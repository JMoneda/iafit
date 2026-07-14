---
title: "Angular → 14"
category: migration
slug: angular-a-14
version: "1.0"
last_updated: "2026-07-09"
applies_to: ["frontend"]
status: active
---

## Salto 13 → 14

Procedimiento general del salto: ver [[proceso-migracion]] y [[convencion-ramas]].
Fuente de verdad: `https://update.angular.dev/?v=13.0-14.0`.

## Baselines

- **Node:** `^14.15.0 || ^16.10.0`
- **TypeScript:** `4.6 / 4.7`

## Cambios de cabecera / breaking

- **Standalone components** (developer preview): componentes/directivas/pipes sin
  NgModule. Aún no obligatorio.
- ⚠️ **Typed Reactive Forms**: `FormGroup`, `FormControl`, etc. pasan a ser
  fuertemente tipados. Puede romper compilación en formularios existentes;
  existe `UntypedFormGroup`/`UntypedFormControl` como puente temporal.
- **Page title** vía `Route.title` + `TitleStrategy`.
- **`ng completion`**: autocompletado de la CLI.
- Diagnósticos extendidos del compilador (advertencias nuevas de plantillas).

## Revisión manual sugerida

- Formularios reactivos: migrar tipos o usar los `Untyped*` como paso intermedio.
- Evaluar (sin obligar) adoptar standalone en componentes nuevos.

⚠️ **Los `Untyped*` son un puente, no un destino.** Si el salto los deja puestos, se anotan
como hallazgo ([[sugerencias-post-migracion]]) para tiparlos en un change separado. Tipar
formularios **cambia comportamiento** y no se hace dentro de la migración
(ver [[preservar-comportamiento]]).

## Ecosistema (majors que suben con este salto)

Ver [[alineacion-ecosistema]]: `@angular/cli`, `@angular-devkit/build-angular`,
`@angular/material`/`cdk`, `ng-packagr` y `@angular-eslint/*` van a 14. `typescript` al
rango que exige 14 (**4.6/4.7**).

## Residuos a eliminar en este salto

Ver [[residuos-de-migracion]]:

- `angular.json` → `cli.defaultCollection` **se renombra** a `cli.schematicCollections`
  (arreglo). Queda deprecado en este salto y su presencia arrastra hasta v17.
- `angular.json` → `defaultProject` queda deprecado; el CLI lo irá ignorando.
- `tslint.json` / dependencias `tslint` — ya no debería quedar ninguna (migrado a ESLint).

## Comando

```bash
ng update @angular/core@14 @angular/cli@14
```

## Verificación

```bash
# Residuos del salto (deben salir vacíos)
grep -nE '"(defaultProject|defaultCollection)"' angular.json
ls tslint.json 2>/dev/null

# Formularios: ¿quedaron Untyped* como deuda? (si hay, van a sugerencias-refactor.md)
grep -rn "UntypedForm" --include=*.ts src/ projects/ 2>/dev/null

npm ls @angular/core @angular/cli @angular-eslint/eslint-plugin --depth=0
ng build && ng test --watch=false --browsers=ChromeHeadless
```
