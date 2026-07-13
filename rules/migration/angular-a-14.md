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

## Comando

```
ng update @angular/core@14 @angular/cli@14
```
