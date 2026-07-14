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

## Verificación

```bash
# 1. Secretos hardcodeados en el árbol de trabajo (debe salir vacío)
git grep -nE "(password|passwd|api[_-]?key|secret|token|connectionstring)\s*[:=]\s*['\"][^'\"]{8,}" \
  -- ':!*.md' ':!*.example' ':!package-lock.json'

# 2. Patrones de credenciales reales (claves de Azure, SAS, PAT, conexiones SQL)
git grep -nE "(AccountKey=|SharedAccessSignature|sk_live_|Server=.*Password=)" -- ':!*.md'

# 3. Archivos que nunca deben estar versionados (debe salir vacío)
git ls-files | grep -E "^\.env$|\.env\.(local|dev|prod)$|\.pfx$|\.pem$|\.publishsettings$"

# 4. .env ignorado de verdad
grep -n "^\.env" .gitignore

# 5. El secreto ya filtrado sigue en el HISTORIAL aunque se haya borrado en un commit
git log --all --full-history -- .env
git grep -nE "sk_live_|AccountKey=" $(git rev-list --all) 2>/dev/null | head
```

**Criterio de aceptación:** los comandos 1, 2 y 3 salen vacíos. Si el 5 devuelve algo, el
secreto está **comprometido**: se revoca y rota de inmediato — borrarlo del working tree no
lo saca del historial.
