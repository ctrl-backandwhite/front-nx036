# Certificación e2e del porte

Este proyecto no se certifica contra una lista de requisitos: se certifica **contra el frontend React
que reemplaza**. La pregunta no es «¿funciona?», es «¿hace exactamente lo mismo?».

Eso permite algo que no suele estar disponible: los dos frontends corren a la vez contra el **mismo
backend**, así que cualquier diferencia de comportamiento es un defecto del porte, no una duda de
interpretación.

```
              ┌──────────────────┐
              │  React  :3003    │──┐
              └──────────────────┘  │     ┌────────────────────┐
                                    ├────►│  backend  :18082   │
              ┌──────────────────┐  │     └────────────────────┘
              │  Angular :3004   │──┘
              └──────────────────┘
```

---

## 1. La regla que gobierna la certificación

**No hay verde sin recuento.** El estado de una compilación, un código HTTP o un «todo correcto» no
prueban nada por sí solos: hay que ver el NÚMERO de comprobaciones ejecutadas. Ya ha pasado tres veces
en este repositorio que un verde no había ejecutado nada.

Cada informe de certificación dice: cuántas comprobaciones se lanzaron, cuántas pasaron, cuántas
fallaron y cuántas se saltaron **y por qué**. Una comprobación saltada en silencio cuenta como fallo.

## 2. Preparación del entorno

```bash
# El React ya corre en :3003 y el backend en :18082 (docker compose).
docker ps --format '{{.Names}}\t{{.Ports}}'

# El Angular, en :3004, en modo PRODUCCIÓN — no en modo desarrollo.
# Es importante: lo que se certifica es lo que se va a servir, con su HTML prerenderizado
# y sus fragmentos con hash, no una compilación de desarrollo que se comporta distinto.
npm run build && npx http-server dist/front-nx036/browser -p 3004
```

**Cuentas de certificación** (ya existen en la base local, son borrables):
`cert-cliente@local.test` y `cert-admin@local.test`, contraseña `CertLocal2026!`, con saldo en el
monedero. No se crean por la API: el alta exige CAPTCHA.

**Antes de certificar, reconstruir.** Si se ha tocado el backend, el contenedor sigue viendo el jar
viejo aunque Maven lo haya reescrito (cambia el inode y el montaje no lo sigue). `mvn verify`, después
`docker compose stop backend && up -d backend` — nunca `restart`.

## 3. Qué se certifica, en cuatro dimensiones

### A. Paridad de rutas
Toda dirección que responde en el React responde en el Angular, con el mismo código y el mismo tipo de
página. Incluye las redirecciones, los alias y la página de «no encontrado». Sale del inventario:
`docs/INVENTARIO-PORTE.md`.

### B. Paridad de contenido
Para cada página pública, se extrae el texto visible normalizado de los dos frontends y se comparan.
Las diferencias esperables (identificadores generados, marcas de tiempo, orden aleatorio del catálogo)
se normalizan explícitamente; **cualquier otra diferencia es un defecto**.

Los **importes se comparan al céntimo**, no redondeados. Es exigencia del proyecto y es donde se
esconden los fallos de verdad: una divisa mal formateada, un margen que se aplica dos veces, un envío
que no suma.

### C. Paridad de flujo
Los recorridos completos, ejecutados en los dos frontends:

| Flujo | Qué tiene que pasar igual |
|---|---|
| Alta → activación → acceso | Correo, código, entrada, y el segundo factor cuando la cuenta lo tiene |
| Catálogo | Búsqueda, filtros, orden, paginación, muro para quien no ha entrado |
| Ficha | Galería, variantes, precio por variante, existencias, reseñas |
| Cesta | Añadir, cambiar cantidad, guardar para después, recotización |
| Pago | Dirección, envío, aranceles, cartera, tarjeta, PayPal |
| Pedidos | Listado, detalle, seguimiento, cancelación |
| Cartera | Saldo, recarga, retorno de la pasarela |
| Cuenta | Perfil, direcciones, métodos de pago, suscripción |
| Panel | Las 35 pantallas: alta, edición, borrado y sus confirmaciones |

### D. Paridad transversal
Se comprueba en las dos aplicaciones, no una sola vez:

- **Los ocho idiomas.** Ninguna pantalla puede enseñar una clave técnica (`login.title`) en ningún
  idioma. Se detecta buscando el patrón de clave en el texto renderizado.
- **Las divisas**: mismo importe y mismo formato local (una cantidad en euros se escribe `14,90 €`,
  no `EUR14.90`).
