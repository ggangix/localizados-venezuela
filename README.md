# Localizados Venezuela

Registro **open source y colaborativo** de personas **ya localizadas** tras el sismo en Venezuela — en hospitales, recintos, direcciones y otros sitios.

**Sitio:** [localizadosvenezuela.com](https://localizadosvenezuela.com)

> Este proyecto es **solo para localizados**. No sirve para reportar desaparecidos.
> Para desaparecidos: [desaparecidosterremotovenezuela.com](https://desaparecidosterremotovenezuela.com/)

## Qué hace

- Búsqueda de personas localizadas por nombre, cédula u observación
- Una **página por persona** (`/localizados/{slug}`) y **por lugar** (`/lugares/{slug}`)
- **API pública** de lectura para integraciones
- Formulario para contribuir localizados o fotos de listados (fase 1: quedan en cola `pending`)
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

| Variable                         | Descripción                            | Ejemplo local                                     |
| -------------------------------- | -------------------------------------- | ------------------------------------------------- |
| `MONGODB_URI`                    | Conexión a MongoDB                     | `mongodb://127.0.0.1:27017/localizados_venezuela` |
| `NEXT_PUBLIC_SITE_URL`           | URL base del sitio (SEO, compartir)    | `http://localhost:3000`                           |
| `UPLOAD_DIR`                     | Carpeta para imágenes subidas          | `./public/uploads`                                |
| `NEXT_PUBLIC_RECAPTCHA_SITE_KEY` | Site key pública de reCAPTCHA v3       | Ver `.env.example`                                |
| `RECAPTCHA_SECRET`               | Secret de reCAPTCHA v3 (solo servidor) | Desde Google reCAPTCHA admin                      |
| `NEXT_PUBLIC_GA_MEASUREMENT_ID`  | ID de Google Analytics 4               | `G-GNN3P1WQW4`                                    |

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
| `npm test`         | Vitest en modo watch (desarrollo)        |
| `npm run test:run` | Vitest una sola vez (CI)                 |

## Colaborar

1. Haz fork del repo
2. Crea una rama: `git checkout -b mi-feature`
3. Instala y arranca con `npm run seed:sample && npm run dev`
4. Haz tus cambios
5. Asegúrate de que pasa el CI localmente:

```bash
npm run check
npm run test:run
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
- `npm run test:run`
- `npm run build`

### Ideas para contribuir

- Mejorar búsqueda y deduplicación
- Panel de moderación (fase 2)
- Nuevas transcripciones en el [repo OCR](https://github.com/ecrespo/OCR-data_Terremoto_Venezuela_24062026) + `npm run seed:ocr`
- Traducciones, accesibilidad, rendimiento móvil
- Documentación de la API
- Reportar bugs con datos de ejemplo en `seed/sample/`

## Estructura del proyecto

```
src/
├── app/              # Páginas y rutas API (Next.js App Router)
├── components/       # UI (header, footer, share, formularios…)
└── lib/              # DB, queries, modelos, utilidades
scripts/
├── seed-from-json.ts   # Importar seed al clonar
├── seed-from-excel.ts
├── seed-from-ocr-md.ts # Importar .md del repo OCR
├── lib/ocr-md-parser.ts
├── lib/ocr-lugares.ts
├── export-seed-json.ts
└── merge-duplicates.ts
seed/
└── sample/           # Datos de prueba commiteados
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
Lugar       → slug, nombre, tipo (hospital|recinto|direccion|otro)
Localizado  → persona, lugarId, fuente, estado (published|pending|rejected)
Contribucion → envíos ciudadanos (persona o imagen de listado)
```

## Roadmap

| Fase                                                                  | Estado |
| --------------------------------------------------------------------- | ------ |
| Seed, búsqueda, páginas individuales, API, contribuciones en cola     | ✅     |
| Importación OCR desde Markdown (`seed:ocr`)                           | ✅     |
| Moderación, OCR automático de imágenes, publicación de contribuciones | 🔜     |

## Stack

- Next.js 15 (App Router)
- MongoDB + Mongoose
- Tailwind CSS
- TypeScript

## Licencia

Código: **MIT** — contribuciones bienvenidas.

Datos: fuentes públicas y contribuciones ciudadanas consolidadas.
