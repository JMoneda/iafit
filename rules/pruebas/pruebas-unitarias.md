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
