import axios from 'axios';
import { ProductProvider, ProductResult } from '../types';
import { logger } from '../../../utils/logger';

/**
 * Helper: Extrae precio de un texto (formato: $1.500,00 o $1500.00)
 */
function extractPriceFromText(text: string): number | null {
  const pricePatterns = [
    /\$\s*(\d{1,3}(?:\.\d{3})*(?:,\d{2})?)/,
    /ARS\s*(\d{1,3}(?:\.\d{3})*(?:,\d{2})?)/,
    /(\d{1,3}(?:\.\d{3})*(?:,\d{2})?)\s*pesos/i,
  ];
  for (const pattern of pricePatterns) {
    const match = text.match(pattern);
    if (match) {
      const priceStr = match[1].replace(/\./g, '').replace(',', '.');
      const price = parseFloat(priceStr);
      if (!isNaN(price) && price > 0) return price;
    }
  }
  return null;
}

function extractBrandFromText(text: string): string | null {
  const brands = [
    'Logitech', 'Sony', 'Samsung', 'LG', 'Philips', 'Panasonic',
    'HP', 'Dell', 'Lenovo', 'Asus', 'Acer', 'Microsoft', 'Apple',
    'Xiaomi', 'Huawei', 'Canon', 'Nikon', 'Epson', 'Brother', 'Ricoh', 'Kodak', 'Fujifilm'
  ];
  const lower = text.toLowerCase();
  for (const brand of brands) {
    if (lower.includes(brand.toLowerCase())) return brand;
  }
  return null;
}

function cleanTitle(title: string): string {
  return title
    .replace(/\s*-\s*Google\s+Shopping.*/i, '')
    .replace(/\s*-\s*Mercado\s+Libre.*/i, '')
    .replace(/\s*-\s*Amazon.*/i, '')
    .trim();
}

function extractCategoryFromLink(link: string): string | null {
  const map: Record<string, string> = {
    'electronica': 'Electrónica', 'computacion': 'Computación', 'hogar': 'Hogar',
    'decoracion': 'Decoración', 'iluminacion': 'Iluminación', 'limpieza': 'Limpieza',
    'carga': 'Electrónica', 'cable': 'Electrónica', 'audio': 'Audio', 'video': 'Video',
  };
  const lower = link.toLowerCase();
  for (const [keyword, category] of Object.entries(map)) {
    if (lower.includes(keyword)) return category;
  }
  return null;
}

/**
 * Respuesta orgánica de SerpApi (Google Search)
 * https://serpapi.com/search-api
 */
interface SerpApiOrganicResult {
  position?: number;
  title?: string;
  link?: string;
  snippet?: string;
  thumbnail?: string;
  source?: string;
  price?: string;
}

interface SerpApiResponse {
  organic_results?: SerpApiOrganicResult[];
  shopping_results?: SerpApiOrganicResult[];
  error?: string;
  search_metadata?: { status?: string };
  search_information?: { total_results?: number };
}

/**
 * Provider para SerpApi (Google Search vía SerpApi).
 * Una API key, sin motor (cx). Documentación: https://serpapi.com/search-api
 *
 * Variables de entorno: SERPAPI_KEY
 */
export const serpapiProvider: ProductProvider = {
  name: 'serpapi',

  async search(barcode: string): Promise<ProductResult | null> {
    const start = Date.now();
    try {
      const apiKey = process.env.SERPAPI_KEY;
      if (!apiKey) {
        logger.barcode.provider(`serpapi: omitido (SERPAPI_KEY no configurada)`);
        return null;
      }

      const cleanedBarcode = barcode.replace(/[\s-]/g, '');
      if (!/^\d+$/.test(cleanedBarcode)) {
        logger.barcode.provider(`serpapi: barcode inválido, skip`);
        return null;
      }

      logger.barcode.provider(`serpapi: llamando API q="${cleanedBarcode}"`);

      const response = await axios.get<SerpApiResponse>('https://serpapi.com/search', {
        params: {
          engine: 'google',
          api_key: apiKey,
          q: cleanedBarcode,
        },
        timeout: 8000,
      });

      const data = response.data;
      if (data.error) {
        logger.barcode.provider(`serpapi: API error → ${data.error} (${Date.now() - start}ms)`);
        return null;
      }

      // Priorizar shopping_results si existe, sino organic_results
      const items = (data.shopping_results && data.shopping_results.length > 0)
        ? data.shopping_results
        : data.organic_results;

      if (!items || items.length === 0) {
        logger.barcode.provider(`serpapi: sin resultados (${Date.now() - start}ms)`);
        return null;
      }

      // Priorizamos resultados de e-commerce y dominios .com.ar cuando existan
      let best = items[0];
      for (const item of items) {
        const linkLower = (item.link || '').toLowerCase();
        if (
          linkLower.includes('mercadolibre.com') ||
          linkLower.includes('amazon.') ||
          linkLower.includes('.com.ar') ||
          linkLower.includes('tienda')
        ) {
          best = item;
          break;
        }
      }

      const title = best.title || 'Producto encontrado';
      const snippet = best.snippet || '';
      const link = best.link || '';
      const price = extractPriceFromText(`${best.price || ''} ${snippet || title}`.trim());
      const brand = extractBrandFromText(title + ' ' + snippet);
      const category = link ? extractCategoryFromLink(link) : null;
      const images: string[] = [];
      if (best.thumbnail) images.push(best.thumbnail);

      logger.barcode.provider(`serpapi: encontrado → "${cleanTitle(title)}" (${Date.now() - start}ms)`);
      return {
        title: cleanTitle(title),
        description: snippet || undefined,
        brand: brand || undefined,
        images: images.length > 0 ? images : undefined,
        source: 'serpapi',
        suggested_price: price || undefined,
        category_suggestion: category || undefined,
      };
    } catch (error: any) {
      const ms = Date.now() - start;
      const status = error.response?.status;
      const body = error.response?.data;
      const msg = body?.error || error.message;

      if (status === 401) {
        logger.barcode.provider(`serpapi: API key inválida (401) ${ms}ms`);
      } else if (status === 403) {
        logger.barcode.provider(`serpapi: API key sin permisos o bloqueada (403) ${ms}ms`);
      } else if (status === 429) {
        logger.barcode.provider(`serpapi: rate limit (429) ${ms}ms`);
      } else {
        logger.barcode.provider(`serpapi: error → ${msg} (${ms}ms)`);
      }
      return null;
    }
  },
};
