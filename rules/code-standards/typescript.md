---
title: "Estándares TypeScript"
category: code-standards
slug: typescript
version: "1.0"
last_updated: "2026-06-30"
applies_to: ["typescript"]
status: active
---

## Regla

Todo código TypeScript debe compilar en modo `strict` sin errores ni warnings.
Se prohíbe el uso de `any` explícito; usar `unknown` cuando el tipo es desconocido.

## Configuración obligatoria (tsconfig)

```json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitReturns": true
  }
}
```

## Reglas específicas

- **Tipos explícitos en firmas públicas.** Parámetros y retornos de funciones exportadas deben tener tipo explícito.
- **No `any`.** Si viene de una librería externa sin tipos, usar `unknown` + type guard.
- **Imports de tipos.** Usar `import type` para importaciones que solo se usan en tipos.
- **Enums → const objects.** Preferir `const ESTADO = { ... } as const` sobre `enum`.
- **Linting.** ESLint con `@typescript-eslint` obligatorio en CI.

## Ejemplos

```typescript
// ✅ Correcto
export function parsearEdad(valor: unknown): number {
  if (typeof valor !== 'number') throw new Error('No es un número');
  return valor;
}

// ❌ Incorrecto
export function parsearEdad(valor: any): any {
  return valor;
}
```
