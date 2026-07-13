---
title: "Gestión de secretos"
category: security
slug: secrets-management
version: "1.1"
last_updated: "2026-07-09"
applies_to: ["all"]
status: active
---

## Regla

Ningún secreto (contraseña, API key, token, connection string, certificado privado)
puede estar hardcodeado en código fuente ni en archivos versionados en git. En Azure,
**todos los secretos viven en Azure Key Vault** y se consumen mediante **identidades
administradas (MSI)**, nunca con credenciales embebidas.

## Reglas específicas

### Almacenamiento
- **Azure Key Vault** es el almacén único de secretos en Dev/QA/Prod: connection strings
  de **SQL Server/Azure SQL**, **Blob Storage**, **SharePoint**, **AI Search**, endpoints
  de **OpenAI / AI Foundry**, certificados y claves de API.
- **Consumo por Managed Identity (MSI)** desde Container Apps y API Management; sin claves
  en configuración ni en variables persistidas.
- Los pipelines obtienen secretos **desde Key Vault** en tiempo de ejecución, nunca del
  repositorio (ver [[azure-devops]]).
- Variables de entorno / appsettings solo para **configuración no sensible** (endpoints,
  flags, umbrales). Los secretos no se ponen en appsettings.
- Archivos `.env` solo para desarrollo local y en `.gitignore`. Nunca versionarlos.

### Rotación
- Los secretos de producción deben rotarse cada 90 días mínimo
- Las API keys comprometidas deben rotarse en menos de 1 hora desde la detección
- Los tokens de acceso personal (PAT) deben tener fecha de expiración explícita

### Auditoría
- Si un secreto se filtra accidentalmente al repositorio, tratarlo como comprometido
  inmediatamente: revocar, rotar, y limpiar el historial de git (no basta con un commit
  que lo elimine — el secreto queda en el historial)

## Ejemplos

```typescript
// ✅ Correcto
const apiKey = process.env.PAYMENT_API_KEY;
if (!apiKey) throw new Error('PAYMENT_API_KEY no definida');

// ❌ Incorrecto
const apiKey = 'sk_live_abc123xyz';
```

```yaml
# ✅ Correcto en CI/CD
env:
  API_KEY: ${{ secrets.PAYMENT_API_KEY }}

# ❌ Incorrecto
env:
  API_KEY: sk_live_abc123xyz
```
