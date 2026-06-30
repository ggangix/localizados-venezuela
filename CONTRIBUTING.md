# Cómo contribuir

## Requisitos previos

- **Node.js** 22+
- **MongoDB** 6+
- **npm**

## Arranque rápido

```bash
./init.sh        # instala, configura .env.local, levanta Mongo, siembra y valida
npm run dev
```

O paso a paso:

```bash
npm install
cp .env.example .env.local
npm run seed:sample
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000).

## Antes de abrir un Pull Request

```bash
npm run verify
```

Este comando es la **compuerta única de validación**: corre `lint`, `format:check`,
los tests (`npm test`) y `build`. Debe pasar sin errores antes de abrir el PR.

## Flujo de trabajo

1. Haz fork del repositorio
2. Crea una rama: `git checkout -b mi-feature`
3. Realiza tus cambios
4. Ejecuta `npm run verify`
5. Haz commit y push a tu fork
6. Abre un Pull Request en GitHub (se cargará la plantilla con el checklist)

## Colaborar con asistentes de IA / LLM

Las contribuciones asistidas por IA (Claude, Codex, Copilot, etc.) son bienvenidas,
pero el autor humano es responsable del resultado. Para mantener la calidad:

- **Tú revisas y entiendes el código generado.** No abras un PR con código que no puedas
  explicar.
- **Ejecuta `npm run verify` de verdad** y confirma que pasa; no asumas que "debería" pasar.
- **Mantén el diff acotado.** No incluyas reescrituras de archivos no relacionados ni
  regeneraciones completas de `package-lock.json`; añade solo lo que tu cambio necesita.
- **No publiques secretos** ni archivos `.env*` (salvo `.env.example`).
- **Comenta el issue antes de empezar** para no duplicar trabajo con otros colaboradores.

Si tu repo o agente usa archivos de instrucciones (`AGENTS.md`, `CLAUDE.md`), trátalos como
guía operativa; esta sección define las reglas mínimas que todo PR debe cumplir.

## Reportar bugs

Si encuentras un error:

- Describe los pasos para reproducirlo
- Incluye el resultado esperado y el obtenido
- Si aplica, usa los datos de ejemplo en [`seed/sample/`](seed/sample/) para facilitar la reproducción
- Indica tu entorno (SO, navegador, versión de Node)

## Issues para empezar

Revisa los issues etiquetados con [good first issue](https://github.com/ggangix/localizados-venezuela/labels/good%20first%20issue) para encontrar tareas amigables para nuevos colaboradores.

**Antes de empezar**, deja un comentario en la issue avisando que vas a trabajarla. Esto evita que dos personas hagan la misma tarea al mismo tiempo.

## Estilo de código

- ESLint (configuración de Next.js) + Prettier (con plugin Tailwind)
- Husky + lint-staged formatean automáticamente al hacer commit
- Extensiones recomendadas en `.vscode/extensions.json`

## Normas de programación

Estas convenciones reflejan los patrones que ya usa el código. Síguelas para que tu
PR sea consistente con el resto del repo.

### TypeScript

- TypeScript en modo estricto. **Evita `any`**; usa `unknown` + narrowing cuando el
  tipo no se conoce.
- Importa con el alias `@/` (ej. `import { jsonResponse } from "@/lib/api"`), no rutas
  relativas largas.

### Rutas API (`src/app/api/**`)

- Envuelve los handlers con `withErrorHandler` (`src/lib/api-middleware.ts`).
- Responde con `jsonResponse` (admin) o `corsJson` (API pública v1), no con
  `NextResponse.json` directo.
- Parsea el body con `safeJsonParseBody` (`src/lib/safe-json.ts`); no asumas que el JSON
  es válido.
- En rutas admin, valida la sesión con `requireAdmin()` antes de tocar datos.

### Manejo de errores

- Lanza subclases de `ApiError` (`src/lib/errors.ts`): `ValidationError` (400),
  `NotFoundError` (404), `UnauthorizedError` (401), `RateLimitError` (429).
- **No lances `new Error(...)` genérico** en la capa de datos/API: `withErrorHandler` lo
  convierte en un 500 en vez del status semántico correcto.
- No silencies errores con `catch {}` vacío salvo que el descarte sea intencional y esté
  comentado.

### Capa de datos (`src/lib/**`)

- Toda la lógica de acceso a datos vive en `src/lib/*`; los modelos Mongoose en
  `src/lib/models/*`. Las rutas API solo orquestan.
- Llama a `connectDB()` al inicio de cada función que toque la base de datos.
- Para escrituras en lote, usa `bulkWrite` en vez de bucles `for...of` con queries
  individuales.
- Valida la paginación con límites (`Math.min`/`Math.max`); nunca pases `limit` del
  cliente sin acotar.

### Seguridad y privacidad

- **Nunca devuelvas documentos Mongoose crudos** al cliente: serializa con DTOs de
  allowlist en `src/lib/serializers.ts`. No expongas campos sensibles (ej. `ipHash`).
- Escapa la entrada del usuario antes de usarla en regex con `escapeRegex`
  (`src/lib/api.ts`) para evitar ReDoS.
- Normaliza la IP (`x-forwarded-for`) antes de usarla como clave de rate limit.

### Idioma

- Dominio, mensajes de usuario y de error: **en español** (es la fuente de verdad del
  proyecto). Mantén la consistencia con el código existente.

### Tests

- Tests con Vitest en archivos `*.test.ts` junto al código que prueban.
- Mockea la base de datos en tests unitarios (ver `src/lib/admin-localizado.test.ts`).
