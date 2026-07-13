---
title: "Estándares .NET"
category: code-standards
slug: dotnet
version: "1.0"
last_updated: "2026-07-09"
applies_to: ["backend", "dotnet"]
status: active
---

## Regla

El código backend en **.NET 8** respeta la separación por capas de Clean Architecture
(ver [[clean-architecture-dotnet]]), los principios **SOLID** y el manejo de errores
mediante el sistema de excepciones institucional. La configuración se externaliza; nada
de valores hard-coded.

## Manejo de excepciones

Usar excepciones para errores y condiciones excepcionales. Se distinguen tres familias:

### Excepciones personalizadas (institucionales)

- **`AplicationCoreException`** — la más usada. Maneja **errores controlados de negocio**;
  su mensaje es lo que el usuario ve en el frontend. Úsala para validaciones y reglas de
  negocio incumplidas.
- **`AuthException`** — errores de **autenticación** del usuario.
- **`BadRequestException`** — personalizada (no existe por defecto en .NET) para errores
  HTTP **400 Bad Request**.

### Excepciones generales de .NET (según el caso real)

`System.ArgumentException` (argumento inválido), `System.NullReferenceException` (acceso a
`null`), `System.InvalidOperationException` (operación inválida para el estado actual),
`System.IO.IOException` (E/S). No usar `System.Exception` genérica para lanzar; sí como
base de captura de último recurso.

### Excepciones HTTP

`System.Net.Http.HttpRequestException` para fallos de solicitud HTTP (conectividad,
respuestas inválidas).

## Reglas específicas

- **Errores de negocio → `AplicationCoreException`**, no excepciones genéricas: el mensaje
  llega al usuario, cuídalo.
- **Todo try-catch registra** en Application Insights con stack trace y contexto
  (ver [[logging-appinsights]]).
- **Configuración por variables de entorno / appsettings**, nunca valores hard-coded
  (endpoints, flags, umbrales). Secretos solo vía Key Vault (ver [[secrets-management]]).
- **Patrones obligatorios**: CQRS + Mediator (MediatR), Repository, Dependency Injection.
- **Validación** con FluentValidation; **mapeo** con AutoMapper.

## Ejemplo

```csharp
// ✅ Error de negocio controlado (el mensaje lo ve el usuario)
if (asistente is null)
    throw new AplicationCoreException("El asistente solicitado no existe o fue retirado.");

// ✅ Config externalizada
var endpoint = configuration["Agentes:OpenAiEndpoint"]
    ?? throw new InvalidOperationException("Agentes:OpenAiEndpoint no configurado.");

// ❌ Incorrecto: valor hard-coded y excepción genérica
// throw new Exception("error");
// var endpoint = "https://api.openai.com/v1";
```
