---
title: "Pruebas unitarias y calidad (xUnit, Moq, SonarQube)"
category: pruebas
slug: pruebas-unitarias
version: "1.0"
last_updated: "2026-07-09"
applies_to: ["backend", "dotnet"]
status: active
---

## Regla

Los servicios y sus capas cuentan con **pruebas unitarias robustas** que validan la lógica
de negocio bajo distintos escenarios. Las pruebas son parte integral del ciclo de CI/CD.
La calidad y cobertura se miden con **SonarQube**, cuyo **umbral mínimo bloquea el
despliegue** a ambientes superiores si no se cumple.

## Justificación

Probar la lógica de negocio de forma aislada da confiabilidad, detecta errores temprano y
facilita el mantenimiento. El gate de SonarQube evita que código sin cobertura o con
vulnerabilidades avance a QA/Prod.

## Herramientas

- **xUnit** — framework de pruebas unitarias.
- **Moq** — simulación de dependencias externas.
- Mock de acceso a datos vía **`IEntityContext<T>`** (pruebas de BD sin base real).
- **SonarQube** — cobertura, vulnerabilidades, bugs y code smells; integrado en el pipeline.

## Qué se cubre

- **Servicios de dominio** y **casos de uso** específicos de la capa de negocio.
- Integración entre servicios, **mapeadores** y **validadores**.
- Manejo de errores, excepciones, logs y resultados nulos o vacíos.
- Que las **validaciones de negocio** se respeten antes de ejecutar acciones críticas.

## Reglas específicas

- **SonarQube en CI/CD** con umbral definido por el equipo técnico: si no se cumple
  cobertura/calidad, **se bloquea el despliegue** (ver [[azure-devops]]).
- Las pruebas se ejecutan en el pipeline de **PR** y de **CI** (ver [[azure-devops]]).
- Cada caso de uso nuevo llega con sus pruebas; no se acepta lógica de negocio sin cubrir.
- Los proyectos de test siguen la estructura `tests/<Producto>.<Capa>.UnitTests`
  (ver [[clean-architecture-dotnet]]).
- **Ninguna prueba omitida** (`[Fact(Skip=...)]`, `[Ignore]`) en la rama principal: una prueba
  omitida es una prueba que no existe.
- **Durante una migración, las pruebas no se debilitan** para poner el salto en verde, y el
  umbral de cobertura no baja (ver [[pruebas-son-linea-base]]).
- El equivalente de esta regla para el frontend Angular es [[pruebas-frontend-angular]].

## Verificación

```bash
# 1. Las pruebas corren y pasan, con cobertura
dotnet test --collect:"XPlat Code Coverage"

# 2. Pruebas omitidas en la rama principal (debe salir vacío)
grep -rnE "Skip\s*=|\[Ignore" --include=*.cs tests/

# 3. Toda capa de negocio tiene su proyecto de pruebas
ls tests/

# 4. El gate de SonarQube está en el pipeline y bloquea (no solo reporta)
grep -rniE "sonar|coverage" azure-pipelines*.yml .azuredevops/ 2>/dev/null
```

**Criterio de aceptación:** el comando 1 termina en 0; el 2 sale vacío; el gate del 4 está
configurado para **fallar** el pipeline, no para publicar el reporte y seguir.
