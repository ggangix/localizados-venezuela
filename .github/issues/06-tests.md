## Por qué
No hay tests. Si alguien cambia `queries.ts` o `serializers.ts` puede romper búsqueda o listados sin darse cuenta. El CI solo hace lint y build.

## Qué hacer
1. Añadir Vitest (o Jest) al proyecto
2. Tests unitarios mínimos:
   - `toLocalizadoDTO` / `toLugarDTO` en `src/lib/serializers.ts`
   - `normalizeNombre` en `src/lib/models/Localizado.ts`
3. Comando `npm test` en `package.json`
4. Añadir paso `npm test` al workflow `.github/workflows/ci.yml`

## Opcional (no bloquea el PR)
- Tests con `mongodb-memory-server` para `searchLocalizados`

## Listo cuando
- [ ] Al menos 5 tests pasan en local
- [ ] CI ejecuta tests en cada PR
- [ ] README o CONTRIBUTING menciona `npm test`