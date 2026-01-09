import { Request, Response } from 'express';
import { executeQuery } from '../config/database';
import { ApiResponse, Product } from '../types';
import { validationResult } from 'express-validator';
import { ProductService } from '../services/ProductService';

export class ProductController {
  private productService: ProductService;

  constructor() {
    this.productService = new ProductService();
  }

  // GET /api/products - Get all products with pagination and filters
  public async getAllProducts(req: Request, res: Response): Promise<void> {
    try {
      const { page = 1, limit = 10, category_id, search, active_only = 'true' } = req.query;
      const pageNum = Number(page);
      const limitNum = Number(limit);
      
      // Usar el servicio en lugar de lógica SQL directa
      const result = await this.productService.getAllProducts({
        page: pageNum,
        limit: limitNum,
        category_id: category_id ? Number(category_id) : undefined,
        search: search as string,
        active_only: active_only === 'true'
      });
      
      const response: ApiResponse<any> = {
        success: true,
        message: 'Products retrieved successfully',
        data: {
          products: result.products,
          pagination: {
            page: pageNum,
            limit: limitNum,
            total: result.total,
            totalPages: Math.ceil(result.total / limitNum)
          }
        },
        timestamp: new Date().toISOString()
      };
      
      res.status(200).json(response);
    } catch (error) {
      console.error('Get products error:', error);
      const response: ApiResponse = {
        success: false,
        message: 'Error retrieving products',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      };
      res.status(500).json(response);
    }
  }

  // GET /api/products/:id - Get product by ID
  public async getProductById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      
      // Usar el servicio en lugar de lógica SQL directa
      const product = await this.productService.getProductById(Number(id));
      
      if (!product) {
        const response: ApiResponse = {
          success: false,
          message: 'Product not found',
          timestamp: new Date().toISOString()
        };
        res.status(404).json(response);
        return;
      }
      
      const response: ApiResponse<Product> = {
        success: true,
        message: 'Product retrieved successfully',
        data: product,
        timestamp: new Date().toISOString()
      };
      
