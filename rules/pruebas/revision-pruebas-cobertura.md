---
title: "Revisión de pruebas: cobertura 100% en Sonar y calidad de las aserciones"
category: pruebas
slug: revision-pruebas-cobertura
version: "1.0"
last_updated: "2026-07-15"
applies_to: ["backend", "frontend", "dotnet", "angular"]
status: active
---

## Regla

Toda contribución con lógica llega con pruebas que dan **100% de cobertura sobre el código
nuevo o modificado** medido por **SonarQube** (líneas **y** condiciones/ramas), y esa
cobertura se **revisa**, no solo se mide. El gate de Sonar **bloquea el merge y el ascenso de
ambiente** si no se cumple (ver [[azure-devops]]).

El 100% se exige sobre el **código nuevo** (*Coverage on New Code* de Sonar), no sobre todo el
legacy de golpe: forzar 100% retroactivo en un proyecto entero es impracticable y **se maquilla**
(exclusiones abusivas, pruebas que solo ejecutan líneas). La cobertura global **nunca baja**
(*ratchet*): cada PR la sube o la mantiene, nunca la reduce.

**El 100% de cobertura es el piso, no la meta.** Cubrir una línea significa que **se ejecutó**,
no que **algo se verificó**. Una suite con 100% de cobertura y asertos débiles da *menos*
seguridad que una con 85% y asertos fuertes, porque disfraza de verde el código sin verificar.
El objetivo real de esta regla es que **cada prueba falle cuando el código se rompe**.

## Justificación

Sonar bloquea despliegues por cobertura porque el número es fácil de auditar en el pipeline.
Pero el número es **gameable**: se llega al 100% ejecutando el código sin comprobar su
resultado (`toBeTruthy()`, `Assert.NotNull`, un `act` sin `assert`). Eso convierte el gate en
teatro: el tablero está verde y no hay red de seguridad. Por eso la regla no es "alcanzar el
número" sino **revisar que las pruebas que producen ese número sirvan**. Es la misma red que
protege las migraciones ([[pruebas-son-linea-base]]): si el aserto no verifica, la cobertura
miente.

## La cobertura de ramas es la que caza el hueco

Line coverage se engaña fácil; **branch/condition coverage** no tanto. Por eso Sonar mide las
dos y el gate exige ambas al 100% en código nuevo.

**Caso real (`@shared/pipes`):** `map.pipe.ts` tiene `if (!isArray(input) || !fn) return input;`.
La prueba del caso "sin función" pasaba `undefined`; en la migración la cambiaron a
`() => false` (una función válida). Con esa entrada, `!fn` es siempre falso y **la rama de
retorno temprano deja de ejecutarse**: la cobertura de ramas cae por debajo del 100% y el gate
lo habría marcado. El 100% de ramas y la calidad del aserto trabajan juntos: el primero detecta
el camino no probado, el segundo garantiza que probarlo signifique algo.

## Revisión de pruebas (la "buena revisión")

Cobertura verde **no cierra** la revisión. Cada suite nueva o tocada se revisa contra esta
lista; lo que falle se corrige o se anota como mejora (ver más abajo):

1. **El aserto verifica comportamiento, no existencia.** `toEqual(valorEsperado)` /
   `Assert.Equal(esperado, real)`, no `toBeTruthy` / `Assert.NotNull` como aserto principal.
   Un test sin `expect`/`Assert` no es una prueba: es código que sube la cobertura.
2. **Los casos límite están cubiertos explícitamente**: `null`, `undefined`, colección vacía,
   un solo elemento, límites numéricos, cadena vacía. Son las entradas que rompen en producción.
3. **Los caminos de error se prueban**, no solo el happy path: excepciones lanzadas
   (`Assert.Throws` / `expectAsync().toBeRejected`), validaciones incumplidas, respuestas nulas.
4. **Una prueba comprueba una cosa.** Nombre que describe el comportamiento
   (`Debe_lanzar_si_el_asistente_no_existe`), estructura Arrange–Act–Assert / Given–When–Then.
5. **Los mocks verifican interacción cuando importa** (`Verify`/`toHaveBeenCalledWith`), no solo
   stubbean. Si el contrato es "se llama al repositorio con el id", eso se asevera.
6. **La prueba es determinista**: sin fecha/hora real (`DateTime.Now`), sin red, sin BD real
   (mock de `IEntityContext<T>`, ver [[pruebas-unitarias]]), sin orden entre pruebas. Nada de
   `sleep`. Una prueba intermitente se arregla o se borra, no se reintenta.
7. **Sin pruebas omitidas** (`[Fact(Skip=…)]`, `[Ignore]`, `xit`, `it.skip`) en la rama
   principal: una prueba omitida no existe y encima infla la deuda.
8. **Las exclusiones de cobertura están justificadas.** Excluir código generado, DTOs/entidades
   sin lógica, `Program`/`Startup`, migraciones de EF, arreglos de rutas/módulos de Angular e
   interfaces es legítimo; excluir un servicio con lógica para llegar al 100% es fraude al gate.

## Mejoras posibles (revisar y proponer)

