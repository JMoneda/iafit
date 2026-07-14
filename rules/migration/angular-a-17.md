---
title: "Angular → 17"
category: migration
slug: angular-a-17
version: "1.0"
last_updated: "2026-07-09"
applies_to: ["frontend"]
status: active
---

## Salto 16 → 17

Procedimiento general del salto: ver [[proceso-migracion]] y [[convencion-ramas]].
Fuente de verdad: `https://update.angular.dev/?v=16.0-17.0`.

## Baselines

- **Node:** `^18.13.0 || ^20.9.0`
- **TypeScript:** `5.2`

## Cambios de cabecera / breaking

- ⚠️ **Nuevo control flow integrado**: `@if`, `@for`, `@switch` (reemplazan
  `*ngIf`, `*ngFor`, `*ngSwitch`). Hay schematic de migración automática
  (`ng generate @angular/core:control-flow`).
- **Deferrable views**: `@defer` para carga diferida en plantilla.
- ⚠️ **Application builder (esbuild + Vite) por defecto** en apps nuevas; para
  proyectos existentes se puede migrar el `builder` en `angular.json`.
- **Standalone por defecto** en apps generadas nuevas.
- Nuevos hooks `afterRender` / `afterNextRender`; **view transitions**.
- Nueva marca y documentación en `angular.dev`.

## Revisión manual sugerida

- Ejecutar el schematic de control flow y revisar plantillas complejas.
- Evaluar migrar el builder a esbuild/application (mejora tiempos de build) y
  validar que el pipeline de CI sigue verde.

## Ecosistema (majors que suben con este salto)

Ver [[alineacion-ecosistema]]. A 17 van: `@angular/cli`, `@angular-devkit/build-angular`,
`@angular/material`/`cdk`, `ng-packagr`, **`@angular-eslint/*`** (el que más se olvida).
`typescript` va al rango **`>=5.2 <5.5`** — no "al último". `zone.js` a `~0.14`.

## Residuos a eliminar en este salto

Ver [[residuos-de-migracion]]. Al cerrar el salto **no debe quedar**:

- `src/polyfills.ts` — sustituido por el arreglo `"polyfills": ["zone.js"]` (y
  `"zone.js/testing"` en `test`) dentro de `angular.json`. **No se crea a mano.**
- `src/test.ts` — el CLI descubre los `.spec.ts` solo.
- `angular.json` → `defaultProject` (el CLI lo ignora) y `cli.defaultCollection`
  (renombrado a `cli.schematicCollections`).
- `tsconfig.json` con `target` por debajo de **ES2022** (+ `useDefineForClassFields: false`).
- Reporters de cobertura duplicados en `karma.conf.js`
  (`karma-coverage-istanbul-reporter` está deprecado).

## Si es una librería (ng-packagr)

Ver [[librerias-publicadas]]. En este salto:

- `peerDependencies` de `projects/<lib>/package.json` suben a `^17.x`, y la versión de la
  librería a un major nuevo.
- `umdModuleIds` de `ng-package.json` desaparece (ya no se emite UMD), **pero las
  dependencias que declaraba siguen siendo reales**: pasan a `peerDependencies`. Eliminar la
  línea sin reubicar la dependencia crea una dependencia fantasma en el paquete publicado.
- Los pipes/componentes pueden ser `standalone`, pero **eso no se hace durante el salto**: va
  como hallazgo a [[sugerencias-post-migracion]].

## Comando

```bash
ng update @angular/core@17 @angular/cli@17
# migración opcional de control flow:
ng generate @angular/core:control-flow
```

## Verificación

```bash
# 1. Majors del ecosistema alineados en 17
npm ls @angular/core @angular/cli @angular-devkit/build-angular ng-packagr \
       @angular-eslint/eslint-plugin --depth=0
npm ls typescript zone.js --depth=0        # TS dentro de >=5.2 <5.5 ; zone.js ~0.14

# 2. Residuos del salto (deben salir vacíos)
ls src/polyfills.ts src/test.ts projects/*/src/polyfills.ts projects/*/src/test.ts 2>/dev/null
grep -nE '"(defaultProject|defaultCollection)"' angular.json
grep -nE '"target"\s*:\s*"[eE][sS](5|201[5-9]|2020|2021)"' tsconfig.json

# 3. Librería: dependencia fantasma tras eliminar umdModuleIds (ver 'librerias-publicadas')
grep -rn "import \* as\|from '[a-z]" projects/*/src/lib --include=*.ts | grep -v "@angular\|\./"

# 4. Build + pruebas verdes y paridad contra las specs de research
ng build && ng test --watch=false --browsers=ChromeHeadless
```

**Criterio de aceptación:** el comando 1 muestra todo en major 17; el 2 sale vacío; todo
paquete de terceros del 3 está declarado en el `package.json` de la librería.
