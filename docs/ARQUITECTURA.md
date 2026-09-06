# Arquitectura de front-nx036

Este documento explica **por qué** el proyecto está montado como está. Las reglas de obligado
cumplimiento están en `CLAUDE.md`; aquí está el razonamiento detrás de ellas.

---

## 1. El problema que resuelve

El frontend React que este proyecto replica tiene 213 ficheros y 62.000 líneas, y llegó a un punto
reconocible: la lógica de negocio vive dentro de las pantallas. Una página de ficha de producto tiene
2.137 líneas y es, en realidad, dos pantallas distintas metidas en una. El cálculo de qué se puede
cancelar, cuándo se aplica una promoción o qué margen corresponde está repartido entre componentes,
almacenes y llamadas sueltas al backend.

Eso no es un defecto de React: es lo que pasa cuando no hay una frontera que impida que crezca hacia
ahí. Este proyecto pone esa frontera, y la pone donde se puede verificar sola.

## 2. El hexágono

```
                        ┌───────────────────────────────────┐
                        │          presentation             │
                        │   componentes, páginas, rutas     │
                        └────────────────┬──────────────────┘
                                         │ usa casos de uso
                        ┌────────────────▼──────────────────┐
                        │          application              │
                        │  casos de uso + estado (signals)  │
                        └────────────────┬──────────────────┘
                                         │ habla por PUERTOS
                        ┌────────────────▼──────────────────┐
                        │            domain                 │
                        │  modelos · reglas · PUERTOS       │
                        │  (no conoce Angular, ni HTTP,     │
                        │   ni el navegador)                │
                        └────────────────▲──────────────────┘
                                         │ implementa los puertos
                        ┌────────────────┴──────────────────┐
                        │        infrastructure             │
                        │   adaptadores: backend, Stripe,   │
                        │   almacenamiento del navegador    │
                        └───────────────────────────────────┘

                  composition  ──►  ata cada puerto con su adaptador
```

Las flechas apuntan **siempre hacia dentro**. La de `infrastructure` apunta hacia arriba porque
implementa un contrato que define el dominio: es la inversión de dependencias, y es lo que permite
cambiar de proveedor —o poner un doble en una prueba— sin tocar nada más.

### La prohibición que sostiene todo

**`presentation` no puede importar `infrastructure`.** Si pudiera, el hexágono sería decorado: una
pantalla llamaría al backend por su cuenta, la lógica se escaparía a las plantillas, y cambiar de
proveedor obligaría a tocar la interfaz. Todo lo demás se deriva de mantener esa prohibición.

### Contextos acotados

El código se parte primero por **contexto de negocio** y solo dentro de cada uno por capa técnica. Son
doce: `auth`, `catalog`, `cart`, `checkout`, `orders`, `wallet`, `account`, `affiliate`,
`notifications`, `platform`, `support`, `admin`.

Un contexto ve el **dominio** de otro —los modelos y los puertos son su contrato público— pero no sus
casos de uso, ni sus adaptadores, ni sus pantallas. Cuando un contexto necesita algo de otro, declara
un puerto propio con lo que de verdad usa. `auth` lo hace con los almacenes: no quiere el catálogo de
almacenes, quiere dos números para una frase, así que define un puerto de un solo método. Poca
duplicación, cero acoplamiento.

## 3. Cómo se verifica, en vez de confiar

Una arquitectura que solo vive en un documento se erosiona en la primera semana con prisa. Aquí hay
tres barreras automáticas:

| Barrera | Qué impide | Dónde |
|---|---|---|
| TypeScript estricto | El `any` implícito, el nulo sin comprobar, el campo que no existe | `tsconfig.json` |
| Regla de dependencia | Que una capa importe de otra que tiene prohibida | `eslint.config.js` (`boundaries`) |
| Aislamiento de contextos | Que un contexto entre en las tripas de otro | `eslint.config.js` (importaciones restringidas) |

Más las que impiden que el diseño se disperse: ningún componente puede declarar estilos, ningún fichero
pasa de 400 líneas sin avisar, y la cobertura tiene umbral en `angular.json`.

### Una lección que costó encontrar

La regla de dependencia **se probó con violaciones deliberadas**, y menos mal: el lint daba
`All files pass linting` mientras una pantalla importaba un adaptador delante de sus narices. Faltaba
el resolvedor de TypeScript, así que toda importación de un `.ts` se clasificaba como «destino
desconocido» y la política ni se evaluaba. Y había un segundo fallo: el selector de capturas del plugin
no restringe el contexto, de modo que el aislamiento entre contextos tampoco se aplicaba.

Los dos se arreglaron. La lección se queda escrita aquí: **una regla que nunca se ha visto fallar no
está verificada, está sin estrenar.**

## 4. Renderizado: prerenderizado, sin servidor

El React apagó el renderizado en servidor el 6-sep-2026: el HTML salía con `no-store`, no se cacheaba
en el borde y cada navegación viajaba hasta el origen en Alemania. El renderizado en el pod había
pasado de 0,13 s a 0,36-0,58 s.

Aquí no hay servidor. `outputMode: static`: el HTML de las páginas públicas se escribe **al construir**,
lo sirve nginx como fichero estático y Cloudflare lo guarda en el nodo más cercano. Encima, el navegador
lo **hidrata** de forma incremental, así que se recuperan las etiquetas de compartir sin volver a pagar
la lentitud.

La regla es quién puede ver la página: lo público se prerenderiza; lo que depende de quién mira lleva
`RenderMode.Client`, porque su esqueleto no puede acabar cacheado en el borde. **Cada contexto declara
el modo de sus propias rutas**, en un fichero pegado a ellas: quien crea la pantalla es quien sabe si su
contenido es el mismo para todo el mundo, y en un fichero central esa decisión se olvida.

## 5. Estado y datos

Signals en todo. `httpResource` para leer, `signal`/`computed`/`linkedSignal` para el estado, Signal
Forms para los formularios. Sin zone.js.

Los puertos no devuelven observables ni promesas crudas: devuelven `Result<T, AppError>`. Que una
operación pueda fallar queda **escrito en el tipo**, y quien la llama no puede seguir sin decidir qué
hace con el fallo. Una excepción es un salto invisible que cualquier `catch` de más arriba se traga.

Para lo que se lee y se repinta solo, los puertos devuelven un `Recurso<T>` —tres signals y un método
para recargar—, de modo que la capa de aplicación obtiene datos reactivos **sin saber que detrás hay
HTTP**.

## 6. Lo que se hereda del proyecto original y no se toca

- **El diseño**, entero. `styles.css` es copia fiel del `index.css` del React, con sus correcciones de
  contraste ganadas a base de incidencias reales. Se comprobó midiendo: 58,36 kB frente a 58,34 kB.
- **Los textos**: los ocho idiomas con sus 2.884 claves cada uno.
- **Las reglas de negocio duras**: el precio lo calcula el backend y el front solo lo pinta; el margen
  depende del país de registro y nunca del de envío; los mensajes de error los localiza el servidor.
- **Los comentarios** del código original que explican por qué algo está como está. Casi todos
  documentan una incidencia que ya ocurrió una vez.
