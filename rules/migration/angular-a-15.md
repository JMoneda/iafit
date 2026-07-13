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

## Comando

```
ng update @angular/core@15 @angular/cli@15
# y, si aplica:
ng update @angular/material@15
```
