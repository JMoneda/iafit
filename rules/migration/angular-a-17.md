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

## Comando

```
ng update @angular/core@17 @angular/cli@17
# migración opcional de control flow:
ng generate @angular/core:control-flow
```