- **Tema claro y oscuro**: sin texto ilegible. Ya hubo dos incidencias de contraste por esto.
- **Mobile first**: cada pantalla a 375 px y a 1440 px, sin desplazamiento horizontal y con los
  objetivos táctiles a 44 px como mínimo.
- **Accesibilidad**: comprobación automática por página; el proyecto exige WCAG AA.
- **Prerenderizado**: el HTML de las páginas públicas llega **ya pintado**, sin JavaScript. Se
  comprueba con el navegador sin JavaScript o mirando el HTML crudo: el título del producto tiene que
  estar ahí. Es la razón de haber elegido esta arquitectura, así que si falla, falla el fundamento.
- **Consola limpia**: ni un error de JavaScript en ninguna pantalla. El React tiene su propio nivel de
  ruido; se compara contra él, no contra cero absoluto.

### E. Paridad —y mejora— de rendimiento

El porte no se limita a hacer lo mismo: donde el original va lento, tiene que ir más rápido. Así que
esta dimensión **no se conforma con empatar**. Se mide lo mismo en los dos frontends, en las dos
anchuras, con la red limitada a la velocidad de un móvil corriente:

| Medida | Criterio |
|---|---|
| Peso inicial descargado | El Angular **por debajo** del React |
| Peticiones hasta la primera pantalla útil | El Angular **igual o menos** |
| Tiempo hasta el primer contenido pintado | El Angular **igual o menos** |
| Tiempo hasta que se ve el contenido principal | El Angular **igual o menos** |
| Desplazamiento inesperado de la maqueta | Por debajo de 0,1 en las dos |
| Peticiones repetidas tras hidratar | **Cero**: las del prerenderizado se reaprovechan |

Cualquier pantalla donde el Angular salga peor que el React se anota como defecto de rendimiento, con
su medida, y se investiga antes de dar el porte por bueno. Las mejoras ya medidas —arranque de 1,72 MB
a 447 kB, hoja de estilos de 105 kB a 58 kB— son el punto de partida, no la meta.

Se comprueba además que las palancas están puestas donde debían: bloques `@defer` en lo que queda bajo
el pliegue, `NgOptimizedImage` con `priority` en la imagen principal, y `track` por identificador
estable en las listas.

## 4. Lo que NO se puede certificar en local, y hay que decirlo

Callarse un hueco de cobertura es peor que tenerlo:

- **El selector de envío y los límites por canal.** En local el transportista va simulado
  (`YUNEXPRESS_ENABLED=false`): `/shipping/quote` devuelve la lista de opciones vacía y cae a la tabla
  de zonas. Exige el entorno de pruebas del proveedor o producción.
- **Los correos** salen al servidor real. Para certificarlos se apunta temporalmente a Mailpit y **se
  restaura el fichero de entorno al terminar**, con copia previa.
- **Los pagos reales**: se certifican con las claves de prueba de la pasarela, verificando el cobro
  contra su propia API, no contra lo que diga la pantalla.

## 5. Registro de defectos

Cada diferencia encontrada se anota en `docs/DEFECTOS-CERTIFICACION.md` con: pantalla, qué hace el
React, qué hace el Angular, gravedad y estado. Un defecto no se cierra porque «ya está arreglado»: se
cierra cuando la comprobación que lo detectó vuelve a pasar.

Los defectos que revelen una regla que faltaba se suben a `CLAUDE.md`, para que el siguiente que porte
una pantalla no lo repita.

## 6. Criterio de aceptación

El porte está certificado cuando:

1. Las cuatro dimensiones pasan **sin defectos abiertos de gravedad alta o media**.
2. Los huecos de cobertura conocidos están **escritos y justificados**, no omitidos.
3. El recuento de comprobaciones ejecutadas aparece en el informe y cuadra con lo previsto.
4. Las pruebas unitarias y de componente siguen en verde, con la cobertura por encima del umbral.

---

## Resultado de la certificación — 7 de septiembre de 2026

Contra la **pasarela real** (nginx con la configuración que se despliega), con el build optimizado y
precomprimido. Las dos anchuras. 582 comprobaciones lanzadas.

| | |
|---|---|
| **Pasadas** | **561** |
| Fallidas | **0** |
| Inestables | 1, del front anterior (su botón de acceso no llega a estar quieto) |
| Saltadas | 20, justificadas abajo |
| Duración | 30,8 min |

Y aparte: **2.885 pruebas unitarias** en 321 ficheros, `ng lint` limpio, 32 rutas prerenderizadas.

