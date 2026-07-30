<!-- Destino de cada artefacto y declaración EXPLÍCITA de la pérdida. Artefacto central del cambio. Sigue siendo solo lectura. Redacta TODO en español. -->

## Mapeo artefacto por artefacto

<!-- Una fila por cada artefacto del inventario. Sin excepciones, sin filas "varios". -->

| Origen | Destino | Nota |
|---|---|---|
| <!-- ruta actual --> | <!-- ruta final --> | <!-- transformación necesaria --> |

## Qué se pierde (obligatorio)

<!-- Sección que no se puede dejar vacía. Una pérdida sin decisión registrada BLOQUEA el paso a plan-conversion. Si no se pierde nada, justifica por qué (es raro). -->

| Qué se pierde | Por qué el destino no lo soporta | Qué decidimos |
|---|---|---|
| <!-- ej. deltas ADDED/MODIFIED/REMOVED --> | <!-- ej. SpecKit no fusiona --> | <!-- conservar como anexo / documentar y descartar / migrar a X --> |

## Requisitos

- **Cómo se preserva cada requisito:** <!-- ... -->
- **Dónde vive la baseline en destino:** <!-- Si destino es SpecKit: la recomendación institucional es CONSERVARLA. Descartarla exige aprobación arquitectural: nómbrala aquí si es el caso. -->
- **Si destino es OpenSpec — síntesis de la baseline:** <!-- cómo se construye desde las N features -->
- **Contradicciones entre features sobre la misma capacidad:** <!-- cuáles y cómo se resuelven, o "ninguna detectada" -->

## Gobernanza en destino

<!-- A SpecKit: la constitución institucional se instala como parte de la conversión. A OpenSpec: qué reglas del MCP sustituyen a los principios que la constitución imponía. -->
- <!-- ... -->

## Formato de requisitos (verificación de formato)

- [ ] Los requisitos convertidos usan `SHALL` / `MUST` (no *should* / *may*).
- [ ] Los escenarios usan **exactamente 4 numerales** (`#### Scenario:`).
      <!-- Con 3 numerales o viñetas, OpenSpec no los cuenta: la pérdida es silenciosa. -->
- [ ] Cada requisito conserva al menos un escenario.

## Decisiones que exceden mi criterio

<!-- CONTROL-STOP: lo que hay que preguntar al usuario antes de continuar. Vacío = no hay ninguna. -->
- <!-- ... -->
