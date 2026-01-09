import { Request, Response } from 'express';
import { ProductService } from '../services/ProductService';
import { ApiResponse } from '../types';

export class WooCommerceController {
  private productService: ProductService;

  constructor() {
    this.productService = new ProductService();
  }

  // GET /api/woocommerce/products - Obtener productos para WooCommerce
  public async getProducts(req: Request, res: Response): Promise<void> {
    try {
      const { page = 1, per_page = 10, search, category } = req.query;
      
      const pageNum = parseInt(String(page), 10) || 1;
      const perPageNum = parseInt(String(per_page), 10) || 10;
      
      const { products, total } = await this.productService.getAllProducts({
        page: pageNum,
        limit: perPageNum,
        search: search as string,
        category_id: category ? parseInt(String(category), 10) : undefined,
        active_only: true
      });
      
      // Formatear para WooCommerce
      const wooProducts = products.map(product => ({
        id: product.id,
        name: product.name,
        slug: product.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        permalink: `https://tu-tienda.com/producto/${product.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
        sku: product.code,
        price: product.price.toString(),
        regular_price: product.price.toString(),
        sale_price: '',
        on_sale: false,
        status: product.is_active ? 'publish' : 'draft',
        purchasable: product.stock > 0,
        stock_quantity: product.stock,
        stock_status: product.stock > 0 ? 'instock' : 'outofstock',
        manage_stock: true,
        backorders: 'no',
        categories: product.category_name ? [{ name: product.category_name }] : [],
        description: product.description || '',
        short_description: product.description ? product.description.substring(0, 160) + '...' : '',
        date_created: product.created_at,
        date_modified: product.updated_at,
        meta_data: [
          { key: '_mfcomputers_erp_id', value: product.id.toString() },
          { key: '_mfcomputers_erp_code', value: product.code }
        ]
      }));
      
      const response: ApiResponse = {
        success: true,
        message: 'Productos obtenidos exitosamente',
        data: {
          products: wooProducts,
          pagination: {
            page: pageNum,
            per_page: perPageNum,
            total,
            total_pages: Math.ceil(total / perPageNum)
          }
        },
        timestamp: new Date().toISOString()
      };
      
      res.status(200).json(response);
    } catch (error) {
      console.error('Get WooCommerce products error:', error);
      const response: ApiResponse = {
        success: false,
        message: 'Error obteniendo productos',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      };
      res.status(500).json(response);
    }
  }

  // POST /api/woocommerce/products/sync - Sincronizar productos desde WooCommerce
  public async syncProducts(req: Request, res: Response): Promise<void> {
    try {
      const { products } = req.body;
      
      if (!Array.isArray(products)) {
        const response: ApiResponse = {
          success: false,
          message: 'Formato inválido. Se espera un array de productos.',
          timestamp: new Date().toISOString()
        };
        res.status(400).json(response);
        return;
      }
      
      const results = [];
      
      for (const product of products) {
        const { sku, stock_quantity, price, name, status, description, images } = product;
        
        // Extraer solo las URLs de las imágenes
        let imageUrls: string[] | undefined;
        if (images) {
          if (Array.isArray(images)) {
            // Si es un array de objetos con 'src', extraer las URLs
            imageUrls = images
              .map((img: any) => {
                if (typeof img === 'string') {
                  return img; // Ya es una URL
                } else if (img && typeof img === 'object' && img.src) {
                  return img.src; // Extraer la URL del objeto
                }
                return null;
              })
              .filter((url: string | null): url is string => url !== null && url !== undefined);
            
            // Si no hay URLs válidas, establecer como undefined
            if (imageUrls.length === 0) {
              imageUrls = undefined;
            }
          } else if (typeof images === 'string') {
            // Si es un string (URL única), convertir a array
            imageUrls = [images];
          }
        }
        
        try {
          // Buscar producto existente
          const existingProduct = await this.productService.getProductByCode(sku);
          
          if (existingProduct) {
            // Actualizar producto existente
            await this.productService.updateProduct(existingProduct.id, {
              name: name || existingProduct.name,
              description: description !== undefined ? description : existingProduct.description,
              price: price || existingProduct.price,
              stock: stock_quantity !== null && stock_quantity !== undefined ? stock_quantity : existingProduct.stock,
              is_active: status === 'publish',
              images: imageUrls !== undefined ? imageUrls : existingProduct.images
            });
            
            results.push({
              sku,
              action: 'updated',
              success: true,
              message: 'Producto actualizado exitosamente'
            });
          } else {
            // Crear nuevo producto
            await this.productService.createProduct({
              code: sku,
              name: name || `Producto ${sku}`,
              description: description || undefined,
              price: price || 0,
              stock: stock_quantity !== null && stock_quantity !== undefined ? stock_quantity : 0,
              images: imageUrls
            });
            
            results.push({
              sku,
              action: 'created',
              success: true,
              message: 'Producto creado exitosamente'
            });
          }
        } catch (error) {
          results.push({
            sku,
            action: 'error',
            success: false,
            error: error instanceof Error ? error.message : 'Error desconocido'
          });
        }
      }
      
      const successCount = results.filter(r => r.success).length;
      const errorCount = results.filter(r => !r.success).length;
      
      const response: ApiResponse = {
        success: true,
        message: `Sincronización completada. ${successCount} exitosos, ${errorCount} errores.`,
        data: { results },
        timestamp: new Date().toISOString()
      };
      
      res.status(200).json(response);
    } catch (error) {
      console.error('Sync WooCommerce products error:', error);
      const response: ApiResponse = {
        success: false,
        message: 'Error sincronizando productos',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      };
      res.status(500).json(response);
    }
  }

  // PUT /api/woocommerce/products/:sku/stock - Actualizar stock específico
  public async updateStock(req: Request, res: Response): Promise<void> {
    try {
      const { sku } = req.params;
      const { stock_quantity, operation = 'set' } = req.body;
      
      if (typeof stock_quantity !== 'number' || stock_quantity < 0) {
        const response: ApiResponse = {
          success: false,
          message: 'stock_quantity debe ser un número positivo',
          timestamp: new Date().toISOString()
        };
        res.status(400).json(response);
        return;
      }
      
      const product = await this.productService.getProductByCode(sku);
      
      if (!product) {
        const response: ApiResponse = {
          success: false,
          message: 'Producto no encontrado',
          timestamp: new Date().toISOString()
        };
        res.status(404).json(response);
        return;
      }
      
      const updatedProduct = await this.productService.updateStock(
        product.id, 
        stock_quantity, 
        operation as 'set' | 'add' | 'subtract'
      );
      
      const response: ApiResponse = {
        success: true,
        message: 'Stock actualizado exitosamente',
        data: {
          sku: updatedProduct.code,
          old_stock: product.stock,
          new_stock: updatedProduct.stock,
          operation
        },
        timestamp: new Date().toISOString()
      };
      
      res.status(200).json(response);
    } catch (error) {
      console.error('Update stock error:', error);
      const response: ApiResponse = {
        success: false,
        message: 'Error actualizando stock',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      };
      res.status(500).json(response);
    }
  }
}
