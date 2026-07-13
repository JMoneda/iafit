---
title: "Red, perímetro y protección de borde"
category: security
slug: red-y-perimetro
version: "1.0"
last_updated: "2026-07-09"
applies_to: ["all"]
status: active
---

## Regla

Los servicios expuestos públicamente se protegen en el borde con **Azure Front Door + WAF**
y **OAuth2**. El tráfico interno entre backend, almacenamiento e integraciones usa
**endpoints privados y subredes aisladas**. La comunicación con sistemas institucionales
es **únicamente a través de OIC**.

## Justificación

Separar el borde público del tráfico interno y forzar WAF + endpoints privados reduce la
superficie expuesta (OWASP Top 10), oculta los endpoints internos y garantiza que las
integraciones críticas ocurran por canales controlados.

## Reglas específicas

- **Front Door + WAF** delante del portal y de API Management; filtra tráfico y ofusca los
  endpoints internos de Static Web App y APIM.
- **Todo servicio público** (Front Door, APIM) exige WAF + autenticación OAuth2.
- **Tráfico interno por endpoints privados** y subredes aisladas; nada de exposición
  directa de backend/almacenamiento.
- **Integración con sistemas institucionales solo vía OIC** (seguridad, baja latencia,
  alta disponibilidad).
- **Azure Private DNS** y reglas **NSG** para controlar el tráfico entre subredes.
- **Azure Policy** para asegurar etiquetado de recursos y evitar configuraciones inseguras.
- **Uso responsable de IA**: moderar prompts y respuestas con **Azure AI Content Safety**
  en los flujos de agentes.

## Relación con otras reglas

- Identidad/RBAC/MSI en [[identidad-acceso]]; secretos en [[secrets-management]].
- Provisión de red y políticas por Bicep/Azure Policy (ver [[azure-devops]]).
