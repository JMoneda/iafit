<!-- Plan ejecutable de la conversión. Regla de oro: crear destino y copiar primero; retirar el origen SOLO al final. Redacta TODO en español. -->

## Precondiciones

- [ ] Trabajo en vuelo cerrado o congelado (según inventario.md).
- [ ] Árbol de git limpio.
- [ ] Rama dedicada creada: `<!-- nombre según la regla 'convencion-ramas' -->`
- [ ] Toda pérdida de mapeo.md tiene decisión registrada.

## Orden de ejecución

<!-- Pasos numerados. El origen NO se toca hasta el paso de retirada. -->

1. <!-- crear estructura destino -->
2. <!-- convertir y escribir artefactos según mapeo.md -->
3. <!-- instalar gobernanza en destino (constitución o schemas del MCP) -->
4. <!-- ... -->

## Verificación (antes de retirar el origen)

- [ ] Recuento de requisitos en destino: <!-- n --> vs inventario: <!-- n -->
- [ ] Cada diferencia está explicada en "qué se pierde" de mapeo.md.
- [ ] Validación del destino en verde:

  ```bash
  <!-- openspec validate   |   /speckit.analyze -->
  ```

- [ ] Formato de requisitos verificado (SHALL/MUST + escenarios con 4 numerales).

## Reversión

- **Reversión natural:** descartar la rama dedicada.
- **Punto de no retorno:** el commit que retira la raíz de origen.
- **Si falla después del punto de no retorno:** <!-- git revert de ese commit; qué más hace falta -->

## Cierre

- [ ] README actualizado: qué framework usa ahora el proyecto (regla `eleccion-de-framework`).
- [ ] Si destino es SpecKit: `.specify/memory/constitution.md` instalada con su cabecera de trazabilidad.
- [ ] Resumen de la conversión redactado: qué se movió, qué se perdió, qué se decidió.
