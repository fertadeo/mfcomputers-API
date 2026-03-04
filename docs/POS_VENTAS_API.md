# API de ventas (POS) – Frontend

Endpoint para **crear una venta** desde el punto de venta (POS) en el frontend.

Al crear una venta, el sistema automáticamente:

- **Stock en el ERP:** descuenta las cantidades vendidas del stock de cada producto (`products.stock`).
- **WooCommerce (si está configurado):** crea un pedido en WooCommerce y actualiza el stock de los productos en la tienda (descuento por ítem), para mantener ERP y tienda sincronizados.

## Crear venta

- **URL:** `POST /api/sales`  
  (base: por ejemplo `http://localhost:8086/api/sales` o la URL de tu API en producción)

- **Autenticación (una de las dos):**
  - **JWT (recomendado para el POS):** header `Authorization: Bearer <token>`
  - **API Key:** header `x-api-key: <tu-api-key>`

- **Content-Type:** `application/json`

### Cuerpo del request (ejemplo)

```json
{
  "items": [
    {
      "product_id": 123,
      "quantity": 1,
      "unit_price": 29000
    }
  ],
  "payment_method": "efectivo",
  "client_id": 1,
  "notes": ""
}
```

| Campo            | Tipo   | Requerido | Descripción |
|-----------------|--------|-----------|-------------|
| `items`         | array  | Sí        | Al menos un ítem. Cada ítem: `product_id` (int), `quantity` (int), `unit_price` (number). |
| `payment_method`| string | Sí        | Uno de: `efectivo`, `tarjeta`, `transferencia`, `mixto`. |
| `client_id`     | int    | No        | Si no se envía, se usa "Consumidor Final". |
| `payment_details` | object | Si método es `mixto` | `{ "efectivo": number, "tarjeta": number, "transferencia": number }` cuya suma = total. |
| `notes`         | string | No        | Máx. 1000 caracteres. |
| `sync_to_woocommerce` | boolean | No | Por defecto `true`. |

### Respuesta exitosa (201)

```json
{
  "success": true,
  "message": "Venta creada exitosamente",
  "data": { ... },
  "timestamp": "..."
}
```

### Si recibes 404

- Comprueba que la URL sea exactamente **`POST /api/sales`** (con el prefijo `/api` y el path `/sales`).
- Comprueba que la base URL del frontend (variable de entorno o config) apunte al mismo host/puerto donde corre esta API.

### Si recibes 401

- Asegúrate de enviar **Authorization: Bearer &lt;token&gt;** con el JWT del usuario logueado, o el header **x-api-key** si usas API Key.
