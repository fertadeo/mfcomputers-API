# Pruebas de sincronización ERP ↔ WooCommerce

Guía para probar el sync de productos entre el ERP (API Node) y la tienda WooCommerce. Los cambios de la API están alineados con el snippet `docs/WORDPRESS_CRUD_PRODUCTS.php` (misma API REST wc/v3 y payload compatible).

## 1. Variables de entorno (API ERP)

En el servidor donde corre la API, configurá:

```env
WOOCOMMERCE_URL=https://mfcomputers.com.ar
WOOCOMMERCE_CONSUMER_KEY=ck_xxxx
WOOCOMMERCE_CONSUMER_SECRET=cs_xxxx
WOOCOMMERCE_API_VERSION=wc/v3
```

Las mismas credenciales que usás en el snippet PHP (`WC_BASE_URL`, `WC_CONSUMER_KEY`, `WC_CONSUMER_SECRET`) corresponden a `WOOCOMMERCE_URL`, `WOOCOMMERCE_CONSUMER_KEY`, `WOOCOMMERCE_CONSUMER_SECRET`.

## 2. Alineación con WORDPRESS_CRUD_PRODUCTS.php

| Aspecto | Snippet PHP | API ERP |
|--------|-------------|---------|
| API WooCommerce | wc/v3 (GET/POST/PUT/DELETE /products) | wc/v3, mismo prefijo |
| Crear producto | `wc_create_product($data)` → POST /products | `WooCommerceService.createProduct()` → POST /products |
| Editar producto | `wc_update_product($id, $data)` → PUT /products/{id} | `WooCommerceService.updateProduct(id, data)` → PUT /products/{id} |
| Campos payload | name, type, sku, regular_price, description, manage_stock, stock_quantity, status | Los mismos + short_description, images, categories, meta_data |
| Auth | consumer_key / consumer_secret (query o Basic) | Basic Auth (URL user/pass) |

Ambos hablan con la misma tienda WooCommerce; podés probar desde la API ERP o desde el snippet PHP contra la misma URL y credenciales.

## 3. Pruebas recomendadas (ERP → WooCommerce)

### 3.1 Sincronizar un producto existente (crear en WC)

1. Tener un producto en el ERP **sin** `woocommerce_id` (nunca sincronizado).
2. Llamar a la API (con JWT de rol gerencia):

   ```http
   POST /api/products/:id/sync-to-woocommerce
   Authorization: Bearer <token>
   ```

   Reemplazá `:id` por el ID del producto en el ERP.

3. Respuesta esperada: `{ "success": true, "data": { "woocommerce_id": 12345, "created": true } }`.
4. En WooCommerce: ver el producto recién creado (SKU = código del producto en ERP). En el ERP el producto debe quedar con `woocommerce_id` guardado.

### 3.2 Sincronizar un producto ya vinculado (actualizar en WC)

1. Producto en el ERP **con** `woocommerce_id` ya asignado.
2. Cambiar nombre, precio o stock en el ERP (PUT /api/products/:id).
3. Llamar de nuevo:

   ```http
   POST /api/products/:id/sync-to-woocommerce
   ```

4. Respuesta: `{ "created": false, "woocommerce_id": ... }`. En WooCommerce el producto debe reflejar los cambios.

### 3.3 Crear producto y sincronizar en un solo paso

```http
POST /api/products
Authorization: Bearer <token>
Content-Type: application/json

{
  "code": "TEST-SYNC-001",
  "name": "Producto prueba sync",
  "price": 1500,
  "stock": 5,
  "sync_to_woocommerce": true
}
```

Comprobar que el producto existe en el ERP y en WooCommerce, y que el ERP tiene `woocommerce_id` asignado.

### 3.4 Actualizar producto y sincronizar a WC

```http
PUT /api/products/:id
Authorization: Bearer <token>
Content-Type: application/json

{
  "price": 2000,
  "stock": 10,
  "sync_to_woocommerce": true
}
```

Solo tiene efecto si el producto ya tiene `woocommerce_id`; si no, actualizar en el ERP no dispara sync (evita crear duplicados).

## 4. Comprobar en WooCommerce

- **SKU**: debe coincidir con el `code` del producto en el ERP.
- **Meta**: en el producto en WC podés ver `_mfcomputers_erp_id` y `_mfcomputers_erp_code` (ID y código del ERP).
- **Stock y precio**: deben coincidir con el ERP después de cada sync.

## 5. Si algo falla

- Revisar logs de la API (mensajes `[WooCommerceService]`).
- Verificar que la URL de la tienda sea la correcta (con/sin barra final no debería afectar; la API normaliza).
- Comprobar que las credenciales de WooCommerce tengan permiso de lectura/escritura sobre productos (REST API habilitada en WooCommerce).
- Para comparar comportamiento, podés usar el snippet PHP (ejemplos en la sección 7 del archivo) contra la misma tienda y credenciales.
