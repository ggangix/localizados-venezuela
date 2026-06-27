## Por qué

**Es lo más urgente de la fase 2.** Las contribuciones en `/contribuir` se guardan como `pending` y nunca se publican. Sin panel de moderación, el formulario no sirve de nada en producción.

## Qué hacer (MVP)

### Ruta protegida

- Ej: `/admin/contribuciones`
- Auth con variable de entorno `ADMIN_SECRET` (header o cookie simple)

### Listado

- Ver contribuciones `pending` (tipo `persona` e `lista_imagen`)
- Mostrar datos relevantes y enlace a imagen si aplica

### Acciones

| Acción              | Efecto                                                            |
| ------------------- | ----------------------------------------------------------------- |
| **Aprobar** persona | `Contribucion` + `Localizado` → `published` (visible en búsqueda) |
| **Rechazar**        | estado `rejected`                                                 |
| **Aprobar** imagen  | marcar aprobada; OCR puede ser issue aparte                       |

### Documentación

- Añadir `ADMIN_SECRET` a `.env.example`

## Fuera de alcance (no en este PR)

- OCR automático
- Editar campos antes de publicar
- Varios roles de usuario

## Listo cuando

- [ ] Sin `ADMIN_SECRET` configurado, la ruta no es accesible
- [ ] Aprobar una persona la hace visible en `/buscar`
- [ ] Rechazar no la publica
- [ ] Variables documentadas en `.env.example`
