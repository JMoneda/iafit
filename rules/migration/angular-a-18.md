---
title: "Angular → 18"
category: migration
slug: angular-a-18
version: "1.0"
last_updated: "2026-07-09"
applies_to: ["frontend"]
status: active
---

## Salto 17 → 18

Procedimiento general del salto: ver [[proceso-migracion]] y [[convencion-ramas]].
Fuente de verdad: `https://update.angular.dev/?v=17.0-18.0`.

## Baselines

- **Node:** `^18.19.0 || ^20.11.0 || ^22.0.0`
- **TypeScript:** `5.4`

## Cambios de cabecera / breaking

- **Angular Material 3** estable.
- **Zoneless change detection** (experimental):
  `provideExperimentalZonelessChangeDetection`.
- **Deferrable views** (`@defer`) estables.
- **Redirects de ruta como función**.
- **Event replay** (SSR) en developer preview.
- Contenido de reserva en `ng-content` (`<ng-content>` con fallback).
- Eventos unificados de estado de formularios.

## Revisión manual sugerida

- Si usan Material, planear la subida a Material 3 (tokens/temas cambian).
- Zoneless sólo si el equipo lo decide explícitamente (aún experimental).

## Comando

```
ng update @angular/core@18 @angular/cli@18
# y, si aplica:
ng update @angular/material@18
```
