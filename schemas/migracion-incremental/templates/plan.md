<!-- Plan de UN salto de versión mayor. Consulta las reglas 'migration' del MCP. Redacta TODO en español. -->

## Salto

- **Componente:** <!-- ej. controls / Api.Pedidos -->
- **Origen → destino:** <!-- ej. 16 → 17 -->

## Rama

- **Nombre:** `migration/<componente>-<framework>-<destino>`
- **Parte de:** <!-- rama de la versión anterior o dev -->

## Baselines a preparar (antes de actualizar)

- **Node / TS** o **.NET SDK:** <!-- versión requerida por el destino -->

## Comandos de actualización

```
<!-- ej. ng update @angular/core@17 @angular/cli@17 -->
```

## Dependencias del ecosistema

<!-- Angular Material, RxJS, paquetes NuGet, librerías propias que suben con este salto -->
- <!-- ... -->

## Breaking changes a atender

<!-- Sólo los que aplican a ESTE proyecto según inventario.md -->
- <!-- ... -->

## Verificación de paridad

<!-- Contra qué specs de research se comprobará que el comportamiento no cambió -->
- <!-- ... -->

## Riesgos y reversión

- **Riesgo:** <!-- ... --> → **Mitigación:** <!-- ... -->
- **Reversión:** descartar la rama del salto.