      res.status(200).json(response);
    } catch (error) {
      console.error('Get product by ID error:', error);
      const response: ApiResponse = {
        success: false,
        message: 'Error retrieving product',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      };
      res.status(500).json(response);
    }
  }

  // POST /api/products - Create new product
  public async createProduct(req: Request, res: Response): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        const response: ApiResponse = {
          success: false,
          message: 'Validation failed',
          error: errors.array().map(err => err.msg).join(', '),
          timestamp: new Date().toISOString()
        };
        res.status(400).json(response);
        return;
      }

      const { 
        code, 
        name, 
        description, 
        category_id, 
        price, 
        stock = 0, 
        min_stock = 0, 
        max_stock = 1000 
      } = req.body;
      
      // Check if product code already exists
      const existingProductResult = await executeQuery(
        'SELECT id FROM products WHERE code = ?', 
        [code]
      );
      const existingProduct = existingProductResult[0];
      
      if (existingProduct) {
        const response: ApiResponse = {
          success: false,
          message: 'Product code already exists',
          timestamp: new Date().toISOString()
        };
        res.status(409).json(response);
        return;
      }
      
      const insertQuery = `
        INSERT INTO products (code, name, description, category_id, price, stock, min_stock, max_stock, is_active)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)
      `;
      
      const result = await executeQuery(insertQuery, [
        code, name, description, category_id, price, stock, min_stock, max_stock
      ]);
      
      // Get the created product
      const newProductResult = await executeQuery(
        'SELECT * FROM products WHERE id = ?', 
        [result.insertId]
      );
      const newProduct = newProductResult[0];
      
      const response: ApiResponse<Product> = {
        success: true,
        message: 'Product created successfully',
        data: newProduct,
        timestamp: new Date().toISOString()
      };
      
      res.status(201).json(response);
    } catch (error) {
      console.error('Create product error:', error);
      const response: ApiResponse = {
        success: false,
        message: 'Error creating product',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      };
      res.status(500).json(response);
    }
  }

  // PUT /api/products/:id - Update product
  public async updateProduct(req: Request, res: Response): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        const response: ApiResponse = {
          success: false,
          message: 'Validation failed',
          error: errors.array().map(err => err.msg).join(', '),
          timestamp: new Date().toISOString()
        };
        res.status(400).json(response);
        return;
      }

      const { id } = req.params;
      const { 
        code, 
        name, 
        description, 
        category_id, 
        price, 
        stock, 
        min_stock, 
        max_stock, 
        is_active 
      } = req.body;
      
      // Check if product exists
      const existingProductResult = await executeQuery('SELECT id FROM products WHERE id = ?', [id]);
      const existingProduct = existingProductResult[0];
      if (!existingProduct) {
        const response: ApiResponse = {
          success: false,
          message: 'Product not found',
          timestamp: new Date().toISOString()
        };
        res.status(404).json(response);
        return;
      }
      
      // Check if code is being changed and if new code already exists
      if (code) {
        const codeExistsResult = await executeQuery(
          'SELECT id FROM products WHERE code = ? AND id != ?', 
          [code, id]
        );
        const codeExists = codeExistsResult[0];
        if (codeExists) {
          const response: ApiResponse = {
            success: false,
            message: 'Product code already exists',
            timestamp: new Date().toISOString()
          };
          res.status(409).json(response);
          return;
        }
      }
      
      const updateQuery = `
        UPDATE products 
        SET code = ?, name = ?, description = ?, category_id = ?, price = ?, 
            stock = ?, min_stock = ?, max_stock = ?, is_active = ?
        WHERE id = ?
      `;
      
      await executeQuery(updateQuery, [
        code, name, description, category_id, price, 
        stock, min_stock, max_stock, is_active, id
      ]);
      
      // Get the updated product
      const updatedProductResult = await executeQuery('SELECT * FROM products WHERE id = ?', [id]);
      const updatedProduct = updatedProductResult[0];
      
      const response: ApiResponse<Product> = {
        success: true,
        message: 'Product updated successfully',
        data: updatedProduct,
        timestamp: new Date().toISOString()
      };
      
      res.status(200).json(response);
    } catch (error) {
      console.error('Update product error:', error);
      const response: ApiResponse = {
        success: false,
        message: 'Error updating product',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      };
      res.status(500).json(response);
    }
  }

  // PUT /api/products/:id/stock - Update product stock
  public async updateStock(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { stock, operation = 'set' } = req.body; // operation: 'set', 'add', 'subtract'
      
      if (typeof stock !== 'number' || stock < 0) {
        const response: ApiResponse = {
          success: false,
          message: 'Invalid stock value',
          timestamp: new Date().toISOString()
        };
        res.status(400).json(response);
        return;
      }
      
      // Check if product exists
      const existingProductResult = await executeQuery('SELECT id, stock FROM products WHERE id = ?', [id]);
      const existingProduct = existingProductResult[0];
      if (!existingProduct) {
        const response: ApiResponse = {
          success: false,
          message: 'Product not found',
          timestamp: new Date().toISOString()
        };
        res.status(404).json(response);
        return;
      }
      
      let newStock = stock;
      if (operation === 'add') {
        newStock = existingProduct.stock + stock;
      } else if (operation === 'subtract') {
        newStock = Math.max(0, existingProduct.stock - stock);
      }
      
      const updateQuery = 'UPDATE products SET stock = ? WHERE id = ?';
      await executeQuery(updateQuery, [newStock, id]);
      
      // Get the updated product
      const updatedProductResult = await executeQuery('SELECT * FROM products WHERE id = ?', [id]);
      const updatedProduct = updatedProductResult[0];
      
      const response: ApiResponse<Product> = {
        success: true,
        message: `Stock ${operation === 'set' ? 'updated' : operation === 'add' ? 'increased' : 'decreased'} successfully`,
        data: updatedProduct,
        timestamp: new Date().toISOString()
      };
      
      res.status(200).json(response);
    } catch (error) {
      console.error('Update stock error:', error);
      const response: ApiResponse = {
        success: false,
        message: 'Error updating stock',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      };
      res.status(500).json(response);
    }
  }

  // GET /api/products/stock/low - Get products with low stock
  public async getLowStockProducts(req: Request, res: Response): Promise<void> {
    try {
      // Usar el servicio en lugar de lógica SQL directa
      const products = await this.productService.getLowStockProducts();
      
      const response: ApiResponse<any> = {
        success: true,
        message: 'Low stock products retrieved successfully',
        data: { products },
        timestamp: new Date().toISOString()
      };
      
      res.status(200).json(response);
    } catch (error) {
      console.error('Get low stock products error:', error);
      const response: ApiResponse = {
        success: false,
        message: 'Error retrieving low stock products',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      };
      res.status(500).json(response);
    }
  }

  // GET /api/products/stats - Get product statistics
  public async getProductStats(req: Request, res: Response): Promise<void> {
    try {
      // Usar el servicio en lugar de lógica SQL directa
      const stats = await this.productService.getProductStats();
      
      const response: ApiResponse = {
        success: true,
        message: 'Product statistics retrieved successfully',
        data: stats,
        timestamp: new Date().toISOString()
      };
      
      res.status(200).json(response);
    } catch (error) {
      console.error('Get product stats error:', error);
      const response: ApiResponse = {
        success: false,
        message: 'Error retrieving product statistics',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      };
      res.status(500).json(response);
    }
  }

  // DELETE /api/products/:id - Delete product (soft delete)
  public async deleteProduct(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      
      // Check if product exists
      const existingProductResult = await executeQuery('SELECT id, name FROM products WHERE id = ?', [id]);
      const existingProduct = existingProductResult[0];
      if (!existingProduct) {
        const response: ApiResponse = {
          success: false,
          message: 'Product not found',
          timestamp: new Date().toISOString()
        };
        res.status(404).json(response);
        return;
      }
      
      // Soft delete - set is_active to 0 instead of actually deleting
      const deleteQuery = 'UPDATE products SET is_active = 0, updated_at = NOW() WHERE id = ?';
      await executeQuery(deleteQuery, [id]);
      
      const response: ApiResponse = {
        success: true,
        message: `Product "${existingProduct.name}" deleted successfully`,
        data: { id: Number(id), name: existingProduct.name },
        timestamp: new Date().toISOString()
      };
      
      res.status(200).json(response);
    } catch (error) {
      console.error('Delete product error:', error);
      const response: ApiResponse = {
        success: false,
        message: 'Error deleting product',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      };
      res.status(500).json(response);
    }
  }

  // DELETE /api/products/:id/permanent - Permanently delete product
  public async permanentDeleteProduct(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      
      // Check if product exists
      const existingProductResult = await executeQuery('SELECT id, name FROM products WHERE id = ?', [id]);
      const existingProduct = existingProductResult[0];
      if (!existingProduct) {
        const response: ApiResponse = {
          success: false,
          message: 'Product not found',
          timestamp: new Date().toISOString()
        };
        res.status(404).json(response);
        return;
      }
      
      // Permanently delete the product
      const deleteQuery = 'DELETE FROM products WHERE id = ?';
      await executeQuery(deleteQuery, [id]);
      
      const response: ApiResponse = {
        success: true,
        message: `Product "${existingProduct.name}" permanently deleted`,
        data: { id: Number(id), name: existingProduct.name },
        timestamp: new Date().toISOString()
      };
      
      res.status(200).json(response);
    } catch (error) {
      console.error('Permanent delete product error:', error);
      const response: ApiResponse = {
        success: false,
        message: 'Error permanently deleting product',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      };
      res.status(500).json(response);
    }
  }
}
