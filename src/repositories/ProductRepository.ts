import { executeQuery } from '../config/database';
import { Product, ProductWithCategory, CreateProductData, UpdateProductData } from '../entities/Product';

export class ProductRepository {
  // Obtener todos los productos
  async findAll(options: {
    page?: number;
    limit?: number;
    category_id?: number;
    search?: string;
    active_only?: boolean;
  } = {}): Promise<{ products: ProductWithCategory[]; total: number }> {
    // Consulta simple para obtener todos los productos
    const productsQuery = `
      SELECT 
        p.id,
        p.code,
        p.name,
        p.description,
        p.category_id,
        c.name as category_name,
        p.price,
        p.stock,
        p.min_stock,
        p.max_stock,
        p.is_active,
        p.images,
        p.created_at,
        p.updated_at
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      ORDER BY p.name
    `;
    
    const products = await executeQuery(productsQuery);
    
    // Parsear JSON de imágenes
    const parsedProducts = products.map((product: any) => ({
      ...product,
      images: product.images ? (typeof product.images === 'string' ? JSON.parse(product.images) : product.images) : null
    }));
    
    // Contar total
    const total = parsedProducts.length;
    
    return { products: parsedProducts, total };
  }

  // Obtener producto por ID
  async findById(id: number): Promise<ProductWithCategory | null> {
    const query = `
      SELECT 
        p.id,
        p.code,
        p.name,
        p.description,
        p.category_id,
        c.name as category_name,
        p.price,
        p.stock,
        p.min_stock,
        p.max_stock,
        p.is_active,
        p.images,
        p.created_at,
        p.updated_at
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.id = ?
    `;
    
    const product = await executeQuery(query, [id]);
    if (!product[0]) return null;
    
    // Parsear JSON de imágenes
    return {
      ...product[0],
      images: product[0].images ? (typeof product[0].images === 'string' ? JSON.parse(product[0].images) : product[0].images) : null
    };
  }

  // Obtener producto por código
  async findByCode(code: string): Promise<Product | null> {
    const query = 'SELECT * FROM products WHERE code = ?';
    const product = await executeQuery(query, [code]);
    if (!product[0]) return null;
    
    // Parsear JSON de imágenes
    return {
      ...product[0],
      images: product[0].images ? (typeof product[0].images === 'string' ? JSON.parse(product[0].images) : product[0].images) : null
    };
  }

  // Crear producto
  async create(data: CreateProductData): Promise<Product> {
    const {
      code,
      name,
      description,
      category_id,
      price,
      stock = 0,
      min_stock = 0,
      max_stock = 1000,
      images
    } = data;
    
    const insertQuery = `
      INSERT INTO products (code, name, description, category_id, price, stock, min_stock, max_stock, is_active, images)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?)
    `;
    
    const result = await executeQuery(insertQuery, [
      code, 
      name, 
      description ?? null, 
      category_id ?? null, 
      price, 
      stock, 
      min_stock, 
      max_stock,
      images ? JSON.stringify(images) : null
    ]);
    
    const newProduct = await executeQuery('SELECT * FROM products WHERE id = ?', [result.insertId]);
    if (!newProduct[0]) throw new Error('Error al crear producto');
    
    // Parsear JSON de imágenes
    return {
      ...newProduct[0],
      images: newProduct[0].images ? (typeof newProduct[0].images === 'string' ? JSON.parse(newProduct[0].images) : newProduct[0].images) : null
    };
  }

  // Actualizar producto
  async update(id: number, data: UpdateProductData): Promise<Product> {
    const fields: string[] = [];
    const values = [];
    
    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined) {
        fields.push(`${key} = ?`);
        // Convertir arrays de imágenes a JSON string
        if (key === 'images' && Array.isArray(value)) {
          values.push(JSON.stringify(value));
        } else {
          // Convertir undefined a null para MySQL
          values.push(value === undefined ? null : value);
        }
      }
    });
    
    if (fields.length === 0) {
      throw new Error('No hay campos para actualizar');
    }
    
    values.push(id);
    
    const updateQuery = `UPDATE products SET ${fields.join(', ')} WHERE id = ?`;
    await executeQuery(updateQuery, values);
    
    const updatedProduct = await executeQuery('SELECT * FROM products WHERE id = ?', [id]);
    if (!updatedProduct[0]) throw new Error('Producto no encontrado después de actualizar');
    
    // Parsear JSON de imágenes
    return {
      ...updatedProduct[0],
      images: updatedProduct[0].images ? (typeof updatedProduct[0].images === 'string' ? JSON.parse(updatedProduct[0].images) : updatedProduct[0].images) : null
    };
  }

  // Actualizar stock
  async updateStock(id: number, stock: number, operation: 'set' | 'add' | 'subtract' = 'set'): Promise<Product> {
    const existingProduct = await executeQuery('SELECT stock FROM products WHERE id = ?', [id]);
    
    if (!existingProduct[0]) {
      throw new Error('Producto no encontrado');
    }
    
    let newStock = stock;
    if (operation === 'add') {
      newStock = existingProduct[0].stock + stock;
    } else if (operation === 'subtract') {
      newStock = Math.max(0, existingProduct[0].stock - stock);
    }
    
    await executeQuery('UPDATE products SET stock = ? WHERE id = ?', [newStock, id]);
    
    const updatedProduct = await executeQuery('SELECT * FROM products WHERE id = ?', [id]);
    if (!updatedProduct[0]) throw new Error('Producto no encontrado después de actualizar stock');
    
    // Parsear JSON de imágenes
    return {
      ...updatedProduct[0],
      images: updatedProduct[0].images ? (typeof updatedProduct[0].images === 'string' ? JSON.parse(updatedProduct[0].images) : updatedProduct[0].images) : null
    };
  }

  // Obtener productos con stock bajo
  async findLowStock(): Promise<ProductWithCategory[]> {
    const query = `
      SELECT 
        p.id,
        p.code,
        p.name,
        p.stock,
        p.min_stock,
        p.max_stock,
        c.name as category_name
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.stock <= p.min_stock AND p.is_active = 1
      ORDER BY (p.stock - p.min_stock) ASC
    `;
    
    return await executeQuery(query);
  }

  // Obtener estadísticas de productos
  async getStats(): Promise<any> {
    const query = `
      SELECT 
        COUNT(*) as total_products,
        SUM(CASE WHEN is_active = 1 THEN 1 ELSE 0 END) as active_products,
        SUM(stock) as total_stock_value,
        AVG(price) as average_price,
        COUNT(CASE WHEN stock <= min_stock THEN 1 END) as low_stock_count,
        COUNT(CASE WHEN stock = 0 THEN 1 END) as out_of_stock_count
      FROM products
    `;
    
    const stats = await executeQuery(query);
    return stats[0];
  }
}