### Qué cubre ahora que antes no

- **El panel de administración entero**: 40 pantallas × 2 anchuras × 2 aplicaciones. Era la mitad de la
  aplicación y no la miraba ninguna prueba.
- **La maqueta**: cuántas piezas de cada tipo hay y cuánto ocupan las grandes. Es lo que la certificación
  cosmética no miraba, y por eso daba verde con los filtros del catálogo convertidos en desplegables
  nativos, el panel del acceso a media pantalla y dos secciones ausentes de la portada.

### Rendimiento, medido en frío a 412 px y con todo comprimido

| Ruta | Front anterior | Porte |
|---|---|---|
| Portada | 664 ms al primer pintado | **148 ms** |
| `/about` | 1.504 kB · 336 ms | **583 kB** · **164 ms** |
| `/pricing` | 1.662 kB · 400 ms | **499 kB** · **108 ms** |
| `/contact` | 1.545 kB · 660 ms | **498 kB** · **140 ms** |

Gana en las cuatro, en bytes y en tiempo hasta ver algo. Dos cambios explican casi todo: **la pasarela
no comprimía nada** (la hoja de estilos viajaba entera, 264 kB) y **el porte cargaba Stripe en páginas
públicas**, más de 1 MB, donde el original no pide nada.

### Las 20 saltadas

| Cuántas | Qué | Por qué |
|---|---|---|
| 19 | Comprobaciones de móvil | Solo aplican a esa anchura; en la pasada de escritorio se saltan a propósito |
| 1 | Ficha de producto con sesión | Se salta solo si la base local no tiene productos |

## Resultado de la certificación de cierre — 6 de septiembre de 2026

Construido con optimización (`--optimization --source-map=false --output-hashing=all`) contra el mismo
backend local que sirve al front anterior. Las dos anchuras, 406 comprobaciones lanzadas.

| | |
|---|---|
| **Pasadas** | **384** |
| Fallidas | 2 (el mismo caso en las dos anchuras) |
| Inestables | **0** |
| Saltadas | 20, todas justificadas abajo |
| Duración | 23,6 min |

Y aparte: **2.848 pruebas unitarias** en 318 ficheros, `ng lint` limpio, 32 rutas prerenderizadas.

### Lo único que queda en rojo

**La ficha de producto no lleva sus etiquetas para compartir.** Es consecuencia de una decisión que
está sin tomar, no de un fallo: hay 7.729 productos y prerenderizarlos todos no es viable. Ahora que el
prerenderizado sí recibe datos, prerenderizar un subconjunto —los más visitados— daría etiquetas reales
para esas fichas, a cambio de alargar cada despliegue. Es decisión del titular, y está en
`DEFECTOS-CERTIFICACION.md`.

### Las 20 saltadas, una por una

| Cuántas | Qué | Por qué se salta |
|---|---|---|
| 19 | Comprobaciones de móvil | Solo tienen sentido a la anchura de un móvil; en la pasada de escritorio se saltan a propósito |
| 1 | Ficha de producto en el recorrido con sesión | Se salta **solo si la base local no tiene productos**. Si los hay, se ejecuta |

### Qué hizo falta arreglar para que este número signifique algo

Cinco de las certificaciones anteriores dieron rojos que NO eran defectos del porte, y uno de esos
rojos escondía el mejor hallazgo de todos. Queda escrito porque volverá a pasar:

1. **Se comparaba rendimiento con la configuración de trabajo** (26 MB, sin optimizar) contra el build
   de producción del otro front. Al medir en igualdad apareció la causa real: el porte **cargaba Stripe
   en páginas públicas**, más de 1 MB y un rastreador de terceros donde el original no pide nada.
2. **El backend limita los accesos** y respondía 429 a partir del undécimo. La batería entraba por el
   formulario treinta veces, así que de la mitad en adelante medía el limitador. Se atribuía a «carga».
3. **Playwright no comprueba tipos**: enumeró 406 pruebas en verde con dos ficheros que usaban una
   función sin importarla. Ahora la batería tiene su `tsconfig` y `npm run e2e` lo comprueba antes de
   abrir un navegador.
4. **`networkidle` esperaba a que la OTRA aplicación se callara**, y el front anterior pide
   `/login.data` en bucle: la red no queda en reposo nunca.
5. **Los bloques diferidos no existen hasta que se baja**, así que se comparaba una pantalla con pie
   contra otra sin él, e inventaba defectos de accesibilidad que no estaban en ninguna de las dos.
