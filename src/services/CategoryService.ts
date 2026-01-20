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

  async createCategory(data: CreateCategoryData & { woocommerce_id?: number; woocommerce_slug?: string; parent_id?: number | null }): Promise<Category> {
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

  async updateCategory(id: number, data: Partial<CreateCategoryData> & { woocommerce_id?: number; woocommerce_slug?: string; parent_id?: number | null; is_active?: boolean }): Promise<Category> {
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
  async syncFromWooCommerce(
    categories: Array<{
      id: number;
      name: string;
      slug: string;
      parent?: number;
    }>,
    requestId?: string
  ): Promise<{ created: number; updated: number; deactivated: number; errors: any[] }> {
    const logPrefix = requestId ? `[${requestId}]` : '[CAT-SYNC]';
    let created = 0;
    let updated = 0;
    let deactivated = 0;
    const errors: any[] = [];

    console.log(`${logPrefix} Procesando ${categories.length} categorías desde WooCommerce...`);

    // Obtener IDs de WooCommerce de las categorías recibidas
    const receivedWcIds = new Set(categories.map(cat => cat.id));
    console.log(`${logPrefix} IDs de WooCommerce recibidos: ${Array.from(receivedWcIds).join(', ')}`);

    // Procesar cada categoría recibida
    for (let i = 0; i < categories.length; i++) {
      const wcCategory = categories[i];
      const categoryLog = `${logPrefix} [${i + 1}/${categories.length}] WC ID: ${wcCategory.id} - "${wcCategory.name}"`;
      
      try {
        console.log(`${categoryLog} Buscando categoría existente...`);
        const existing = await this.categoryRepository.findByWooCommerceId(wcCategory.id);
        
        if (existing) {
          console.log(`${categoryLog} ✅ Categoría existente encontrada (ERP ID: ${existing.id}). Actualizando...`);
          
          // Si estaba inactiva, reactivarla
          const needsReactivation = !existing.is_active;
          
          // Actualizar categoría existente
          await this.categoryRepository.update(existing.id, {
            name: wcCategory.name,
            woocommerce_slug: wcCategory.slug,
            parent_id: wcCategory.parent !== undefined ? (wcCategory.parent === 0 ? null : wcCategory.parent) : undefined,
            is_active: true // Reactivar si estaba inactiva
          });
          updated++;
          
          if (needsReactivation) {
            console.log(`${categoryLog} ✅ Reactivada y actualizada exitosamente`);
          } else {
            console.log(`${categoryLog} ✅ Actualizada exitosamente`);
          }
        } else {
          // Verificar si existe por nombre antes de crear
          const existingByName = await this.categoryRepository.findByName(wcCategory.name);
          if (existingByName) {
            console.log(`${categoryLog} ⚠️ Categoría existe por nombre pero sin woocommerce_id (ERP ID: ${existingByName.id}). Agregando woocommerce_id...`);
            // Si existe por nombre pero no por woocommerce_id, actualizar para agregar el woocommerce_id
            await this.categoryRepository.update(existingByName.id, {
              woocommerce_id: wcCategory.id,
              woocommerce_slug: wcCategory.slug,
              parent_id: wcCategory.parent !== undefined ? (wcCategory.parent === 0 ? null : wcCategory.parent) : undefined,
              is_active: true
            });
            updated++;
            console.log(`${categoryLog} ✅ woocommerce_id agregado exitosamente`);
          } else {
            console.log(`${categoryLog} ➕ Nueva categoría. Creando...`);
            // Crear nueva categoría
            const newCategory = await this.categoryRepository.create({
              name: wcCategory.name,
              woocommerce_id: wcCategory.id,
              woocommerce_slug: wcCategory.slug,
              parent_id: wcCategory.parent !== undefined ? (wcCategory.parent === 0 ? null : wcCategory.parent) : undefined
            });
            created++;
            console.log(`${categoryLog} ✅ Creada exitosamente (ERP ID: ${newCategory.id})`);
          }
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Error desconocido';
        console.error(`${categoryLog} ❌ ERROR: ${errorMsg}`);
        if (error instanceof Error && error.stack) {
          console.error(`${categoryLog} Stack:`, error.stack);
        }
        
        errors.push({
          woocommerce_id: wcCategory.id,
          name: wcCategory.name,
          error: errorMsg
        });
      }
    }

    // Desactivar categorías que ya no existen en WooCommerce
    console.log(`${logPrefix} Verificando categorías a desactivar (que no están en WooCommerce)...`);
    // Necesitamos todas las categorías, incluyendo inactivas, para comparar
    const allCategories = await this.categoryRepository.findAllIncludingInactive();
    const categoriesWithWcId = allCategories.filter(cat => cat.woocommerce_id !== undefined);
    
    console.log(`${logPrefix} Categorías en ERP con woocommerce_id: ${categoriesWithWcId.length}`);
    
    for (const erpCategory of categoriesWithWcId) {
      if (erpCategory.woocommerce_id && !receivedWcIds.has(erpCategory.woocommerce_id)) {
        // Esta categoría existe en el ERP pero no en WooCommerce (fue eliminada)
        if (erpCategory.is_active) {
          console.log(`${logPrefix} 🗑️ Desactivando categoría eliminada en WooCommerce: ERP ID ${erpCategory.id}, WC ID ${erpCategory.woocommerce_id} - "${erpCategory.name}"`);
          try {
            await this.categoryRepository.update(erpCategory.id, {
              is_active: false
            });
            deactivated++;
            console.log(`${logPrefix} ✅ Categoría desactivada exitosamente`);
          } catch (error) {
            const errorMsg = error instanceof Error ? error.message : 'Error desconocido';
            console.error(`${logPrefix} ❌ Error desactivando categoría ${erpCategory.id}: ${errorMsg}`);
            errors.push({
              woocommerce_id: erpCategory.woocommerce_id,
              name: erpCategory.name,
              error: `Error al desactivar: ${errorMsg}`
            });
          }
        } else {
          console.log(`${logPrefix} ℹ️ Categoría ya estaba inactiva: WC ID ${erpCategory.woocommerce_id} - "${erpCategory.name}"`);
        }
      }
    }

    console.log(`${logPrefix} Resumen de sincronización:`, {
      total_recibidas: categories.length,
      creadas: created,
      actualizadas: updated,
      desactivadas: deactivated,
      errores: errors.length
    });

    return { created, updated, deactivated, errors };
  }
}