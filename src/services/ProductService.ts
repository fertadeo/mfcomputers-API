import { ProductRepository } from '../repositories/ProductRepository';
import { Product, ProductWithCategory, CreateProductData, UpdateProductData } from '../entities/Product';

export class ProductService {
  private productRepository: ProductRepository;

  constructor() {
    this.productRepository = new ProductRepository();
  }

  async getAllProducts(options: {
    page?: number;
    limit?: number;
    category_id?: number;
    search?: string;
    active_only?: boolean;
  } = {}) {
    return await this.productRepository.findAll(options);
  }

  async getProductById(id: number): Promise<ProductWithCategory | null> {
    return await this.productRepository.findById(id);
  }

  async createProduct(data: CreateProductData): Promise<Product> {
    // Verificar si el código ya existe
    const existingProduct = await this.productRepository.findByCode(data.code);
    if (existingProduct) {
      throw new Error('El código del producto ya existe');
    }

    return await this.productRepository.create(data);
  }

  async updateProduct(id: number, data: UpdateProductData): Promise<Product> {
    // Verificar si el producto existe
    const existingProduct = await this.productRepository.findById(id);
    if (!existingProduct) {
      throw new Error('Producto no encontrado');
    }

    // Si se está cambiando el código, verificar que no exista
    if (data.code && data.code !== existingProduct.code) {
      const codeExists = await this.productRepository.findByCode(data.code);
      if (codeExists) {
        throw new Error('El código del producto ya existe');
      }
    }

    return await this.productRepository.update(id, data);
  }

  async updateStock(id: number, stock: number, operation: 'set' | 'add' | 'subtract' = 'set'): Promise<Product> {
    if (typeof stock !== 'number' || stock < 0) {
      throw new Error('El stock debe ser un número positivo');
    }

    return await this.productRepository.updateStock(id, stock, operation);
  }

  async getLowStockProducts(): Promise<ProductWithCategory[]> {
    return await this.productRepository.findLowStock();
  }

  async getProductStats() {
    return await this.productRepository.getStats();
  }

  async getProductByCode(code: string): Promise<Product | null> {
    return await this.productRepository.findByCode(code);
  }
}


