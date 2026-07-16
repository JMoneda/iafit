---
title: "Línea base de contrato: snapshots del API + diff por salto"
category: migration
slug: linea-base-de-contrato
version: "1.0"
last_updated: "2026-07-16"
applies_to: ["backend"]
status: active
---

## Regla

Antes del primer salto se **fija una línea base de contrato**: un conjunto de **snapshots
JSON** de las respuestas de cada endpoint (entradas representativas → salida exacta) más el
documento **OpenAPI/Swagger** del servicio. Tras **cada** salto se regenera y se hace **diff
contra la línea base**. Cualquier diferencia es un **breaking change hasta que se demuestre
lo contrario** y debe resolverse **antes de avanzar** al siguiente salto.

Este es el instrumento ejecutable con el que se verifica [[preservar-comportamiento]] en
backend: donde las specs de `research` describen el comportamiento en prosa, los snapshots lo
**congelan byte a byte**.

## Justificación

"El comportamiento no cambió" es una afirmación sin evidencia si no hay con qué compararla.
Un snapshot de la respuesta real —con su casing, su manejo de `null`, sus enums, sus fechas y
su orden de campos— convierte la paridad en una comprobación objetiva y repetible. El
frontend consume ese contrato exacto; un cambio silencioso en la serialización (ver
[[serializacion-vector-de-ruptura]]) rompe al consumidor aunque el build y los tests unitarios
estén en verde.

## Reglas específicas

- **Qué se captura por endpoint**: ruta y verbo, parámetros de query, **status code**,
  headers relevantes (p. ej. `Content-Type`), y el **cuerpo JSON completo** con su casing,
  manejo de `null`, enums (número vs string), formato de fechas y cultura.
- **Entradas representativas**: al menos el caso feliz y los casos límite conocidos (no
  encontrado, vacío, error). El comportamiento peculiar observable (p. ej. HTTP 200 ante
  excepción) **también se captura**: es contrato hasta que el dueño del servicio decida
  lo contrario (ver [[preservar-comportamiento]]).
- **Dónde vive**: junto a las specs de `research` (p. ej. `research/contracts/` o
  `specs/**/contracts/`), versionado. La línea base se genera **una vez, contra el estado
  actual**, antes del Salto 1.
- **Diff por salto**: forma parte de las [[compuertas-de-salto]]. Un diff con diferencias
  **bloquea el avance** hasta mitigarlo preservando el comportamiento previo (nunca cambiando
  el contrato "de paso").
- **El OpenAPI/Swagger es parte del contrato**: si no existe, se implementa como
  documentación al cerrar (ver [[documentacion-api-cierre]]), pero para la línea base basta
  con capturar las respuestas reales.

## Ejemplo

```
✅ Correcto
  - Snapshot de GET /admited?domain=eafit.edu.co → 200, body exacto guardado.
  - Tras el salto isolated: mismo request → diff vacío. Salto verificado.

❌ Incorrecto
  - "Los tests unitarios pasan, no hace falta comparar la respuesta."
    → System.Text.Json serializó camelCase donde antes era PascalCase; el frontend
      dejó de leer los campos y nadie lo vio hasta producción.
```

## Verificación

```bash
# 1. Generar la línea base ANTES de migrar (una vez, contra el estado actual)
func start &                                   # o el host del salto
curl -s "http://localhost:7071/api/GetAdmited?domain=eafit.edu.co" \
  | tee research/contracts/GetAdmited.baseline.json
# (repetir por endpoint y por caso representativo)

# 2. Tras CADA salto: regenerar y comparar (debe salir vacío)
curl -s "http://localhost:7071/api/GetAdmited?domain=eafit.edu.co" \
  | diff - research/contracts/GetAdmited.baseline.json

# 3. Diff del contrato OpenAPI/Swagger contra la línea base (debe salir vacío)
diff research/contracts/swagger.baseline.json <(curl -s http://localhost:7071/api/swagger.json)
```

**Criterio de aceptación:** los diffs de los comandos 2 y 3 salen **vacíos**. Cualquier
diferencia se resuelve preservando el comportamiento previo antes de cerrar el salto; si el
dueño del servicio decide aceptar el cambio, se documenta y se **regenera la línea base**.
