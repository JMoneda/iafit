<!-- Checklist ejecutable del salto. USA exactamente el formato `- [ ] X.Y ...`; la fase apply parsea los checkboxes. Redacta TODO en español. -->

## 1. Preparación

- [ ] 1.1 Asegurar baseline de runtime (Node/TS o .NET SDK) del destino
- [ ] 1.2 Crear la rama `migration/<componente>-<framework>-<destino>` desde la versión anterior

## 2. Actualización

- [ ] 2.1 Ejecutar el comando de actualización (ng update / dotnet) y los schematics
- [ ] 2.2 Actualizar dependencias del ecosistema (Material, RxJS, NuGet, librerías propias)

## 3. Breaking changes

- [ ] 3.1 Atender los breaking changes del salto que aplican al proyecto
- [ ] 3.2 Revisión manual de los cambios de alto impacto (⚠️ de la regla del MCP)

## 4. Verificación

- [ ] 4.1 Build verde
- [ ] 4.2 Pruebas verdes
- [ ] 4.3 Verificación de paridad contra las specs de research
- [ ] 4.4 Commit + PR de la rama del salto
