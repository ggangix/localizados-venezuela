# Guía de Integración y Configuración del Bot de WhatsApp (FZAP)

Este módulo implementa un **bot de WhatsApp de auto-consulta en tiempo real** para que los ciudadanos y familiares de zonas afectadas puedan buscar el estado de personas localizadas directamente desde su móvil, utilizando una conexión de datos mínima.

La arquitectura se compone de tres piezas integradas localmente en desarrollo mediante contenedores:

1.  **Next.js (Backend)**: Expone el endpoint de Webhook `/api/webhook/whatsapp` que procesa los mensajes entrantes, consulta MongoDB y genera las respuestas.
2.  **FZAP (WhatsApp Gateway)**: Una API self-hosted basada en Go (`whatsmeow`) que gestiona la sesión de WhatsApp, genera el código QR de vinculación y actúa de pasarela para recibir/enviar los mensajes de texto.
3.  **PostgreSQL**: La base de datos relacional requerida por FZAP para persistir sus sesiones, configuraciones de webhook e instancias.

---

## 1. Habilitar la Infraestructura en localizados-venezuela

Para levantar el gateway de FZAP y su base de datos Postgres junto al resto de los servicios de la aplicación:

1. Abre el archivo [docker-compose.yml](file:///c:/Users/eliec/OneDrive/Escritorio/localizados-venezuela/docker-compose.yml).
2. **Descomenta** los servicios de WhatsApp y sus respectivos volúmenes persistentes al final del archivo. La estructura debe quedar así:

```yaml
  # --- Servicios de WhatsApp (Descomentar para habilitar) ---
  fzap_postgres:
    image: postgres:15
    container_name: fzap_postgres
    restart: always
    environment:
      POSTGRES_USER: fzap
      POSTGRES_PASSWORD: fzap123
      POSTGRES_DB: fzap
    volumes:
      - fzap_postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: [ "CMD-SHELL", "pg_isready -U fzap" ]
      interval: 5s
      timeout: 5s
      retries: 5

  fzap:
    image: dncarbonell/fzap:latest
    container_name: fzap_api
    restart: always
    ports:
      - "8081:8080" # Expone la API de FZAP en el puerto 8081 del host
    depends_on:
      fzap_postgres:
        condition: service_healthy
    environment:
      - TZ=America/Sao_Paulo
      - FZAP_LANGUAGE=es-ES # Idioma del panel
      - PUBLIC_BASE_URL=http://localhost:8081
      - ADMIN_TOKEN=secret_key # Token de administración global
      - DB_DRIVER=postgres
      - DB_HOST=fzap_postgres
      - DB_PORT=5432
      - DB_NAME=fzap
      - DB_USER=fzap
      - DB_PASSWORD=fzap123
      - SESSION_DEVICE_NAME=Fzap
      - WEBHOOK_FORMAT=json
    volumes:
      - fzap_dbdata:/app/dbdata
      - fzap_files:/app/files
      - fzap_logos:/app/data/public-folder-logos
    restart: unless-stopped
```

3. Guarda los cambios y levanta el stack actualizado de Docker:
   ```bash
   docker compose up -d
   ```

---

## 2. Variables de Entorno del Proyecto

Configura las credenciales de comunicación en tu archivo local [.env.local](file:///c:/Users/eliec/OneDrive/Escritorio/localizados-venezuela/.env.local) para enlazar Next.js con el FZAP que acabamos de levantar:

```env
# Integración de WhatsApp (FZAP)
FZAP_API_URL=http://localhost:8081
FZAP_INSTANCE_ID=bot_instance
FZAP_API_TOKEN=secret_key
```

- `FZAP_API_URL`: La dirección del gateway de FZAP expuesto en tu máquina local (`http://localhost:8081`).
- `FZAP_INSTANCE_ID`: Nombre identificador de la instancia de WhatsApp de desarrollo (ej. `bot_instance`).
- `FZAP_API_TOKEN`: El token de autenticación de usuario que FZAP usará para validar las peticiones REST.

---

## 3. Inicializar Instancia de WhatsApp y Vincular QR

FZAP requiere que registremos un usuario/instancia para generar la sesión de WhatsApp. Puedes aprovisionar la instancia ejecutando dos simples peticiones HTTP locales:

### Paso A: Crear el usuario en FZAP

Ejecuta la llamada de administración en tu terminal para registrar la instancia de desarrollo `bot_instance`:

**En PowerShell (Windows):**

```powershell
Invoke-RestMethod -Uri "http://localhost:8081/admin/users" -Method Post -Headers @{"Authorization"="secret_key"} -ContentType "application/json" -Body '{"name":"bot_instance","token":"secret_key","expiration":0}'
```

**En Bash / macOS / Linux:**

```bash
curl -X POST http://localhost:8081/admin/users \
  -H "Authorization: secret_key" \
  -H "Content-Type: application/json" \
  -d '{"name":"bot_instance","token":"secret_key","expiration":0}'
```

### Paso B: Conectar la sesión (Generación del QR)

Genera el proceso de vinculación de WhatsApp. Esto iniciará el cliente web interno en FZAP:

**En PowerShell (Windows):**

```powershell
Invoke-RestMethod -Uri "http://localhost:8081/session/connect" -Method Post -Headers @{"token"="secret_key"} -ContentType "application/json" -Body '{}'
```

**En Bash / macOS / Linux:**

```bash
curl -X POST http://localhost:8081/session/connect \
  -H "token: secret_key" \
  -H "Content-Type: application/json" \
  -d '{}'
```

### Paso C: Escaneo de Código QR

1. Abre tu navegador y accede al Dashboard de FZAP en [http://localhost:8081](http://localhost:8081).
2. Selecciona la instancia `bot_instance` e inicia sesión.
3. Ve a tu aplicación de WhatsApp en tu teléfono móvil, pulsa en **Dispositivos vinculados > Vincular un dispositivo**, y escanea el código QR que se muestra en la pantalla de FZAP.
4. Una vez emparejado, FZAP mantendrá la sesión activa en segundo plano.

---

## 4. Configurar el Webhook de WhatsApp

Para que FZAP le reenvíe a tu servidor local de Next.js todos los mensajes que recibe el teléfono móvil, debes registrar la URL de Webhook:

1. En el panel de FZAP ([http://localhost:8081](http://localhost:8081)), ve a la configuración de la instancia `bot_instance` y añade un nuevo Webhook:
   - **URL del Webhook (Desarrollo local)**: `http://host.docker.internal:3000/api/webhook/whatsapp` (esto permite al contenedor FZAP salir y conectarse al puerto `3000` de tu Windows host).
   - **URL del Webhook (Producción)**: `https://tu-dominio.com/api/webhook/whatsapp`.
2. Marca la opción para suscribirse al evento **Message / Mensajes Entrantes** (`messages.upsert`).

---

## 5. Flujos de Consulta del Bot

El backend Next.js procesará dinámicamente las consultas entrantes y responderá de la siguiente forma:

### Búsqueda Inteligente

- **Por Cédula / Identificación**: Si el texto recibido en el chat contiene 4 o más dígitos consecutivos, el sistema interpreta que se busca una cédula e intentará buscar coincidencias exactas o parciales.
  - _Ejemplo de chat_: _"Tienen información sobre el portador de la cédula V-21443908?"_ o simplemente _"21443908"_.
- **Por Nombre**: Si el texto es plano y no posee dígitos, realiza una búsqueda de texto regular por similitud.
  - _Ejemplo de chat_: _"Buscar a Alexander Acosta"_.

### Formato de la Respuesta

El bot responderá directamente en el chat del usuario con el siguiente formato optimizado para dispositivos móviles:

> Resultados para "Acosta" (Encontrados: 1):
>
> 👤 **ACOSTA ALEXANDER**
> 🆔 Cédula: 17.849.208
> 🎂 Edad: 34 años
> 📌 Condición: 🟡 Desconocido
> 🏥 Lugar: Hospital Domingo Luciani
> 🔗 Ver Ficha: http://localhost:3000/localizados/acosta-alexander-d4e5f6
> \-------------------
