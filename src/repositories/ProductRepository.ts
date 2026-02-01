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
        p.woocommerce_image_ids,
        p.woocommerce_id,
        p.barcode,
        p.qr_code,
        p.created_at,
        p.updated_at
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      ORDER BY p.name
    `;
    
    const products = await executeQuery(productsQuery);
    
    // Parsear JSON de imágenes y woocommerce_image_ids
    const parsedProducts = products.map((product: any) => ({
      ...product,
      images: product.images ? (typeof product.images === 'string' ? JSON.parse(product.images) : product.images) : null,
      woocommerce_image_ids: product.woocommerce_image_ids ? (typeof product.woocommerce_image_ids === 'string' ? JSON.parse(product.woocommerce_image_ids) : product.woocommerce_image_ids) : null
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
        p.woocommerce_image_ids,
        p.woocommerce_id,
        p.woocommerce_json,
        p.barcode,
        p.qr_code,
        p.created_at,
        p.updated_at
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.id = ?
    `;
    
    const product = await executeQuery(query, [id]);
    if (!product[0]) return null;
    
    // Parsear JSON de imágenes, woocommerce_image_ids y woocommerce_json
    return {
      ...product[0],
      images: product[0].images ? (typeof product[0].images === 'string' ? JSON.parse(product[0].images) : product[0].images) : null,
      woocommerce_image_ids: product[0].woocommerce_image_ids ? (typeof product[0].woocommerce_image_ids === 'string' ? JSON.parse(product[0].woocommerce_image_ids) : product[0].woocommerce_image_ids) : null,
      woocommerce_json: product[0].woocommerce_json
        ? (typeof product[0].woocommerce_json === 'string' ? JSON.parse(product[0].woocommerce_json) : product[0].woocommerce_json)
        : null
    };
  }

  // Obtener producto por código
  async findByCode(code: string): Promise<Product | null> {
    const query = 'SELECT * FROM products WHERE code = ?';
    const product = await executeQuery(query, [code]);
    if (!product[0]) return null;
    
    const row = product[0] as any;
    return {
      ...row,
      images: row.images ? (typeof row.images === 'string' ? JSON.parse(row.images) : row.images) : null,
      woocommerce_image_ids: row.woocommerce_image_ids ? (typeof row.woocommerce_image_ids === 'string' ? JSON.parse(row.woocommerce_image_ids) : row.woocommerce_image_ids) : null,
      woocommerce_json: row.woocommerce_json ? (typeof row.woocommerce_json === 'string' ? JSON.parse(row.woocommerce_json) : row.woocommerce_json) : null
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
      images,
      woocommerce_image_ids,
      woocommerce_id,
      woocommerce_json,
      barcode,
      qr_code
    } = data;
    
    const insertQuery = `
      INSERT INTO products (
        code, name, description, category_id, price, stock, min_stock, max_stock,
        is_active, images, woocommerce_image_ids, barcode, qr_code, woocommerce_id, woocommerce_json
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?, ?, ?)
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
      images ? JSON.stringify(images) : null,
      woocommerce_image_ids ? JSON.stringify(woocommerce_image_ids) : null,
      barcode ?? null,
      qr_code ?? null,
      woocommerce_id ?? null,
      woocommerce_json ? JSON.stringify(woocommerce_json) : null
    ]);
    
    const newProduct = await executeQuery('SELECT * FROM products WHERE id = ?', [result.insertId]);
    if (!newProduct[0]) throw new Error('Error al crear producto');
    
    const row = newProduct[0] as any;
    return {
      ...row,
      images: row.images ? (typeof row.images === 'string' ? JSON.parse(row.images) : row.images) : null,
      woocommerce_image_ids: row.woocommerce_image_ids ? (typeof row.woocommerce_image_ids === 'string' ? JSON.parse(row.woocommerce_image_ids) : row.woocommerce_image_ids) : null,
      woocommerce_json: row.woocommerce_json ? (typeof row.woocommerce_json === 'string' ? JSON.parse(row.woocommerce_json) : row.woocommerce_json) : null
    };
  }

  // Actualizar producto
  async update(id: number, data: UpdateProductData): Promise<Product> {
    const fields: string[] = [];
    const values = [];
    
    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined) {
        fields.push(`${key} = ?`);
        // Convertir arrays a JSON string
        if (key === 'images' && Array.isArray(value)) {
          values.push(JSON.stringify(value));
        } else if (key === 'woocommerce_image_ids' && Array.isArray(value)) {
          values.push(JSON.stringify(value));
        } else if (key === 'woocommerce_json') {
          // Guardar JSON completo de WooCommerce como string JSON
          if (value === null) {
            values.push(null);
          } else if (typeof value === 'string') {
            values.push(value);
          } else {
            values.push(JSON.stringify(value));
          }
        } else {
          values.push(value);
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
    
    const row = updatedProduct[0] as any;
    return {
      ...row,
      images: row.images ? (typeof row.images === 'string' ? JSON.parse(row.images) : row.images) : null,
      woocommerce_image_ids: row.woocommerce_image_ids ? (typeof row.woocommerce_image_ids === 'string' ? JSON.parse(row.woocommerce_image_ids) : row.woocommerce_image_ids) : null,
      woocommerce_json: row.woocommerce_json ? (typeof row.woocommerce_json === 'string' ? JSON.parse(row.woocommerce_json) : row.woocommerce_json) : null
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
    
    const row = updatedProduct[0] as any;
    return {
      ...row,
      images: row.images ? (typeof row.images === 'string' ? JSON.parse(row.images) : row.images) : null,
      woocommerce_image_ids: row.woocommerce_image_ids ? (typeof row.woocommerce_image_ids === 'string' ? JSON.parse(row.woocommerce_image_ids) : row.woocommerce_image_ids) : null,
      woocommerce_json: row.woocommerce_json ? (typeof row.woocommerce_json === 'string' ? JSON.parse(row.woocommerce_json) : row.woocommerce_json) : null
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

  // Obtener SOLO el JSON completo de WooCommerce de un producto (por ID interno)
  async getWooCommerceJsonById(id: number): Promise<any | null> {
    const rows = await executeQuery('SELECT woocommerce_json FROM products WHERE id = ?', [id]) as any[];
    if (!rows[0]) return null;
    const raw = rows[0].woocommerce_json;
    if (!raw) return null;
    return typeof raw === 'string' ? JSON.parse(raw) : raw;
  }
}
