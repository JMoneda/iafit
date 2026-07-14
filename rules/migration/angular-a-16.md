---
title: "Angular → 16"
category: migration
slug: angular-a-16
version: "1.0"
last_updated: "2026-07-09"
applies_to: ["frontend"]
status: active
---

## Salto 15 → 16

Procedimiento general del salto: ver [[proceso-migracion]] y [[convencion-ramas]].
Fuente de verdad: `https://update.angular.dev/?v=15.0-16.0`.

## Baselines

- **Node:** `^16.14.0 || ^18.10.0`
- **TypeScript:** `4.9 / 5.0`

## Cambios de cabecera / breaking

- **Signals** (developer preview): `signal`, `computed`, `effect`.
- **Required inputs**: `@Input({ required: true })`.
- **Router component input binding**: `withComponentInputBinding()` mapea params a `@Input`.
- **`DestroyRef`** y **`takeUntilDestroyed`** (interop RxJS).
- **esbuild**: builder de desarrollo en developer preview.
- **Hydration** (SSR no destructiva) en developer preview.
- Etiquetas **self-closing** en plantillas.

## Revisión manual sugerida

- Oportunidad de empezar a introducir signals en estado local (no obligatorio).
- Revisar suscripciones manuales que puedan pasar a `takeUntilDestroyed`.

⚠️ Signals y `takeUntilDestroyed` **son mejoras, no parte del salto**: cambian el modelo de
ejecución. Se anotan como hallazgo ([[sugerencias-post-migracion]]) y se abordan en un change
separado (ver [[preservar-comportamiento]]).

## Ecosistema (majors que suben con este salto)

Ver [[alineacion-ecosistema]]: `@angular/cli`, `@angular-devkit/build-angular`,
`@angular/material`/`cdk`, `ng-packagr` y `@angular-eslint/*` van a 16. `typescript` al
rango que exige 16 (**4.9/5.0**).

## Residuos a eliminar en este salto

Ver [[residuos-de-migracion]]:

- **`ngcc` desaparece**: cualquier referencia (scripts `postinstall` con `ngcc`,
  `enableIvy` en `tsconfig`) es residuo y se elimina.
- `angular.json` → `defaultProject` ya no lo usa el CLI.
- Si vienes de un salto donde se creó `polyfills.ts`/`test.ts` a mano, es el momento de
  cerrarlo: la config correcta es el arreglo `"polyfills"` en `angular.json`.

## Comando

```bash
ng update @angular/core@16 @angular/cli@16
```

## Verificación

```bash
# Residuos del salto (deben salir vacíos)
grep -rn "ngcc\|enableIvy" package.json tsconfig.json angular.json 2>/dev/null
grep -nE '"defaultProject"' angular.json
ls src/polyfills.ts src/test.ts projects/*/src/polyfills.ts projects/*/src/test.ts 2>/dev/null

npm ls @angular/core @angular/cli @angular-eslint/eslint-plugin typescript --depth=0
ng build && ng test --watch=false --browsers=ChromeHeadless
```
