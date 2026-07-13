---
title: "Estándares Angular"
category: code-standards
slug: angular
version: "1.0"
last_updated: "2026-07-09"
applies_to: ["frontend", "angular", "typescript"]
status: active
---

## Regla

El frontend en **Angular/TypeScript** compila en modo `strict` sin errores ni warnings,
sigue una estructura modular por componentes y consume datos **solo** a través del API
Gateway (ver [[frontend-spa-angular]]). Complementa a los estándares generales de
TypeScript (ver [[typescript]]).

## Reglas específicas

- **TypeScript strict.** Prohibido `any` explícito; usar `unknown` cuando el tipo se
  desconoce. Tipos explícitos en firmas públicas.
- **Componentes reutilizables y cohesivos**; separar presentación de lógica. Preferir
  componentes standalone según la versión de Angular del proyecto.
- **Servicios para el acceso a datos** (HttpClient), nunca llamadas HTTP dispersas en
  componentes. Base URL del gateway por configuración de entorno, no hard-coded.
- **Manejo explícito de errores** de las respuestas del gateway y mensajes claros al
  usuario.
- **Telemetría** de front-end con Application Insights (ver [[logging-appinsights]]).
- **Accesibilidad y diseño responsivo** según lineamientos institucionales.
- La **versión de Angular** y su actualización siguen las reglas de la categoría
  `migration` (`angular-a-*`, `convencion-ramas`).

## Configuración obligatoria (tsconfig)

```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true
  }
}
```
