---
title: "Pruebas de frontend Angular (Karma/Jasmine, cobertura, CI)"
category: pruebas
slug: pruebas-frontend-angular
version: "1.0"
last_updated: "2026-07-14"
applies_to: ["frontend", "angular", "typescript"]
status: active
---

## Regla

El frontend Angular tiene pruebas unitarias que se ejecutan **en el pipeline, sin navegador
interactivo y sin modo watch**, con un **umbral de cobertura que bloquea el merge**. Es la
contraparte de [[pruebas-unitarias]] (que aplica a backend/.NET) para el stack Angular.

Un umbral existe para **fallar**. Un umbral que ningún proyecto puede incumplir no es un
umbral: es decoración.

## Justificación

En una librería o SPA, las pruebas son el único contrato verificable de lo que el código hace
— y en una migración son la **red de seguridad** de la verificación de paridad
([[preservar-comportamiento]]). Si la configuración de Karma está pensada para la máquina del
desarrollador (Chrome visible, `autoWatch`, `singleRun: false`), el pipeline o **se cuelga**
esperando un navegador que nunca abre, o alguien lo "arregla" desactivando las pruebas.

## Configuración mínima

- **Ejecución headless en CI**: `ChromeHeadless` (o el launcher `ChromeHeadlessCI` con
  `--no-sandbox`, necesario en agentes containerizados), `--watch=false`, `--browsers` explícito.
- **Un solo reporter de cobertura**: `karma-coverage`. `karma-coverage-istanbul-reporter` está
  deprecado; los dos a la vez producen reportes que compiten por el mismo directorio.
- **Formato de cobertura que el pipeline entienda**: `cobertura` y/o `lcovonly` para publicar
  en Azure DevOps y SonarQube (ver [[azure-devops]]).
- **Umbrales reales** en `coverageReporter.thresholds`, acordados con el equipo técnico y
  **respetados por el gate** de SonarQube.

```jsonc
// package.json — el script que corre el pipeline, no el del desarrollador
"scripts": {
  "test": "ng test",
  "test:ci": "ng test --watch=false --browsers=ChromeHeadlessCI --code-coverage"
}
```

## Antipatrón (caso real: `@shared/pipes`)

```js
// karma.conf.js
plugins: [
  require('karma-coverage-istanbul-reporter'),   // ❌ deprecado
  require('karma-coverage'),                     // ❌ ...y el otro a la vez
],
coverageReporter: {
  thresholds: {
    statements: 20,   // ❌ umbrales que no puede incumplir ni un proyecto vacío
    lines: 20,
    branches: 1,      // ❌ un umbral de 1% no es un umbral
    functions: 15
  }
},
browsers: ['Chrome'],    // ❌ navegador visible: en un agente de CI no existe
singleRun: false,        // ❌ el pipeline se queda esperando para siempre
autoWatch: true          // ❌ ídem
```

El `customLauncher` `ChromeHeadlessCI` **estaba definido** en el archivo... y no lo usaba
nadie. La configuración por defecto es la del desarrollador, así que `npm test` en el
pipeline no termina.

## Reglas específicas

- **El script que corre CI no es el que corre el desarrollador.** `test:ci` es explícito en
  headless, sin watch y con cobertura; `test` puede ser cómodo.
- **Los umbrales no bajan.** Ni para "desbloquear el pipeline", ni durante una migración: en
  un salto de versión quedan **iguales o suben** (ver [[pruebas-son-linea-base]]).
- **Toda rama pública (`public-api.ts`) de una librería tiene prueba.** Es código que ejecutan
  terceros (ver [[librerias-publicadas]]).
- **Los casos límite se prueban explícitamente**: `null`, `undefined`, arreglo vacío, un solo
  elemento. Son las entradas que el código recibe en producción y las primeras que se pierden
  cuando alguien pelea con el compilador.
- **Prohibido `xit` / `it.skip` en la rama principal.** Una prueba omitida es una prueba que
  no existe, con el costo de mantenerla y ninguno de sus beneficios.
- **La cobertura se publica en el pipeline** (`PublishCodeCoverageResults`) y alimenta el gate
  de SonarQube, igual que en backend (ver [[pruebas-unitarias]], [[azure-devops]]).

## Verificación

```bash
# 1. Las pruebas corren headless y terminan solas (esto es lo que corre CI)
ng test --watch=false --browsers=ChromeHeadless --code-coverage

# 2. Reporters de cobertura duplicados o deprecados (debe salir vacío)
grep -n "istanbul" karma.conf.js projects/*/karma.conf.js 2>/dev/null

# 3. Config atada al entorno del desarrollador (revisar cada resultado)
grep -nE "browsers:|singleRun:|autoWatch:" karma.conf.js projects/*/karma.conf.js 2>/dev/null

# 4. Umbrales de cobertura: ¿son reales?
grep -A6 "thresholds" karma.conf.js projects/*/karma.conf.js 2>/dev/null

# 5. Pruebas omitidas en la rama principal (debe salir vacío)
grep -rnE "\b(xit|xdescribe)\(|\b(it|describe)\.skip\(" --include=*.spec.ts .

# 6. Existe un script de CI explícito
grep -nE '"test(:ci)?"' package.json
```

**Criterio de aceptación:** el comando 1 termina con código 0 sin intervención; los comandos 2
y 5 salen vacíos; los umbrales del 4 son los acordados por el equipo y el gate los aplica.
