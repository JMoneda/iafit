<!-- Estado técnico ACTUAL del proyecto, leído desde archivos de configuración. NO editar código. Cada dato cita su archivo de origen. Redacta TODO en español. -->

## Framework y versión actual

<!-- Ej: Angular 12.2.0 (leído de package.json) / .NET 3.1 (TargetFramework en Api.csproj) -->
- **Framework:** <!-- ... --> (`<archivo>`)

## Runtime / SDK

- **Node / TypeScript** o **.NET SDK / TFM:** <!-- ... --> (`<archivo>`)

## Dependencias

| Paquete | Versión actual | Estado | Nota |
|---------|----------------|--------|------|
| <!-- pkg --> | <!-- x.y.z --> | activa / deprecada / EOL | <!-- ... --> |

## Pipeline de build y pruebas

- **Build:** <!-- comando / builder --> (`<archivo>`)
- **Pruebas:** <!-- framework, ¿existen?, cobertura conocida --> (`<archivo>`)
- **CI:** <!-- azure-pipelines.yml u otro --> (`<archivo>`)

## Compilación de línea base (antes de tocar nada)

<!-- Verificar que el código descargado compila/buildea TAL CUAL. Compilar es solo lectura. -->
- **Comando:** <!-- ej: dotnet build -c Release / npm ci && npm run build -->
- **Toolchain:** <!-- versión SDK .NET / Node+npm usada -->
- **Resultado:** ✅ compila / ❌ falla
- **Si ❌ — detalle del bloqueador:** <!-- error exacto + causa aparente; ¿es del código o falta toolchain? -->
- **Decisión con el usuario:** <!-- arreglar en cambio separado (preferido) / proceder con riesgo aprobado -->
- **Pruebas de base (si existen):** <!-- pasan / fallan / no hay -->

<!-- Regla: la base debe compilar antes de migrar (linea-base-compila). Si falla, es bloqueador. -->

## Bloqueadores conocidos

<!-- APIs deprecadas en uso, librerías propias, código generado, acoplamientos, etc. -->
- <!-- ... -->

## Objetivo de migración

- **Versión destino:** <!-- según onboarding -->

## Por confirmar

<!-- Datos que no pudieron determinarse desde archivos. NO adivinar. -->
- <!-- ... -->
