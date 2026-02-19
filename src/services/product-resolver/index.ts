import { ProductProvider, ProductResult } from './types';
import { upcProvider } from './providers/upc.provider';
import { discogsProvider } from './providers/discogs.provider';
import { tiendaProvider } from './providers/tienda.provider';
import { googleProvider } from './providers/google.provider';
import { logger } from '../../utils/logger';

/**
 * Lista de providers disponibles, ordenados por prioridad
 * 
 * Orden de ejecución:
 * 1. upcProvider - Base de datos UPCItemDB (rápido, sin API key)
 * 2. discogsProvider - Especializado en música (requiere API key)
 * 3. googleProvider - Google Custom Search (requiere API key, alta cobertura)
 * 4. tiendaProvider - Placeholder para futuros providers
 */
const providers: ProductProvider[] = [
  upcProvider,
  discogsProvider,
  googleProvider, // Agregado: Google Custom Search
  tiendaProvider
];

/**
 * Resuelve un producto por código de barras consultando múltiples providers en paralelo
 * 
 * @param barcode Código de barras a buscar
 * @returns ProductResult si se encuentra, null si no se encuentra en ningún provider
 */
export async function resolveProduct(barcode: string): Promise<ProductResult | null> {
  const startTime = Date.now();

  logger.barcode.provider(`Iniciando ${providers.length} providers en paralelo: ${providers.map(p => p.name).join(', ')}`);

  try {
    const results = await Promise.allSettled(
      providers.map(provider => provider.search(barcode))
    );

    // Log resultado de cada provider
    for (let i = 0; i < results.length; i++) {
      const name = providers[i].name;
      const result = results[i];
      if (result.status === 'fulfilled') {
        if (result.value) {
          logger.barcode.provider(`${name}: OK → "${result.value.title}"`);
        } else {
          logger.barcode.provider(`${name}: sin resultados`);
        }
      } else {
        logger.barcode.provider(`${name}: error → ${(result.reason as Error)?.message || result.reason}`);
      }
    }

    // Tomar el primer resultado exitoso (prioridad por orden del array)
    for (let i = 0; i < results.length; i++) {
      const result = results[i];
      if (result.status === 'fulfilled' && result.value) {
        const responseTime = Date.now() - startTime;
        logger.barcode.provider(`Usando resultado de ${providers[i].name} (${responseTime}ms total)`);
        logger.product.info(`Producto resuelto por ${providers[i].name} en ${responseTime}ms`);
        return {
          ...result.value,
          provider_response_time: responseTime
        };
      }
    }

    const totalTime = Date.now() - startTime;
    logger.barcode.provider(`Todos los providers terminaron sin resultado (${totalTime}ms)`);
    logger.product.info(`No se encontró producto para barcode ${barcode} después de ${totalTime}ms`);
    return null;
  } catch (error: any) {
    logger.barcode.error(`resolveProduct barcode=${barcode}:`, error?.message || error);
    logger.product.error(`Error crítico en resolveProduct para barcode ${barcode}:`, error);
    return null;
  }
}

/**
 * Valida el formato de un código de barras
 * 
 * @param barcode Código de barras a validar
 * @returns true si el formato es válido
 */
export function validateBarcode(barcode: string): boolean {
  if (!barcode || typeof barcode !== 'string') {
    return false;
  }

  // Remover espacios y guiones
  const cleaned = barcode.replace(/[\s-]/g, '');
  
  // Validar que sea numérico y tenga longitud válida
  if (!/^\d+$/.test(cleaned)) {
    return false;
  }
  
  const length = cleaned.length;
  // EAN-8, UPC-A (12), EAN-13 (13), GTIN-14 (14)
  return length === 8 || length === 12 || length === 13 || length === 14;
}
