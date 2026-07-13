---
title: "Proceso de migración incremental (OpenSpec)"
category: migration
slug: proceso-migracion
version: "1.0"
last_updated: "2026-07-09"
applies_to: ["frontend", "backend"]
status: active
---

## Regla

Toda migración se ejecuta como una secuencia de fases sobre OpenSpec, en este
orden, y **todo artefacto se redacta en español**:

0. **Comparación de ramas (fase 0)** — lo PRIMERO: comparar `dev` contra `master`/`main`
   y documentar el estado (qué está liberado, qué falta por liberar, si divergen) y desde
   qué rama se parte para migrar. Solo lectura (git), explícito pero puntual.
1. **Inventario técnico** — capturar el estado actual: framework y versión, paquetes
   y sus versiones, dependencias con APIs deprecadas, pipeline de build y pruebas.
   Incluye **verificar que la línea base compila** antes de tocar nada; si no compila, se
   documenta como bloqueador (ver [[linea-base-compila]]).
2. **Investigación (`research`)** — documentar el comportamiento ACTUAL como specs
   de caracterización (read-only, estilo *linear walkthrough*). Es la red de seguridad
   para verificar paridad tras cada salto.
3. **Migración incremental** — un cambio de OpenSpec por salto de versión, cada uno
   en su propia rama (ver [[convencion-ramas]]).
4. **Verificación de paridad** — tras cada salto, comprobar que el comportamiento
   sigue cumpliendo las specs de la fase 2.
5. **README final** — al cerrar la migración del proyecto, generar/actualizar un
   README en español que sintetice lo aprendido, porque muchos proyectos no tienen
   documentación o es deficiente. Además, al cerrar el `apply` de cada API se deja el
   API bien documentado: README del API + Swagger/OpenAPI (implementarlo si no existe),
   como documentación, sin alterar comportamiento (ver [[documentacion-api-cierre]]).
6. **Sugerencias de refactor** — consolidar las vulnerabilidades y mejoras detectadas
   durante el proceso como sugerencias por API, para changes futuros separados; las de
   seguridad se proponen como HU (ver [[sugerencias-post-migracion]]).

## Justificación

Migrar sin una línea base documentada es migrar a ciegas: no hay forma de saber si
se rompió algo. Documentar primero el comportamiento actual y luego avanzar en
saltos pequeños y verificables hace la migración auditable y reversible.

## Reglas específicas

- **La migración preserva el comportamiento** (ver [[preservar-comportamiento]]): solo se
  actualiza framework/versión; no se alteran conexiones ni lógica de negocio. El sistema
  debe seguir operando tal cual está.
- **No se implementa nada en las fases 1 y 2.** Son read-only (documentación).
- **Cada salto verifica contra las specs de `research`** antes de continuar al
  siguiente.
- **El README final se deriva** de las specs y walkthroughs acumulados, no se
  redacta a mano desde cero.
- **El orden no se salta.** Si no hay inventario ni research, no se inicia la
  migración incremental.

## Relación con el onboarding

Cuando el MCP arranca en un proyecto sin configurar, la entrevista de onboarding
pregunta: ¿actualizar?, ¿qué?, ¿crear rama?, ¿cómo llamarla?, ¿usar OpenSpec?,
¿instalarlo? Con las respuestas, configura los schemas de estas fases. El MCP
entrega el plan y el contenido; **el agente ejecuta** git/npm y escribe los archivos.
