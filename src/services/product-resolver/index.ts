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
  
  try {
    // Ejecutar todos los providers en paralelo
    const results = await Promise.allSettled(
      providers.map(provider => provider.search(barcode))
    );

    // Tomar el primer resultado exitoso
    for (let i = 0; i < results.length; i++) {
      const result = results[i];
      if (result.status === 'fulfilled' && result.value) {
        const responseTime = Date.now() - startTime;
        logger.product.info(`Producto resuelto por ${providers[i].name} en ${responseTime}ms`);
        return {
          ...result.value,
          provider_response_time: responseTime
        };
      }
    }

    // Si ningún provider encontró resultados
    const totalTime = Date.now() - startTime;
    logger.product.info(`No se encontró producto para barcode ${barcode} después de ${totalTime}ms`);
    return null;
  } catch (error: any) {
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
