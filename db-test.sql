-- --------------------------------------------------------
-- Host:                         127.0.0.1
-- Versión del servidor:         8.4.3 - MySQL Community Server - GPL
-- SO del servidor:              Win64
-- HeidiSQL Versión:             12.8.0.6908
-- --------------------------------------------------------

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET NAMES utf8 */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

-- Volcando estructura para tabla mfcomputers.accrued_expenses
CREATE TABLE IF NOT EXISTS `accrued_expenses` (
  `id` int NOT NULL AUTO_INCREMENT,
  `expense_number` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Número de egreso devengado',
  `supplier_id` int DEFAULT NULL COMMENT 'Proveedor relacionado (opcional)',
  `expense_type` enum('compromise','accrual') COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'compromise = compromiso, accrual = devengado',
  `concept` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Concepto del egreso',
  `category` enum('seguro','impuesto','alquiler','servicio','otro') COLLATE utf8mb4_unicode_ci DEFAULT 'otro',
  `amount` decimal(12,2) NOT NULL,
  `accrual_date` date NOT NULL COMMENT 'Fecha de devengamiento',
  `due_date` date DEFAULT NULL COMMENT 'Fecha de vencimiento',
  `payment_date` date DEFAULT NULL COMMENT 'Fecha de pago efectivo',
  `status` enum('pending','paid','cancelled') COLLATE utf8mb4_unicode_ci DEFAULT 'pending',
  `has_invoice` tinyint(1) DEFAULT '0' COMMENT 'Si tiene factura asociada',
  `invoice_id` int DEFAULT NULL COMMENT 'Factura asociada (si existe)',
  `notes` text COLLATE utf8mb4_unicode_ci,
  `created_by` int DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `expense_number` (`expense_number`),
  KEY `invoice_id` (`invoice_id`),
  KEY `created_by` (`created_by`),
  KEY `idx_accrued_expenses_supplier` (`supplier_id`),
  KEY `idx_accrued_expenses_type` (`expense_type`),
  KEY `idx_accrued_expenses_category` (`category`),
  KEY `idx_accrued_expenses_status` (`status`),
  KEY `idx_accrued_expenses_date` (`accrual_date`),
  KEY `idx_accrued_expenses_due` (`due_date`),
  CONSTRAINT `accrued_expenses_ibfk_1` FOREIGN KEY (`supplier_id`) REFERENCES `suppliers` (`id`) ON DELETE SET NULL,
  CONSTRAINT `accrued_expenses_ibfk_2` FOREIGN KEY (`invoice_id`) REFERENCES `supplier_invoices` (`id`) ON DELETE SET NULL,
  CONSTRAINT `accrued_expenses_ibfk_3` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Volcando datos para la tabla mfcomputers.accrued_expenses: ~0 rows (aproximadamente)

-- Volcando estructura para tabla mfcomputers.accrued_liabilities
CREATE TABLE IF NOT EXISTS `accrued_liabilities` (
  `id` int NOT NULL AUTO_INCREMENT,
  `liability_number` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Número de pasivo',
  `liability_type` enum('impuesto','alquiler','seguro','servicio','prestamo','otro') COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `amount` decimal(12,2) NOT NULL,
  `accrual_date` date NOT NULL COMMENT 'Fecha de devengamiento',
  `due_date` date NOT NULL COMMENT 'Fecha de vencimiento',
  `payment_date` date DEFAULT NULL COMMENT 'Fecha de pago',
  `status` enum('pending','partial_paid','paid','overdue','cancelled') COLLATE utf8mb4_unicode_ci DEFAULT 'pending',
  `paid_amount` decimal(12,2) DEFAULT '0.00',
  `remaining_amount` decimal(12,2) NOT NULL COMMENT 'Monto pendiente',
  `treasury_account_id` int DEFAULT NULL COMMENT 'Cuenta de tesorería relacionada',
  `payment_id` int DEFAULT NULL COMMENT 'Pago relacionado (si se pagó desde tesorería)',
  `notes` text COLLATE utf8mb4_unicode_ci,
  `created_by` int DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `liability_number` (`liability_number`),
  KEY `created_by` (`created_by`),
  KEY `idx_accrued_liabilities_type` (`liability_type`),
  KEY `idx_accrued_liabilities_status` (`status`),
  KEY `idx_accrued_liabilities_accrual_date` (`accrual_date`),
  KEY `idx_accrued_liabilities_due_date` (`due_date`),
  KEY `idx_accrued_liabilities_payment` (`payment_date`),
  CONSTRAINT `accrued_liabilities_ibfk_1` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Volcando datos para la tabla mfcomputers.accrued_liabilities: ~0 rows (aproximadamente)

-- Volcando estructura para tabla mfcomputers.accrued_liability_payments
CREATE TABLE IF NOT EXISTS `accrued_liability_payments` (
  `id` int NOT NULL AUTO_INCREMENT,
  `liability_id` int NOT NULL,
  `payment_id` int NOT NULL COMMENT 'Pago desde tesorería',
  `amount` decimal(12,2) NOT NULL COMMENT 'Monto del pago aplicado',
  `payment_date` date NOT NULL,
  `notes` text COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_liability_payments_liability` (`liability_id`),
  KEY `idx_liability_payments_payment` (`payment_id`),
  CONSTRAINT `accrued_liability_payments_ibfk_1` FOREIGN KEY (`liability_id`) REFERENCES `accrued_liabilities` (`id`) ON DELETE CASCADE,
  CONSTRAINT `accrued_liability_payments_ibfk_2` FOREIGN KEY (`payment_id`) REFERENCES `payments` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Volcando datos para la tabla mfcomputers.accrued_liability_payments: ~0 rows (aproximadamente)

-- Volcando estructura para tabla mfcomputers.api_keys
CREATE TABLE IF NOT EXISTS `api_keys` (
  `id` int NOT NULL AUTO_INCREMENT,
  `key_name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `api_key` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `key_hash` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `created_by` int DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT '1',
  `last_used_at` timestamp NULL DEFAULT NULL,
  `expires_at` timestamp NULL DEFAULT NULL,
  `rate_limit_per_minute` int DEFAULT '60',
  `rate_limit_per_hour` int DEFAULT '1000',
  `allowed_ips` text COLLATE utf8mb4_unicode_ci,
  `metadata` json DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `api_key` (`api_key`),
  KEY `idx_api_key` (`api_key`),
  KEY `idx_key_hash` (`key_hash`),
  KEY `idx_is_active` (`is_active`),
  KEY `idx_created_by` (`created_by`),
  KEY `idx_expires_at` (`expires_at`),
  CONSTRAINT `api_keys_ibfk_1` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Volcando datos para la tabla mfcomputers.api_keys: ~2 rows (aproximadamente)
INSERT INTO `api_keys` (`id`, `key_name`, `api_key`, `key_hash`, `description`, `created_by`, `is_active`, `last_used_at`, `expires_at`, `rate_limit_per_minute`, `rate_limit_per_hour`, `allowed_ips`, `metadata`, `created_at`, `updated_at`) VALUES
	(1, 'n8n WooCommerce Sync', '${n8nKey}', '${n8nHash}', 'API Key para sincronización automática de productos desde WooCommerce mayorista con n8n', NULL, 1, NULL, NULL, 60, 1000, NULL, '{"store": "mayorista", "purpose": "woocommerce_product_sync", "integration": "n8n"}', '2025-11-21 02:28:00', '2025-11-21 02:28:00'),
	(2, 'Monday.com Integration', '${mondayKey}', '${mondayHash}', 'API Key para integración con Monday.com. Permite sincronización de datos entre el ERP y Monday.com para gestión de proyectos y tareas.', NULL, 1, NULL, '2027-01-01 02:59:59', 60, 1000, NULL, '{"notes": "Vence el 31/12/2026 - Notificar al integrador 30 días antes para renovación", "company": "Monday.com", "contact": "integrador@monday.com", "purpose": "project_management_sync", "integration": "monday", "review_date": "2026-11-30"}', '2025-11-21 02:28:01', '2025-11-21 02:28:01');

-- Volcando estructura para tabla mfcomputers.api_key_logs
CREATE TABLE IF NOT EXISTS `api_key_logs` (
  `id` int NOT NULL AUTO_INCREMENT,
  `api_key_id` int NOT NULL,
  `endpoint` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `method` varchar(10) COLLATE utf8mb4_unicode_ci NOT NULL,
  `ip_address` varchar(45) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `user_agent` text COLLATE utf8mb4_unicode_ci,
  `response_status` int DEFAULT NULL,
  `response_time_ms` int DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_api_key_id` (`api_key_id`),
  KEY `idx_created_at` (`created_at`),
  KEY `idx_endpoint` (`endpoint`),
  CONSTRAINT `api_key_logs_ibfk_1` FOREIGN KEY (`api_key_id`) REFERENCES `api_keys` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Volcando datos para la tabla mfcomputers.api_key_logs: ~0 rows (aproximadamente)

-- Volcando estructura para tabla mfcomputers.budgets
CREATE TABLE IF NOT EXISTS `budgets` (
  `id` int NOT NULL AUTO_INCREMENT,
  `budget_number` varchar(20) NOT NULL,
  `client_id` int NOT NULL,
  `status` enum('draft','sent','approved','rejected','expired') DEFAULT 'draft',
  `total_amount` decimal(10,2) NOT NULL DEFAULT '0.00',
  `valid_until` date DEFAULT NULL,
  `notes` text,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `budget_number` (`budget_number`),
  KEY `client_id` (`client_id`),
  CONSTRAINT `budgets_ibfk_1` FOREIGN KEY (`client_id`) REFERENCES `clients` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Volcando datos para la tabla mfcomputers.budgets: ~0 rows (aproximadamente)

-- Volcando estructura para tabla mfcomputers.budget_items
CREATE TABLE IF NOT EXISTS `budget_items` (
  `id` int NOT NULL AUTO_INCREMENT,
  `budget_id` int NOT NULL,
  `product_id` int NOT NULL,
  `quantity` int NOT NULL,
  `unit_price` decimal(10,2) NOT NULL,
  `total_price` decimal(10,2) NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `budget_id` (`budget_id`),
  KEY `product_id` (`product_id`),
  CONSTRAINT `budget_items_ibfk_1` FOREIGN KEY (`budget_id`) REFERENCES `budgets` (`id`) ON DELETE CASCADE,
  CONSTRAINT `budget_items_ibfk_2` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Volcando datos para la tabla mfcomputers.budget_items: ~0 rows (aproximadamente)

-- Volcando estructura para tabla mfcomputers.categories
CREATE TABLE IF NOT EXISTS `categories` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(50) NOT NULL,
  `description` text,
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Volcando datos para la tabla mfcomputers.categories: ~0 rows (aproximadamente)

-- Volcando estructura para tabla mfcomputers.clients
CREATE TABLE IF NOT EXISTS `clients` (
  `id` int NOT NULL AUTO_INCREMENT,
  `code` varchar(20) NOT NULL,
  `client_type` enum('mayorista','minorista','personalizado') DEFAULT 'minorista',
  `sales_channel` enum('woocommerce_minorista','woocommerce_mayorista','mercadolibre','manual','otro') DEFAULT 'manual',
  `name` varchar(100) NOT NULL,
  `email` varchar(100) DEFAULT NULL,
  `phone` varchar(20) DEFAULT NULL,
  `address` text,
  `city` varchar(50) DEFAULT NULL,
  `country` varchar(50) DEFAULT 'Argentina',
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `code` (`code`),
  KEY `idx_clients_type` (`client_type`),
  KEY `idx_clients_type_code` (`client_type`,`code`),
  KEY `idx_clients_sales_channel` (`sales_channel`)
) ENGINE=InnoDB AUTO_INCREMENT=24 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Volcando datos para la tabla mfcomputers.clients: ~18 rows (aproximadamente)
INSERT INTO `clients` (`id`, `code`, `client_type`, `sales_channel`, `name`, `email`, `phone`, `address`, `city`, `country`, `is_active`, `created_at`, `updated_at`) VALUES
	(1, 'C0001', 'minorista', 'manual', 'Cliente Demo 1', 'c1@demo.com', '1111-1111', NULL, NULL, 'Argentina', 1, '2025-10-20 22:15:07', '2025-10-20 22:15:07'),
	(2, 'CLI002', 'mayorista', 'woocommerce_minorista', 'Fernando prueba', 'fernandotadeos@gmail.com', '+543541222719', '', 'Rio Cuarto', 'Argentina', 1, '2025-09-08 19:13:59', '2025-10-13 01:21:41'),
	(3, 'CLI003', 'minorista', 'woocommerce_mayorista', 'Juan Pérez', 'juan.perez@gmail.com', '+54 11 5555-1234', 'Mitre 890', 'Rosario', 'Argentina', 0, '2025-09-08 19:13:59', '2025-10-13 01:21:45'),
	(4, 'CLI004', 'mayorista', 'mercadolibre', 'Distribuidora Central', 'compras@distribuidora.com.ar', '+54 11 9999-8888', 'Belgrano 456', 'Mendoza', 'Argentina', 1, '2025-09-08 19:13:59', '2025-10-13 01:21:49'),
	(5, 'CLI005', 'minorista', 'manual', 'Ana Rodríguez', 'ana.rodriguez@hotmail.com', '+54 11 7777-2222', 'Rivadavia 123', 'La Plata', 'Argentina', 1, '2025-09-08 19:13:59', '2025-10-13 01:21:52'),
	(6, 'CLI006', 'mayorista', 'mercadolibre', 'Ferretería Central', 'info@ferreteriacentral.com', '+54 11 3333-4444', 'Independencia 789', 'Tucumán', 'Argentina', 1, '2025-09-08 19:13:59', '2025-10-13 01:21:57'),
	(7, 'CLI007', 'minorista', 'manual', 'Carlos Mendoza', 'carlos.mendoza@yahoo.com', '+54 11 6666-7777', 'Sarmiento 321', 'Salta', 'Argentina', 0, '2025-09-08 19:13:59', '2025-09-08 19:13:59'),
	(8, 'CLI008', 'mayorista', 'mercadolibre', 'Electrodomésticos Sur', 'ventas@electrosur.com', '+54 11 2222-3333', 'Maipú 654', 'Neuquén', 'Argentina', 1, '2025-09-08 19:13:59', '2025-10-13 01:22:00'),
	(9, 'CLI009', 'minorista', 'manual', 'Laura Fernández', 'laura.fernandez@gmail.com', '+54 11 8888-9999', 'Moreno 987', 'Mar del Plata', 'Argentina', 1, '2025-09-08 19:13:59', '2025-09-08 19:13:59'),
	(10, 'CLI010', 'mayorista', 'manual', 'Mayorista Central', 'pedidos@mayorista.com', '+54 11 1111-2222', 'Pellegrini 147', 'Resistencia', 'Argentina', 1, '2025-09-08 19:13:59', '2025-09-13 23:48:49'),
	(11, 'CLI011', 'minorista', 'manual', 'Roberto Silva', 'roberto.silva@outlook.com', '+54 11 4444-5555', 'Urquiza 258', 'Paraná', 'Argentina', 1, '2025-09-08 19:13:59', '2025-09-08 19:13:59'),
	(12, 'CLI012', 'mayorista', 'manual', 'Casa de Ventilación', 'contacto@casaventilacion.com', '+54 11 7777-8888', 'Lavalle 369', 'Santa Fe', 'Argentina', 1, '2025-09-08 19:13:59', '2025-09-13 23:48:45'),
	(13, 'CLI013', 'minorista', 'manual', 'Patricia López', 'patricia.lopez@gmail.com', '+54 11 9999-1111', 'Alsina 741', 'Bahía Blanca', 'Argentina', 0, '2025-09-08 19:13:59', '2025-09-08 19:13:59'),
	(14, 'CLI014', 'mayorista', 'manual', 'Climatización Integral', 'info@climaintegral.com', '+54 11 5555-6666', 'Catamarca 852', 'Formosa', 'Argentina', 1, '2025-09-08 19:13:59', '2025-09-13 23:48:43'),
	(15, 'CLI015', 'minorista', 'manual', 'Miguel Torres', 'miguel.torres@hotmail.com', '+54 11 3333-7777', 'Jujuy 963', 'Posadas', 'Argentina', 1, '2025-09-08 19:13:59', '2025-09-08 19:13:59'),
	(18, 'MAY002', 'mayorista', 'manual', 'José Caffaratti', 'fernandotadeos@gmail.com', '+543541222719', 'Av. Guillermo Marconi 650', 'Rio Cuarto', 'Argentina', 1, '2025-09-14 01:57:21', '2025-09-14 01:57:21'),
	(19, 'CLI-TEST-001', 'minorista', 'manual', 'Cliente de Prueba SA', 'cliente.prueba@example.com', '+54 11 1234-5678', 'Av. Corrientes 1234', 'Buenos Aires', 'Argentina', 1, '2025-10-12 23:50:36', '2025-10-12 23:50:36'),
	(23, 'MAY003', 'mayorista', 'woocommerce_mayorista', 'Juan Pérez', 'cliente@example.com', '11-1234-5678', 'Av. Corrientes 1234', 'CABA', 'Argentina', 1, '2025-11-13 23:35:36', '2025-11-13 23:35:36');

-- Volcando estructura para tabla mfcomputers.delivery_zones
CREATE TABLE IF NOT EXISTS `delivery_zones` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  `description` text,
  `city` varchar(50) DEFAULT NULL,
  `province` varchar(50) DEFAULT NULL,
  `postal_codes` json DEFAULT NULL,
  `delivery_time_days` int DEFAULT '1',
  `delivery_cost` decimal(10,2) DEFAULT '0.00',
  `free_delivery_minimum` decimal(10,2) DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Volcando datos para la tabla mfcomputers.delivery_zones: ~4 rows (aproximadamente)
INSERT INTO `delivery_zones` (`id`, `name`, `description`, `city`, `province`, `postal_codes`, `delivery_time_days`, `delivery_cost`, `free_delivery_minimum`, `is_active`, `created_at`, `updated_at`) VALUES
	(1, 'Capital Federal', 'Ciudad Autónoma de Buenos Aires', 'CABA', 'CABA', '["1000", "1100", "1200", "1300", "1400", "1500", "1600", "1700", "1800", "1900"]', 1, 500.00, 5000.00, 1, '2025-10-12 23:51:02', '2025-10-12 23:51:02'),
	(2, 'GBA Norte', 'Gran Buenos Aires - Zona Norte', 'San Isidro', 'Buenos Aires', '["1600", "1610", "1615", "1620", "1625", "1630", "1635", "1640"]', 2, 800.00, 8000.00, 1, '2025-10-12 23:51:02', '2025-10-12 23:51:02'),
	(3, 'GBA Sur', 'Gran Buenos Aires - Zona Sur', 'Avellaneda', 'Buenos Aires', '["1870", "1875", "1880", "1885", "1890", "1895", "1900"]', 2, 800.00, 8000.00, 1, '2025-10-12 23:51:02', '2025-10-12 23:51:02'),
	(4, 'GBA Oeste', 'Gran Buenos Aires - Zona Oeste', 'La Matanza', 'Buenos Aires', '["1700", "1702", "1704", "1706", "1708", "1710"]', 2, 800.00, 8000.00, 1, '2025-10-12 23:51:02', '2025-10-12 23:51:02');

-- Volcando estructura para tabla mfcomputers.logistics_config
CREATE TABLE IF NOT EXISTS `logistics_config` (
  `id` int NOT NULL AUTO_INCREMENT,
  `config_key` varchar(100) NOT NULL,
  `config_value` text,
  `config_type` enum('string','number','boolean','json') DEFAULT 'string',
  `description` text,
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `config_key` (`config_key`)
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Volcando datos para la tabla mfcomputers.logistics_config: ~8 rows (aproximadamente)
INSERT INTO `logistics_config` (`id`, `config_key`, `config_value`, `config_type`, `description`, `is_active`, `created_at`, `updated_at`) VALUES
	(1, 'auto_generate_remito', 'true', 'boolean', 'Generar remitos automáticamente al aprobar pedidos', 1, '2025-10-12 23:51:02', '2025-10-12 23:51:02'),
	(2, 'require_signature', 'true', 'boolean', 'Requerir firma digital en entregas', 1, '2025-10-12 23:51:02', '2025-10-12 23:51:02'),
	(3, 'tracking_enabled', 'true', 'boolean', 'Habilitar seguimiento GPS de entregas', 1, '2025-10-12 23:51:02', '2025-10-12 23:51:02'),
	(4, 'auto_update_stock', 'true', 'boolean', 'Actualizar stock automáticamente con remitos', 1, '2025-10-12 23:51:02', '2025-10-12 23:51:02'),
	(5, 'default_transport_company', '1', 'number', 'Empresa de transporte por defecto', 1, '2025-10-12 23:51:02', '2025-10-12 23:51:02'),
	(6, 'remito_number_prefix', 'REM', 'string', 'Prefijo para numeración de remitos', 1, '2025-10-12 23:51:02', '2025-10-12 23:51:02'),
	(7, 'max_delivery_days', '7', 'number', 'Máximo días para entrega antes de alerta', 1, '2025-10-12 23:51:02', '2025-10-12 23:51:02'),
	(8, 'quality_check_required', 'true', 'boolean', 'Requerir control de calidad antes del despacho', 1, '2025-10-12 23:51:02', '2025-10-12 23:51:02');

-- Volcando estructura para tabla mfcomputers.orders
CREATE TABLE IF NOT EXISTS `orders` (
  `id` int NOT NULL AUTO_INCREMENT,
  `order_number` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `client_id` int NOT NULL,
  `status` enum('pendiente_preparacion','listo_despacho','pagado','aprobado','en_proceso','completado','cancelado') COLLATE utf8mb4_unicode_ci DEFAULT 'pendiente_preparacion',
  `total_amount` decimal(12,2) NOT NULL DEFAULT '0.00',
  `order_date` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `delivery_date` timestamp NULL DEFAULT NULL,
  `delivery_address` text COLLATE utf8mb4_unicode_ci,
  `delivery_city` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `delivery_contact` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `delivery_phone` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `transport_company` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `transport_cost` decimal(10,2) DEFAULT '0.00',
  `notes` text COLLATE utf8mb4_unicode_ci,
  `remito_status` enum('sin_remito','remito_generado','remito_despachado','remito_entregado') COLLATE utf8mb4_unicode_ci DEFAULT 'sin_remito',
  `stock_reserved` tinyint(1) DEFAULT '0',
  `is_active` tinyint(1) DEFAULT '1',
  `created_by` int DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `order_number` (`order_number`),
  KEY `idx_order_number` (`order_number`),
  KEY `idx_client_id` (`client_id`),
  KEY `idx_status` (`status`),
  KEY `idx_remito_status` (`remito_status`),
  KEY `idx_order_date` (`order_date`),
  KEY `idx_stock_reserved` (`stock_reserved`),
  KEY `orders_ibfk_2` (`created_by`),
  CONSTRAINT `orders_ibfk_1` FOREIGN KEY (`client_id`) REFERENCES `clients` (`id`),
  CONSTRAINT `orders_ibfk_2` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Volcando datos para la tabla mfcomputers.orders: ~6 rows (aproximadamente)
INSERT INTO `orders` (`id`, `order_number`, `client_id`, `status`, `total_amount`, `order_date`, `delivery_date`, `delivery_address`, `delivery_city`, `delivery_contact`, `delivery_phone`, `transport_company`, `transport_cost`, `notes`, `remito_status`, `stock_reserved`, `is_active`, `created_by`, `created_at`, `updated_at`) VALUES
	(1, 'ORD-202510-0954', 19, 'pendiente_preparacion', 0.00, '2025-10-12 23:56:23', '2025-10-19 23:56:23', 'Av. Corrientes 1234, Piso 3', 'Buenos Aires', 'Juan Pérez', '+54 11 1234-5678', 'OCA', 2500.00, 'Pedido de prueba - Entregar en horario de oficina (9-18hs)', 'sin_remito', 0, 1, 2, '2025-10-12 23:56:23', '2025-10-12 23:56:23'),
	(2, 'ORD-202510-0767', 19, 'pendiente_preparacion', 347300.00, '2025-10-13 00:03:29', '2025-10-20 00:03:29', 'Av. Corrientes 1234, Piso 3', 'Buenos Aires', 'Juan Pérez', '+54 11 1234-5678', 'OCA', 2500.00, 'Pedido de prueba - Entregar en horario de oficina (9-18hs)', 'sin_remito', 0, 1, 2, '2025-10-13 00:03:29', '2025-10-13 00:03:29'),
	(3, 'ORD-1001', 1, 'aprobado', 125000.00, '2025-10-20 22:15:07', NULL, NULL, NULL, NULL, NULL, NULL, 0.00, 'Venta mayorista - contado', 'sin_remito', 0, 1, NULL, '2025-10-20 22:15:07', '2025-10-20 22:15:07'),
	(4, 'ORD-1002', 2, 'pagado', 84500.00, '2025-10-18 22:15:07', NULL, NULL, NULL, NULL, NULL, NULL, 0.00, 'Venta consumo final - tarjeta', 'sin_remito', 0, 1, NULL, '2025-10-20 22:15:07', '2025-10-20 22:15:07'),
	(5, 'ORD-1003', 1, 'completado', 54000.00, '2025-10-05 22:15:07', NULL, NULL, NULL, NULL, NULL, NULL, 0.00, 'Venta transferencia', 'sin_remito', 0, 1, NULL, '2025-10-20 22:15:07', '2025-10-20 22:15:07'),
	(6, 'ORD-1004', 1, 'pendiente_preparacion', 0.00, '2025-10-22 03:33:29', '2025-10-22 03:33:32', 'Av. Colon 1494', 'Cordoba', 'Fernando Tadeo', '3541222719', 'Retiro en local', 0.00, NULL, 'sin_remito', 0, 1, NULL, '2025-10-22 03:34:27', '2025-10-22 03:34:27');

-- Volcando estructura para tabla mfcomputers.orders_config
CREATE TABLE IF NOT EXISTS `orders_config` (
  `id` int NOT NULL AUTO_INCREMENT,
  `config_key` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `config_value` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `config_type` enum('string','number','boolean','json') COLLATE utf8mb4_unicode_ci DEFAULT 'string',
  `description` text COLLATE utf8mb4_unicode_ci,
  `is_active` tinyint(1) DEFAULT '1',
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `config_key` (`config_key`)
) ENGINE=InnoDB AUTO_INCREMENT=34 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Volcando datos para la tabla mfcomputers.orders_config: ~8 rows (aproximadamente)
INSERT INTO `orders_config` (`id`, `config_key`, `config_value`, `config_type`, `description`, `is_active`, `updated_at`) VALUES
	(1, 'auto_generate_order_number', 'true', 'boolean', 'Generar número de pedido automáticamente', 1, '2025-10-12 23:51:40'),
	(2, 'require_stock_before_approval', 'true', 'boolean', 'Requerir stock disponible antes de aprobar pedido', 1, '2025-10-12 23:51:40'),
	(3, 'auto_reserve_stock_on_approval', 'true', 'boolean', 'Reservar stock automáticamente al aprobar pedido', 1, '2025-10-12 23:51:40'),
	(4, 'auto_generate_remito_on_ready', 'true', 'boolean', 'Generar remito automáticamente cuando pedido está listo', 1, '2025-10-12 23:51:40'),
	(5, 'default_transport_company', 'OCA', 'string', 'Empresa de transporte predeterminada', 1, '2025-10-12 23:51:40'),
	(6, 'days_to_complete_order', '7', 'number', 'Días para completar un pedido', 1, '2025-10-12 23:51:40'),
	(7, 'notify_client_on_status_change', 'true', 'boolean', 'Notificar cliente al cambiar estado', 1, '2025-10-12 23:51:40'),
	(8, 'notify_logistics_on_ready', 'true', 'boolean', 'Notificar logística cuando pedido está listo', 1, '2025-10-12 23:51:40');

-- Volcando estructura para tabla mfcomputers.order_items
CREATE TABLE IF NOT EXISTS `order_items` (
  `id` int NOT NULL AUTO_INCREMENT,
  `order_id` int NOT NULL,
  `product_id` int NOT NULL,
  `quantity` int NOT NULL,
  `unit_price` decimal(10,2) NOT NULL,
  `total_price` decimal(10,2) NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `batch_number` varchar(50) DEFAULT NULL,
  `notes` text,
  `stock_reserved` tinyint(1) DEFAULT '0',
  PRIMARY KEY (`id`),
  KEY `order_id` (`order_id`),
  KEY `product_id` (`product_id`),
  CONSTRAINT `order_items_ibfk_1` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`) ON DELETE CASCADE,
  CONSTRAINT `order_items_ibfk_2` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Volcando datos para la tabla mfcomputers.order_items: ~4 rows (aproximadamente)
INSERT INTO `order_items` (`id`, `order_id`, `product_id`, `quantity`, `unit_price`, `total_price`, `created_at`, `batch_number`, `notes`, `stock_reserved`) VALUES
	(1, 2, 11, 5, 15500.00, 77500.00, '2025-10-13 00:03:29', NULL, 'Color negro', 0),
	(2, 2, 12, 3, 22800.00, 68400.00, '2025-10-13 00:03:29', NULL, 'Con garantía extendida', 0),
	(3, 2, 13, 10, 12300.00, 123000.00, '2025-10-13 00:03:29', NULL, NULL, 0),
	(4, 2, 14, 8, 9800.00, 78400.00, '2025-10-13 00:03:29', NULL, 'Con control remoto incluido', 0);

-- Volcando estructura para tabla mfcomputers.order_status_history
CREATE TABLE IF NOT EXISTS `order_status_history` (
  `id` int NOT NULL AUTO_INCREMENT,
  `order_id` int NOT NULL,
  `previous_status` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `new_status` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `changed_by` int DEFAULT NULL,
  `change_reason` text COLLATE utf8mb4_unicode_ci,
  `changed_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `changed_by` (`changed_by`),
  KEY `idx_order_id` (`order_id`),
  KEY `idx_changed_at` (`changed_at`),
  CONSTRAINT `order_status_history_ibfk_1` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`) ON DELETE CASCADE,
  CONSTRAINT `order_status_history_ibfk_2` FOREIGN KEY (`changed_by`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Volcando datos para la tabla mfcomputers.order_status_history: ~0 rows (aproximadamente)

-- Volcando estructura para tabla mfcomputers.payments
CREATE TABLE IF NOT EXISTS `payments` (
  `id` int NOT NULL AUTO_INCREMENT,
  `type` enum('income','outflow') COLLATE utf8mb4_unicode_ci NOT NULL,
  `method` enum('efectivo','tarjeta','transferencia') COLLATE utf8mb4_unicode_ci NOT NULL,
  `amount` decimal(12,2) NOT NULL,
  `currency` varchar(10) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'ARS',
  `payment_date` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `status` enum('draft','posted','void') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'posted',
  `payee_type` enum('supplier','employee','other','client') COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `payee_id` int DEFAULT NULL,
  `payee_name` varchar(200) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `related_type` enum('order','purchase','expense','payroll') COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `related_id` int DEFAULT NULL,
  `invoice_id` int DEFAULT NULL COMMENT 'Vinculación directa a factura de proveedor',
  `accrued_expense_id` int DEFAULT NULL COMMENT 'Egreso devengado relacionado',
  `is_partial_payment` tinyint(1) DEFAULT '0',
  `remaining_amount` decimal(12,2) DEFAULT NULL COMMENT 'Monto restante de la factura',
  `notes` text COLLATE utf8mb4_unicode_ci,
  `created_by` int DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_payment_date` (`payment_date`),
  KEY `idx_payment_method` (`method`),
  KEY `idx_payment_type` (`type`),
  KEY `idx_related` (`related_type`,`related_id`),
  KEY `idx_payee` (`payee_type`,`payee_id`),
  KEY `created_by` (`created_by`),
  KEY `idx_payments_invoice` (`invoice_id`),
  KEY `payments_ibfk_accrued_expense` (`accrued_expense_id`),
  CONSTRAINT `payments_ibfk_1` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`),
  CONSTRAINT `payments_ibfk_accrued_expense` FOREIGN KEY (`accrued_expense_id`) REFERENCES `accrued_expenses` (`id`) ON DELETE SET NULL,
  CONSTRAINT `payments_ibfk_invoice` FOREIGN KEY (`invoice_id`) REFERENCES `supplier_invoices` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Volcando datos para la tabla mfcomputers.payments: ~0 rows (aproximadamente)

-- Volcando estructura para tabla mfcomputers.permissions
CREATE TABLE IF NOT EXISTS `permissions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `code` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Código único del permiso (ej: products.create, orders.view)',
  `module` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Módulo al que pertenece (products, orders, purchases, etc)',
  `description` text COLLATE utf8mb4_unicode_ci,
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `name` (`name`),
  UNIQUE KEY `code` (`code`),
  KEY `idx_module` (`module`),
  KEY `idx_code` (`code`)
) ENGINE=InnoDB AUTO_INCREMENT=51 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Volcando datos para la tabla mfcomputers.permissions: ~50 rows (aproximadamente)
INSERT INTO `permissions` (`id`, `name`, `code`, `module`, `description`, `is_active`, `created_at`, `updated_at`) VALUES
	(1, 'Ver productos', 'products.view', 'products', 'Permite ver el listado y detalles de productos', 1, '2025-11-04 00:34:26', '2025-11-04 00:34:26'),
	(2, 'Crear productos', 'products.create', 'products', 'Permite crear nuevos productos', 1, '2025-11-04 00:34:26', '2025-11-04 00:34:26'),
	(3, 'Actualizar productos', 'products.update', 'products', 'Permite modificar productos existentes', 1, '2025-11-04 00:34:26', '2025-11-04 00:34:26'),
	(4, 'Eliminar productos', 'products.delete', 'products', 'Permite eliminar productos (soft delete)', 1, '2025-11-04 00:34:26', '2025-11-04 00:34:26'),
	(5, 'Eliminación permanente de productos', 'products.delete_permanent', 'products', 'Permite eliminar productos permanentemente de la base de datos', 1, '2025-11-04 00:34:26', '2025-11-04 00:34:26'),
	(6, 'Gestionar stock', 'products.manage_stock', 'products', 'Permite actualizar el stock de productos', 1, '2025-11-04 00:34:26', '2025-11-04 00:34:26'),
	(7, 'Ver estadísticas de productos', 'products.view_stats', 'products', 'Permite ver estadísticas del módulo de productos', 1, '2025-11-04 00:34:26', '2025-11-04 00:34:26'),
	(8, 'Ver pedidos', 'orders.view', 'orders', 'Permite ver el listado y detalles de pedidos', 1, '2025-11-04 00:34:26', '2025-11-04 00:34:26'),
	(9, 'Crear pedidos', 'orders.create', 'orders', 'Permite crear nuevos pedidos', 1, '2025-11-04 00:34:26', '2025-11-04 00:34:26'),
	(10, 'Actualizar pedidos', 'orders.update', 'orders', 'Permite modificar pedidos existentes', 1, '2025-11-04 00:34:26', '2025-11-04 00:34:26'),
	(11, 'Eliminar pedidos', 'orders.delete', 'orders', 'Permite eliminar pedidos', 1, '2025-11-04 00:34:26', '2025-11-04 00:34:26'),
	(12, 'Ver estadísticas de pedidos', 'orders.view_stats', 'orders', 'Permite ver estadísticas del módulo de pedidos', 1, '2025-11-04 00:34:26', '2025-11-04 00:34:26'),
	(13, 'Reservar stock', 'orders.reserve_stock', 'orders', 'Permite reservar stock para pedidos', 1, '2025-11-04 00:34:26', '2025-11-04 00:34:26'),
	(14, 'Actualizar estado de remito', 'orders.update_remito_status', 'orders', 'Permite actualizar el estado de remito de pedidos', 1, '2025-11-04 00:34:26', '2025-11-04 00:34:26'),
	(15, 'Ver compras', 'purchases.view', 'purchases', 'Permite ver el listado y detalles de compras', 1, '2025-11-04 00:34:26', '2025-11-04 00:34:26'),
	(16, 'Crear compras', 'purchases.create', 'purchases', 'Permite crear nuevas compras', 1, '2025-11-04 00:34:26', '2025-11-04 00:34:26'),
	(17, 'Actualizar compras', 'purchases.update', 'purchases', 'Permite modificar compras existentes', 1, '2025-11-04 00:34:26', '2025-11-04 00:34:26'),
	(18, 'Eliminar compras', 'purchases.delete', 'purchases', 'Permite eliminar compras', 1, '2025-11-04 00:34:26', '2025-11-04 00:34:26'),
	(19, 'Ver estadísticas de compras', 'purchases.view_stats', 'purchases', 'Permite ver estadísticas del módulo de compras', 1, '2025-11-04 00:34:26', '2025-11-04 00:34:26'),
	(20, 'Gestionar items de compra', 'purchases.manage_items', 'purchases', 'Permite gestionar items de compras', 1, '2025-11-04 00:34:26', '2025-11-04 00:34:26'),
	(21, 'Gestionar proveedores', 'purchases.manage_suppliers', 'purchases', 'Permite gestionar proveedores', 1, '2025-11-04 00:34:26', '2025-11-04 00:34:26'),
	(22, 'Ver clientes', 'clients.view', 'clients', 'Permite ver el listado y detalles de clientes', 1, '2025-11-04 00:34:27', '2025-11-04 00:34:27'),
	(23, 'Crear clientes', 'clients.create', 'clients', 'Permite crear nuevos clientes', 1, '2025-11-04 00:34:27', '2025-11-04 00:34:27'),
	(24, 'Actualizar clientes', 'clients.update', 'clients', 'Permite modificar clientes existentes', 1, '2025-11-04 00:34:27', '2025-11-04 00:34:27'),
	(25, 'Eliminar clientes', 'clients.delete', 'clients', 'Permite eliminar clientes', 1, '2025-11-04 00:34:27', '2025-11-04 00:34:27'),
	(26, 'Ver estadísticas de clientes', 'clients.view_stats', 'clients', 'Permite ver estadísticas del módulo de clientes', 1, '2025-11-04 00:34:27', '2025-11-04 00:34:27'),
	(27, 'Ver resumen de caja', 'cash.view', 'cash', 'Permite ver resúmenes de caja (día, período, mensual)', 1, '2025-11-04 00:34:27', '2025-11-04 00:34:27'),
	(28, 'Gestionar gastos', 'cash.manage_expenses', 'cash', 'Permite crear y gestionar gastos operativos', 1, '2025-11-04 00:34:27', '2025-11-04 00:34:27'),
	(29, 'Exportar movimientos', 'cash.export', 'cash', 'Permite exportar movimientos de caja', 1, '2025-11-04 00:34:27', '2025-11-04 00:34:27'),
	(30, 'Ver pagos', 'payments.view', 'payments', 'Permite ver el listado y detalles de pagos', 1, '2025-11-04 00:34:27', '2025-11-04 00:34:27'),
	(31, 'Crear pagos', 'payments.create', 'payments', 'Permite crear nuevos pagos', 1, '2025-11-04 00:34:27', '2025-11-04 00:34:27'),
	(32, 'Actualizar pagos', 'payments.update', 'payments', 'Permite modificar pagos existentes', 1, '2025-11-04 00:34:27', '2025-11-04 00:34:27'),
	(33, 'Eliminar pagos', 'payments.delete', 'payments', 'Permite eliminar pagos', 1, '2025-11-04 00:34:27', '2025-11-04 00:34:27'),
	(34, 'Ver dashboard', 'dashboard.view', 'dashboard', 'Permite acceder al dashboard principal', 1, '2025-11-04 00:34:27', '2025-11-04 00:34:27'),
	(35, 'Ver estadísticas del dashboard', 'dashboard.view_stats', 'dashboard', 'Permite ver estadísticas en el dashboard', 1, '2025-11-04 00:34:27', '2025-11-04 00:34:27'),
	(36, 'Ver actividades recientes', 'dashboard.view_activities', 'dashboard', 'Permite ver actividades recientes en el dashboard', 1, '2025-11-04 00:34:27', '2025-11-04 00:34:27'),
	(37, 'Ver remitos', 'logistics.view_remitos', 'logistics', 'Permite ver remitos de logística', 1, '2025-11-04 00:34:27', '2025-11-04 00:34:27'),
	(38, 'Crear remitos', 'logistics.create_remitos', 'logistics', 'Permite crear nuevos remitos', 1, '2025-11-04 00:34:27', '2025-11-04 00:34:27'),
	(39, 'Actualizar remitos', 'logistics.update_remitos', 'logistics', 'Permite modificar remitos', 1, '2025-11-04 00:34:27', '2025-11-04 00:34:27'),
	(40, 'Eliminar remitos', 'logistics.delete_remitos', 'logistics', 'Permite eliminar remitos', 1, '2025-11-04 00:34:27', '2025-11-04 00:34:27'),
	(41, 'Gestionar estados de remitos', 'logistics.manage_remito_status', 'logistics', 'Permite cambiar estados de remitos (preparar, despachar, entregar)', 1, '2025-11-04 00:34:27', '2025-11-04 00:34:27'),
	(42, 'Ver trazabilidad', 'logistics.view_trazabilidad', 'logistics', 'Permite ver trazabilidad de remitos', 1, '2025-11-04 00:34:27', '2025-11-04 00:34:27'),
	(43, 'Gestionar trazabilidad', 'logistics.manage_trazabilidad', 'logistics', 'Permite crear y actualizar trazabilidad', 1, '2025-11-04 00:34:27', '2025-11-04 00:34:27'),
	(44, 'Ver usuarios', 'users.view', 'users', 'Permite ver el listado de usuarios', 1, '2025-11-04 00:34:27', '2025-11-04 00:34:27'),
	(45, 'Crear usuarios', 'users.create', 'users', 'Permite crear nuevos usuarios', 1, '2025-11-04 00:34:27', '2025-11-04 00:34:27'),
	(46, 'Actualizar usuarios', 'users.update', 'users', 'Permite modificar usuarios existentes', 1, '2025-11-04 00:34:27', '2025-11-04 00:34:27'),
	(47, 'Eliminar usuarios', 'users.delete', 'users', 'Permite eliminar usuarios', 1, '2025-11-04 00:34:27', '2025-11-04 00:34:27'),
	(48, 'Gestionar roles', 'users.manage_roles', 'users', 'Permite gestionar roles del sistema', 1, '2025-11-04 00:34:27', '2025-11-04 00:34:27'),
	(49, 'Gestionar permisos', 'users.manage_permissions', 'users', 'Permite gestionar permisos del sistema', 1, '2025-11-04 00:34:27', '2025-11-04 00:34:27'),
	(50, 'Asignar permisos', 'users.assign_permissions', 'users', 'Permite asignar permisos a roles y usuarios', 1, '2025-11-04 00:34:27', '2025-11-04 00:34:27');

-- Volcando estructura para tabla mfcomputers.personnel
CREATE TABLE IF NOT EXISTS `personnel` (
  `id` int NOT NULL AUTO_INCREMENT,
  `employee_code` varchar(20) NOT NULL,
  `first_name` varchar(50) NOT NULL,
  `last_name` varchar(50) NOT NULL,
  `position` varchar(50) NOT NULL,
  `department` varchar(50) DEFAULT NULL,
  `salary` decimal(10,2) DEFAULT NULL,
  `hire_date` date NOT NULL,
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `employee_code` (`employee_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Volcando datos para la tabla mfcomputers.personnel: ~0 rows (aproximadamente)

-- Volcando estructura para tabla mfcomputers.production_orders
CREATE TABLE IF NOT EXISTS `production_orders` (
  `id` int NOT NULL AUTO_INCREMENT,
  `order_number` varchar(20) NOT NULL,
  `product_id` int NOT NULL,
  `quantity` int NOT NULL,
  `status` enum('pending','in_process','completed','cancelled') DEFAULT 'pending',
  `start_date` timestamp NULL DEFAULT NULL,
  `end_date` timestamp NULL DEFAULT NULL,
  `notes` text,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `order_number` (`order_number`),
  KEY `idx_production_orders_product` (`product_id`),
  KEY `idx_production_orders_status` (`status`),
  CONSTRAINT `production_orders_ibfk_1` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Volcando datos para la tabla mfcomputers.production_orders: ~0 rows (aproximadamente)

-- Volcando estructura para tabla mfcomputers.products
CREATE TABLE IF NOT EXISTS `products` (
  `id` int NOT NULL AUTO_INCREMENT,
  `code` varchar(20) NOT NULL,
  `name` varchar(100) NOT NULL,
  `description` text,
  `category_id` int DEFAULT NULL,
  `price` decimal(10,2) NOT NULL DEFAULT '0.00',
  `stock` int NOT NULL DEFAULT '0',
  `min_stock` int NOT NULL DEFAULT '0',
  `max_stock` int NOT NULL DEFAULT '1000',
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `woocommerce_id` int DEFAULT NULL COMMENT 'ID del producto en WooCommerce',
  `woocommerce_sku` varchar(50) DEFAULT NULL COMMENT 'SKU específico para WooCommerce',
  `make_scenario_id` varchar(100) DEFAULT NULL COMMENT 'ID del escenario en Make',
  `make_last_sync` timestamp NULL DEFAULT NULL COMMENT 'Timestamp de última sincronización via Make',
  `sync_status` enum('pending','synced','error','manual') DEFAULT 'pending' COMMENT 'Estado de sincronización',
  `external_systems` json DEFAULT NULL COMMENT 'Metadatos de sistemas externos',
  `webhook_url` varchar(255) DEFAULT NULL COMMENT 'URL para webhooks de Make',
  `weight` decimal(8,2) DEFAULT NULL COMMENT 'Peso del producto en kg',
  `length` decimal(8,2) DEFAULT NULL COMMENT 'Longitud del producto en cm',
  `width` decimal(8,2) DEFAULT NULL COMMENT 'Ancho del producto en cm',
  `height` decimal(8,2) DEFAULT NULL COMMENT 'Alto del producto en cm',
  `images` json DEFAULT NULL COMMENT 'Array de URLs de imágenes desde WooCommerce',
  PRIMARY KEY (`id`),
  UNIQUE KEY `code` (`code`),
  KEY `idx_products_code` (`code`),
  KEY `idx_products_category` (`category_id`),
  KEY `idx_products_woocommerce_id` (`woocommerce_id`),
  KEY `idx_products_woocommerce_sku` (`woocommerce_sku`),
  KEY `idx_products_sync_status` (`sync_status`),
  KEY `idx_products_make_scenario` (`make_scenario_id`),
  CONSTRAINT `products_ibfk_1` FOREIGN KEY (`category_id`) REFERENCES `categories` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=20 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='Tabla de productos con integración WooCommerce/Make';

-- Volcando datos para la tabla mfcomputers.products: ~0 rows (aproximadamente)

-- Volcando estructura para tabla mfcomputers.product_sync_logs
CREATE TABLE IF NOT EXISTS `product_sync_logs` (
  `id` int NOT NULL AUTO_INCREMENT,
  `product_id` int NOT NULL,
  `woocommerce_id` int DEFAULT NULL,
  `action` enum('create','update','delete','sync') NOT NULL,
  `sync_status` enum('pending','synced','error','manual') NOT NULL,
  `error_message` text,
  `make_scenario_id` varchar(100) DEFAULT NULL,
  `external_data` json DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_sync_logs_product` (`product_id`),
  KEY `idx_sync_logs_status` (`sync_status`),
  KEY `idx_sync_logs_created` (`created_at`),
  CONSTRAINT `product_sync_logs_ibfk_1` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='Logs de sincronización de productos';

-- Volcando datos para la tabla mfcomputers.product_sync_logs: ~0 rows (aproximadamente)

-- Volcando estructura para tabla mfcomputers.purchases
CREATE TABLE IF NOT EXISTS `purchases` (
  `id` int NOT NULL AUTO_INCREMENT,
  `purchase_number` varchar(20) NOT NULL,
  `supplier_id` int NOT NULL,
  `status` enum('pending','received','cancelled') DEFAULT 'pending',
  `debt_type` enum('compromiso','deuda_directa') DEFAULT 'compromiso',
  `total_amount` decimal(12,2) NOT NULL DEFAULT '0.00',
  `commitment_amount` decimal(12,2) DEFAULT '0.00' COMMENT 'Monto en compromiso',
  `debt_amount` decimal(12,2) DEFAULT '0.00' COMMENT 'Monto en deuda real',
  `allows_partial_delivery` tinyint(1) DEFAULT '1',
  `purchase_date` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `confirmed_at` timestamp NULL DEFAULT NULL COMMENT 'Fecha de confirmación de la OC',
  `received_date` timestamp NULL DEFAULT NULL,
  `notes` text,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `purchase_number` (`purchase_number`),
  KEY `idx_purchases_supplier` (`supplier_id`),
  KEY `idx_purchases_status` (`status`),
  KEY `idx_purchases_date` (`purchase_date`),
  KEY `idx_purchases_debt_type` (`debt_type`),
  KEY `idx_purchases_confirmed` (`confirmed_at`),
  CONSTRAINT `purchases_ibfk_1` FOREIGN KEY (`supplier_id`) REFERENCES `suppliers` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Volcando datos para la tabla mfcomputers.purchases: ~10 rows (aproximadamente)
INSERT INTO `purchases` (`id`, `purchase_number`, `supplier_id`, `status`, `debt_type`, `total_amount`, `commitment_amount`, `debt_amount`, `allows_partial_delivery`, `purchase_date`, `confirmed_at`, `received_date`, `notes`, `created_at`, `updated_at`) VALUES
	(1, 'COMP0001', 1, 'received', 'compromiso', 15000.00, 0.00, 0.00, 1, '2024-01-15 13:30:00', NULL, '2024-01-16 17:30:00', 'Compra de motores eléctricos para producción', '2025-10-22 03:40:42', '2025-10-22 03:40:42'),
	(2, 'COMP0002', 2, 'received', 'compromiso', 8500.00, 0.00, 0.00, 1, '2024-01-18 12:15:00', NULL, '2024-01-19 14:45:00', 'Materiales de construcción para producción', '2025-10-22 03:40:42', '2025-10-22 03:40:42'),
	(3, 'COMP0003', 3, 'pending', 'compromiso', 12000.00, 0.00, 0.00, 1, '2024-01-20 17:20:00', NULL, NULL, 'Componentes eléctricos pendientes de entrega', '2025-10-22 03:40:42', '2025-10-22 03:40:42'),
	(4, 'COMP0004', 4, 'received', 'compromiso', 22000.00, 0.00, 0.00, 1, '2024-01-22 11:45:00', NULL, '2024-01-23 19:20:00', 'Repuestos industriales para mantenimiento', '2025-10-22 03:40:42', '2025-10-22 03:40:42'),
	(5, 'COMP0005', 5, 'received', 'compromiso', 18000.00, 0.00, 0.00, 1, '2024-01-25 14:30:00', NULL, '2024-01-26 12:15:00', 'Suministros técnicos para línea de producción', '2025-10-22 03:40:42', '2025-10-22 03:40:42'),
	(6, 'COMP0006', 6, 'cancelled', 'compromiso', 9500.00, 0.00, 0.00, 1, '2024-01-28 16:10:00', NULL, NULL, 'Compra cancelada por problemas de calidad', '2025-10-22 03:40:42', '2025-10-22 03:40:42'),
	(7, 'COMP0007', 7, 'received', 'compromiso', 25000.00, 0.00, 0.00, 1, '2024-01-30 19:45:00', NULL, '2024-01-31 13:30:00', 'Equipos industriales para nueva línea', '2025-10-22 03:40:42', '2025-10-22 03:40:42'),
	(8, 'COMP0008', 8, 'pending', 'compromiso', 13500.00, 0.00, 0.00, 1, '2024-02-02 15:20:00', NULL, NULL, 'Materiales especializados en proceso', '2025-10-22 03:40:42', '2025-10-22 03:40:42'),
	(9, 'COMP0009', 9, 'received', 'compromiso', 19000.00, 0.00, 0.00, 1, '2024-02-05 18:30:00', NULL, '2024-02-06 16:45:00', 'Componentes del litoral para exportación', '2025-10-22 03:40:42', '2025-10-22 03:40:42'),
	(10, 'COMP0010', 10, 'received', 'compromiso', 16500.00, 0.00, 0.00, 1, '2024-02-08 13:15:00', NULL, '2024-02-09 17:20:00', 'Suministros del interior para distribución', '2025-10-22 03:40:42', '2025-10-22 03:40:42');

-- Volcando estructura para tabla mfcomputers.purchase_items
CREATE TABLE IF NOT EXISTS `purchase_items` (
  `id` int NOT NULL AUTO_INCREMENT,
  `purchase_id` int NOT NULL,
  `product_id` int NOT NULL,
  `material_code` varchar(50) DEFAULT NULL COMMENT 'Código del material (clave para costos)',
  `quantity` int NOT NULL,
  `received_quantity` int DEFAULT '0' COMMENT 'Cantidad recibida',
  `unit_price` decimal(10,2) NOT NULL,
  `unit_cost` decimal(10,2) DEFAULT NULL COMMENT 'Costo unitario para producción',
  `total_price` decimal(12,2) NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_purchase_items_purchase` (`purchase_id`),
  KEY `idx_purchase_items_product` (`product_id`),
  KEY `idx_purchase_items_material` (`material_code`),
  CONSTRAINT `purchase_items_ibfk_1` FOREIGN KEY (`purchase_id`) REFERENCES `purchases` (`id`) ON DELETE CASCADE,
  CONSTRAINT `purchase_items_ibfk_2` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=16 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Volcando datos para la tabla mfcomputers.purchase_items: ~0 rows (aproximadamente)

-- Volcando estructura para tabla mfcomputers.refresh_tokens
CREATE TABLE IF NOT EXISTS `refresh_tokens` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `token` text NOT NULL,
  `revoked` tinyint(1) DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `expires_at` datetime NOT NULL,
  `revoked_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_refresh_tokens_user` (`user_id`),
  KEY `idx_refresh_tokens_expires` (`expires_at`),
  CONSTRAINT `fk_refresh_tokens_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=113 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Volcando datos para la tabla mfcomputers.refresh_tokens: ~99 rows (aproximadamente)
INSERT INTO `refresh_tokens` (`id`, `user_id`, `token`, `revoked`, `created_at`, `expires_at`, `revoked_at`) VALUES
	(1, 2, 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIyIiwidHlwZSI6InJlZnJlc2giLCJpYXQiOjE3NTg1ODQwNTQsImV4cCI6MTc1OTE4ODg1NH0.b1V3nAlnCa8NO9-_6P3aAK_mq0rN21dQJy88CRgKJYg', 0, '2025-09-22 23:34:14', '2025-09-29 20:34:14', NULL),
	(2, 3, 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIzIiwidHlwZSI6InJlZnJlc2giLCJpYXQiOjE3NTg1ODcyNzksImV4cCI6MTc1OTE5MjA3OX0.vI5L78rgErX62_NfvXY2t2lE-PTw00Lo6jthdU-CyFw', 0, '2025-09-23 00:27:59', '2025-09-29 21:27:59', NULL),
	(3, 3, 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIzIiwidHlwZSI6InJlZnJlc2giLCJpYXQiOjE3NTg1ODg1MzksImV4cCI6MTc1OTE5MzMzOX0.fXM4UOTCXhj08HFdnbZT3Ch_AQspuJPCKXbYrOtX_0M', 0, '2025-09-23 00:48:59', '2025-09-29 21:48:59', NULL),
	(4, 2, 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIyIiwidHlwZSI6InJlZnJlc2giLCJpYXQiOjE3NTg1OTE2NjQsImV4cCI6MTc1OTE5NjQ2NH0.4iZq9w4G_4P82d2z0DXhkR2vT9p_f4yzyvSPvGWTiKA', 0, '2025-09-23 01:41:04', '2025-09-29 22:41:04', NULL),
	(5, 2, 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIyIiwidHlwZSI6InJlZnJlc2giLCJpYXQiOjE3NTg1OTE3MjQsImV4cCI6MTc1OTE5NjUyNH0.0m_88REKiWRLCiD8yaw1f2LEpg5xgJHuRS5Pwm0Gffo', 0, '2025-09-23 01:42:04', '2025-09-29 22:42:04', NULL),
	(6, 2, 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIyIiwidHlwZSI6InJlZnJlc2giLCJpYXQiOjE3NTg1OTE3NzYsImV4cCI6MTc1OTE5NjU3Nn0.9XR8UQbs5aDWuMgc3IZKzezDbMzq11wd3AEY4wrIhl8', 0, '2025-09-23 01:42:56', '2025-09-29 22:42:56', NULL),
	(7, 2, 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIyIiwidHlwZSI6InJlZnJlc2giLCJpYXQiOjE3NTg1OTMyMjQsImV4cCI6MTc1OTE5ODAyNH0.MRm18J5jjegA9dX9U-eUFDcGdyjKJty2LKomJ7H5dv8', 0, '2025-09-23 02:07:04', '2025-09-29 23:07:04', NULL),
	(8, 2, 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIyIiwidHlwZSI6InJlZnJlc2giLCJpYXQiOjE3NTg1OTM2MDYsImV4cCI6MTc1OTE5ODQwNn0.qTQxekifBMD69lTJe9V-pCL_TC0R6nWp-I3jwey385E', 0, '2025-09-23 02:13:26', '2025-09-29 23:13:26', NULL),
	(9, 2, 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIyIiwidHlwZSI6InJlZnJlc2giLCJpYXQiOjE3NTg1OTM2MDgsImV4cCI6MTc1OTE5ODQwOH0.kQfM8IMDdEd8jciaOi3Hngkk4RakKZ2n8vsVFQ2hz0A', 0, '2025-09-23 02:13:28', '2025-09-29 23:13:28', NULL),
	(10, 2, 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIyIiwidHlwZSI6InJlZnJlc2giLCJpYXQiOjE3NTg1OTM2MDksImV4cCI6MTc1OTE5ODQwOX0.jluwSw5c9BFQ6gyYlaJdpFU-cn-eV9BRvsC_9iwrUuk', 0, '2025-09-23 02:13:29', '2025-09-29 23:13:29', NULL),
	(11, 2, 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIyIiwidHlwZSI6InJlZnJlc2giLCJpYXQiOjE3NTg1OTM2MTEsImV4cCI6MTc1OTE5ODQxMX0.H3tqBBbqGpHJ_OfJpCLadfv2b_cPE9BJj-usYODz5Pk', 0, '2025-09-23 02:13:31', '2025-09-29 23:13:31', NULL),
	(12, 2, 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIyIiwidHlwZSI6InJlZnJlc2giLCJpYXQiOjE3NTg1OTM2MTIsImV4cCI6MTc1OTE5ODQxMn0.e9zLD5zqVb18E--PC3jW54zeZUvUWKXpUlSPsUV6Cug', 0, '2025-09-23 02:13:32', '2025-09-29 23:13:32', NULL),
	(13, 2, 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIyIiwidHlwZSI6InJlZnJlc2giLCJpYXQiOjE3NTg1OTM2MTYsImV4cCI6MTc1OTE5ODQxNn0.w-eUThf-pcl7SIP5eTADK_4MOH2xJnph6h-JPxh4fag', 0, '2025-09-23 02:13:36', '2025-09-29 23:13:36', NULL),
	(14, 2, 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIyIiwidHlwZSI6InJlZnJlc2giLCJpYXQiOjE3NTg1OTM2MTcsImV4cCI6MTc1OTE5ODQxN30.XbVw36GuUdZT0-Ig8m-6-LHr4o-GXH5R3vgMiMkDnuQ', 0, '2025-09-23 02:13:37', '2025-09-29 23:13:37', NULL),
	(15, 2, 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIyIiwidHlwZSI6InJlZnJlc2giLCJpYXQiOjE3NTg1OTM2MTgsImV4cCI6MTc1OTE5ODQxOH0.iHfOPIajaDOiFkWRGkFjmnRVnRMH8dSvGmOSyuM0wvk', 0, '2025-09-23 02:13:38', '2025-09-29 23:13:38', NULL),
	(16, 2, 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIyIiwidHlwZSI6InJlZnJlc2giLCJpYXQiOjE3NTg1OTM2MjAsImV4cCI6MTc1OTE5ODQyMH0.7CHz_9HI4CKkErxnp0ylLF7kVjmN9M6oqDR_GevQpdU', 0, '2025-09-23 02:13:40', '2025-09-29 23:13:40', NULL),
	(17, 2, 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIyIiwidHlwZSI6InJlZnJlc2giLCJpYXQiOjE3NTg1OTM2MjMsImV4cCI6MTc1OTE5ODQyM30.RQRlaU-UyuCHL74geRRfXqJcgGA0fn1t-pFToqp5jrg', 0, '2025-09-23 02:13:43', '2025-09-29 23:13:43', NULL),
	(18, 2, 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIyIiwidHlwZSI6InJlZnJlc2giLCJpYXQiOjE3NTg1OTM2MzgsImV4cCI6MTc1OTE5ODQzOH0.9qUBHGQSmUYlcyqHcn7LugCGABr-yXT8x0toCwbjGyg', 0, '2025-09-23 02:13:58', '2025-09-29 23:13:58', NULL),
	(19, 2, 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIyIiwidHlwZSI6InJlZnJlc2giLCJpYXQiOjE3NTg1OTM2NDEsImV4cCI6MTc1OTE5ODQ0MX0.-hQOfcxbIxGMcRwXAUxvySMRszGQh3NhYwKIdLeI8C4', 0, '2025-09-23 02:14:01', '2025-09-29 23:14:01', NULL),
	(20, 2, 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIyIiwidHlwZSI6InJlZnJlc2giLCJpYXQiOjE3NTg1OTM2NDIsImV4cCI6MTc1OTE5ODQ0Mn0.-dt642TVKM2DRK_lAeOc4UJ4r5CkMt-FSWn-tpUxOIE', 0, '2025-09-23 02:14:02', '2025-09-29 23:14:02', NULL),
	(21, 2, 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIyIiwidHlwZSI6InJlZnJlc2giLCJpYXQiOjE3NTg1OTM2NDMsImV4cCI6MTc1OTE5ODQ0M30.dIibHPXgw6DV5PPDMQgc9LUlHSv6w_OBa_1ypa0zzwQ', 0, '2025-09-23 02:14:03', '2025-09-29 23:14:03', NULL),
	(22, 2, 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIyIiwidHlwZSI6InJlZnJlc2giLCJpYXQiOjE3NTg1OTM2NDUsImV4cCI6MTc1OTE5ODQ0NX0.rh0yS2RBhXUve8mO2zccbDIXfVa_DKzOYduhjhqkt5U', 0, '2025-09-23 02:14:05', '2025-09-29 23:14:05', NULL),
	(23, 2, 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIyIiwidHlwZSI6InJlZnJlc2giLCJpYXQiOjE3NTg1OTM2NDgsImV4cCI6MTc1OTE5ODQ0OH0.MnWn3L56FGBee_ZX8zr-0blhXki7MJs-o-Mhj2UszIQ', 0, '2025-09-23 02:14:08', '2025-09-29 23:14:08', NULL),
	(24, 2, 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIyIiwidHlwZSI6InJlZnJlc2giLCJpYXQiOjE3NTg1OTM3NTgsImV4cCI6MTc1OTE5ODU1OH0.yKBEUq54cn_SOOwvOBm3ioMZHNjWvdilM8oQzAZPnbs', 0, '2025-09-23 02:15:58', '2025-09-29 23:15:58', NULL),
	(25, 2, 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIyIiwidHlwZSI6InJlZnJlc2giLCJpYXQiOjE3NTg1OTM4MTEsImV4cCI6MTc1OTE5ODYxMX0.VYlJNaTZzNy9frMT68HBGK69dxCYw-aNCXkNxeHlqHs', 0, '2025-09-23 02:16:51', '2025-09-29 23:16:51', NULL),
	(26, 2, 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIyIiwidHlwZSI6InJlZnJlc2giLCJpYXQiOjE3NTg1OTQ3NjgsImV4cCI6MTc1OTE5OTU2OH0.kG2s8wQaG8F5-TiuTB7GrHnbl5s9D07gxN2nh8FaUv4', 0, '2025-09-23 02:32:48', '2025-09-29 23:32:48', NULL),
	(27, 2, 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIyIiwidHlwZSI6InJlZnJlc2giLCJpYXQiOjE3NTg2NzEwMTcsImV4cCI6MTc1OTI3NTgxN30.UeXlG6wbAFcf3RYH6MtsGjGUrge8mEHRD2my2EX5rkE', 0, '2025-09-23 23:43:37', '2025-09-30 20:43:37', NULL),
	(28, 2, 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIyIiwidHlwZSI6InJlZnJlc2giLCJpYXQiOjE3NTg2NzExNjIsImV4cCI6MTc1OTI3NTk2Mn0.a7SNm23_hU4lbWDwXsXC0hjXjwSYpQnWuSY5_Sgb7fg', 0, '2025-09-23 23:46:02', '2025-09-30 20:46:02', NULL),
	(29, 2, 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIyIiwidHlwZSI6InJlZnJlc2giLCJpYXQiOjE3NTg2NzEyMDgsImV4cCI6MTc1OTI3NjAwOH0.BCICjMieI0geTw55l7QSpQatUaR2lUQuS8fIj8OEoJk', 0, '2025-09-23 23:46:48', '2025-09-30 20:46:48', NULL),
	(30, 2, 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIyIiwidHlwZSI6InJlZnJlc2giLCJpYXQiOjE3NTg2NzEyNDYsImV4cCI6MTc1OTI3NjA0Nn0.WYZYdtE5l-nFBPyRGj45iwtlY7WSoUUtIKGEGA9aeKY', 0, '2025-09-23 23:47:26', '2025-09-30 20:47:26', NULL),
	(31, 2, 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIyIiwidHlwZSI6InJlZnJlc2giLCJpYXQiOjE3NTg2NzE1MTgsImV4cCI6MTc1OTI3NjMxOH0.DVAgoqXCtWOBJLnDKPpS3oHU1ATvl8lr8-2TejqHDMs', 0, '2025-09-23 23:51:58', '2025-09-30 20:51:58', NULL),
	(32, 2, 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIyIiwidHlwZSI6InJlZnJlc2giLCJpYXQiOjE3NTg2NzE1NjgsImV4cCI6MTc1OTI3NjM2OH0.xWFZGLYajcY9gWrEN0vFLdh1s8bOPRTO02LPC4nCni4', 0, '2025-09-23 23:52:48', '2025-09-30 20:52:48', NULL),
	(33, 2, 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIyIiwidHlwZSI6InJlZnJlc2giLCJpYXQiOjE3NTg2NzE5MTcsImV4cCI6MTc1OTI3NjcxN30.o1BRFbSVUNWBaSLK9GTqtDz_FIbnBK3ZIl8cxEg9j7Q', 0, '2025-09-23 23:58:37', '2025-09-30 20:58:37', NULL),
	(34, 2, 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIyIiwidHlwZSI6InJlZnJlc2giLCJpYXQiOjE3NTg3MTE2NDgsImV4cCI6MTc1OTMxNjQ0OH0.r5bBKOl9mR6NzfUwawfv52cMvpOd7eA17LryHuB1nKU', 0, '2025-09-24 11:00:48', '2025-10-01 08:00:48', NULL),
	(35, 2, 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIyIiwidHlwZSI6InJlZnJlc2giLCJpYXQiOjE3NTg3MTIwMjgsImV4cCI6MTc1OTMxNjgyOH0.n1lEXUUn_6jCDWp93eGUZqeCKMAfJqH0cfgNzW3UOJA', 0, '2025-09-24 11:07:08', '2025-10-01 08:07:08', NULL),
	(36, 2, 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIyIiwidHlwZSI6InJlZnJlc2giLCJpYXQiOjE3NTg5MjA3NDgsImV4cCI6MTc1OTUyNTU0OH0.j1Vct6Wl0YT2qp4sr2ggaNWUWdyl9mjvL2XzCPHKD6U', 0, '2025-09-26 21:05:48', '2025-10-03 18:05:48', NULL),
	(37, 2, 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIyIiwidHlwZSI6InJlZnJlc2giLCJpYXQiOjE3NTkwOTQ0MTIsImV4cCI6MTc1OTY5OTIxMn0.itDixYkfsCbi2xElhisuAsH5YDOo3imTw-St6zIbK-4', 0, '2025-09-28 21:20:12', '2025-10-05 18:20:12', NULL),
	(38, 3, 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIzIiwidHlwZSI6InJlZnJlc2giLCJpYXQiOjE3NTkwOTQ4MjEsImV4cCI6MTc1OTY5OTYyMX0.KhO_N707ozY90G6CJBG1Q0-9VsaUfqz9Ov_keYdk5vo', 0, '2025-09-28 21:27:01', '2025-10-05 18:27:01', NULL),
	(39, 3, 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIzIiwidHlwZSI6InJlZnJlc2giLCJpYXQiOjE3NTkwOTcxNTAsImV4cCI6MTc1OTcwMTk1MH0.m-XUupfs_gBWCT9D8AhP61xtAeGNFzaDqNSwdb4JKvg', 0, '2025-09-28 22:05:50', '2025-10-05 19:05:50', NULL),
	(40, 2, 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIyIiwidHlwZSI6InJlZnJlc2giLCJpYXQiOjE3NTkwOTcyODUsImV4cCI6MTc1OTcwMjA4NX0.RTi8pd7rWn3BB4jQ-tkdw9lqF4eaFIJE8JG_QjzrURg', 0, '2025-09-28 22:08:05', '2025-10-05 19:08:05', NULL),
	(41, 3, 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIzIiwidHlwZSI6InJlZnJlc2giLCJpYXQiOjE3NTkwOTc1NTMsImV4cCI6MTc1OTcwMjM1M30.TJsOk-yTYdu93sm-RBvEoQKnrz2g0Osti_BKgIecqEA', 0, '2025-09-28 22:12:33', '2025-10-05 19:12:33', NULL),
	(42, 2, 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIyIiwidHlwZSI6InJlZnJlc2giLCJpYXQiOjE3NTkxMDA5MTIsImV4cCI6MTc1OTcwNTcxMn0.ZCqFXCf5bFW9bvWbOZVM5TrWwdDukD0qXFh0AsA_uc0', 0, '2025-09-28 23:08:32', '2025-10-05 20:08:32', NULL),
	(43, 3, 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIzIiwidHlwZSI6InJlZnJlc2giLCJpYXQiOjE3NTkxMDEwNDgsImV4cCI6MTc1OTcwNTg0OH0.bHJe_mk1rCjFP9eoZvVRfJEzYsM2yyrv_jErRyCH1rQ', 0, '2025-09-28 23:10:48', '2025-10-05 20:10:48', NULL),
	(44, 2, 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIyIiwidHlwZSI6InJlZnJlc2giLCJpYXQiOjE3NTkxMDE2NzUsImV4cCI6MTc1OTcwNjQ3NX0.393PMvNk10kxgFjhO-gHDJCXv_lfIf9_XvfMq1MlAU8', 0, '2025-09-28 23:21:15', '2025-10-05 20:21:15', NULL),
	(45, 2, 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIyIiwidHlwZSI6InJlZnJlc2giLCJpYXQiOjE3NTkxMDMyMDAsImV4cCI6MTc1OTcwODAwMH0.N3QQk06Fp9LEqMUE_OMn2JlQrKUOKMLRYObpbNVwLYM', 0, '2025-09-28 23:46:40', '2025-10-05 20:46:40', NULL),
	(46, 3, 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIzIiwidHlwZSI6InJlZnJlc2giLCJpYXQiOjE3NTkxMDMyMjQsImV4cCI6MTc1OTcwODAyNH0.cEXAI_UkQRzdzBIVRH1E3AJ86DnZbZ1urD86v-5gjss', 0, '2025-09-28 23:47:04', '2025-10-05 20:47:04', NULL),
	(47, 3, 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIzIiwidHlwZSI6InJlZnJlc2giLCJpYXQiOjE3NTkxMDU3NDIsImV4cCI6MTc1OTcxMDU0Mn0.pCU_7LiY6lczLQq1YsqiUVqRHmgOAgnxYcO9aJ1MWAA', 0, '2025-09-29 00:29:02', '2025-10-05 21:29:02', NULL),
	(48, 2, 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIyIiwidHlwZSI6InJlZnJlc2giLCJpYXQiOjE3NTkxMDU4MTAsImV4cCI6MTc1OTcxMDYxMH0.-dOFsrlVy78om1JIyt7jh1YnIzFCny6oTcj2YCupegI', 0, '2025-09-29 00:30:10', '2025-10-05 21:30:10', NULL),
	(49, 2, 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIyIiwidHlwZSI6InJlZnJlc2giLCJpYXQiOjE3NTk0NDA5NzQsImV4cCI6MTc2MDA0NTc3NH0.zkAfTJOvtZt27zMZdiWiMNEpEcUIMJe9LJlnpDo_pvM', 0, '2025-10-02 21:36:14', '2025-10-09 18:36:14', NULL),
	(50, 2, 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIyIiwidHlwZSI6InJlZnJlc2giLCJpYXQiOjE3NTk1MDQyODYsImV4cCI6MTc2MDEwOTA4Nn0.dAO9B7LS-wzEryIiS5T9i4N-iKgltFYlhmQ6ajoz4Ik', 0, '2025-10-03 15:11:26', '2025-10-10 12:11:26', NULL),
	(51, 2, 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIyIiwidHlwZSI6InJlZnJlc2giLCJpYXQiOjE3NTk3MTA1NjcsImV4cCI6MTc2MDMxNTM2N30.pe3xmkz97Mu6HN0h7-NJFJyofWtA02Lt_OZI1pNCHB0', 0, '2025-10-06 00:29:27', '2025-10-12 21:29:27', NULL),
	(52, 2, 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIyIiwidHlwZSI6InJlZnJlc2giLCJpYXQiOjE3NTk3MTMyOTUsImV4cCI6MTc2MDMxODA5NX0.j4tnjatGJP495wUpCx3lRwSA1w0ld4BYRSGjoZl0zL8', 0, '2025-10-06 01:14:55', '2025-10-12 22:14:55', NULL),
	(53, 2, 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIyIiwidHlwZSI6InJlZnJlc2giLCJpYXQiOjE3NTk3MTY4NDMsImV4cCI6MTc2MDMyMTY0M30.Nf3_nxYfVX1eGbqRzO1uGva3y-9UzktKQgCLBaB1tTM', 0, '2025-10-06 02:14:03', '2025-10-12 23:14:03', NULL),
	(54, 2, 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIyIiwidHlwZSI6InJlZnJlc2giLCJpYXQiOjE3NTk3MTgxNjIsImV4cCI6MTc2MDMyMjk2Mn0.aeBFZ8PqvKHoamrUVWzJhLFhhIOvQmdSQemecrq4LjI', 0, '2025-10-06 02:36:02', '2025-10-12 23:36:02', NULL),
	(55, 2, 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIyIiwidHlwZSI6InJlZnJlc2giLCJpYXQiOjE3NjAxMjM0ODEsImV4cCI6MTc2MDcyODI4MX0.COmjbMvNcki75vIckFbkoE3asiXYuFc5ulf88aZ_aHY', 0, '2025-10-10 19:11:21', '2025-10-17 16:11:21', NULL),
	(56, 2, 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIyIiwidHlwZSI6InJlZnJlc2giLCJpYXQiOjE3NjAyNDA5NzEsImV4cCI6MTc2MDg0NTc3MX0.x8MArweqxnt_pIqS3FDHSofhMRJSDI8Ki-7normVCd8', 0, '2025-10-12 03:49:31', '2025-10-19 00:49:31', NULL),
	(57, 2, 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIyIiwidHlwZSI6InJlZnJlc2giLCJpYXQiOjE3NjAyNDQ0MjksImV4cCI6MTc2MDg0OTIyOX0.8HBwYi8BrLT1b_e2ociF0meKarVvg0atODvocGpkp6s', 0, '2025-10-12 04:47:09', '2025-10-19 01:47:09', NULL),
	(58, 2, 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIyIiwidHlwZSI6InJlZnJlc2giLCJpYXQiOjE3NjAzMDY5NzcsImV4cCI6MTc2MDkxMTc3N30.zgluBUkvdLJYKsiuPJtSjcz5IvQZRpZ5CPBH-u_HM1s', 0, '2025-10-12 22:09:37', '2025-10-19 19:09:37', NULL),
	(59, 2, 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIyIiwidHlwZSI6InJlZnJlc2giLCJpYXQiOjE3NjAzMDc5NjUsImV4cCI6MTc2MDkxMjc2NX0.h_Mrrl6o5lvkU4Q01lVJk-LJVo28FKH78k9hv9R6fE4', 0, '2025-10-12 22:26:05', '2025-10-19 19:26:05', NULL),
	(60, 2, 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIyIiwidHlwZSI6InJlZnJlc2giLCJpYXQiOjE3NjAzMTA3NTQsImV4cCI6MTc2MDkxNTU1NH0.MGxdgjgzkcn-d_El6-zbce29c66OnpNaP6aoll8zzdo', 0, '2025-10-12 23:12:34', '2025-10-19 20:12:34', NULL),
	(61, 2, 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIyIiwidHlwZSI6InJlZnJlc2giLCJpYXQiOjE3NjAzMTUxMzEsImV4cCI6MTc2MDkxOTkzMX0.0ehyUdJb-yDSe1lU3rtehAIrMzUZLnRewOt9UpPZY4M', 0, '2025-10-13 00:25:31', '2025-10-19 21:25:31', NULL),
	(62, 2, 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIyIiwidHlwZSI6InJlZnJlc2giLCJpYXQiOjE3NjAzMTc4NDcsImV4cCI6MTc2MDkyMjY0N30.M4ivvOfTCVsOf0AagOaQRAp7Y25IHLunuhSEen1iGQI', 0, '2025-10-13 01:10:47', '2025-10-19 22:10:47', NULL),
	(63, 2, 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIyIiwidHlwZSI6InJlZnJlc2giLCJpYXQiOjE3NjA0MDQxOTMsImV4cCI6MTc2MTAwODk5M30.u7G9fw3xDQQtWnO_sq5gukYnMQ8ecZVON4NmLALq23k', 0, '2025-10-14 01:09:53', '2025-10-20 22:09:53', NULL),
	(64, 2, 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIyIiwidHlwZSI6InJlZnJlc2giLCJpYXQiOjE3NjA5ODg0NTUsImV4cCI6MTc2MTU5MzI1NX0.ObnXVd6Ywg3zB8jFGEOYug2iUqlahi4TeToAk_lIXd0', 0, '2025-10-20 19:27:35', '2025-10-27 16:27:35', NULL),
	(65, 2, 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIyIiwidHlwZSI6InJlZnJlc2giLCJpYXQiOjE3NjA5ODg0NTgsImV4cCI6MTc2MTU5MzI1OH0.4infZe2N1obheyZVBgwANJJ_aMJRulDnFkEIoyYHvCI', 0, '2025-10-20 19:27:38', '2025-10-27 16:27:38', NULL),
	(66, 2, 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIyIiwidHlwZSI6InJlZnJlc2giLCJpYXQiOjE3NjA5OTE0MjcsImV4cCI6MTc2MTU5NjIyN30.8zE2-iJoERniq0R0mNYFY0Hy02snHM3AydRdpBNZz9I', 0, '2025-10-20 20:17:07', '2025-10-27 17:17:07', NULL),
	(67, 2, 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIyIiwidHlwZSI6InJlZnJlc2giLCJpYXQiOjE3NjA5OTUzNDAsImV4cCI6MTc2MTYwMDE0MH0.6Z1cBS_M_TX2_Ovb2jbG9CPeE8GMHIokA5UZb-APQAc', 0, '2025-10-20 21:22:20', '2025-10-27 18:22:20', NULL),
	(68, 2, 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIyIiwidHlwZSI6InJlZnJlc2giLCJpYXQiOjE3NjA5OTY1NDQsImV4cCI6MTc2MTYwMTM0NH0.qhECMr69E65ldnYf6Ayh1bANCncJ74Zt55ENvPwClZs', 0, '2025-10-20 21:42:24', '2025-10-27 18:42:24', NULL),
	(69, 2, 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIyIiwidHlwZSI6InJlZnJlc2giLCJpYXQiOjE3NjA5OTc1NjMsImV4cCI6MTc2MTYwMjM2M30.gh5M8D3lHO6YF-RQoeR62UG1A7DjqexziUe71EZrxK0', 0, '2025-10-20 21:59:23', '2025-10-27 18:59:23', NULL),
	(70, 2, 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIyIiwidHlwZSI6InJlZnJlc2giLCJpYXQiOjE3NjA5OTk1MjQsImV4cCI6MTc2MTYwNDMyNH0.uFlEP8ve5lQPy0kqxdMMttXTAd-yLCFxA1HJ3Yl--AM', 0, '2025-10-20 22:32:04', '2025-10-27 19:32:04', NULL),
	(71, 2, 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIyIiwidHlwZSI6InJlZnJlc2giLCJpYXQiOjE3NjEwMDMxMjQsImV4cCI6MTc2MTYwNzkyNH0.WJZAvmYoQ06gMiEVo596u1iOtu2HyV69TTTG_uwh9nU', 0, '2025-10-20 23:32:04', '2025-10-27 20:32:04', NULL),
	(72, 2, 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIyIiwidHlwZSI6InJlZnJlc2giLCJpYXQiOjE3NjEwMDQyMDAsImV4cCI6MTc2MTYwOTAwMH0.jEtdJbAhbBule94ZTtNUPEzhtDVQqdQx26UfDQC5tX0', 0, '2025-10-20 23:50:00', '2025-10-27 20:50:00', NULL),
	(73, 2, 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIyIiwidHlwZSI6InJlZnJlc2giLCJpYXQiOjE3NjEwMDUxNzksImV4cCI6MTc2MTYwOTk3OX0.QagGRFqvuO0GwdYXjScLNX2H8bZY2ppRwZV04bStqmc', 0, '2025-10-21 00:06:19', '2025-10-27 21:06:19', NULL),
	(74, 2, 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIyIiwidHlwZSI6InJlZnJlc2giLCJpYXQiOjE3NjEwMDYzNzIsImV4cCI6MTc2MTYxMTE3Mn0.PMSTIY87zHcekeb6m5K6Ht-haaWElE9k1DqtK0u7Gsk', 0, '2025-10-21 00:26:12', '2025-10-27 21:26:12', NULL),
	(75, 2, 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIyIiwidHlwZSI6InJlZnJlc2giLCJpYXQiOjE3NjEwNzYxNDUsImV4cCI6MTc2MTY4MDk0NX0.RBWSOsKXlM2eja-kL7SLpn4-GhQ91Rc70-bYQx861kM', 0, '2025-10-21 19:49:05', '2025-10-28 16:49:05', NULL),
	(76, 2, 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIyIiwidHlwZSI6InJlZnJlc2giLCJpYXQiOjE3NjEyMjk5MzAsImV4cCI6MTc2MTgzNDczMH0.IewoBRLFOv2_7xD7pyZxnyjAVmwQnzDdwEcwecUMbqI', 0, '2025-10-23 14:32:10', '2025-10-30 11:32:10', NULL),
	(77, 2, 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIyIiwidHlwZSI6InJlZnJlc2giLCJpYXQiOjE3NjEyNDI1MTIsImV4cCI6MTc2MTg0NzMxMn0.xT8YcZJKIs1kNzqnqjyTEPO1Fxh7x10Kb_ttXhrTFpo', 0, '2025-10-23 18:01:52', '2025-10-30 15:01:52', NULL),
	(78, 2, 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIyIiwidHlwZSI6InJlZnJlc2giLCJpYXQiOjE3NjEyNTI4NDgsImV4cCI6MTc2MTg1NzY0OH0.gb632poJ8hPEeTTf5dENvxHt30Xo8mDZWf-0hhUfg18', 0, '2025-10-23 20:54:08', '2025-10-30 17:54:08', NULL),
	(79, 2, 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIyIiwidHlwZSI6InJlZnJlc2giLCJpYXQiOjE3NjEyNTI4NTUsImV4cCI6MTc2MTg1NzY1NX0.VWTI6AUQcs7hrbRGW95VDpqothShbZSnsyty5dXT4yM', 0, '2025-10-23 20:54:15', '2025-10-30 17:54:15', NULL),
	(80, 2, 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIyIiwidHlwZSI6InJlZnJlc2giLCJpYXQiOjE3NjEzOTg1ODksImV4cCI6MTc2MjAwMzM4OX0.IR3_6Vt55diipcdDSZvhw02eo3DonhEOKMjj8FDJO_M', 0, '2025-10-25 13:23:09', '2025-11-01 10:23:09', NULL),
	(81, 2, 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIyIiwidHlwZSI6InJlZnJlc2giLCJpYXQiOjE3NjEzOTk0MTEsImV4cCI6MTc2MjAwNDIxMX0.iM7bFVVKGFbB4t_PizprEQevshLfBekXuW3FKMtJOJ4', 0, '2025-10-25 13:36:51', '2025-11-01 10:36:51', NULL),
	(82, 2, 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIyIiwidHlwZSI6InJlZnJlc2giLCJpYXQiOjE3NjE4MzAyOTYsImV4cCI6MTc2MjQzNTA5Nn0.-i9MPHzQmtae3H5mbxarYHun0SyYIXYU41XWcHVpbXk', 0, '2025-10-30 13:18:16', '2025-11-06 10:18:16', NULL),
	(83, 2, 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIyIiwidHlwZSI6InJlZnJlc2giLCJpYXQiOjE3NjIyMTQxNDQsImV4cCI6MTc2MjgxODk0NH0.llNaw_e0Cpa0iXeM0iomYrYGw_lB47t4pyNOcqbPaVE', 0, '2025-11-03 23:55:44', '2025-11-10 20:55:44', NULL),
	(84, 2, 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIyIiwidHlwZSI6InJlZnJlc2giLCJpYXQiOjE3NjIyMTc1MzAsImV4cCI6MTc2MjgyMjMzMH0.dNb_k84R90WkronTHIZGFei95fWWaUT9yWJiGLB-5LA', 0, '2025-11-04 00:52:10', '2025-11-10 21:52:10', NULL),
	(85, 2, 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIyIiwidHlwZSI6InJlZnJlc2giLCJpYXQiOjE3NjIyMjIyMTYsImV4cCI6MTc2MjgyNzAxNn0.ZuwVG12BT87rOvO4IhRo1XN5Uai9sK-DqWdXpEiqRfk', 0, '2025-11-04 02:10:16', '2025-11-10 23:10:16', NULL),
	(86, 2, 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIyIiwidHlwZSI6InJlZnJlc2giLCJpYXQiOjE3NjIyMjU3NDEsImV4cCI6MTc2MjgzMDU0MX0.v8bIrNsxYxaM46wdbZYWNQe4e_3SIvG4DrQNJ9yfWxU', 0, '2025-11-04 03:09:01', '2025-11-11 00:09:01', NULL),
	(87, 2, 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIyIiwidHlwZSI6InJlZnJlc2giLCJpYXQiOjE3NjIyMjcyNjcsImV4cCI6MTc2MjgzMjA2N30.D3ketOXF3DN0tiwPaU01R-zN_NSbZAF2SGIHMg8qvCg', 0, '2025-11-04 03:34:27', '2025-11-11 00:34:27', NULL),
	(88, 2, 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIyIiwidHlwZSI6InJlZnJlc2giLCJpYXQiOjE3NjIyMjgyNDksImV4cCI6MTc2MjgzMzA0OX0.qFe-QUdaQLdfkaCh5BBjtS2uksZRR8xfiX8PZW11nsI', 0, '2025-11-04 03:50:49', '2025-11-11 00:50:49', NULL),
	(89, 2, 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIyIiwidHlwZSI6InJlZnJlc2giLCJpYXQiOjE3NjI0NDU1MzAsImV4cCI6MTc2MzA1MDMzMH0.nLgTleU_QE4F-4QpXUyTc_JExr1jrBNeuwI-72iPBIE', 0, '2025-11-06 16:12:10', '2025-11-13 13:12:10', NULL),
	(90, 2, 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIyIiwidHlwZSI6InJlZnJlc2giLCJpYXQiOjE3NjI0NjU1MTcsImV4cCI6MTc2MzA3MDMxN30.rvUR8q4ZofguEjENafAnbrZo-Ba6s5EVUiMptjGWxyw', 0, '2025-11-06 21:45:17', '2025-11-13 18:45:17', NULL),
	(92, 2, 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIyIiwidHlwZSI6InJlZnJlc2giLCJpYXQiOjE3NjI0NjY2ODYsImV4cCI6MTc2MzA3MTQ4Nn0.eqoNnmwQNZoe7kDGEJxi0nCLQAkFZzNNclBw3dOPnWc', 0, '2025-11-06 22:04:46', '2025-11-13 19:04:46', NULL),
	(93, 2, 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIyIiwidHlwZSI6InJlZnJlc2giLCJpYXQiOjE3NjI0NjY3MTcsImV4cCI6MTc2MzA3MTUxN30.cf-U7o0x5evtvxQk6gbkPx0KSETkL3rZAaB5O8JIRA4', 0, '2025-11-06 22:05:17', '2025-11-13 19:05:17', NULL),
	(94, 2, 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIyIiwidHlwZSI6InJlZnJlc2giLCJpYXQiOjE3NjI0Nzc5MTEsImV4cCI6MTc2MzA4MjcxMX0.oWwcyaPcw7qHzHfGEV6Tx-VEpVpE_n9G2hyH36kQRTk', 0, '2025-11-07 01:11:51', '2025-11-13 22:11:51', NULL),
	(96, 2, 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIyIiwidHlwZSI6InJlZnJlc2giLCJpYXQiOjE3NjI0NzgzNzIsImV4cCI6MTc2MzA4MzE3Mn0.VhP8_8wSrvj80WHaudiLL31wiaWO_Pa0pmHCivcRETs', 0, '2025-11-07 01:19:32', '2025-11-13 22:19:32', NULL),
	(97, 2, 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIyIiwidHlwZSI6InJlZnJlc2giLCJpYXQiOjE3NjI0ODUzOTksImV4cCI6MTc2MzA5MDE5OX0.xQAhhnbVZEvGZfM8-cXsqoRFnDlDtDudD8ddnhxwWyc', 0, '2025-11-07 03:16:39', '2025-11-14 00:16:39', NULL),
	(98, 2, 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIyIiwidHlwZSI6InJlZnJlc2giLCJpYXQiOjE3NjI0ODY1MDAsImV4cCI6MTc2MzA5MTMwMH0.31pi62qgHMHB7QuSLBiCqonHkeXvZN3ij2vloGwGJx4', 0, '2025-11-07 03:35:00', '2025-11-14 00:35:00', NULL),
	(99, 2, 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIyIiwidHlwZSI6InJlZnJlc2giLCJpYXQiOjE3NjI0ODc1MDIsImV4cCI6MTc2MzA5MjMwMn0.Q49afdxwmL9M_AcviWD_HUdP0JDMvCEpVsi6ggQCpgA', 0, '2025-11-07 03:51:42', '2025-11-14 00:51:42', NULL),
	(100, 2, 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIyIiwidHlwZSI6InJlZnJlc2giLCJpYXQiOjE3NjI0ODc4NTEsImV4cCI6MTc2MzA5MjY1MX0.y09uu5oz_oEofwWrl7TPlXy_7Z8I2eT_Dr2-wEl3diQ', 0, '2025-11-07 03:57:31', '2025-11-14 00:57:31', NULL),
	(101, 2, 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIyIiwidHlwZSI6InJlZnJlc2giLCJpYXQiOjE3NjI0ODg2MjcsImV4cCI6MTc2MzA5MzQyN30.jN6FsfUDzufY7VyV5BE5B217xXrKbJV6pMJTf1iAras', 0, '2025-11-07 04:10:27', '2025-11-14 01:10:27', NULL),
	(102, 2, 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIyIiwidHlwZSI6InJlZnJlc2giLCJpYXQiOjE3NjI0ODg3ODEsImV4cCI6MTc2MzA5MzU4MX0.1p7gbTNKEs-d_MgOnJ2n9FKVckIZjf1I53Hyul25SPg', 0, '2025-11-07 04:13:01', '2025-11-14 01:13:01', NULL),
	(103, 2, 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIyIiwidHlwZSI6InJlZnJlc2giLCJpYXQiOjE3NjI0ODk4NTMsImV4cCI6MTc2MzA5NDY1M30.cRIr9c9GYUSLiUmizK2nWqKinoKlnj8wptFARK4IIAY', 0, '2025-11-07 04:30:53', '2025-11-14 01:30:53', NULL),
	(104, 2, 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIyIiwidHlwZSI6InJlZnJlc2giLCJpYXQiOjE3NjI0OTA2MTksImV4cCI6MTc2MzA5NTQxOX0.uJGIQJGk3Ael8dQzW71cduYJlKhtKwMntHMiXqz09lk', 0, '2025-11-07 04:43:39', '2025-11-14 01:43:39', NULL),
	(105, 2, 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIyIiwidHlwZSI6InJlZnJlc2giLCJpYXQiOjE3NjI0OTIwODYsImV4cCI6MTc2MzA5Njg4Nn0.czv_74SkqRbYYb9jcKoh0Cu5rOtCMJ2WQh9A_fqwZ1A', 0, '2025-11-07 05:08:06', '2025-11-14 02:08:06', NULL),
	(106, 7, 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI3IiwidHlwZSI6InJlZnJlc2giLCJpYXQiOjE3NjI1NDU3MjcsImV4cCI6MTc2MzE1MDUyN30.p1jahQmv88GZnRXcRQnMsl0OA5PWIyuBAYQv5E-RF04', 0, '2025-11-07 20:02:07', '2025-11-14 17:02:07', NULL),
	(107, 2, 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIyIiwidHlwZSI6InJlZnJlc2giLCJpYXQiOjE3NjI1NDU3ODIsImV4cCI6MTc2MzE1MDU4Mn0.j03Ygz4sW2BZvxal6ixCsSn5tdoLaj3LSgnnLC8L5q8', 0, '2025-11-07 20:03:02', '2025-11-14 17:03:02', NULL),
	(108, 2, 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIyIiwidHlwZSI6InJlZnJlc2giLCJpYXQiOjE3NjMwNzU0ODMsImV4cCI6MTc2MzY4MDI4M30.ISCOfm2ymqj7_uA_2CG0dZpl2d5D0t3PnCGwSwDSAq0', 0, '2025-11-13 23:11:23', '2025-11-20 20:11:23', NULL),
	(109, 2, 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIyIiwidHlwZSI6InJlZnJlc2giLCJpYXQiOjE3NjMwNzY2MjUsImV4cCI6MTc2MzY4MTQyNX0.Zqzry1VXNthj8Gn7EOF9BIAlcDQ173F7aCINFAGaFeo', 0, '2025-11-13 23:30:25', '2025-11-20 20:30:25', NULL),
	(110, 2, 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIyIiwidHlwZSI6InJlZnJlc2giLCJpYXQiOjE3NjM0Mzg5ODcsImV4cCI6MTc2NDA0Mzc4N30.yEEruDBgVdElU5_jc5lCKF6oFJH2ZZHuHIl7-HorQjs', 0, '2025-11-18 04:09:47', '2025-11-25 01:09:47', NULL),
	(111, 2, 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIyIiwidHlwZSI6InJlZnJlc2giLCJpYXQiOjE3NjM3MzUzOTYsImV4cCI6MTc2NDM0MDE5Nn0.W2VGvjOSuPoUli3-H3UXYBPBFmQqGYPE6pVCR3w0nqg', 0, '2025-11-21 14:29:56', '2025-11-28 11:29:56', NULL),
	(112, 2, 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIyIiwidHlwZSI6InJlZnJlc2giLCJpYXQiOjE3NjM4NTU0NTQsImV4cCI6MTc2NDQ2MDI1NH0.5k5EF-eyiHDx3VwvJyVVNNgPiWMHYafdrWUt521YAwg', 0, '2025-11-22 23:50:54', '2025-11-29 20:50:54', NULL);

-- Volcando estructura para tabla mfcomputers.remitos
CREATE TABLE IF NOT EXISTS `remitos` (
  `id` int NOT NULL AUTO_INCREMENT,
  `remito_number` varchar(20) NOT NULL,
  `order_id` int NOT NULL,
  `client_id` int NOT NULL,
  `remito_type` enum('entrega_cliente','traslado_interno','devolucion','consignacion') DEFAULT 'entrega_cliente',
  `status` enum('generado','preparando','listo_despacho','en_transito','entregado','devuelto','cancelado') DEFAULT 'generado',
  `generation_date` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `preparation_date` timestamp NULL DEFAULT NULL,
  `dispatch_date` timestamp NULL DEFAULT NULL,
  `delivery_date` timestamp NULL DEFAULT NULL,
  `delivery_address` text,
  `delivery_city` varchar(50) DEFAULT NULL,
  `delivery_contact` varchar(100) DEFAULT NULL,
  `delivery_phone` varchar(20) DEFAULT NULL,
  `transport_company` varchar(100) DEFAULT NULL,
  `tracking_number` varchar(50) DEFAULT NULL,
  `transport_cost` decimal(10,2) DEFAULT '0.00',
  `total_products` int DEFAULT '0',
  `total_quantity` int DEFAULT '0',
  `total_value` decimal(10,2) DEFAULT '0.00',
  `preparation_notes` text,
  `delivery_notes` text,
  `signature_data` text,
  `delivery_photo` varchar(255) DEFAULT NULL,
  `created_by` int DEFAULT NULL,
  `delivered_by` int DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `remito_number` (`remito_number`),
  KEY `created_by` (`created_by`),
  KEY `delivered_by` (`delivered_by`),
  KEY `idx_remitos_order` (`order_id`),
  KEY `idx_remitos_client` (`client_id`),
  KEY `idx_remitos_status` (`status`),
  KEY `idx_remitos_date` (`generation_date`),
  KEY `idx_remitos_number` (`remito_number`),
  CONSTRAINT `remitos_ibfk_1` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`),
  CONSTRAINT `remitos_ibfk_2` FOREIGN KEY (`client_id`) REFERENCES `clients` (`id`),
  CONSTRAINT `remitos_ibfk_3` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`),
  CONSTRAINT `remitos_ibfk_4` FOREIGN KEY (`delivered_by`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Volcando datos para la tabla mfcomputers.remitos: ~0 rows (aproximadamente)

-- Volcando estructura para tabla mfcomputers.remito_items
CREATE TABLE IF NOT EXISTS `remito_items` (
  `id` int NOT NULL AUTO_INCREMENT,
  `remito_id` int NOT NULL,
  `product_id` int NOT NULL,
  `quantity` int NOT NULL,
  `unit_price` decimal(10,2) NOT NULL,
  `total_price` decimal(10,2) NOT NULL,
  `status` enum('preparado','parcial','completo','devuelto') DEFAULT 'preparado',
  `prepared_quantity` int DEFAULT '0',
  `delivered_quantity` int DEFAULT '0',
  `returned_quantity` int DEFAULT '0',
  `batch_number` varchar(50) DEFAULT NULL,
  `serial_numbers` text,
  `expiration_date` date DEFAULT NULL,
  `notes` text,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_remito_items_remito` (`remito_id`),
  KEY `idx_remito_items_product` (`product_id`),
  KEY `idx_remito_items_status` (`status`),
  CONSTRAINT `remito_items_ibfk_1` FOREIGN KEY (`remito_id`) REFERENCES `remitos` (`id`) ON DELETE CASCADE,
  CONSTRAINT `remito_items_ibfk_2` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Volcando datos para la tabla mfcomputers.remito_items: ~0 rows (aproximadamente)

-- Volcando estructura para tabla mfcomputers.role_permissions
CREATE TABLE IF NOT EXISTS `role_permissions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `role` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Rol del usuario (admin, manager, gerencia, ventas, etc)',
  `permission_id` int NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_role_permission` (`role`,`permission_id`),
  KEY `idx_role` (`role`),
  KEY `idx_permission` (`permission_id`),
  CONSTRAINT `role_permissions_ibfk_1` FOREIGN KEY (`permission_id`) REFERENCES `permissions` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=286 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Volcando datos para la tabla mfcomputers.role_permissions: ~200 rows (aproximadamente)
INSERT INTO `role_permissions` (`id`, `role`, `permission_id`, `created_at`) VALUES
	(1, 'admin', 27, '2025-11-04 00:34:27'),
	(2, 'admin', 28, '2025-11-04 00:34:27'),
	(3, 'admin', 29, '2025-11-04 00:34:27'),
	(4, 'admin', 22, '2025-11-04 00:34:27'),
	(5, 'admin', 23, '2025-11-04 00:34:27'),
	(6, 'admin', 24, '2025-11-04 00:34:27'),
	(7, 'admin', 25, '2025-11-04 00:34:27'),
	(8, 'admin', 26, '2025-11-04 00:34:27'),
	(9, 'admin', 34, '2025-11-04 00:34:27'),
	(10, 'admin', 35, '2025-11-04 00:34:27'),
	(11, 'admin', 36, '2025-11-04 00:34:27'),
	(12, 'admin', 37, '2025-11-04 00:34:27'),
	(13, 'admin', 38, '2025-11-04 00:34:27'),
	(14, 'admin', 39, '2025-11-04 00:34:27'),
	(15, 'admin', 40, '2025-11-04 00:34:27'),
	(16, 'admin', 41, '2025-11-04 00:34:27'),
	(17, 'admin', 42, '2025-11-04 00:34:27'),
	(18, 'admin', 43, '2025-11-04 00:34:27'),
	(19, 'admin', 8, '2025-11-04 00:34:27'),
	(20, 'admin', 9, '2025-11-04 00:34:27'),
	(21, 'admin', 10, '2025-11-04 00:34:27'),
	(22, 'admin', 11, '2025-11-04 00:34:27'),
	(23, 'admin', 12, '2025-11-04 00:34:27'),
	(24, 'admin', 13, '2025-11-04 00:34:27'),
	(25, 'admin', 14, '2025-11-04 00:34:27'),
	(26, 'admin', 30, '2025-11-04 00:34:27'),
	(27, 'admin', 31, '2025-11-04 00:34:27'),
	(28, 'admin', 32, '2025-11-04 00:34:27'),
	(29, 'admin', 33, '2025-11-04 00:34:27'),
	(30, 'admin', 1, '2025-11-04 00:34:27'),
	(31, 'admin', 2, '2025-11-04 00:34:27'),
	(32, 'admin', 3, '2025-11-04 00:34:27'),
	(33, 'admin', 4, '2025-11-04 00:34:27'),
	(34, 'admin', 5, '2025-11-04 00:34:27'),
	(35, 'admin', 6, '2025-11-04 00:34:27'),
	(36, 'admin', 7, '2025-11-04 00:34:27'),
	(37, 'admin', 15, '2025-11-04 00:34:27'),
	(38, 'admin', 16, '2025-11-04 00:34:27'),
	(39, 'admin', 17, '2025-11-04 00:34:27'),
	(40, 'admin', 18, '2025-11-04 00:34:27'),
	(41, 'admin', 19, '2025-11-04 00:34:27'),
	(42, 'admin', 20, '2025-11-04 00:34:27'),
	(43, 'admin', 21, '2025-11-04 00:34:27'),
	(44, 'admin', 44, '2025-11-04 00:34:27'),
	(45, 'admin', 45, '2025-11-04 00:34:27'),
	(46, 'admin', 46, '2025-11-04 00:34:27'),
	(47, 'admin', 47, '2025-11-04 00:34:27'),
	(48, 'admin', 48, '2025-11-04 00:34:27'),
	(49, 'admin', 49, '2025-11-04 00:34:27'),
	(50, 'admin', 50, '2025-11-04 00:34:27'),
	(65, 'gerencia', 28, '2025-11-04 00:34:27'),
	(66, 'gerencia', 27, '2025-11-04 00:34:27'),
	(67, 'gerencia', 23, '2025-11-04 00:34:27'),
	(68, 'gerencia', 25, '2025-11-04 00:34:27'),
	(69, 'gerencia', 24, '2025-11-04 00:34:27'),
	(70, 'gerencia', 22, '2025-11-04 00:34:27'),
	(71, 'gerencia', 26, '2025-11-04 00:34:27'),
	(72, 'gerencia', 34, '2025-11-04 00:34:27'),
	(73, 'gerencia', 36, '2025-11-04 00:34:27'),
	(74, 'gerencia', 35, '2025-11-04 00:34:27'),
	(75, 'gerencia', 38, '2025-11-04 00:34:27'),
	(76, 'gerencia', 41, '2025-11-04 00:34:27'),
	(77, 'gerencia', 43, '2025-11-04 00:34:27'),
	(78, 'gerencia', 39, '2025-11-04 00:34:27'),
	(79, 'gerencia', 37, '2025-11-04 00:34:27'),
	(80, 'gerencia', 42, '2025-11-04 00:34:27'),
	(81, 'gerencia', 9, '2025-11-04 00:34:27'),
	(82, 'gerencia', 13, '2025-11-04 00:34:27'),
	(83, 'gerencia', 10, '2025-11-04 00:34:27'),
	(84, 'gerencia', 14, '2025-11-04 00:34:27'),
	(85, 'gerencia', 8, '2025-11-04 00:34:27'),
	(86, 'gerencia', 12, '2025-11-04 00:34:27'),
	(87, 'gerencia', 31, '2025-11-04 00:34:27'),
	(88, 'gerencia', 33, '2025-11-04 00:34:27'),
	(89, 'gerencia', 32, '2025-11-04 00:34:27'),
	(90, 'gerencia', 30, '2025-11-04 00:34:27'),
	(91, 'gerencia', 2, '2025-11-04 00:34:27'),
	(92, 'gerencia', 6, '2025-11-04 00:34:27'),
	(93, 'gerencia', 3, '2025-11-04 00:34:27'),
	(94, 'gerencia', 1, '2025-11-04 00:34:27'),
	(95, 'gerencia', 7, '2025-11-04 00:34:27'),
	(96, 'gerencia', 16, '2025-11-04 00:34:27'),
	(97, 'gerencia', 20, '2025-11-04 00:34:27'),
	(98, 'gerencia', 21, '2025-11-04 00:34:27'),
	(99, 'gerencia', 17, '2025-11-04 00:34:27'),
	(100, 'gerencia', 15, '2025-11-04 00:34:27'),
	(101, 'gerencia', 19, '2025-11-04 00:34:27'),
	(102, 'gerencia', 45, '2025-11-04 00:34:27'),
	(103, 'gerencia', 46, '2025-11-04 00:34:27'),
	(104, 'gerencia', 44, '2025-11-04 00:34:27'),
	(127, 'ventas', 23, '2025-11-04 00:34:27'),
	(128, 'ventas', 24, '2025-11-04 00:34:27'),
	(129, 'ventas', 22, '2025-11-04 00:34:27'),
	(130, 'ventas', 26, '2025-11-04 00:34:27'),
	(131, 'ventas', 34, '2025-11-04 00:34:27'),
	(132, 'ventas', 35, '2025-11-04 00:34:27'),
	(133, 'ventas', 9, '2025-11-04 00:34:27'),
	(134, 'ventas', 13, '2025-11-04 00:34:27'),
	(135, 'ventas', 10, '2025-11-04 00:34:27'),
	(136, 'ventas', 8, '2025-11-04 00:34:27'),
	(137, 'ventas', 12, '2025-11-04 00:34:27'),
	(138, 'ventas', 31, '2025-11-04 00:34:27'),
	(139, 'ventas', 30, '2025-11-04 00:34:27'),
	(140, 'ventas', 1, '2025-11-04 00:34:27'),
	(141, 'ventas', 7, '2025-11-04 00:34:27'),
	(142, 'logistica', 34, '2025-11-04 00:34:27'),
	(143, 'logistica', 38, '2025-11-04 00:34:27'),
	(144, 'logistica', 41, '2025-11-04 00:34:27'),
	(145, 'logistica', 43, '2025-11-04 00:34:27'),
	(146, 'logistica', 39, '2025-11-04 00:34:27'),
	(147, 'logistica', 37, '2025-11-04 00:34:27'),
	(148, 'logistica', 42, '2025-11-04 00:34:27'),
	(149, 'logistica', 14, '2025-11-04 00:34:27'),
	(150, 'logistica', 8, '2025-11-04 00:34:27'),
	(151, 'logistica', 12, '2025-11-04 00:34:27'),
	(152, 'logistica', 6, '2025-11-04 00:34:27'),
	(153, 'logistica', 1, '2025-11-04 00:34:27'),
	(154, 'logistica', 7, '2025-11-04 00:34:27'),
	(155, 'logistica', 20, '2025-11-04 00:34:27'),
	(156, 'logistica', 15, '2025-11-04 00:34:27'),
	(157, 'finanzas', 29, '2025-11-04 00:34:27'),
	(158, 'finanzas', 28, '2025-11-04 00:34:27'),
	(159, 'finanzas', 27, '2025-11-04 00:34:27'),
	(160, 'finanzas', 22, '2025-11-04 00:34:27'),
	(161, 'finanzas', 26, '2025-11-04 00:34:27'),
	(162, 'finanzas', 34, '2025-11-04 00:34:27'),
	(163, 'finanzas', 35, '2025-11-04 00:34:27'),
	(164, 'finanzas', 8, '2025-11-04 00:34:27'),
	(165, 'finanzas', 12, '2025-11-04 00:34:27'),
	(166, 'finanzas', 31, '2025-11-04 00:34:27'),
	(167, 'finanzas', 33, '2025-11-04 00:34:27'),
	(168, 'finanzas', 32, '2025-11-04 00:34:27'),
	(169, 'finanzas', 30, '2025-11-04 00:34:27'),
	(170, 'finanzas', 1, '2025-11-04 00:34:27'),
	(171, 'finanzas', 7, '2025-11-04 00:34:27'),
	(172, 'finanzas', 16, '2025-11-04 00:34:27'),
	(173, 'finanzas', 20, '2025-11-04 00:34:27'),
	(174, 'finanzas', 21, '2025-11-04 00:34:27'),
	(175, 'finanzas', 17, '2025-11-04 00:34:27'),
	(176, 'finanzas', 15, '2025-11-04 00:34:27'),
	(177, 'finanzas', 19, '2025-11-04 00:34:27'),
	(188, 'manager', 29, '2025-11-04 00:34:27'),
	(189, 'manager', 28, '2025-11-04 00:34:27'),
	(190, 'manager', 27, '2025-11-04 00:34:27'),
	(191, 'manager', 23, '2025-11-04 00:34:27'),
	(192, 'manager', 25, '2025-11-04 00:34:27'),
	(193, 'manager', 24, '2025-11-04 00:34:27'),
	(194, 'manager', 22, '2025-11-04 00:34:27'),
	(195, 'manager', 26, '2025-11-04 00:34:27'),
	(196, 'manager', 34, '2025-11-04 00:34:27'),
	(197, 'manager', 36, '2025-11-04 00:34:27'),
	(198, 'manager', 35, '2025-11-04 00:34:27'),
	(199, 'manager', 38, '2025-11-04 00:34:27'),
	(200, 'manager', 41, '2025-11-04 00:34:27'),
	(201, 'manager', 43, '2025-11-04 00:34:27'),
	(202, 'manager', 39, '2025-11-04 00:34:27'),
	(203, 'manager', 37, '2025-11-04 00:34:27'),
	(204, 'manager', 42, '2025-11-04 00:34:27'),
	(205, 'manager', 9, '2025-11-04 00:34:27'),
	(206, 'manager', 13, '2025-11-04 00:34:27'),
	(207, 'manager', 10, '2025-11-04 00:34:27'),
	(208, 'manager', 14, '2025-11-04 00:34:27'),
	(209, 'manager', 8, '2025-11-04 00:34:27'),
	(210, 'manager', 12, '2025-11-04 00:34:27'),
	(211, 'manager', 31, '2025-11-04 00:34:27'),
	(212, 'manager', 33, '2025-11-04 00:34:27'),
	(213, 'manager', 32, '2025-11-04 00:34:27'),
	(214, 'manager', 30, '2025-11-04 00:34:27'),
	(215, 'manager', 2, '2025-11-04 00:34:27'),
	(216, 'manager', 6, '2025-11-04 00:34:27'),
	(217, 'manager', 3, '2025-11-04 00:34:27'),
	(218, 'manager', 1, '2025-11-04 00:34:27'),
	(219, 'manager', 7, '2025-11-04 00:34:27'),
	(220, 'manager', 16, '2025-11-04 00:34:27'),
	(221, 'manager', 20, '2025-11-04 00:34:27'),
	(222, 'manager', 21, '2025-11-04 00:34:27'),
	(223, 'manager', 17, '2025-11-04 00:34:27'),
	(224, 'manager', 15, '2025-11-04 00:34:27'),
	(225, 'manager', 19, '2025-11-04 00:34:27'),
	(226, 'manager', 44, '2025-11-04 00:34:27'),
	(251, 'employee', 22, '2025-11-04 00:34:27'),
	(252, 'employee', 34, '2025-11-04 00:34:27'),
	(253, 'employee', 9, '2025-11-04 00:34:27'),
	(254, 'employee', 8, '2025-11-04 00:34:27'),
	(255, 'employee', 1, '2025-11-04 00:34:27'),
	(258, 'viewer', 27, '2025-11-04 00:34:27'),
	(259, 'viewer', 22, '2025-11-04 00:34:27'),
	(260, 'viewer', 26, '2025-11-04 00:34:27'),
	(261, 'viewer', 34, '2025-11-04 00:34:27'),
	(262, 'viewer', 36, '2025-11-04 00:34:27'),
	(263, 'viewer', 35, '2025-11-04 00:34:27'),
	(264, 'viewer', 8, '2025-11-04 00:34:27'),
	(265, 'viewer', 12, '2025-11-04 00:34:27'),
	(266, 'viewer', 30, '2025-11-04 00:34:27'),
	(267, 'viewer', 1, '2025-11-04 00:34:27'),
	(268, 'viewer', 7, '2025-11-04 00:34:27'),
	(269, 'viewer', 15, '2025-11-04 00:34:27'),
	(270, 'viewer', 19, '2025-11-04 00:34:27'),
	(271, 'viewer', 44, '2025-11-04 00:34:27'),
	(274, 'gerencia', 29, '2025-11-06 21:48:33'),
	(275, 'gerencia', 40, '2025-11-06 21:48:39'),
	(276, 'gerencia', 11, '2025-11-06 21:48:44'),
	(277, 'ventas', 38, '2025-11-07 01:15:05'),
	(278, 'gerencia', 4, '2025-11-07 03:16:58'),
	(279, 'gerencia', 5, '2025-11-07 03:17:00'),
	(280, 'gerencia', 18, '2025-11-07 03:17:03'),
	(281, 'gerencia', 48, '2025-11-07 03:17:08'),
	(282, 'gerencia', 49, '2025-11-07 03:17:10'),
	(283, 'gerencia', 47, '2025-11-07 03:17:13'),
	(284, 'gerencia', 50, '2025-11-07 03:17:16');

-- Volcando estructura para tabla mfcomputers.stock_movements
CREATE TABLE IF NOT EXISTS `stock_movements` (
  `id` int NOT NULL AUTO_INCREMENT,
  `product_id` int NOT NULL,
  `movement_type` enum('salida_remito','entrada_devolucion','traslado_interno','ajuste_inventario') NOT NULL,
  `remito_id` int DEFAULT NULL,
  `reference_number` varchar(50) DEFAULT NULL,
  `reference_type` enum('remito','devolucion','traslado','ajuste') NOT NULL,
  `quantity` int NOT NULL,
  `unit_cost` decimal(10,2) DEFAULT NULL,
  `total_cost` decimal(10,2) DEFAULT NULL,
  `from_location` varchar(100) DEFAULT NULL,
  `to_location` varchar(100) DEFAULT NULL,
  `batch_number` varchar(50) DEFAULT NULL,
  `notes` text,
  `created_by` int DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `created_by` (`created_by`),
  KEY `idx_stock_movements_product` (`product_id`),
  KEY `idx_stock_movements_remito` (`remito_id`),
  KEY `idx_stock_movements_type` (`movement_type`),
  KEY `idx_stock_movements_date` (`created_at`),
  CONSTRAINT `stock_movements_ibfk_1` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`),
  CONSTRAINT `stock_movements_ibfk_2` FOREIGN KEY (`remito_id`) REFERENCES `remitos` (`id`),
  CONSTRAINT `stock_movements_ibfk_3` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Volcando datos para la tabla mfcomputers.stock_movements: ~0 rows (aproximadamente)

-- Volcando estructura para tabla mfcomputers.suppliers
CREATE TABLE IF NOT EXISTS `suppliers` (
  `id` int NOT NULL AUTO_INCREMENT,
  `code` varchar(20) NOT NULL,
  `supplier_type` enum('productivo','no_productivo','otro_pasivo') DEFAULT 'no_productivo',
  `name` varchar(100) NOT NULL,
  `legal_name` varchar(255) DEFAULT NULL COMMENT 'Razón Social del Proveedor',
  `trade_name` varchar(255) DEFAULT NULL COMMENT 'Nombre de Fantasía',
  `purchase_frequency` varchar(50) DEFAULT NULL COMMENT 'Frecuencia de Compra (diaria, semanal, mensual, etc.)',
  `id_type` enum('CUIT','CUIL','DNI','PASAPORTE','OTRO') DEFAULT NULL COMMENT 'Tipo de Identificación',
  `tax_id` varchar(20) DEFAULT NULL COMMENT 'CUIT/Número de Identificación',
  `gross_income` varchar(50) DEFAULT NULL COMMENT 'Ingresos Brutos',
  `vat_condition` enum('Responsable Inscripto','Monotributista','Exento','Iva Exento','No Responsable','Consumidor Final') DEFAULT NULL COMMENT 'Condición IVA',
  `account_description` text COMMENT 'Descripción de Cuenta Contable',
  `product_service` text COMMENT 'Producto o Servicio que provee',
  `integral_summary_account` varchar(100) DEFAULT NULL COMMENT 'Cuenta de Resumen Integral',
  `cost` decimal(12,2) DEFAULT NULL COMMENT 'Costo asociado al proveedor',
  `contact_name` varchar(100) DEFAULT NULL,
  `email` varchar(100) DEFAULT NULL,
  `phone` varchar(20) DEFAULT NULL,
  `address` text,
  `city` varchar(50) DEFAULT NULL,
  `country` varchar(50) DEFAULT 'Argentina',
  `has_account` tinyint(1) DEFAULT '1',
  `payment_terms` int DEFAULT '30' COMMENT 'Términos de pago en días',
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `code` (`code`),
  KEY `idx_suppliers_code` (`code`),
  KEY `idx_suppliers_active` (`is_active`),
  KEY `idx_suppliers_type` (`supplier_type`),
  KEY `idx_suppliers_tax_id` (`tax_id`),
  KEY `idx_suppliers_legal_name` (`legal_name`)
) ENGINE=InnoDB AUTO_INCREMENT=15 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Volcando datos para la tabla mfcomputers.suppliers: ~14 rows (aproximadamente)
INSERT INTO `suppliers` (`id`, `code`, `supplier_type`, `name`, `legal_name`, `trade_name`, `purchase_frequency`, `id_type`, `tax_id`, `gross_income`, `vat_condition`, `account_description`, `product_service`, `integral_summary_account`, `cost`, `contact_name`, `email`, `phone`, `address`, `city`, `country`, `has_account`, `payment_terms`, `is_active`, `created_at`, `updated_at`) VALUES
	(1, 'S0001', 'no_productivo', 'Proveedor Demo 1', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'p1@demo.com', '9999-1111', NULL, NULL, 'Argentina', 1, 30, 0, '2025-10-20 22:15:07', '2025-11-07 04:22:34'),
	(2, 'S0002', 'no_productivo', 'Proveedor Demo 2', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'p2@demo.com', '9999-2222', NULL, NULL, 'Argentina', 1, 30, 0, '2025-10-20 22:15:07', '2025-11-07 04:22:30'),
	(3, 'PROV001', 'no_productivo', 'Proveedor ABC S.A.', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'Juan Pérez', 'juan@proveedorabc.com', '+54 11 1234-5678', 'Av. Corrientes 1234', 'Buenos Aires', 'Argentina', 1, 30, 0, '2025-10-22 03:40:42', '2025-11-07 03:57:47'),
	(4, 'PROV002', 'no_productivo', 'Materiales Central SRL', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'María González', 'maria@materialescentral.com', '+54 11 2345-6789', 'Av. Santa Fe 5678', 'Buenos Aires', 'Argentina', 1, 30, 0, '2025-10-22 03:40:42', '2025-11-07 03:57:57'),
	(5, 'PROV003', 'no_productivo', 'Componentes Eléctricos S.A.', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'Carlos Rodríguez', 'carlos@componentes.com', '+54 11 3456-7890', 'Av. Rivadavia 9012', 'Córdoba', 'Argentina', 1, 30, 0, '2025-10-22 03:40:42', '2025-11-07 04:21:19'),
	(6, 'PROV004', 'no_productivo', 'Repuestos Industriales Ltda.', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'Ana Martínez', 'ana@repuestos.com', '+54 11 4567-8901', 'Av. Córdoba 3456', 'Rosario', 'Argentina', 1, 30, 0, '2025-10-22 03:40:42', '2025-11-07 04:21:25'),
	(7, 'PROV005', 'no_productivo', 'Suministros Técnicos S.A.', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'Roberto Silva', 'roberto@suministros.com', '+54 11 5678-9012', 'Av. 9 de Julio 7890', 'Buenos Aires', 'Argentina', 1, 30, 0, '2025-10-22 03:40:42', '2025-11-07 04:21:37'),
	(8, 'PROV006', 'no_productivo', 'Herramientas del Sur', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'Laura Fernández', 'laura@herramientas.com', '+54 11 6789-0123', 'Av. San Martín 1234', 'Mendoza', 'Argentina', 1, 30, 0, '2025-10-22 03:40:42', '2025-11-07 04:21:42'),
	(9, 'PROV007', 'no_productivo', 'Equipos Industriales SRL', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'Diego López', 'diego@equipos.com', '+54 11 7890-1234', 'Av. Belgrano 5678', 'Tucumán', 'Argentina', 1, 30, 0, '2025-10-22 03:40:42', '2025-11-07 04:21:52'),
	(10, 'PROV008', 'otro_pasivo', 'Materiales Especializados', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'Patricia García', 'patricia@materiales.com', '+54 11 8901-2345', 'Av. Libertador 9012', 'Buenos Aires', 'Argentina', 1, 30, 0, '2025-10-22 03:40:42', '2025-11-07 04:42:38'),
	(11, 'PROV009', 'otro_pasivo', 'Componentes del Litoral', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'Miguel Torres', 'miguel@litoral.com', '+54 11 9012-3456', 'Av. Entre Ríos 3456', 'Paraná', 'Argentina', 1, 30, 1, '2025-10-22 03:40:42', '2025-11-07 04:42:35'),
	(12, 'PROV010', 'otro_pasivo', 'Suministros del Interior', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'Sandra Morales', 'sandra@interior.com', '+54 11 0123-4567', 'Av. Sarmiento 7890', 'Salta', 'Argentina', 1, 30, 1, '2025-10-22 03:40:42', '2025-11-07 04:42:40'),
	(13, '1', 'no_productivo', 'ARCA', 'AGENCIA DE RECAUDACION Y CONTROL ADUANERO', 'ARCA', 'mensual', 'CUIT', '33693450239', 'S/D', 'Iva Exento', NULL, NULL, 'ARCA - Autónomos', 0.00, NULL, NULL, NULL, NULL, NULL, 'Argentina', 1, 30, 1, '2025-11-07 03:31:34', '2025-11-07 04:04:57'),
	(14, '2', 'productivo', 'ALSAPEMA S.A', 'ALSAPEMA S.A', 'ALSAPEMA', 'quincenal', 'CUIT', '33693450239', '30708218614', 'Responsable Inscripto', NULL, NULL, 'Proveedores Productivos', NULL, NULL, NULL, NULL, NULL, NULL, 'Argentina', 1, 30, 1, '2025-11-07 04:14:28', '2025-11-07 04:14:28');

-- Volcando estructura para tabla mfcomputers.supplier_accounts
CREATE TABLE IF NOT EXISTS `supplier_accounts` (
  `id` int NOT NULL AUTO_INCREMENT,
  `supplier_id` int NOT NULL,
  `commitment_balance` decimal(12,2) DEFAULT '0.00' COMMENT 'Compromisos',
  `debt_balance` decimal(12,2) DEFAULT '0.00' COMMENT 'Deuda real',
  `total_balance` decimal(12,2) DEFAULT '0.00' COMMENT 'Total (commitment + debt)',
  `credit_limit` decimal(12,2) DEFAULT '0.00',
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `supplier_id` (`supplier_id`),
  KEY `idx_supplier_accounts_supplier` (`supplier_id`),
  KEY `idx_supplier_accounts_active` (`is_active`),
  CONSTRAINT `supplier_accounts_ibfk_1` FOREIGN KEY (`supplier_id`) REFERENCES `suppliers` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=13 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Volcando datos para la tabla mfcomputers.supplier_accounts: ~12 rows (aproximadamente)
INSERT INTO `supplier_accounts` (`id`, `supplier_id`, `commitment_balance`, `debt_balance`, `total_balance`, `credit_limit`, `is_active`, `created_at`, `updated_at`) VALUES
	(1, 1, 0.00, 0.00, 0.00, 100000.00, 1, '2025-11-06 22:58:14', '2025-11-06 22:58:14'),
	(2, 2, 0.00, 0.00, 0.00, 100000.00, 1, '2025-11-06 22:58:14', '2025-11-06 22:58:14'),
	(3, 3, 0.00, 0.00, 0.00, 100000.00, 1, '2025-11-06 22:58:14', '2025-11-06 22:58:14'),
	(4, 4, 0.00, 0.00, 0.00, 100000.00, 1, '2025-11-06 22:58:14', '2025-11-06 22:58:14'),
	(5, 5, 0.00, 0.00, 0.00, 100000.00, 1, '2025-11-06 22:58:14', '2025-11-06 22:58:14'),
	(6, 6, 0.00, 0.00, 0.00, 100000.00, 1, '2025-11-06 22:58:14', '2025-11-06 22:58:14'),
	(7, 7, 0.00, 0.00, 0.00, 100000.00, 1, '2025-11-06 22:58:14', '2025-11-06 22:58:14'),
	(8, 8, 0.00, 0.00, 0.00, 100000.00, 1, '2025-11-06 22:58:14', '2025-11-06 22:58:14'),
	(9, 9, 0.00, 0.00, 0.00, 100000.00, 1, '2025-11-06 22:58:14', '2025-11-06 22:58:14'),
	(10, 10, 0.00, 0.00, 0.00, 100000.00, 1, '2025-11-06 22:58:14', '2025-11-06 22:58:14'),
	(11, 11, 0.00, 0.00, 0.00, 100000.00, 1, '2025-11-06 22:58:14', '2025-11-06 22:58:14'),
	(12, 12, 0.00, 0.00, 0.00, 100000.00, 1, '2025-11-06 22:58:14', '2025-11-06 22:58:14');

-- Volcando estructura para tabla mfcomputers.supplier_account_movements
CREATE TABLE IF NOT EXISTS `supplier_account_movements` (
  `id` int NOT NULL AUTO_INCREMENT,
  `supplier_account_id` int NOT NULL,
  `movement_type` enum('commitment','debt','payment','adjustment') COLLATE utf8mb4_unicode_ci NOT NULL,
  `type` enum('debit','credit') COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Débito = aumenta deuda, Crédito = pago',
  `amount` decimal(12,2) NOT NULL,
  `balance_after` decimal(12,2) NOT NULL COMMENT 'Balance después del movimiento',
  `reference_type` enum('purchase','invoice','payment','delivery_note','adjustment') COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `reference_id` int DEFAULT NULL,
  `description` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `due_date` date DEFAULT NULL COMMENT 'Fecha de vencimiento (para deudas)',
  `payment_date` date DEFAULT NULL COMMENT 'Fecha de pago (si aplica)',
  `status` enum('pending','paid','overdue','cancelled') COLLATE utf8mb4_unicode_ci DEFAULT 'pending',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_movements_account` (`supplier_account_id`),
  KEY `idx_movements_type` (`movement_type`),
  KEY `idx_movements_reference` (`reference_type`,`reference_id`),
  KEY `idx_movements_status` (`status`),
  KEY `idx_movements_date` (`created_at`),
  CONSTRAINT `supplier_account_movements_ibfk_1` FOREIGN KEY (`supplier_account_id`) REFERENCES `supplier_accounts` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Volcando datos para la tabla mfcomputers.supplier_account_movements: ~0 rows (aproximadamente)

-- Volcando estructura para tabla mfcomputers.supplier_delivery_notes
CREATE TABLE IF NOT EXISTS `supplier_delivery_notes` (
  `id` int NOT NULL AUTO_INCREMENT,
  `delivery_note_number` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `supplier_id` int NOT NULL,
  `purchase_id` int NOT NULL COMMENT 'OC relacionada',
  `invoice_id` int DEFAULT NULL COMMENT 'Factura relacionada (puede ser NULL si se recibe antes)',
  `delivery_date` date NOT NULL,
  `received_date` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `status` enum('pending','partial','complete','cancelled') COLLATE utf8mb4_unicode_ci DEFAULT 'pending',
  `matches_invoice` tinyint(1) DEFAULT '0' COMMENT 'Si coincide con factura',
  `notes` text COLLATE utf8mb4_unicode_ci,
  `received_by` int DEFAULT NULL COMMENT 'Usuario que recibió',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `delivery_note_number` (`delivery_note_number`),
  KEY `received_by` (`received_by`),
  KEY `idx_delivery_notes_supplier` (`supplier_id`),
  KEY `idx_delivery_notes_purchase` (`purchase_id`),
  KEY `idx_delivery_notes_invoice` (`invoice_id`),
  KEY `idx_delivery_notes_number` (`delivery_note_number`),
  KEY `idx_delivery_notes_status` (`status`),
  CONSTRAINT `supplier_delivery_notes_ibfk_1` FOREIGN KEY (`supplier_id`) REFERENCES `suppliers` (`id`),
  CONSTRAINT `supplier_delivery_notes_ibfk_2` FOREIGN KEY (`purchase_id`) REFERENCES `purchases` (`id`),
  CONSTRAINT `supplier_delivery_notes_ibfk_3` FOREIGN KEY (`invoice_id`) REFERENCES `supplier_invoices` (`id`),
  CONSTRAINT `supplier_delivery_notes_ibfk_4` FOREIGN KEY (`received_by`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Volcando datos para la tabla mfcomputers.supplier_delivery_notes: ~0 rows (aproximadamente)

-- Volcando estructura para tabla mfcomputers.supplier_delivery_note_items
CREATE TABLE IF NOT EXISTS `supplier_delivery_note_items` (
  `id` int NOT NULL AUTO_INCREMENT,
  `delivery_note_id` int NOT NULL,
  `material_code` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `product_id` int DEFAULT NULL,
  `quantity` decimal(10,2) NOT NULL,
  `purchase_item_id` int DEFAULT NULL COMMENT 'Item de OC',
  `invoice_item_id` int DEFAULT NULL COMMENT 'Item de factura',
  `quality_check` tinyint(1) DEFAULT '0',
  `quality_notes` text COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `purchase_item_id` (`purchase_item_id`),
  KEY `invoice_item_id` (`invoice_item_id`),
  KEY `idx_delivery_note_items_delivery` (`delivery_note_id`),
  KEY `idx_delivery_note_items_material` (`material_code`),
  KEY `idx_delivery_note_items_product` (`product_id`),
  CONSTRAINT `supplier_delivery_note_items_ibfk_1` FOREIGN KEY (`delivery_note_id`) REFERENCES `supplier_delivery_notes` (`id`) ON DELETE CASCADE,
  CONSTRAINT `supplier_delivery_note_items_ibfk_2` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`),
  CONSTRAINT `supplier_delivery_note_items_ibfk_3` FOREIGN KEY (`purchase_item_id`) REFERENCES `purchase_items` (`id`),
  CONSTRAINT `supplier_delivery_note_items_ibfk_4` FOREIGN KEY (`invoice_item_id`) REFERENCES `supplier_invoice_items` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Volcando datos para la tabla mfcomputers.supplier_delivery_note_items: ~0 rows (aproximadamente)

-- Volcando estructura para tabla mfcomputers.supplier_invoices
CREATE TABLE IF NOT EXISTS `supplier_invoices` (
  `id` int NOT NULL AUTO_INCREMENT,
  `invoice_number` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Número de factura del proveedor',
  `supplier_id` int NOT NULL,
  `purchase_id` int DEFAULT NULL COMMENT 'OC relacionada (opcional al inicio)',
  `invoice_date` date NOT NULL,
  `due_date` date DEFAULT NULL COMMENT 'Fecha de vencimiento',
  `subtotal` decimal(12,2) NOT NULL DEFAULT '0.00',
  `tax_amount` decimal(12,2) DEFAULT '0.00',
  `total_amount` decimal(12,2) NOT NULL DEFAULT '0.00',
  `status` enum('draft','received','partial_paid','paid','cancelled') COLLATE utf8mb4_unicode_ci DEFAULT 'received',
  `payment_status` enum('pending','partial','paid','overdue') COLLATE utf8mb4_unicode_ci DEFAULT 'pending',
  `delivery_note_id` int DEFAULT NULL COMMENT 'Remito relacionado',
  `notes` text COLLATE utf8mb4_unicode_ci,
  `file_url` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'URL del PDF de la factura',
  `created_by` int DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `invoice_number` (`invoice_number`),
  KEY `created_by` (`created_by`),
  KEY `idx_invoices_supplier` (`supplier_id`),
  KEY `idx_invoices_purchase` (`purchase_id`),
  KEY `idx_invoices_number` (`invoice_number`),
  KEY `idx_invoices_date` (`invoice_date`),
  KEY `idx_invoices_status` (`status`),
  KEY `idx_invoices_payment_status` (`payment_status`),
  KEY `supplier_invoices_ibfk_delivery` (`delivery_note_id`),
  CONSTRAINT `supplier_invoices_ibfk_1` FOREIGN KEY (`supplier_id`) REFERENCES `suppliers` (`id`),
  CONSTRAINT `supplier_invoices_ibfk_2` FOREIGN KEY (`purchase_id`) REFERENCES `purchases` (`id`),
  CONSTRAINT `supplier_invoices_ibfk_3` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`),
  CONSTRAINT `supplier_invoices_ibfk_delivery` FOREIGN KEY (`delivery_note_id`) REFERENCES `supplier_delivery_notes` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Volcando datos para la tabla mfcomputers.supplier_invoices: ~0 rows (aproximadamente)

-- Volcando estructura para tabla mfcomputers.supplier_invoice_items
CREATE TABLE IF NOT EXISTS `supplier_invoice_items` (
  `id` int NOT NULL AUTO_INCREMENT,
  `invoice_id` int NOT NULL,
  `material_code` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `product_id` int DEFAULT NULL COMMENT 'Opcional, vinculación con producto',
  `description` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `quantity` decimal(10,2) NOT NULL,
  `unit_price` decimal(10,2) NOT NULL,
  `total_price` decimal(10,2) NOT NULL,
  `unit_cost` decimal(10,2) DEFAULT NULL COMMENT 'Costo unitario para producción',
  `affects_production_cost` tinyint(1) DEFAULT '1' COMMENT 'Si afecta costo de producción',
  `purchase_item_id` int DEFAULT NULL COMMENT 'Item de OC relacionado',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `purchase_item_id` (`purchase_item_id`),
  KEY `idx_invoice_items_invoice` (`invoice_id`),
  KEY `idx_invoice_items_material` (`material_code`),
  KEY `idx_invoice_items_product` (`product_id`),
  CONSTRAINT `supplier_invoice_items_ibfk_1` FOREIGN KEY (`invoice_id`) REFERENCES `supplier_invoices` (`id`) ON DELETE CASCADE,
  CONSTRAINT `supplier_invoice_items_ibfk_2` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`),
  CONSTRAINT `supplier_invoice_items_ibfk_3` FOREIGN KEY (`purchase_item_id`) REFERENCES `purchase_items` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Volcando datos para la tabla mfcomputers.supplier_invoice_items: ~0 rows (aproximadamente)

-- Volcando estructura para tabla mfcomputers.sync_status
CREATE TABLE IF NOT EXISTS `sync_status` (
  `id` int NOT NULL AUTO_INCREMENT,
  `product_id` int NOT NULL,
  `woocommerce_id` int DEFAULT NULL,
  `sync_status` enum('pending','synced','error','manual') DEFAULT 'pending',
  `last_sync` timestamp NULL DEFAULT NULL,
  `error_message` text,
  `make_scenario_id` varchar(100) DEFAULT NULL,
  `retry_count` int DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_product_sync` (`product_id`),
  KEY `idx_sync_status_product` (`product_id`),
  KEY `idx_sync_status_woocommerce` (`woocommerce_id`),
  KEY `idx_sync_status_status` (`sync_status`),
  CONSTRAINT `sync_status_ibfk_1` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='Estado de sincronización de productos';

-- Volcando datos para la tabla mfcomputers.sync_status: ~0 rows (aproximadamente)

-- Volcando estructura para tabla mfcomputers.transport_companies
CREATE TABLE IF NOT EXISTS `transport_companies` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  `contact_person` varchar(100) DEFAULT NULL,
  `email` varchar(100) DEFAULT NULL,
  `phone` varchar(20) DEFAULT NULL,
  `address` text,
  `services` json DEFAULT NULL,
  `coverage_zones` json DEFAULT NULL,
  `rates` json DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Volcando datos para la tabla mfcomputers.transport_companies: ~3 rows (aproximadamente)
INSERT INTO `transport_companies` (`id`, `name`, `contact_person`, `email`, `phone`, `address`, `services`, `coverage_zones`, `rates`, `is_active`, `created_at`, `updated_at`) VALUES
	(1, 'OCA', 'Contacto OCA', 'contacto@oca.com.ar', '0810-888-6222', NULL, '["envio_estandar", "envio_express", "envio_express_24hs"]', '["capital_federal", "gba", "interior"]', NULL, 1, '2025-10-12 23:51:02', '2025-10-12 23:51:02'),
	(2, 'Correo Argentino', 'Contacto Correo', 'contacto@correoargentino.com.ar', '0810-222-2276', NULL, '["envio_estandar", "envio_certificado"]', '["nacional"]', NULL, 1, '2025-10-12 23:51:02', '2025-10-12 23:51:02'),
	(3, 'Andreani', 'Contacto Andreani', 'contacto@andreani.com.ar', '0810-777-2627', NULL, '["envio_estandar", "envio_express"]', '["capital_federal", "gba", "interior"]', NULL, 1, '2025-10-12 23:51:02', '2025-10-12 23:51:02');

-- Volcando estructura para tabla mfcomputers.trazabilidad
CREATE TABLE IF NOT EXISTS `trazabilidad` (
  `id` int NOT NULL AUTO_INCREMENT,
  `remito_id` int NOT NULL,
  `product_id` int NOT NULL,
  `stage` enum('fabricacion','control_calidad','almacenamiento','preparacion','despacho','transito','entrega','devuelto') NOT NULL,
  `location` varchar(100) DEFAULT NULL,
  `location_details` text,
  `responsible_person` varchar(100) DEFAULT NULL,
  `responsible_user_id` int DEFAULT NULL,
  `stage_start` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `stage_end` timestamp NULL DEFAULT NULL,
  `duration_minutes` int DEFAULT NULL,
  `temperature` decimal(5,2) DEFAULT NULL,
  `humidity` decimal(5,2) DEFAULT NULL,
  `quality_check` tinyint(1) DEFAULT '0',
  `quality_notes` text,
  `vehicle_plate` varchar(20) DEFAULT NULL,
  `driver_name` varchar(100) DEFAULT NULL,
  `driver_phone` varchar(20) DEFAULT NULL,
  `notes` text,
  `photos` json DEFAULT NULL,
  `documents` json DEFAULT NULL,
  `is_automatic` tinyint(1) DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `responsible_user_id` (`responsible_user_id`),
  KEY `idx_trazabilidad_remito` (`remito_id`),
  KEY `idx_trazabilidad_product` (`product_id`),
  KEY `idx_trazabilidad_stage` (`stage`),
  KEY `idx_trazabilidad_date` (`stage_start`),
  CONSTRAINT `trazabilidad_ibfk_1` FOREIGN KEY (`remito_id`) REFERENCES `remitos` (`id`),
  CONSTRAINT `trazabilidad_ibfk_2` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`),
  CONSTRAINT `trazabilidad_ibfk_3` FOREIGN KEY (`responsible_user_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Volcando datos para la tabla mfcomputers.trazabilidad: ~0 rows (aproximadamente)

-- Volcando estructura para tabla mfcomputers.users
CREATE TABLE IF NOT EXISTS `users` (
  `id` int NOT NULL AUTO_INCREMENT,
  `username` varchar(50) NOT NULL,
  `email` varchar(100) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `first_name` varchar(50) NOT NULL,
  `last_name` varchar(50) NOT NULL,
  `role` enum('admin','manager','employee','viewer','gerencia','ventas','logistica','finanzas') DEFAULT 'employee',
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `username` (`username`),
  UNIQUE KEY `email` (`email`)
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Volcando datos para la tabla mfcomputers.users: ~3 rows (aproximadamente)
INSERT INTO `users` (`id`, `username`, `email`, `password_hash`, `first_name`, `last_name`, `role`, `is_active`, `created_at`, `updated_at`) VALUES
	(2, 'gerente1', 'gerente1@mfcomputers.com', '$2a$10$L9sQyrMsC.GumrAj3atyx.1l8ZjWr4KAcez1E7/tjmrdFBS7krOlm', 'Ana', 'García', 'gerencia', 1, '2025-09-22 23:27:15', '2025-11-06 22:05:09'),
	(3, 'vendedor1', 'vendedor1@mfcomputers.com', '$2a$10$MGOE9Tpfajdnx3kH8T9Kj.BDJyKRQh3Izo4Cjj8i1uYFJwFnXc0de', 'Luis', 'Pérez', 'ventas', 1, '2025-09-22 23:39:20', '2025-09-22 23:39:20'),
	(7, 'logistica1', 'fernandotadeos@gmail.com', '$2a$10$.uSZPMrQeJ8i3WaxpFGsruQXszHGuyvF9Fpd0GISXdCL5Jr47uwCu', 'Fernando ', 'Tadeo', 'logistica', 1, '2025-11-07 20:00:06', '2025-11-07 20:00:06');

-- Volcando estructura para tabla mfcomputers.user_permissions
CREATE TABLE IF NOT EXISTS `user_permissions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `permission_id` int NOT NULL,
  `granted_by` int DEFAULT NULL COMMENT 'ID del usuario que otorgó el permiso',
  `expires_at` timestamp NULL DEFAULT NULL COMMENT 'Fecha de expiración del permiso (NULL = permanente)',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_user_permission` (`user_id`,`permission_id`),
  KEY `granted_by` (`granted_by`),
  KEY `idx_user` (`user_id`),
  KEY `idx_permission` (`permission_id`),
  KEY `idx_expires` (`expires_at`),
  CONSTRAINT `user_permissions_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `user_permissions_ibfk_2` FOREIGN KEY (`permission_id`) REFERENCES `permissions` (`id`) ON DELETE CASCADE,
  CONSTRAINT `user_permissions_ibfk_3` FOREIGN KEY (`granted_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Volcando datos para la tabla mfcomputers.user_permissions: ~0 rows (aproximadamente)

-- Volcando estructura para vista mfcomputers.v_orders_ready_for_remito
-- Creando tabla temporal para superar errores de dependencia de VIEW
CREATE TABLE `v_orders_ready_for_remito` (
	`id` INT NOT NULL,
	`order_number` VARCHAR(1) NOT NULL COLLATE 'utf8mb4_unicode_ci',
	`client_id` INT NOT NULL,
	`status` ENUM('pendiente_preparacion','listo_despacho','pagado','aprobado','en_proceso','completado','cancelado') NULL COLLATE 'utf8mb4_unicode_ci',
	`total_amount` DECIMAL(12,2) NOT NULL,
	`order_date` TIMESTAMP NULL,
	`delivery_date` TIMESTAMP NULL,
	`delivery_address` TEXT NULL COLLATE 'utf8mb4_unicode_ci',
	`delivery_city` VARCHAR(1) NULL COLLATE 'utf8mb4_unicode_ci',
	`delivery_contact` VARCHAR(1) NULL COLLATE 'utf8mb4_unicode_ci',
	`delivery_phone` VARCHAR(1) NULL COLLATE 'utf8mb4_unicode_ci',
	`transport_company` VARCHAR(1) NULL COLLATE 'utf8mb4_unicode_ci',
	`transport_cost` DECIMAL(10,2) NULL,
	`notes` TEXT NULL COLLATE 'utf8mb4_unicode_ci',
	`remito_status` ENUM('sin_remito','remito_generado','remito_despachado','remito_entregado') NULL COLLATE 'utf8mb4_unicode_ci',
	`stock_reserved` TINYINT(1) NULL,
	`is_active` TINYINT(1) NULL,
	`created_by` INT NULL,
	`created_at` TIMESTAMP NULL,
	`updated_at` TIMESTAMP NULL,
	`client_name` VARCHAR(1) NULL COLLATE 'utf8mb4_0900_ai_ci',
	`client_email` VARCHAR(1) NULL COLLATE 'utf8mb4_0900_ai_ci'
) ENGINE=MyISAM;

-- Volcando estructura para vista mfcomputers.v_orders_with_clients
-- Creando tabla temporal para superar errores de dependencia de VIEW
CREATE TABLE `v_orders_with_clients` (
	`id` INT NULL,
	`order_number` VARCHAR(1) NULL COLLATE 'utf8mb4_unicode_ci',
	`client_id` INT NULL,
	`status` ENUM('pendiente_preparacion','listo_despacho','pagado','aprobado','en_proceso','completado','cancelado') NULL COLLATE 'utf8mb4_unicode_ci',
	`total_amount` DECIMAL(12,2) NULL,
	`order_date` TIMESTAMP NULL,
	`delivery_date` TIMESTAMP NULL,
	`delivery_address` TEXT NULL COLLATE 'utf8mb4_unicode_ci',
	`delivery_city` VARCHAR(1) NULL COLLATE 'utf8mb4_unicode_ci',
	`delivery_contact` VARCHAR(1) NULL COLLATE 'utf8mb4_unicode_ci',
	`delivery_phone` VARCHAR(1) NULL COLLATE 'utf8mb4_unicode_ci',
	`transport_company` VARCHAR(1) NULL COLLATE 'utf8mb4_unicode_ci',
	`transport_cost` DECIMAL(10,2) NULL,
	`notes` TEXT NULL COLLATE 'utf8mb4_unicode_ci',
	`remito_status` ENUM('sin_remito','remito_generado','remito_despachado','remito_entregado') NULL COLLATE 'utf8mb4_unicode_ci',
	`stock_reserved` TINYINT(1) NULL,
	`is_active` TINYINT(1) NULL,
	`created_by` INT NULL,
	`created_at` TIMESTAMP NULL,
	`updated_at` TIMESTAMP NULL,
	`client_name` VARCHAR(1) NULL COLLATE 'utf8mb4_0900_ai_ci',
	`client_code` VARCHAR(1) NULL COLLATE 'utf8mb4_0900_ai_ci',
	`client_email` VARCHAR(1) NULL COLLATE 'utf8mb4_0900_ai_ci',
	`client_phone` VARCHAR(1) NULL COLLATE 'utf8mb4_0900_ai_ci',
	`client_type` ENUM('mayorista','minorista','personalizado') NULL COLLATE 'utf8mb4_0900_ai_ci',
	`items_count` BIGINT NULL
) ENGINE=MyISAM;

-- Volcando estructura para tabla mfcomputers.webhook_configs
CREATE TABLE IF NOT EXISTS `webhook_configs` (
  `id` int NOT NULL AUTO_INCREMENT,
  `system_name` varchar(50) NOT NULL COMMENT 'Nombre del sistema (woocommerce, make, etc)',
  `webhook_url` varchar(255) NOT NULL,
  `webhook_secret` varchar(255) DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='Configuración de webhooks para sistemas externos';

-- Volcando datos para la tabla mfcomputers.webhook_configs: ~2 rows (aproximadamente)
INSERT INTO `webhook_configs` (`id`, `system_name`, `webhook_url`, `webhook_secret`, `is_active`, `created_at`, `updated_at`) VALUES
	(1, 'make', 'https://hook.eu1.make.com/your-webhook-url', NULL, 1, '2025-09-14 02:47:55', '2025-09-14 02:47:55'),
	(2, 'woocommerce', 'https://your-store.com/wp-json/wc/v3/webhooks', NULL, 1, '2025-09-14 02:47:55', '2025-09-14 02:47:55');

-- Volcando estructura para disparador mfcomputers.after_order_item_delete
SET @OLDTMP_SQL_MODE=@@SQL_MODE, SQL_MODE='ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION';
DELIMITER //
CREATE TRIGGER `after_order_item_delete` AFTER DELETE ON `order_items` FOR EACH ROW BEGIN
    UPDATE orders 
    SET total_amount = (
        SELECT COALESCE(SUM(total_price), 0) 
        FROM order_items 
        WHERE order_id = OLD.order_id
    )
    WHERE id = OLD.order_id;
END//
DELIMITER ;
SET SQL_MODE=@OLDTMP_SQL_MODE;

-- Volcando estructura para disparador mfcomputers.after_order_item_insert
SET @OLDTMP_SQL_MODE=@@SQL_MODE, SQL_MODE='ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION';
DELIMITER //
CREATE TRIGGER `after_order_item_insert` AFTER INSERT ON `order_items` FOR EACH ROW BEGIN
    UPDATE orders 
    SET total_amount = (
        SELECT COALESCE(SUM(total_price), 0) 
        FROM order_items 
        WHERE order_id = NEW.order_id
    )
    WHERE id = NEW.order_id;
END//
DELIMITER ;
SET SQL_MODE=@OLDTMP_SQL_MODE;

-- Volcando estructura para disparador mfcomputers.after_order_item_update
SET @OLDTMP_SQL_MODE=@@SQL_MODE, SQL_MODE='ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION';
DELIMITER //
CREATE TRIGGER `after_order_item_update` AFTER UPDATE ON `order_items` FOR EACH ROW BEGIN
    UPDATE orders 
    SET total_amount = (
        SELECT COALESCE(SUM(total_price), 0) 
        FROM order_items 
        WHERE order_id = NEW.order_id
    )
    WHERE id = NEW.order_id;
END//
DELIMITER ;
SET SQL_MODE=@OLDTMP_SQL_MODE;

-- Volcando estructura para disparador mfcomputers.after_order_status_change
SET @OLDTMP_SQL_MODE=@@SQL_MODE, SQL_MODE='ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION';
DELIMITER //
CREATE TRIGGER `after_order_status_change` BEFORE UPDATE ON `orders` FOR EACH ROW BEGIN
    IF OLD.status != NEW.status THEN
        INSERT INTO order_status_history (order_id, previous_status, new_status, changed_by, change_reason)
        VALUES (NEW.id, OLD.status, NEW.status, NEW.created_by, 'Estado actualizado');
    END IF;
END//
DELIMITER ;
SET SQL_MODE=@OLDTMP_SQL_MODE;

-- Volcando estructura para disparador mfcomputers.before_order_item_insert
SET @OLDTMP_SQL_MODE=@@SQL_MODE, SQL_MODE='ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION';
DELIMITER //
CREATE TRIGGER `before_order_item_insert` BEFORE INSERT ON `order_items` FOR EACH ROW BEGIN
    SET NEW.total_price = NEW.quantity * NEW.unit_price;
END//
DELIMITER ;
SET SQL_MODE=@OLDTMP_SQL_MODE;

-- Volcando estructura para disparador mfcomputers.before_order_item_update
SET @OLDTMP_SQL_MODE=@@SQL_MODE, SQL_MODE='ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION';
DELIMITER //
CREATE TRIGGER `before_order_item_update` BEFORE UPDATE ON `order_items` FOR EACH ROW BEGIN
    SET NEW.total_price = NEW.quantity * NEW.unit_price;
END//
DELIMITER ;
SET SQL_MODE=@OLDTMP_SQL_MODE;

-- Volcando estructura para disparador mfcomputers.tr_remito_stock_update
SET @OLDTMP_SQL_MODE=@@SQL_MODE, SQL_MODE='ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION';
DELIMITER //
CREATE TRIGGER `tr_remito_stock_update` AFTER INSERT ON `remito_items` FOR EACH ROW BEGIN
    -- Actualizar stock del producto
    UPDATE products 
    SET stock = stock - NEW.quantity,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = NEW.product_id;
    
    -- Registrar movimiento de stock
    INSERT INTO stock_movements (
        product_id, 
        movement_type, 
        remito_id, 
        reference_number, 
        reference_type, 
        quantity, 
        unit_cost, 
        total_cost,
        notes
    ) VALUES (
        NEW.product_id,
        'salida_remito',
        NEW.remito_id,
        (SELECT remito_number FROM remitos WHERE id = NEW.remito_id),
        'remito',
        NEW.quantity,
        NEW.unit_price,
        NEW.total_price,
        CONCAT('Salida por remito ', (SELECT remito_number FROM remitos WHERE id = NEW.remito_id))
    );
END//
DELIMITER ;
SET SQL_MODE=@OLDTMP_SQL_MODE;

-- Volcando estructura para disparador mfcomputers.tr_remito_totals_update
SET @OLDTMP_SQL_MODE=@@SQL_MODE, SQL_MODE='ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION';
DELIMITER //
CREATE TRIGGER `tr_remito_totals_update` AFTER INSERT ON `remito_items` FOR EACH ROW BEGIN
    UPDATE remitos 
    SET total_products = (
            SELECT COUNT(*) FROM remito_items WHERE remito_id = NEW.remito_id
        ),
        total_quantity = (
            SELECT SUM(quantity) FROM remito_items WHERE remito_id = NEW.remito_id
        ),
        total_value = (
            SELECT SUM(total_price) FROM remito_items WHERE remito_id = NEW.remito_id
        ),
        updated_at = CURRENT_TIMESTAMP
    WHERE id = NEW.remito_id;
END//
DELIMITER ;
SET SQL_MODE=@OLDTMP_SQL_MODE;

-- Eliminando tabla temporal y crear estructura final de VIEW
DROP TABLE IF EXISTS `v_orders_ready_for_remito`;
CREATE ALGORITHM=UNDEFINED SQL SECURITY DEFINER VIEW `v_orders_ready_for_remito` AS select `o`.`id` AS `id`,`o`.`order_number` AS `order_number`,`o`.`client_id` AS `client_id`,`o`.`status` AS `status`,`o`.`total_amount` AS `total_amount`,`o`.`order_date` AS `order_date`,`o`.`delivery_date` AS `delivery_date`,`o`.`delivery_address` AS `delivery_address`,`o`.`delivery_city` AS `delivery_city`,`o`.`delivery_contact` AS `delivery_contact`,`o`.`delivery_phone` AS `delivery_phone`,`o`.`transport_company` AS `transport_company`,`o`.`transport_cost` AS `transport_cost`,`o`.`notes` AS `notes`,`o`.`remito_status` AS `remito_status`,`o`.`stock_reserved` AS `stock_reserved`,`o`.`is_active` AS `is_active`,`o`.`created_by` AS `created_by`,`o`.`created_at` AS `created_at`,`o`.`updated_at` AS `updated_at`,`c`.`name` AS `client_name`,`c`.`email` AS `client_email` from (`orders` `o` left join `clients` `c` on((`o`.`client_id` = `c`.`id`))) where ((`o`.`is_active` = true) and (`o`.`status` in ('listo_despacho','pagado','aprobado')) and (`o`.`remito_status` = 'sin_remito') and (`o`.`stock_reserved` = true));

-- Eliminando tabla temporal y crear estructura final de VIEW
DROP TABLE IF EXISTS `v_orders_with_clients`;
CREATE ALGORITHM=UNDEFINED SQL SECURITY DEFINER VIEW `v_orders_with_clients` AS select `o`.`id` AS `id`,`o`.`order_number` AS `order_number`,`o`.`client_id` AS `client_id`,`o`.`status` AS `status`,`o`.`total_amount` AS `total_amount`,`o`.`order_date` AS `order_date`,`o`.`delivery_date` AS `delivery_date`,`o`.`delivery_address` AS `delivery_address`,`o`.`delivery_city` AS `delivery_city`,`o`.`delivery_contact` AS `delivery_contact`,`o`.`delivery_phone` AS `delivery_phone`,`o`.`transport_company` AS `transport_company`,`o`.`transport_cost` AS `transport_cost`,`o`.`notes` AS `notes`,`o`.`remito_status` AS `remito_status`,`o`.`stock_reserved` AS `stock_reserved`,`o`.`is_active` AS `is_active`,`o`.`created_by` AS `created_by`,`o`.`created_at` AS `created_at`,`o`.`updated_at` AS `updated_at`,`c`.`name` AS `client_name`,`c`.`code` AS `client_code`,`c`.`email` AS `client_email`,`c`.`phone` AS `client_phone`,`c`.`client_type` AS `client_type`,(select count(0) from `order_items` where (`order_items`.`order_id` = `o`.`id`)) AS `items_count` from (`orders` `o` left join `clients` `c` on((`o`.`client_id` = `c`.`id`))) where (`o`.`is_active` = true);

/*!40103 SET TIME_ZONE=IFNULL(@OLD_TIME_ZONE, 'system') */;
/*!40101 SET SQL_MODE=IFNULL(@OLD_SQL_MODE, '') */;
/*!40014 SET FOREIGN_KEY_CHECKS=IFNULL(@OLD_FOREIGN_KEY_CHECKS, 1) */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40111 SET SQL_NOTES=IFNULL(@OLD_SQL_NOTES, 1) */;
