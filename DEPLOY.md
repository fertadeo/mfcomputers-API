# Guía de Despliegue en Producción - Norte ERP API

Esta guía explica cómo desplegar la aplicación Norte ERP API en un servidor Ubuntu usando PM2 y Nginx.

## Requisitos Previos

- Servidor Ubuntu (versión 20.04 o superior recomendada)
- Acceso SSH al servidor
- Usuario con permisos sudo
- Node.js instalado (versión 18.x o superior)
- MySQL instalado y configurado
- Nginx instalado

## IP del Servidor
**149.50.139.91**

---

## Paso 1: Preparar el Servidor

### 1.1 Actualizar el sistema
```bash
sudo apt update && sudo apt upgrade -y
```

### 1.2 Instalar Node.js (si no está instalado)
```bash
# Instalar Node.js 20.x LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Verificar instalación
node --version
npm --version
```

### 1.3 Instalar PM2 globalmente
```bash
sudo npm install -g pm2
```

### 1.4 Instalar Nginx (si no está instalado)
```bash
sudo apt install -y nginx

# Iniciar y habilitar Nginx
sudo systemctl start nginx
sudo systemctl enable nginx

# Verificar estado
sudo systemctl status nginx
```

### 1.5 Instalar MySQL Client (si necesitas conectarte a la base de datos)
```bash
sudo apt install -y mysql-client
```

---

## Paso 2: Preparar la Aplicación en el Servidor

### 2.1 Conectarse al servidor
```bash
ssh usuario@149.50.139.91
```

### 2.2 Crear directorio para la aplicación
```bash
# Crear directorio
sudo mkdir -p /var/www/norte-erp-api
sudo chown -R $USER:$USER /var/www/norte-erp-api
cd /var/www/norte-erp-api
```

### 2.3 Subir el código de la aplicación

**Opción A: Usando Git (recomendado)**
```bash
# Si tu código está en un repositorio Git
git clone https://tu-repositorio.git .
# O si prefieres usar SSH:
# git clone git@github.com:tu-usuario/norte-erp-api.git .
```

**Opción B: Usando SCP desde tu máquina local**
```bash
# Desde tu máquina local (en otra terminal)
scp -r /ruta/local/norte-erp-api usuario@149.50.139.91:/var/www/
```

### 2.4 Instalar dependencias
```bash
cd /var/www/norte-erp-api
npm install --production
```

### 2.5 Compilar TypeScript
```bash
npm run build
```

### 2.6 Crear directorio para logs
```bash
mkdir -p logs
```

---

## Paso 3: Configurar Variables de Entorno

### 3.1 Crear archivo .env
```bash
nano /var/www/norte-erp-api/.env
```

### 3.2 Configurar variables de entorno
Copia el contenido de `.env.production.example` y ajusta los valores:

```env
NODE_ENV=production
PORT=8083

# Base de Datos
DB_HOST=149.50.139.91
DB_PORT=3306
DB_USER=fenecstudio-remote
DB_PASSWORD=tu_password_real_aqui
DB_NAME=norte_erp_db

# JWT Secret (genera uno seguro)
JWT_SECRET=$(openssl rand -base64 32)

# CORS
CORS_ORIGIN=http://149.50.139.91,https://tu-dominio.com
```

**Importante:** Genera un JWT_SECRET seguro:
```bash
openssl rand -base64 32
```

Guarda el archivo (Ctrl+O, Enter, Ctrl+X en nano).

---

## Paso 4: Configurar PM2

### 4.1 Copiar el archivo de configuración
El archivo `ecosystem.config.js` ya debería estar en el directorio del proyecto.

### 4.2 Iniciar la aplicación con PM2
```bash
cd /var/www/norte-erp-api
pm2 start ecosystem.config.js
```

### 4.3 Verificar que la aplicación está corriendo
```bash
pm2 status
pm2 logs norte-erp-api
```

### 4.4 Guardar la configuración de PM2
```bash
pm2 save
```

### 4.5 Configurar PM2 para iniciar al arranque del sistema
```bash
pm2 startup
# Ejecuta el comando que PM2 te muestre (normalmente algo como):
# sudo env PATH=$PATH:/usr/bin /usr/lib/node_modules/pm2/bin/pm2 startup systemd -u tu_usuario --hp /home/tu_usuario
```

### Comandos útiles de PM2
```bash
pm2 restart norte-erp-api    # Reiniciar aplicación
pm2 stop norte-erp-api       # Detener aplicación
pm2 reload norte-erp-api     # Recarga sin downtime
pm2 delete norte-erp-api     # Eliminar proceso
pm2 logs norte-erp-api       # Ver logs en tiempo real
pm2 monit                    # Monitor en tiempo real
```

---

## Paso 5: Configurar Nginx

### 5.1 Copiar la configuración de Nginx
```bash
sudo cp /var/www/norte-erp-api/nginx/norte-erp-api.conf /etc/nginx/sites-available/norte-erp-api
```

