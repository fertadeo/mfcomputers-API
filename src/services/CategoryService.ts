import { CategoryRepository } from '../repositories/CategoryRepository';
import { Category, CreateCategoryData } from '../entities/Category';

export class CategoryService {
  private categoryRepository: CategoryRepository;

  constructor() {
    this.categoryRepository = new CategoryRepository();
  }

  async getAllCategories(): Promise<{ categories: Category[] }> {
    const categories = await this.categoryRepository.findAll();
    return { categories };
  }

  async getCategoryById(id: number): Promise<Category | null> {
    return await this.categoryRepository.findById(id);
  }

  async getCategoryByWooCommerceId(woocommerceId: number): Promise<Category | null> {
    return await this.categoryRepository.findByWooCommerceId(woocommerceId);
  }

  async createCategory(data: CreateCategoryData & { woocommerce_id?: number; woocommerce_slug?: string; parent_id?: number }): Promise<Category> {
    // Verificar si ya existe por nombre
    const existingByName = await this.categoryRepository.findByName(data.name);
    if (existingByName) {
      throw new Error('Ya existe una categoría con ese nombre');
    }

    // Verificar si ya existe por woocommerce_id
    if (data.woocommerce_id) {
      const existingByWcId = await this.categoryRepository.findByWooCommerceId(data.woocommerce_id);
      if (existingByWcId) {
        throw new Error('Ya existe una categoría con ese ID de WooCommerce');
      }
    }

    return await this.categoryRepository.create(data);
  }

  async updateCategory(id: number, data: Partial<CreateCategoryData> & { woocommerce_id?: number; woocommerce_slug?: string; parent_id?: number; is_active?: boolean }): Promise<Category> {
    const existing = await this.categoryRepository.findById(id);
    if (!existing) {
      throw new Error('Categoría no encontrada');
    }

    // Verificar nombre único si se está actualizando
    if (data.name && data.name !== existing.name) {
      const existingByName = await this.categoryRepository.findByName(data.name);
      if (existingByName && existingByName.id !== id) {
        throw new Error('Ya existe otra categoría con ese nombre');
      }
    }

    return await this.categoryRepository.update(id, data);
  }

  // Método específico para sincronización desde WooCommerce
  async syncFromWooCommerce(categories: Array<{
    id: number;
    name: string;
    slug: string;
    parent?: number;
  }>): Promise<{ created: number; updated: number; errors: any[] }> {
    let created = 0;
    let updated = 0;
    const errors: any[] = [];

    for (const wcCategory of categories) {
      try {
        const existing = await this.categoryRepository.findByWooCommerceId(wcCategory.id);
        
        if (existing) {
          // Actualizar categoría existente
          await this.categoryRepository.update(existing.id, {
            name: wcCategory.name,
            woocommerce_slug: wcCategory.slug,
            parent_id: wcCategory.parent !== undefined ? (wcCategory.parent === 0 ? null : wcCategory.parent) : undefined
          });
          updated++;
        } else {
          // Verificar si existe por nombre antes de crear
          const existingByName = await this.categoryRepository.findByName(wcCategory.name);
          if (existingByName) {
            // Si existe por nombre pero no por woocommerce_id, actualizar para agregar el woocommerce_id
            await this.categoryRepository.update(existingByName.id, {
              woocommerce_id: wcCategory.id,
              woocommerce_slug: wcCategory.slug,
              parent_id: wcCategory.parent !== undefined ? (wcCategory.parent === 0 ? null : wcCategory.parent) : undefined
            });
            updated++;
          } else {
            // Crear nueva categoría
            await this.categoryRepository.create({
              name: wcCategory.name,
              woocommerce_id: wcCategory.id,
              woocommerce_slug: wcCategory.slug,
              parent_id: wcCategory.parent !== undefined ? (wcCategory.parent === 0 ? null : wcCategory.parent) : undefined
            });
            created++;
          }
        }
      } catch (error) {
        errors.push({
          woocommerce_id: wcCategory.id,
          name: wcCategory.name,
          error: error instanceof Error ? error.message : 'Error desconocido'
        });
      }
    }

    return { created, updated, errors };
  }
}