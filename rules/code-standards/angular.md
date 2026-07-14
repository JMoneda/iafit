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

## Código heredado: se anota, no se corrige de paso

Estos estándares aplican a **código nuevo**. Un proyecto que llega a migrarse suele estar
lleno de `any` y de firmas sin tipar (`transform(input: any, fn: Function): any`). Eso
**no se corrige durante la migración**: tipar cambia comportamiento y contamina el salto
(ver [[preservar-comportamiento]]).

Se registra como hallazgo en `sugerencias-refactor.md` y se aborda en un change separado
(ver [[sugerencias-post-migracion]]). Lo que **sí** exige la migración es que activar `strict`
no sirva de excusa para debilitar las pruebas (ver [[pruebas-son-linea-base]]).

## Verificación

```bash
# 1. strict activo y sin excepciones locales
grep -nE '"(strict|noImplicitReturns|noFallthroughCasesInSwitch)"' tsconfig.json

# 2. `any` explícito y escapes del compilador (en código NUEVO deben salir vacíos;
#    en código heredado, cada resultado va a sugerencias-refactor.md)
grep -rnE ":\s*any\b|\bas any\b" --include=*.ts src/ projects/ | grep -v ".spec.ts"
grep -rn "@ts-ignore\|@ts-nocheck" --include=*.ts src/ projects/

# 3. HTTP fuera de servicios (los componentes no llaman al gateway directamente)
grep -rln "HttpClient" --include=*.component.ts src/ projects/

# 4. URLs hard-coded en vez de configuración de entorno (debe salir vacío)
grep -rnE "https?://" --include=*.ts src/ projects/ | grep -v "environment\|.spec.ts"

# 5. Compila y lintea limpio
ng build && ng lint
```

**Criterio de aceptación:** el comando 1 muestra `strict: true`; los comandos 3 y 4 salen
vacíos; el 5 termina sin errores ni warnings. Los resultados del 2 en código heredado están
inventariados como hallazgos, no corregidos dentro del salto.
