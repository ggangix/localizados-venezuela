# Cómo contribuir

## Requisitos previos

- **Node.js** 22+
- **MongoDB** 6+
- **npm**

## Arranque rápido

```bash
npm install
cp .env.example .env.local
npm run seed:sample
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000).

## Antes de abrir un Pull Request

```bash
npm run check
npm run build
```

Ambos comandos deben pasar sin errores.

## Flujo de trabajo

1. Haz fork del repositorio
2. Crea una rama: `git checkout -b mi-feature`
3. Realiza tus cambios
4. Ejecuta `npm run check` y `npm run build`
5. Haz commit y push a tu fork
6. Abre un Pull Request en GitHub

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
