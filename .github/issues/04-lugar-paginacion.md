## Por qué

En `/lugares/{slug}` hay hospitales con decenas de personas. Hoy, si hay más de una página, la UI solo muestra un enlace a la API. El usuario normal no debería necesitar la API para ver más nombres.

## Qué hacer

1. Usar el componente de paginación (misma issue o PR que `/buscar`)
2. URL: `/lugares/hospital-x?page=2`
3. `getLugarBySlug` ya recibe `page` y `limit` — solo falta pasar el query param

## Archivos

- `src/app/lugares/[slug]/page.tsx`
- `src/lib/queries.ts`

## Listo cuando

- [ ] Lugares con muchos localizados muestran paginación
- [ ] `npm run build` OK