### 5.2 Habilitar el sitio
```bash
sudo ln -s /etc/nginx/sites-available/norte-erp-api /etc/nginx/sites-enabled/
```

### 5.3 Verificar configuración de Nginx
```bash
sudo nginx -t
```

Si todo está bien, verás:
```
nginx: configuration file /etc/nginx/nginx.conf test is successful
```

### 5.4 Reiniciar Nginx
```bash
sudo systemctl restart nginx
```

### 5.5 Verificar estado
```bash
sudo systemctl status nginx
```

---

## Paso 6: Configurar Firewall

### 6.1 Permitir tráfico HTTP y HTTPS
```bash
sudo ufw allow 'Nginx Full'
# O específicamente:
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
```

### 6.2 Verificar reglas del firewall
```bash
sudo ufw status
```

---

## Paso 7: Verificar el Despliegue

### 7.1 Verificar que la API está corriendo
```bash
curl http://localhost:8083/health
```

### 7.2 Verificar a través de Nginx
```bash
curl http://149.50.139.91/health
```

O abre en tu navegador:
```
http://149.50.139.91/health
```

Deberías ver una respuesta JSON con el estado de la API.

---

## Configuración de SSL/TLS (Opcional pero Recomendado)

Para usar HTTPS, puedes configurar Let's Encrypt con Certbot:

### Instalar Certbot
```bash
sudo apt install -y certbot python3-certbot-nginx
```

### Obtener certificado SSL (reemplaza con tu dominio)
```bash
sudo certbot --nginx -d tu-dominio.com
```

Luego edita `/etc/nginx/sites-available/norte-erp-api` y descomenta las líneas SSL.

---

## Actualizar la Aplicación

Cuando necesites actualizar la aplicación:

```bash
cd /var/www/norte-erp-api

# Si usas Git:
git pull origin main

# Instalar nuevas dependencias (si las hay)
npm install --production

# Recompilar
npm run build

# Reiniciar con PM2
pm2 restart norte-erp-api

# Verificar logs
pm2 logs norte-erp-api --lines 50
```

---

## Monitoreo y Mantenimiento

### Ver logs de la aplicación
```bash
pm2 logs norte-erp-api
```

### Ver logs de Nginx
```bash
sudo tail -f /var/log/nginx/norte-erp-api-access.log
sudo tail -f /var/log/nginx/norte-erp-api-error.log
```

### Ver logs de PM2
```bash
tail -f /var/www/norte-erp-api/logs/pm2-combined.log
```

### Monitor de recursos
```bash
pm2 monit
```

---

## Solución de Problemas

### La aplicación no inicia
```bash
# Ver logs detallados
pm2 logs norte-erp-api --err

# Verificar que el puerto 8083 no está en uso
sudo lsof -i :8083

# Verificar variables de entorno
pm2 env 0
```

### Nginx no funciona
```bash
# Verificar configuración
sudo nginx -t

# Ver logs de error
sudo tail -f /var/log/nginx/error.log

# Verificar que Nginx está corriendo
sudo systemctl status nginx
```

### Problemas de conexión a la base de datos
```bash
# Verificar conectividad
mysql -h 149.50.139.91 -u fenecstudio-remote -p -e "SELECT 1"

# Verificar variables de entorno en .env
cat .env | grep DB_
```

---

## Estructura de Archivos en el Servidor

```
/var/www/norte-erp-api/
├── dist/                    # Código compilado (generado)
├── logs/                    # Logs de PM2
├── node_modules/            # Dependencias
├── src/                     # Código fuente
├── ecosystem.config.js      # Configuración PM2
├── .env                     # Variables de entorno (NO versionar)
├── package.json
└── ...
```

---

## Comandos de Emergencia

### Reiniciar todo
```bash
pm2 restart all
sudo systemctl restart nginx
```

### Detener todo
```bash
pm2 stop all
sudo systemctl stop nginx
```

### Ver estado general
```bash
pm2 status
sudo systemctl status nginx
sudo systemctl status mysql  # Si MySQL está local
```

---

## Notas Importantes

1. **Seguridad**: Asegúrate de que el archivo `.env` no esté en el repositorio Git. Está en `.gitignore`.

2. **Backups**: Configura backups regulares de la base de datos:
```bash
# Ejemplo de backup diario
mysqldump -h 149.50.139.91 -u usuario -p nombre_db > backup_$(date +%Y%m%d).sql
```

3. **Actualizaciones**: Mantén el sistema operativo y las dependencias actualizadas.

4. **Monitoreo**: Considera usar herramientas como `pm2-logrotate` para rotar logs automáticamente.

---

## Soporte

Si encuentras problemas durante el despliegue, verifica:
- Logs de PM2: `pm2 logs`
- Logs de Nginx: `/var/log/nginx/`
- Estado de servicios: `sudo systemctl status nginx`, `pm2 status`
- Conectividad de red y firewall: `sudo ufw status`

