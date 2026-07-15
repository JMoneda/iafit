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
   documentación o es deficiente. El README general queda **completo** contra su checklist
   de completitud (ver [[readme-api-completo]]), no a medias ni con el boilerplate del
   generador. Además, al cerrar el `apply` de cada API se deja el API bien documentado:
   README + Swagger/OpenAPI (implementarlo si no existe), como documentación, sin alterar
   comportamiento (ver [[documentacion-api-cierre]]).
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
- **Las pruebas existentes son línea base**: no se debilitan para que el salto quede verde
  (ver [[pruebas-son-linea-base]]).
- **Cada salto cierra sin residuos**: la configuración de la versión anterior se elimina en
  ese mismo salto (ver [[residuos-de-migracion]]) y el ecosistema queda alineado al major
  destino (ver [[alineacion-ecosistema]]).
- **Si el componente es una librería publicada**, el manifiesto que se publica es parte del
  contrato y se verifica en cada salto (ver [[librerias-publicadas]]).
- **El README final se deriva** de las specs y walkthroughs acumulados, no se
  redacta a mano desde cero. El README boilerplate del CLI (`ng serve`, `ng e2e`) **no es
  documentación**: si sigue ahí al cerrar, la fase 5 no se hizo (ver [[readme-api-completo]]).
- **El orden no se salta.** Si no hay inventario ni research, no se inicia la
  migración incremental.

## Cuando el repo ya sufrió un salto múltiple

Muchos proyectos llegan con la cadena rota: alguien subió de v12 a v17 en un solo commit. Eso
**no se deshace**, pero sí se detecta y se paga, porque **ningún schematic intermedio corrió**
y toda migración automática que esos saltos traían quedó sin ejecutar.

Al detectarlo en la fase 1 (inventario), se documenta como **deuda de saltos omitidos** y se
inventaría lo que los schematics habrían hecho:

- Configuración que quedó en el formato de la versión vieja ([[residuos-de-migracion]]).
- Paquetes del ecosistema que `ng update` no tocó ([[alineacion-ecosistema]]).
- Pruebas que se debilitaron para que el salto compilara ([[pruebas-son-linea-base]]).
- APIs deprecadas que cada versión intermedia habría migrado automáticamente.

Señales de que ocurrió: un solo commit con el `package-lock.json` regenerado entero; el
`package.json` salta varios majors de golpe; el historial no tiene una rama por versión
([[convencion-ramas]]).

**No se "re-migra" hacia atrás.** Se levanta el inventario del estado real, se sanea como
trabajo explícito y **desde ahí** se reanuda la cadena de saltos, uno a uno.

## Relación con el onboarding

Cuando el MCP arranca en un proyecto sin configurar, la entrevista de onboarding
pregunta: ¿actualizar?, ¿qué?, ¿crear rama?, ¿cómo llamarla?, ¿usar OpenSpec?,
¿instalarlo? Con las respuestas, configura los schemas de estas fases. El MCP
entrega el plan y el contenido; **el agente ejecuta** git/npm y escribe los archivos.

## Verificación

```bash
# 1. ¿El repo ya sufrió un salto múltiple? (commits que regeneran el lock entero)
git log --oneline --stat -- package-lock.json | head -30
git log -p --follow -- package.json | grep -E "^[+-].*\"@angular/core\"" | head

# 2. ¿Existe una rama por versión, o se saltó la cadena?
git branch -a --list '*migration*'

# 3. El README final no puede ser el boilerplate del CLI (debe salir vacío)
grep -lE "This project was generated with|Run \`ng serve\`" README.md

# 4. Al cerrar el salto: build verde, pruebas verdes, paridad verificada
```

**Criterio de aceptación:** si el comando 1 revela un salto múltiple ya consumado, existe una
sección de **deuda de saltos omitidos** en `inventario.md`. El comando 3 sale vacío antes de
archivar la migración.
