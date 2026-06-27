# Localizados Venezuela

Registro **open source y colaborativo** de personas **ya localizadas** tras el sismo en Venezuela — en hospitales, recintos, direcciones y otros sitios.

**Sitio:** [localizadosvenezuela.com](https://localizadosvenezuela.com)

> Este proyecto es **solo para localizados**. No sirve para reportar desaparecidos.  
> Para desaparecidos: [desaparecidosterremotovenezuela.com](https://desaparecidosterremotovenezuela.com/)

## Qué hace

- Búsqueda de personas localizadas por nombre, cédula u observación
- Una **página por persona** (`/localizados/{slug}`) y **por lugar** (`/lugares/{slug}`)
- **API pública** de lectura para integraciones
- Formulario para contribuir localizados o fotos de listados (quedan en cola `pending` hasta moderación)
- **Panel de moderación** (`/admin`) para aprobar contribuciones, OCR de imágenes, CRUD de personas y acciones masivas
- Botones para compartir en WhatsApp, Telegram, X, etc.

## Requisitos

- **Node.js** 22+
- **MongoDB** 6+ (local o remoto)
- **npm**

## Empezar en 5 minutos

```bash
git clone https://github.com/ggangix/localizados-venezuela.git
cd localizados-venezuela
npm install
cp .env.example .env.local
```

Levanta MongoDB (ejemplo si lo tienes instalado localmente):

```bash
# Windows / macOS / Linux — depende de tu instalación
mongod
```

Carga datos de prueba e inicia el servidor:

```bash
npm run seed:sample
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000).

### Variables de entorno (`.env.local`)

| Variable                         | Descripción                                             | Ejemplo local                                                 |
| -------------------------------- | ------------------------------------------------------- | ------------------------------------------------------------- |
| `MONGODB_URI`                    | Conexión a MongoDB                                      | `mongodb://127.0.0.1:27017/localizados_venezuela`             |
| `NEXT_PUBLIC_SITE_URL`           | URL base del sitio (SEO, compartir)                     | `http://localhost:3000`                                       |
| `UPLOAD_DIR`                     | Carpeta para imágenes subidas                           | `./public/uploads`                                            |
| `NEXT_PUBLIC_RECAPTCHA_SITE_KEY` | Site key pública de reCAPTCHA v3                        | Ver `.env.example`                                            |
| `RECAPTCHA_SECRET`               | Secret de reCAPTCHA v3 (solo servidor)                  | Desde Google reCAPTCHA admin                                  |
| `NEXT_PUBLIC_GA_MEASUREMENT_ID`  | ID de Google Analytics 4                                | `G-GNN3P1WQW4`                                                |
| `ADMIN_SECRET`                   | Clave(s) del panel `/admin` (coma = varios moderadores) | Generar con `npm run admin:secret`                            |
| `OPENAI_API_KEY`                 | OCR de imágenes en el panel (OpenAI Vision)             | `sk-...` desde [OpenAI](https://platform.openai.com/api-keys) |
| `OPENAI_OCR_MODEL`               | Modelo Vision (opcional)                                | `gpt-4o-mini` (default)                                       |

## Panel de moderación (fase 2)

Las contribuciones en `/contribuir` se guardan como `pending`. El panel permite publicarlas, rechazarlas o procesar imágenes con OCR.

**URL:** `/admin` → redirige a `/admin/login` si no hay sesión.

### Configurar acceso

```bash
# Genera una clave segura
npm run admin:secret

# Añadir otro moderador (varias claves separadas por coma)
npm run admin:secret -- --append
```

Copia el valor a `.env.local`:

```env
ADMIN_SECRET=tu_clave_generada
OPENAI_API_KEY=sk-...   # opcional, para OCR de imágenes
```

Sin `ADMIN_SECRET` el panel **no es accesible** (middleware devuelve 503 / redirige al inicio).

### Qué puede hacer un moderador

| Área               | Acciones                                                                         |
| ------------------ | -------------------------------------------------------------------------------- |
| **Contribuciones** | Ver `pending` (persona e imagen), editar campos, aprobar → `published`, rechazar |
| **OCR (imágenes)** | Extraer tabla con OpenAI Vision, revisar filas, asignar hospital, crear personas |
| **Hospitales**     | Elegir lugar existente o crear uno nuevo al aprobar/importar                     |
| **Personas**       | CRUD completo, soft delete (`deletedAt`), restaurar, mover de hospital           |
| **Masivo**         | Seleccionar todo, borrar, restaurar, publicar, mover a otro lugar                |

### Flujo típico

1. Ciudadano envía en `/contribuir` (persona o foto de listado).
2. Moderador entra en `/admin` → pestaña **Contribuciones**.
3. **Persona:** revisar datos, asignar hospital, **Aprobar** → visible en `/buscar`.
4. **Imagen:** **Extraer tabla con OpenAI OCR** → elegir hospital → **Crear personas** (pending o published) → **Aprobar** contribución.

### API admin (protegida)

Requiere cookie de sesión (`lv_admin`) o header `Authorization: Bearer <ADMIN_SECRET>`.

| Método       | Ruta                                 | Descripción                                                         |
| ------------ | ------------------------------------ | ------------------------------------------------------------------- |
| POST         | `/api/admin/auth/login`              | Iniciar sesión                                                      |
| POST         | `/api/admin/auth/logout`             | Cerrar sesión                                                       |
| GET          | `/api/admin/contribuciones`          | Listar contribuciones                                               |
| PATCH        | `/api/admin/contribuciones/{id}`     | Aprobar / rechazar                                                  |
| POST         | `/api/admin/contribuciones/{id}/ocr` | Extraer (`extract`) o importar (`import`) filas OCR                 |
| GET/POST     | `/api/admin/localizados`             | Listar / crear personas                                             |
| PATCH/DELETE | `/api/admin/localizados/{id}`        | Editar / soft delete                                                |
| POST         | `/api/admin/localizados/bulk`        | Acciones masivas (`delete`, `restore`, `move`, `publish`, `reject`) |
| GET/POST     | `/api/admin/lugares`                 | Listar / crear hospitales                                           |

### Producción (Docker)

En `docker-compose.yaml` del stack de despliegue:

```yaml
environment:
  - ADMIN_SECRET=${LOCALIZADOS_ADMIN_SECRET:-}
  - OPENAI_API_KEY=${OPENAI_API_KEY:-}
```

En el `.env` del servidor:

```env
LOCALIZADOS_ADMIN_SECRET=clave_generada_con_admin_secret
OPENAI_API_KEY=sk-...
```

```bash
docker compose build localizados-venezuela
docker compose up -d localizados-venezuela
```

## Integración con desaparecidos (webhooks salientes)

Para **cerrar el ciclo** entre los dos registros hermanos, este proyecto puede avisar
a [desaparecidosterremotovenezuela.com](https://desaparecidosterremotovenezuela.com/)
(u otro socio) **cuando se publica un Localizado**, para que el otro sistema marque su
reporte de desaparecido como encontrado.

- **No hace scraping**: solo **enviamos** nuestros datos (que ya son públicos vía
  `/api/v1/localizados`). No leemos su API (está protegida con reCAPTCHA, por diseño).
  El intercambio de lectura debe coordinarse con su equipo (`developer@theempire.tech`).
- **Best-effort y no bloqueante**: se dispara en segundo plano; un fallo no afecta al panel.
- **Firmado**: si el webhook tiene secreto, el cuerpo se firma con HMAC-SHA256 en la
  cabecera `X-LV-Signature` para que el socio verifique autenticidad e integridad.
- **Reintentos**: cada envío se registra (`WebhookDelivery`) y se reintenta con backoff
  (hasta 5 intentos). Tras un reinicio, `POST /api/admin/webhook-deliveries/process`
  (ideal para un cron) reprocesa los pendientes vencidos.

### Gestión desde el panel (`/admin` → pestaña **Webhooks**)

Los moderadores pueden **crear, editar, activar/desactivar y borrar** endpoints sin
redeploy, elegir el secreto y los eventos, **probar** la conexión con un ping y ver el
**historial de entregas** (con reintento manual). Soporta **varios** destinos.

### Fallback por variable de entorno (opcional)

Además de los webhooks del panel, si defines estas variables se añade un destino fijo
(útil para automatización/CI). Si no, no pasa nada:

```env
DESAPARECIDOS_WEBHOOK_URL=https://api-del-socio.example/webhooks/localizados
DESAPARECIDOS_WEBHOOK_SECRET=un_secreto_compartido
```

### Cuándo se dispara

Cada vez que un `Localizado` queda **publicado y visible**: al crearlo publicado, al
**aprobar** una contribución, en la acción masiva **publish** y al importar por OCR.

### Forma del payload (`POST`)

```json
{
  "event": "localizado.published",
  "occurredAt": "2026-06-27T01:23:45.000Z",
  "source": "localizadosvenezuela.com",
  "localizado": {
    "slug": "juan-perez-ab12cd",
    "url": "https://localizadosvenezuela.com/localizados/juan-perez-ab12cd",
    "nombreCompleto": "JUAN PEREZ",
    "nombreNormalizado": "JUAN PEREZ",
    "cedula": "12345678",
    "edad": "34",
    "condicion": "vivo",
    "lugarNombre": "Hospital Domingo Luciani"
  }
}
```

Archivos clave: `src/lib/webhooks.ts`, modelos `Webhook` / `WebhookDelivery`, y la
pestaña **Webhooks** en `src/components/admin/AdminPanel.tsx`.

## Datos de prueba (seed)

El repo incluye **`seed/sample/`** para desarrollar sin archivos externos:

```bash
npm run seed:sample   # 3 lugares, 12 personas — recomendado
npm run seed          # dataset completo si existe seed/lugares.json
```

Si clonas el repo y solo existe `sample/`, `npm run seed` usa ese subset automáticamente.

Más detalle en [`seed/README.md`](seed/README.md).

### Importar listas OCR (Markdown)

Las transcripciones de listas manuscritas viven en un repo aparte, gracias a @ecrespo:

**[OCR-data_Terremoto_Venezuela_24062026](https://github.com/ecrespo/OCR-data_Terremoto_Venezuela_24062026)** — tablas `.md` por hospital y fecha.

Clónalo junto al proyecto (o donde prefieras) y ejecuta el seeder. Es **idempotente**: reutiliza lugares ya existentes en MongoDB y omite personas duplicadas (`lugar + nombre normalizado`). Puedes correrlo cada vez que se agreguen archivos nuevos al repo OCR.

```bash
# junto a localizados-venezuela/
git clone https://github.com/ecrespo/OCR-data_Terremoto_Venezuela_24062026.git

cd localizados-venezuela

# simular sin escribir en BD
npm run seed:ocr -- --dry-run

# importar (ruta por defecto: ../OCR-data_Terremoto_Venezuela_24062026)
npm run seed:ocr

# otra ruta al repo OCR
npm run seed:ocr -- --path /ruta/a/OCR-data_Terremoto_Venezuela_24062026
```

Orden sugerido si partes del Excel consolidado: primero `npm run seed:excel`, luego `npm run seed:ocr` (el OCR solo inserta lo que aún no está).

### Scripts de datos

| Comando                    | Descripción                                        |
| -------------------------- | -------------------------------------------------- |
| `npm run seed:sample`      | Importa `seed/sample/`                             |
| `npm run seed`             | Importa dataset completo (o sample como fallback)  |
| `npm run seed:export`      | Genera `seed/*.json` desde el Excel (mantenedores) |
| `npm run seed:excel`       | Importa directo desde Excel a MongoDB              |
| `npm run seed:ocr`         | Importa tablas `.md` del repo OCR (sin duplicar)   |
| `npm run merge`            | Dry-run: fusiona lugares/personas duplicadas       |
| `npm run merge -- --apply` | Aplica la fusión en MongoDB                        |
| `npm run admin:secret`     | Genera `ADMIN_SECRET` para el panel de moderación  |

## Scripts de desarrollo

| Comando            | Descripción                              |
| ------------------ | ---------------------------------------- |
| `npm run dev`      | Servidor de desarrollo                   |
| `npm run build`    | Build de producción                      |
| `npm run start`    | Servir build                             |
| `npm run lint`     | ESLint                                   |
| `npm run lint:fix` | ESLint con auto-fix                      |
| `npm run format`   | Prettier                                 |
| `npm run check`    | lint + format:check (lo que corre el CI) |

## Colaborar

1. Haz fork del repo
2. Crea una rama: `git checkout -b mi-feature`
3. Instala y arranca con `npm run seed:sample && npm run dev`
4. Haz tus cambios
5. Asegúrate de que pasa el CI localmente:

```bash
npm run check
npm run build
```

6. Abre un Pull Request en GitHub

### Estilo de código

- **ESLint** (config Next.js) + **Prettier** (con plugin Tailwind)
- **Husky** + **lint-staged** formatean automáticamente al hacer commit
- VS Code: instala las extensiones recomendadas (`.vscode/extensions.json`)

### CI en Pull Requests

GitHub Actions ejecuta en cada PR:

- `npm run lint`
- `npm run format:check`
- `npm run build`

### Ideas para contribuir

- Mejorar búsqueda y deduplicación
- Nuevas transcripciones en el [repo OCR](https://github.com/ecrespo/OCR-data_Terremoto_Venezuela_24062026) + `npm run seed:ocr`
- Mejoras al panel de moderación (roles, historial de cambios, etc.)
- Traducciones, accesibilidad, rendimiento móvil
- Documentación de la API
- Reportar bugs con datos de ejemplo en `seed/sample/`

## Estructura del proyecto

```
src/
├── app/
│   ├── admin/        # Panel de moderación (login + dashboard)
│   └── api/
│       ├── admin/    # API protegida (contribuciones, personas, OCR)
│       └── v1/       # API pública de lectura
├── components/
│   └── admin/        # AdminPanel, LoginForm
└── lib/              # DB, queries, modelos, admin-auth, ocr-openai
middleware.ts         # Protege /admin y /api/admin
scripts/
├── create-admin-secret.ts
├── seed-from-json.ts
├── seed-from-excel.ts
├── seed-from-ocr-md.ts
├── list-lugares.ts
└── merge-duplicates.ts
seed/
└── sample/
```

## API pública (v1)

Base: `https://localizadosvenezuela.com` (o tu `NEXT_PUBLIC_SITE_URL` en local)

| Método | Ruta                                         | Descripción         |
| ------ | -------------------------------------------- | ------------------- |
| GET    | `/api/v1/localizados?q=&lugar=&page=&limit=` | Buscar publicados   |
| GET    | `/api/v1/localizados/{slug}`                 | Detalle de persona  |
| GET    | `/api/v1/lugares`                            | Listar lugares      |
| GET    | `/api/v1/lugares/{slug}?page=&limit=`        | Lugar + localizados |

CORS: `Access-Control-Allow-Origin: *` solo en rutas **GET** de `/api/v1/*`.

Las contribuciones se envían únicamente desde el formulario web en [`/contribuir`](https://localizadosvenezuela.com/contribuir), protegido con reCAPTCHA v3 (no es API pública).

Documentación interactiva en `/api` cuando el sitio está corriendo.

## Modelo de datos

```
Lugar        → slug, nombre, tipo (hospital|recinto|direccion|otro)
Localizado   → persona, lugarId, fuente, estado (published|pending|rejected), deletedAt (soft delete)
Contribucion → envíos ciudadanos (persona o imagen de listado), moderadoEn/Por
```

## Roadmap

| Fase                                                              | Estado |
| ----------------------------------------------------------------- | ------ |
| Seed, búsqueda, páginas individuales, API, contribuciones en cola | ✅     |
| Importación OCR desde Markdown (`seed:ocr`)                       | ✅     |
| Panel de moderación, OCR de imágenes (OpenAI), CRUD y publicación | ✅     |

## Stack

- Next.js 15 (App Router)
- MongoDB + Mongoose
- Tailwind CSS
- TypeScript

## Licencia

Código: **MIT** — contribuciones bienvenidas.

Datos: fuentes públicas y contribuciones ciudadanas consolidadas.
