---
title: "Angular → 15"
category: migration
slug: angular-a-15
version: "1.0"
last_updated: "2026-07-09"
applies_to: ["frontend"]
status: active
---

## Salto 14 → 15

Procedimiento general del salto: ver [[proceso-migracion]] y [[convencion-ramas]].
Fuente de verdad: `https://update.angular.dev/?v=14.0-15.0`.

## Baselines

- **Node:** `^14.20.0 || ^16.13.0 || ^18.10.0`
- **TypeScript:** `4.8`

## Cambios de cabecera / breaking

- **Standalone APIs estables**: bootstrap standalone, `provideRouter`,
  `provideHttpClient`, guards funcionales.
- ⚠️ **Angular Material pasa a MDC** (Material Design Components): cambian el DOM
  y el CSS de muchos componentes. Los componentes antiguos quedan como
  `mat-legacy-*` (import temporal). **Alto impacto visual** — requiere QA.
- **Directive composition API** (`hostDirectives`).
- **`NgOptimizedImage`** estable.
- Se elimina el soporte experimental previo de algunas APIs de router legacy.

## Revisión manual sugerida

- **Material**: decidir entre migrar estilos a MDC o usar `mat-legacy-*` como puente.
  Revisar visualmente TODOS los componentes Material afectados.
- Migrar router/HttpClient a las nuevas `provide*` APIs.

## Ecosistema (majors que suben con este salto)

Ver [[alineacion-ecosistema]]: `@angular/cli`, `@angular-devkit/build-angular`,
`@angular/material`/`cdk`, `ng-packagr` y `@angular-eslint/*` van a 15. `typescript` al
rango que exige 15 (**4.8**), no al último publicado.

## Residuos a eliminar en este salto

Ver [[residuos-de-migracion]]. Este es **el salto donde nace la mayoría de los residuos** de
los proyectos EAFIT, porque cambia la forma de declarar pruebas y polyfills:

- `src/test.ts` — **deja de ser necesario**: el CLI descubre los `.spec.ts` solo. Se elimina
  y se quita de `tsconfig.spec.json` (`files`).
- `src/polyfills.ts` — se reemplaza por el arreglo `"polyfills"` en `angular.json`
  (`["zone.js"]` en build, `["zone.js", "zone.js/testing"]` en test). **No se crea a mano.**
- `tsconfig.json` — `target` sube a **ES2022** con `useDefineForClassFields: false`.
- `e2e/`, `protractor.conf.js` — Protractor sale de soporte.

## Comando

```bash
ng update @angular/core@15 @angular/cli@15
# y, si aplica:
ng update @angular/material@15
```

## Verificación

```bash
# Residuos del salto (deben salir vacíos)
ls src/test.ts src/polyfills.ts projects/*/src/test.ts projects/*/src/polyfills.ts 2>/dev/null
ls e2e/ protractor.conf.js 2>/dev/null
grep -n '"polyfills"\s*:\s*"' angular.json      # string = formato viejo; debe ser arreglo
grep -nE '"target"\s*:\s*"[eE][sS](5|201[5-9]|2020|2021)"' tsconfig.json

# Ecosistema en 15 y pruebas verdes tras el cambio de Material
npm ls @angular/core @angular/cli @angular/material @angular-eslint/eslint-plugin --depth=0
ng build && ng test --watch=false --browsers=ChromeHeadless
```
