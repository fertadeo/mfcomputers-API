import chalk from 'chalk';

/**
 * Logger con colores por tipo de acción para facilitar la visualización en consola.
 * Uso: logger.product.info(), logger.product.warn(), etc.
 */
const product = {
  /** Acciones de actualización (ej. reemplazo de imágenes, guardado) */
  update: (msg: string, ...args: unknown[]) =>
    console.log(chalk.cyan('[ProductService]'), chalk.blue('UPDATE:'), msg, ...args),
  /** Imágenes: cambios en galería, reemplazo, limpieza */
  images: (msg: string, ...args: unknown[]) =>
    console.log(chalk.cyan('[ProductService]'), chalk.magenta('IMAGES:'), msg, ...args),
  /** Sync con WooCommerce */
  sync: (msg: string, ...args: unknown[]) =>
    console.log(chalk.cyan('[ProductService]'), chalk.green('SYNC:'), msg, ...args),
  /** Errores */
  error: (msg: string, ...args: unknown[]) =>
    console.error(chalk.cyan('[ProductService]'), chalk.red('ERROR:'), msg, ...args),
  /** Info general */
  info: (msg: string, ...args: unknown[]) =>
    console.log(chalk.cyan('[ProductService]'), chalk.gray('INFO:'), msg, ...args),
};

export const logger = {
  product,
};
