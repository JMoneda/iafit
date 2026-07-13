---
title: "Clean Architecture .NET (backend)"
category: architecture
slug: clean-architecture-dotnet
version: "1.0"
last_updated: "2026-07-09"
applies_to: ["backend"]
status: active
---

## Regla

El backend se construye en **.NET 8** siguiendo **Clean Architecture** por capas y el
principio **"monolítico por fuera, modular por dentro"**: un despliegue cohesionado
hacia afuera, pero internamente desacoplado por capas y features. La lógica de negocio
NO depende de frameworks, UI ni base de datos.

## Justificación

Separar el dominio de la infraestructura hace el negocio testeable de forma aislada,
permite cambiar detalles (ORM, proveedor de IA, motor de BD) sin tocar reglas de
negocio, y sostiene la evolución controlada de la solución. Es la arquitectura de
referencia de EAFIT para los servicios del portal.

## Capas (dependencias hacia adentro)

- **Domain** — Entidades, interfaces (contratos) y excepciones del negocio. Sin
  dependencias externas.
- **Application** — Casos de uso con **CQRS** (Commands/Queries) vía **MediatR**, DTOs,
  validadores y código compartido. Depende solo de Domain.
- **Infrastructure** — Persistencia con **EF Core** (`ApplicationDbContext`,
  configuraciones de entidades), integraciones externas. Implementa los contratos de
  Domain.
- **API** — Controllers REST, middleware, `Program.cs`. Orquesta; no contiene reglas de
  negocio.

## Reglas específicas

- **CQRS + Mediator.** Comandos (escritura) y queries (lectura) separados, despachados
  por MediatR. No mezclar lectura/escritura en un mismo handler.
- **Repository + DI.** El acceso a datos se abstrae tras interfaces del dominio; se
  inyectan por DI nativa. El dominio depende de abstracciones, no de EF Core.
- **Validación** con FluentValidation en la capa Application, antes de ejecutar acciones
  críticas. **Mapeo** con AutoMapper.
- **SOLID** en todas las capas.
- La SPA nunca llega directo al backend: siempre a través del **API Gateway**
  (ver [[frontend-spa-angular]] y [[plataforma-azure]]).
- Documentación de API con **Swagger/OpenAPI**.

## Estructura de referencia

```
src/
  <Producto>.Domain/          # Entities, Interfaces, Exceptions
  <Producto>.Application/     # Commands, Queries, DTOs, Common, DependencyInjection
  <Producto>.Infrastructure/  # Persistence (EF Core), Configurations, DependencyInjection
  <Producto>.API/             # Controllers, Middleware, Program.cs
tests/
  <Producto>.Domain.UnitTests/
  <Producto>.Application.UnitTests/
```
