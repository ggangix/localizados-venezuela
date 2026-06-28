# AGENTS.md

Guía para agentes de código que trabajen en este repositorio. Las personas
deben empezar por `README.md`; este archivo es el mapa operativo corto para
agentes.

## Misión del proyecto

Localizados Venezuela es un registro público, en español primero, de personas
que ya fueron localizadas después del sismo en Venezuela. El producto está
limitado a personas localizadas, lugares, búsqueda pública, contribuciones
ciudadanas y moderación. No conviertas esta app en un flujo para reportar
desaparecidos; el README enlaza el proyecto separado para desaparecidos.

Como el sitio está cerca de un contexto de seguridad y ayuda pública, conserva
la claridad, la privacidad y los límites de moderación. Las contribuciones
ciudadanas y los resultados de OCR no son confiables hasta que una persona
moderadora los apruebe.

## Stack

- Next.js 15 App Router, React 19, TypeScript, Tailwind CSS
- MongoDB vía Mongoose
- npm, Node.js 22+
- ESLint, Prettier, Husky, lint-staged

## Configuración local

```bash
npm install
cp .env.example .env.local
npm run seed:sample
npm run dev
```

Usa una instancia local o remota de MongoDB 6+. La URI local sugerida es:

```env
MONGODB_URI=mongodb://127.0.0.1:27017/localizados_venezuela
```

El trabajo opcional de administración u OCR necesita `ADMIN_SECRET`,
`OPENAI_API_KEY` y valores relacionados de `.env.example`. Nunca guardes
secretos reales en commits.

## Validación

Ejecuta esto antes de abrir o actualizar un PR:

```bash
npm run check
npm run build
```

`npm run check` ejecuta lint y verificación de Prettier. GitHub Actions ejecuta
lint, format check y build en PRs hacia `main` o `master`.

Para cambios en datos o scripts de importación, también ejecuta el comando
relevante:

```bash
npm run seed:sample
npm run seed:ocr -- --dry-run
npm run merge
```

Usa `npm run merge -- --apply` solo cuando la escritura en base de datos sea
intencional y explícita.

## Mapa del repositorio

- `src/app/` - páginas de App Router y rutas API
- `src/components/` - componentes compartidos y UI de administración
- `src/lib/` - modelos Mongo, queries, serializadores, auth, OCR, analytics y
  helpers
- `scripts/` - herramientas de seed, importación OCR, export, merge de
  duplicados y generación de secretos admin
- `seed/` - datos de muestra y metadatos del seed
- `public/uploads/` - destino runtime para subidas; no guardes uploads generados
  en git
- `.github/workflows/ci.yml` - control de CI para PRs

## Reglas de implementación

- Mantén el texto visible para usuarios en español primero, salvo que estés
  agregando una superficie bilingüe de forma intencional.
- Reusa helpers existentes de queries, modelos y serializadores antes de crear
  nuevos patrones de acceso a datos.
- Valida inputs en rutas API y devuelve errores genéricos a clientes.
- Mantén las rutas admin protegidas con el patrón existente de cookie de sesión
  admin o `Authorization: Bearer <ADMIN_SECRET>`.
- Mantén las contribuciones ciudadanas dentro del flujo de moderación; no hagas
  públicas las contribuciones sin revisar.
- Trata texto OCR e imágenes subidas como material no confiable.
- No expongas secretos, llaves admin privadas, llaves de OpenAI ni rutas locales
  al navegador.
- Prefiere los patrones existentes de soft delete y restore antes de hard
  deletes.
- Conserva el formato existente: ESLint y Prettier con el plugin de Tailwind.

## Datos y seeds

`seed/sample/` es el dataset seguro para desarrollo y debe mantenerse pequeño. El
dataset completo lo generan mantenedores desde fuentes externas. Los Markdown de
OCR viven en el repositorio externo referenciado por `README.md`; no copies ese
repositorio dentro de este.

Cuando cambies scripts, conserva modos dry-run útiles y actualiza `seed/README.md`
o `README.md` si cambian comandos o expectativas de archivos.

## Expectativas de PR

- Trabaja desde un fork o una rama de trabajo; mantén el diff limitado al issue.
- Menciona el número de issue en el cuerpo del PR.
- Incluye qué cambió, por qué cambió y cómo fue validado.
- No incluyas cambios de formato ajenos al scope, uploads generados, secretos
  `.env*` ni artefactos de base de datos local.
- Si no puedes ejecutar un check requerido, explica exactamente por qué en el PR.

## Nota para agentes en inglés

No mantengas una copia separada en inglés. Este archivo en español es la fuente
canónica; si una herramienta necesita resumirlo o traducirlo para su ejecución,
debe hacerlo a partir de `AGENTS.md` para evitar instrucciones divergentes.
