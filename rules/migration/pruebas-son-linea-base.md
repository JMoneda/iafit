---
title: "Las pruebas son línea base: no se debilitan para que pasen"
category: migration
slug: pruebas-son-linea-base
version: "1.0"
last_updated: "2026-07-14"
applies_to: ["frontend", "backend"]
status: active
---

## Regla

Las pruebas existentes son **parte de la línea base** ([[linea-base-compila]]), igual que el
código de producción. Durante un salto de versión **no se reescriben las expectativas para
que pasen**. Si una prueba deja de compilar por el endurecimiento del compilador (TS
`strict`, nullable reference types en .NET), se ajusta **la sintaxis**, nunca **la aserción**.

La pregunta que decide siempre es la misma:

> ¿El cambio en la prueba es porque **el lenguaje ya no me deja escribirla así**, o porque
> **el aserto fallaba**? Lo primero se arregla. Lo segundo es una regresión.

Si un aserto falla tras el salto, **el defecto está en la migración**, no en la prueba.

## Justificación

[[preservar-comportamiento]] declara que las specs de caracterización son la red de
seguridad de la migración. Esa red **son las pruebas**. Debilitar el aserto para volver el
build verde no arregla nada: elimina la evidencia de que algo se rompió y deja el
comportamiento sin cobertura, con la apariencia de una suite en verde. Es la forma más
silenciosa de romper una migración, porque el pipeline pasa.

## Antipatrón (caso real: `@shared/pipes`, salto 12 → 17)

Al activar `strict: true`, los specs dejaron de compilar porque pasaban `null`/`undefined`
donde la firma espera una `Function`. En vez de castear, se reescribieron las expectativas:

```ts
// ❌ Lo que se hizo: el aserto cambió, el caso de prueba desapareció
- it('Should return the original array', () => {
-   expect(pipe.transform([1, 2], undefined)).toEqual([1, 2]);
- });
+ it('Should return the original array 1', () => {
+   expect(pipe.transform([1, 2], () => { return false })).toBeTruthy();
+ });
```

Tres cosas se perdieron de golpe:

1. El caso "sin función → devuelve el arreglo original" ya **no se prueba**, aunque
   `map.pipe.ts` **sigue teniendo** la rama `if (!isArray(input) || !fn) return input;`.
   El comportamiento existe y quedó sin cobertura.
2. El aserto pasó de `toEqual([1, 2])` (exacto) a `toBeTruthy()` (pasa con casi cualquier
   cosa distinta de `null`, `0` o `''`).
3. El test se renombró, así que el diff no delata la pérdida.

El mismo patrón se repitió en 8 archivos de spec del mismo salto.

```ts
// ✅ Lo correcto: la sintaxis se adapta, la aserción se conserva intacta
it('Should return the original array', () => {
  expect(pipe.transform([1, 2], null as unknown as Function)).toEqual([1, 2]);
});
```

## Reglas específicas

- **Ningún `expect`/`Assert` cambia de matcher** durante un salto. `toEqual` no se degrada a
  `toBeTruthy`/`toBeDefined`; `Assert.Equal` no se degrada a `Assert.NotNull`.
- **Ninguna prueba se borra, se renombra ni se marca como omitida** (`xit`, `it.skip`,
  `[Fact(Skip=...)]`, `[Ignore]`) para hacer verde el salto. Renombrar oculta la pérdida en
  el diff.
- **Los casos límite son los primeros que se pierden** y los más valiosos: `null`,
  `undefined`, arreglo vacío, colección de un elemento. Si el compilador impide pasarlos,
  **se castea** (`null as unknown as T`, `default!`, `#nullable disable` local); son las
  entradas que el código de producción sigue recibiendo en tiempo de ejecución.
- **El umbral de cobertura no baja** en un salto: queda igual o sube (ver
  [[pruebas-frontend-angular]], [[revision-pruebas-cobertura]]).
- **Si una prueba es genuinamente incorrecta** (probaba un bug), no se corrige aquí: se
  documenta como hallazgo y se aborda en un change separado (ver
  [[sugerencias-post-migracion]]).
- **Toda prueba tocada en un salto se justifica** en `notas-migracion.md`, con el motivo
  exacto del cambio de sintaxis.

## Verificación

```bash
# 1. Toda prueba modificada en el salto (revisión obligatoria, una por una)
git diff <rama-base>..HEAD --stat -- '*.spec.ts' '*Tests.cs' '*.test.ts'

# 2. Matchers degradados: cualquier resultado exige justificación en notas-migracion.md
git diff <rama-base>..HEAD -- '*.spec.ts' '*.test.ts' \
  | grep -E '^\-.*expect\(' | grep -E 'toEqual|toBe\(|toHaveBeenCalledWith'

# 3. Pruebas desactivadas o renombradas durante el salto (debe salir vacío)
git diff <rama-base>..HEAD -- '*.spec.ts' '*.test.ts' \
  | grep -E '^\+.*(xit\(|it\.skip|xdescribe|describe\.skip)'
git diff <rama-base>..HEAD -- '*Tests.cs' | grep -E '^\+.*(Skip\s*=|\[Ignore)'

# 4. El conteo de pruebas no disminuye respecto de la línea base
git grep -c -E "\bit\(|\bFact\b|\bTheory\b" <rama-base> -- '*.spec.ts' '*Tests.cs' | awk -F: '{s+=$NF} END {print "base:", s}'
git grep -c -E "\bit\(|\bFact\b|\bTheory\b" HEAD          -- '*.spec.ts' '*Tests.cs' | awk -F: '{s+=$NF} END {print "head:", s}'
```

**Criterio de aceptación:** los comandos 2 y 3 salen vacíos, o cada resultado tiene su
justificación explícita en `notas-migracion.md`. El conteo de `head` es **mayor o igual** al
de `base`.