La revisión no solo aprueba: **detecta oportunidades** y las propone (en una migración van a
`sugerencias-refactor.md`, ver [[sugerencias-post-migracion]]; fuera de migración, como tarea).

- **Mutation testing — el antídoto contra el teatro de cobertura.** Introduce cambios
  artificiales en el código (mutantes) y mide cuántos "matan" las pruebas. Una suite con 100%
  de cobertura y **bajo mutation score** confirma que las pruebas no verifican nada. Recomendado
  para la lógica de negocio crítica: **Stryker.NET** (`dotnet-stryker`) en backend, **StrykerJS**
  (`@stryker-mutator/core`) en frontend.
- **Pruebas parametrizadas** para colapsar duplicación: `[Theory]/[InlineData]` en xUnit,
  `it.each` / bucles de casos en Jasmine. Un caso por fila en vez de copiar-pegar el test.
- **Builders / Object Mothers** para los datos de prueba, en vez de construir a mano el mismo
  objeto en cada test.
- **Nombres que documentan el comportamiento**: el nombre de la prueba debe leerse como una
  especificación, no como `Test1`.
- **Cobertura que no sube sola**: si un módulo nuevo entra con exclusión "temporal", queda como
  deuda con fecha, no como exclusión permanente.

## Antipatrón (caso real: `@shared/pipes`, salto 12 → 17)

```ts
// ❌ 100% de cobertura de línea, cero verificación real
it('Should return the original array 1', () => {
  expect(pipe.transform([1, 2], () => { return false })).toBeTruthy();
});
```

`toBeTruthy()` pasa con cualquier arreglo no vacío, así que el test **no distingue** entre la
implementación correcta y una rota; la línea queda "cubierta" y el caso "sin función" quedó sin
probar. Cobertura verde, red de seguridad inexistente.

```ts
// ✅ Cubre la misma línea Y verifica el resultado exacto, incluido el caso límite
it('devuelve el arreglo original cuando no hay función', () => {
  expect(pipe.transform([1, 2], null as unknown as Function)).toEqual([1, 2]);
});
it('aplica la función a cada elemento', () => {
  expect(pipe.transform([0, 1, 2], (x: number) => x + 1)).toEqual([1, 2, 3]);
});
```

## Reglas específicas

- **El gate de Sonar sobre código nuevo exige 100%** de cobertura de líneas y de condiciones,
  y bloquea el pipeline de PR y de CI (ver [[azure-devops]]). No es una advertencia: falla el build.
- **La cobertura global nunca decrece.** Un PR que baja el porcentaje total se rechaza.
- **Durante una migración la cobertura no baja** y las pruebas no se debilitan para llegar al
  número (ver [[pruebas-son-linea-base]]).
- **La revisión de calidad es parte del PR.** Aprobar un PR sin mirar los asertos de sus pruebas
  es aprobar cobertura, no pruebas.
- **Backend** sigue además [[pruebas-unitarias]] (xUnit, Moq, `IEntityContext<T>`); **frontend**
  sigue [[pruebas-frontend-angular]] (Karma/Jasmine headless, umbrales, CI).
- **Toda exclusión de cobertura se declara** en `sonar-project.properties`
  (`sonar.coverage.exclusions`) con su motivo, y se revisa que no esconda lógica sin probar.

## Verificación

```bash
# 1. Backend: cobertura con formato que Sonar entiende
dotnet test --collect:"XPlat Code Coverage"
#    (reportgenerator para inspección local del % por clase/rama)

# 2. Frontend: cobertura headless, terminando sola
ng test --watch=false --browsers=ChromeHeadless --code-coverage

# 3. Asertos candidatos a débiles: cada resultado se revisa (no todos son malos)
grep -rnE "toBeTruthy\(|toBeDefined\(|toBeNull\(\)\s*;?\s*$" --include=*.spec.ts .
grep -rnE "Assert\.(NotNull|True|IsNotNull)\(" --include=*.cs tests/

# 4. Pruebas sin ningún aserto (act sin assert): revisar
#    xUnit: un [Fact] cuyo cuerpo no contenga Assert./Verify(/Should()
#    Jasmine: un it(...) sin expect(

# 5. Pruebas omitidas en la rama principal (debe salir vacío)
grep -rnE "\b(xit|xdescribe)\(|\b(it|describe)\.skip\(" --include=*.spec.ts .
grep -rnE "Skip\s*=|\[Ignore" --include=*.cs tests/

# 6. Exclusiones de cobertura: revisar que ninguna esconda lógica
grep -rn "coverage.exclusions\|ExcludeFromCodeCoverage" sonar-project.properties --include=*.cs .

# 7. Mejora recomendada — mutation testing sobre la lógica crítica
dotnet stryker            # backend (Stryker.NET)
npx stryker run           # frontend (StrykerJS)
```

**Criterio de aceptación:** el gate de Sonar reporta **100% de cobertura (líneas y condiciones)
en el código nuevo**; el comando 5 sale vacío; cada resultado de los comandos 3 y 4 tiene un
aserto que verifica comportamiento real o está justificado en la revisión del PR; toda exclusión
del comando 6 está documentada. El mutation score del comando 7, cuando se corre, es la señal de
si el 100% de cobertura es real o teatro.
