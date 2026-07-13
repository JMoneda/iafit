---
title: "Identidad y control de acceso"
category: security
slug: identidad-acceso
version: "1.0"
last_updated: "2026-07-09"
applies_to: ["all"]
status: active
---

## Regla

La autenticación y autorización se apoyan en la **gestión de identidades institucional**:
**Microsoft Entra ID** con **App Registration**, mediante **OAuth2 / OpenID Connect** y
SSO. La autorización es **basada en roles (RBAC)** usando **claims en los tokens JWT**. El
acceso a recursos Azure se rige por **RBAC con privilegio mínimo** e **identidades
administradas (MSI)**.

## Justificación

Centralizar identidad en Entra ID evita credenciales dispersas, habilita SSO para usuarios
EAFIT y externos, y permite controlar por rol qué asistentes y funcionalidades ve cada
tipo de usuario. El privilegio mínimo reduce la superficie de ataque.

## Reglas específicas

- **Autenticación** vía Entra ID (OAuth2/OIDC); la SPA y API Management **validan JWT**
  (`validate-jwt`) en cada solicitud.
- **Autorización por rol**: los permisos se definen en Entra ID y se evalúan con los claims
  del token, aplicándolos en **API Management (policies)** y en los **microservicios .NET**
  (autorización por rol).
- **Roles del portal** complementarios al IdP se guardan en la BD del portal, no
  reemplazan al IdP institucional.
- **Identidades administradas (MSI)** para el acceso servicio-a-recurso; nunca secretos de
  cliente embebidos.
- **Privilegio mínimo** en todas las asignaciones RBAC de Azure.
- Errores de autenticación se manejan con `AuthException` (ver [[dotnet]]).

## Relación con otras reglas

- Los secretos asociados (certificados, client secrets) viven en Key Vault
  (ver [[secrets-management]]).
- La protección de borde y red se cubre en [[red-y-perimetro]].
