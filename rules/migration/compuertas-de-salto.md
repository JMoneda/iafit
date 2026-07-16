---
title: "Compuertas de verificación por salto (definition of done)"
category: migration
slug: compuertas-de-salto
version: "1.0"
last_updated: "2026-07-16"
applies_to: ["frontend", "backend"]
status: active
---

## Regla

Un salto de versión **solo se considera completo** cuando pasa **todas** estas compuertas, en
verde y **demostrables**. Está **prohibido** avanzar al siguiente salto (o fusionar el PR) con
cualquiera en rojo o "pendiente":

1. **Build verde** — la solución compila sin errores (`dotnet build` / `npm run build`).
2. **Pruebas verdes** — la suite pasa, con **conteo y cobertura ≥ la línea base**; ninguna
   prueba debilitada, borrada u omitida (ver [[pruebas-son-linea-base]], [[linea-base-compila]]).
3. **Arranque local verificado** — la app arranca sin errores y responde: `func start` (Azure
   Functions) / `ng serve` o el host correspondiente. No basta con que compile.
4. **Diff de contrato sin ruptura** — contra la [[linea-base-de-contrato]] (backend) y la
   paridad de [[preservar-comportamiento]]; sin diferencias de comportamiento observable.
5. **Re-escaneo de vulnerabilidades y deprecados** — el salto no introduce vulnerabilidades
   ni dependencias deprecadas sin un plan explícito.

## Justificación

Sin una compuerta objetiva y repetible por salto, los defectos se acumulan y se vuelven
indiagnosticables: tres saltos después nadie sabe si lo que falla lo rompió el framework, un
paquete o el modelo de ejecución. La compuerta es lo que convierte "salto a salto" en algo
**seguro y auditable**; es la definición de *done* de cada rama de migración
(ver [[convencion-ramas]], [[proceso-migracion]]).

## Reglas específicas

- **Las cinco compuertas se evidencian en el PR del salto** (logs/capturas o comandos), no se
  declaran "verde" de palabra.
- **Warnings nuevos se registran y se justifican** en `notas-migracion.md`; no se silencian
  sin explicación.
- **Ninguna compuerta se salta "temporalmente"**: si una no puede cumplirse (p. ej. no hay
  entorno para `func start`), es un bloqueador que se decide con el usuario, no un pendiente
  que se arrastra.
- **La compuerta 5 se re-ejecuta en cada salto**, no solo al inicio: una versión nueva puede
  arrastrar transitivos vulnerables o marcar deprecado algo que antes no lo estaba.

## Ejemplo

```
✅ Salto cerrado
  build ✅ · test ✅ (142/142, cov 78% ≥ base 78%) · func start ✅ (3/3 endpoints)
  · diff de contrato vacío ✅ · 0 vulnerables / 0 deprecados nuevos ✅

❌ No se puede cerrar
  "build y test en verde, pero func start no lo probé y el diff de contrato lo veo luego"
  → dos compuertas pendientes: el salto NO está completo.
```

## Verificación

```bash
# 1. Build
dotnet build -c Release            # backend
npm ci && npm run build            # frontend

# 2. Pruebas (conteo y cobertura ≥ línea base)
dotnet test --collect:"XPlat Code Coverage"
ng test --watch=false --browsers=ChromeHeadless --code-coverage

# 3. Arranque local
func start                         # Azure Functions: cada trigger responde
ng serve                           # frontend

# 4. Diff de contrato (ver linea-base-de-contrato) — debe salir vacío

# 5. Re-escaneo de vulnerabilidades y deprecados (no debe introducir nuevos)
dotnet list package --vulnerable --include-transitive
dotnet list package --deprecated
npm audit --omit=dev
```

**Criterio de aceptación:** las cinco compuertas en verde y evidenciadas en el PR. Cualquier
resultado nuevo del comando 5 tiene plan documentado; cualquier warning nuevo está justificado
en `notas-migracion.md`.
