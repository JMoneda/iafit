---
title: "Actualizar sin alterar: preservar comportamiento y conexiones"
category: migration
slug: preservar-comportamiento
version: "1.0"
last_updated: "2026-07-10"
applies_to: ["frontend", "backend"]
status: active
---

## Regla

Una migración/actualización es **estrictamente conservadora del comportamiento**
(*behavior-preserving*): lo único que cambia es el framework, su versión y las APIs
deprecadas por su **equivalente exacto**. El sistema debe seguir operando **tal cual está**.

**Prohibido tocar durante una migración:**

- **Conexiones e integraciones**: cadenas de conexión, endpoints, colas, topics, storage,
  bases de datos, APIs externas, credenciales y sus destinos. Apuntan a **los mismos
  recursos, con los mismos valores**.
- **Lógica de negocio**: reglas, cálculos, validaciones, flujos y decisiones. No se
  "mejora", ni se corrige, ni se refactoriza de paso.
- **Contratos públicos**: firmas de API, formatos de mensaje/evento, esquemas de datos,
  nombres y semántica de campos.
- **Comportamiento observable**: mismas entradas → mismas salidas y efectos.

**Permitido (y esperado)** siempre que el comportamiento observable sea idéntico:

- Reemplazar sintaxis/APIs deprecadas por su equivalente de la nueva versión.
- Cambiar hosting model, TFM, paquetes y herramientas de build.
- Ajustes mecánicos que la nueva versión exige (p. ej. cómo se lee la configuración en el
  modelo isolated), siempre que **resuelvan a los mismos valores y destinos**.

## Justificación

La red de seguridad de la migración son las **specs de caracterización** de la fase
`research` (ver [[proceso-migracion]]): documentan el comportamiento ACTUAL y se verifican
tras cada salto. Si en el mismo cambio se mezcla migración con refactor, corrección o
features, se pierde la auditabilidad: ante un fallo es imposible saber si lo rompió la
versión nueva o el cambio funcional. Migrar y cambiar comportamiento son **dos actividades
distintas** que no comparten rama.

## Reglas específicas

- **Migración y cambios funcionales van en changes/ramas SEPARADOS.** Si durante la
  migración aparece un bug, una mejora o una deuda, se **anota en backlog** y se aborda
  **después**, fuera de la migración.
- **Verificación de paridad obligatoria** contra las specs de `research` tras cada salto;
  si el comportamiento cambió, es un defecto de migración, no un "ya que estábamos".
- **Sin equivalente directo**: cuando una API o conexión deprecada no tiene reemplazo 1:1,
  **se documenta y se decide con el usuario**; nunca se cambia silenciosamente el
  comportamiento ni el destino de una conexión.
- **Configuración y secretos** se conservan apuntando a los mismos recursos; mover el
  *mecanismo* (p. ej. a Key Vault) solo si ya era la política vigente y **sin cambiar
  valores ni destinos** — y aun así, preferible como cambio separado.

## Ejemplo

```
✅ Correcto
  - `*ngIf` → `@if` (Angular 17): misma condición, mismo render.
  - `HttpRequestMessage` → `HttpRequestData` (Functions isolated): mismo endpoint,
    misma respuesta, misma cadena de conexión.

❌ Incorrecto (fuera de alcance de la migración)
  - "Ya que subo a .NET 8, cambio la cola de Storage a Service Bus."
  - "Aprovecho y corrijo esta regla de negocio que estaba mal."
  - "Apunto la conexión a la nueva base mientras migro."
```
