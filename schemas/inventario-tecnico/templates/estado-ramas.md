<!-- Fase 0: comparación de ramas ANTES de migrar. Solo lectura (git). Puntual, sin relleno. Redacta TODO en español. -->

## Ramas comparadas

- **Liberado (base):** `master`/`main` — <!-- último commit / tag / fecha -->
- **Desarrollo:** `dev` — <!-- último commit / fecha -->
- **Comando:** `git log --oneline --left-right --cherry-pick master...dev`

## Estado de sincronización

- **`dev` adelante de `master` (falta liberar):** <!-- N commits -->
- **`master` adelante de `dev` (falta bajar a dev):** <!-- N commits -->
- **¿Divergen?** <!-- sí/no; riesgo de conflicto -->

## Qué hay / qué falta

| Estado | Detalle |
|--------|---------|
| ✅ En `master` (liberado) | <!-- features/fixes ya en producción --> |
| ⏳ En `dev`, falta liberar | <!-- pendiente de merge a master --> |
| ❌ Falta en ambas | <!-- si aplica -->  |

## Rama base para la migración

- **Se migra desde:** <!-- normalmente `dev` --> — <!-- razón breve -->
- **Riesgo / a resolver antes de arrancar:** <!-- p. ej. merge pendiente, conflicto -->
