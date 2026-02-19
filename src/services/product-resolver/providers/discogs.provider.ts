import axios from 'axios';
import { ProductProvider, ProductResult } from '../types';
import { logger } from '../../../utils/logger';

/**
 * Provider para Discogs API (especializado en música)
 * Documentación: https://www.discogs.com/developers
 * 
 * Nota: Requiere API key. Por ahora retorna null si no está configurado.
 */
export const discogsProvider: ProductProvider = {
  name: 'discogs',
  
  async search(barcode: string): Promise<ProductResult | null> {
    try {
      // Discogs requiere API key, si no está configurado, retornar null
      const apiKey = process.env.DISCOGS_API_KEY;
      const apiSecret = process.env.DISCOGS_API_SECRET;
      
      if (!apiKey || !apiSecret) {
        return null; // Silenciosamente retornar null si no está configurado
      }

      const cleanedBarcode = barcode.replace(/[\s-]/g, '');
      if (!/^\d+$/.test(cleanedBarcode)) {
        return null;
      }

      const response = await axios.get(
        `https://api.discogs.com/database/search`,
        {
          params: {
            barcode: cleanedBarcode,
            type: 'release'
          },
          headers: {
            'User-Agent': 'MFComputersERP/1.0',
            'Authorization': `Discogs key=${apiKey}, secret=${apiSecret}`
          },
          timeout: 5000
        }
      );

      if (response.data?.results?.length > 0) {
        const result = response.data.results[0];
        
        return {
          title: result.title || 'Producto sin nombre',
          description: result.genre?.join(', ') || undefined,
          brand: result.label?.[0] || undefined,
          images: result.cover_image ? [result.cover_image] : undefined,
          source: 'discogs',
          category_suggestion: 'Música'
        };
      }

      return null;
    } catch (error: any) {
      logger.product.error(`Error en discogsProvider para barcode ${barcode}:`, error.message);
      return null;
    }
  }
};
   