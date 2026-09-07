# Defectos encontrados

Dos listas, y la distinción entre ellas importa: un defecto **del porte** es trabajo por terminar; un
defecto **heredado** ya lo sufre quien usa la aplicación hoy, y corregirlo es una decisión de producto,
no de traducción.

Estado: **abierto**. Última actualización: 6-sep-2026.

---

## A. Defectos heredados del frontend React

Salieron al portar, pero **no los introduce el porte**: se comprobó abriendo el fichero original. Están
en producción ahora mismo. Se listan porque callarlos sería peor, pero corregirlos rompe la paridad que
se está certificando, así que **la decisión es del titular**.

| # | Dónde | Qué pasa | Propuesta |
|---|---|---|---|
| H-1 | Panel · soporte | El rótulo del campo dice **«Resolución (opcional)»** y la regla exige texto. El rótulo miente, y el resultado son casos cerrados sin explicación para quien reclamó. Idéntico en el React. | Quitar «(opcional)» en los ocho idiomas |
| H-2 | Panel · usuarios | `admin.users.actions.reset_sent` llevaba el marcador `{email}` en siete idiomas y **no en español**: quien usa el panel en español no veía a qué dirección se había enviado. | **CORREGIDO** — el marcador existía en los otros siete, así que era una incoherencia, no una decisión |
| H-3 | Panel · soporte | `AdminSupportPage` existía pero **no estaba enrutada**: `/admin/support` montaba la página del escaparate, la que ve quien compra. Quien atendía soporte no tenía la bandeja de todos los tiques, y la pantalla escrita para eso no se enseñaba en ninguna parte. | **CORREGIDO en el porte** — enrutada a la pantalla correcta |
| H-4 | Alta, contraseña, buzón, soporte, alta de producto, divisas, idiomas, legales | **31 textos escritos a pelo dentro del componente**, en castellano, sin pasar por el diccionario: nunca se tradujeron y nadie los echó de menos. | **CORREGIDO** — traducidos a los ocho idiomas |
| H-5 | Acceso · interruptor de tema | «Claro» y «Oscuro» eran literales en inglés dentro del componente. | **CORREGIDO** — en los ocho idiomas |

Sobre H-1: es el único que sigue abierto de los heredados, y se deja abierto **a propósito**. Cambiarlo
es correcto para quien usa la aplicación y es una divergencia respecto al React; conviene que se decida,
no que se cuele en un porte.

## B. Defectos del porte

Los encontrados hasta ahora, y todos corregidos ya. Se dejan escritos porque cada uno señala una regla
que faltaba.

| # | Qué pasaba | Causa | Regla que deja |
|---|---|---|---|
| P-1 | El lint de arquitectura pasaba en verde con violaciones flagrantes delante | Sin el resolvedor de TypeScript, toda importación se clasificaba como «destino desconocido» y la política ni se evaluaba | Una regla que nunca se ha visto fallar no está verificada |
| P-2 | Ocho guardianes de sesión distintos, uno por equipo | El guardián estaba dentro de un contexto, y lo necesitan ocho | Lo que usan todos vive en el núcleo |
| P-3 | La clave de idempotencia no viajaba al pagar | El cliente HTTP no admitía cabeceras por petición | El servidor no puede frenar un doble cobro con lo que no le llega |
| P-4 | `ng test` dejó de arrancar para todos los equipos | Al renombrar las configuraciones se rompió el objetivo que busca el ejecutor, y el error no menciona `angular.json` | Renombrar una configuración toca más cosas de las que parece |
| P-5 | `/checkout` fallaba al entrar directamente | Los proveedores de la cesta colgaban de la ruta de la cesta | Lo que vive en el marco de página se provee en la raíz |
| P-6 | El prerenderizado fallaba con `NG0203` | `esNavegador()` usaba `inject()` por dentro, así que solo valía en contexto de inyección; llamarla desde un `effect` fallaba **solo al construir** | Una función que inyecta por dentro es una trampa: mejor un servicio |
| P-7 | La hoja de estilos se duplicó sin tocar una regla | Tailwind escaneaba 25.000 líneas de traducciones y confundía palabras sueltas con utilidades | Los ficheros de datos se excluyen del escaneo |
| **P-8** | **El pago nunca se confirmaba.** Quien volvía de Stripe o de PayPal veía «No pudimos confirmar el pago · Falta la referencia del pago»: el cobro **no se cerraba del lado del servidor** y la cesta **no se vaciaba**. Sin error en ningún registro. | La confirmación se lanzaba desde el CONSTRUCTOR, y el enrutador enlaza los parámetros de la dirección **después** de construir el componente. Los dos identificadores valían siempre cadena vacía. | Lo que depende de un parámetro de la ruta se lee en un `effect`, nunca en el constructor |
| P-9 | Seis bloques de contenido no aparecían nunca a quien llegaba navegando | `@defer` con solo disparador de hidratación | Declarar siempre los dos disparadores |
| **P-10** | **La aplicación se servía sin cabecera, sin pie y sin cajón de cesta.** | El marco de página estaba escrito y probado, pero no lo montaba ninguna ruta | Una pieza con sus pruebas en verde puede no estar enchufada a nada |
| **P-11** | **La portada llegaba vacía** (1.116 bytes) | Un `path: ''` con carga en diferido CONSUME el intento de resolución; si el grupo cargado no contiene la dirección, el enrutador no vuelve atrás | Las pantallas sueltas se montan por su camino propio, no bajo un camino vacío |
| P-12 | Los planes y precios se servían vacíos | Marcados «cliente» porque el resto de su contexto lo es, siendo una página pública | El modo de generación se decide por página, no por contexto |
| **P-13** | **Pantallas que revientan al abrirlas** con `NG0201` | 51 casos de uso declarados en el inyector RAÍZ dependen de puertos que se registran en la RUTA. Desde la raíz no se ven. **Ninguna prueba lo detecta**: en el banco de pruebas todo se provee junto | Lo que depende de un puerto de contexto se registra con ese contexto, nunca en la raíz |
| P-14 | El panel de marca del acceso no cargaba | El adaptador pedía `/storefront/warehouses`; el endpoint es `/warehouses` | Comprobar cada ruta contra el módulo de API del original |

### Sobre P-8, que merece leerse dos veces

Tres pruebas de esa pantalla **estaban en verde antes del arreglo, y pasaban por el motivo equivocado**:
comprobaban que sin identificadores se enseña un error, y los identificadores faltaban SIEMPRE. La
prueba describía bien el comportamiento deseado, el código estaba mal, y la coincidencia entre los dos
fallos producía verde.

Es el mejor argumento a favor de certificar contra la aplicación funcionando y no solo contra la
batería de pruebas.

### Sobre P-13, y por qué la certificación en navegador no era opcional

Los 51 casos de uso mal ubicados pasaban **todas** sus pruebas. En el banco de pruebas, los puertos y
los casos de uso se registran juntos en el mismo inyector, así que la dependencia siempre se resuelve.
En la aplicación de verdad no: el caso de uso vive en la raíz y el puerto en la ruta, y la pantalla
revienta al abrirla.

No lo veían las pruebas, ni el lint, ni la compilación, ni la comprobación de tipos. Apareció al abrir
sesión con una cuenta real y navegar. Es, junto con P-8 y P-10, el argumento de que **la certificación
tiene que ejecutar la aplicación**.

## B bis. Defectos abiertos del porte

| # | Qué pasa | Estado |
|---|---|---|
| A-1 | **La documentación para desarrolladores se desplazaba en horizontal en el móvil**, 115 px a 412 px de ancho, y el original no | **CERRADO.** Las tres primeras respuestas eran falsas: no era el bloque de código, ni el diálogo de bienvenida, ni la barra inferior — los tres **medían** 527 px porque el desborde ya existía, y arreglar cualquiera dejaba el número clavado en 115. Desbordaba la prosa de la guía (427 px de ancho intrínseco en una columna de 369). Resuelto con `main { overflow-x: clip }` en la hoja central; `clip` y no `hidden` para no desactivar `position: sticky` en el índice lateral |
| A-2 | Tres enlaces del pie por debajo del mínimo táctil que el original no tenía | **ERA FALSO.** Al ir a mirarlos a mano no estaban en ninguna de las dos aplicaciones. El pie va en `@defer (on viewport)`: hasta que no se baja, ese marcado NO EXISTE, y la prueba comparaba una pantalla con pie contra otra sin él según cuál terminara antes. Corregido bajando al fondo en las dos antes de medir |
| A-3 | Las peticiones del prerenderizado no viajan en el documento y el navegador las repite al hidratar | Abierto. Vuelve a medirse ahora que el prerenderizado sí lleva datos |
| A-4 | `/about`, `/contact` y `/pricing` medían más lentas que el original | **CERRADO, y era doble.** Primero, la medida no valía: se servía el build de `local`, con la optimización apagada. Y al medir en igualdad apareció la causa real, que era un defecto de verdad: **el porte cargaba Stripe en páginas públicas**. `@stripe/stripe-js` mete su `<script>` en la página en cuanto se CARGA el módulo, sin que nadie llame a `loadStripe`: `/about` y `/pricing` pedían cinco recursos a `js.stripe.com` y `m.stripe.network` —más de 1 MB, un tercio del peso— donde el original no pide nada. Resuelto importando de `@stripe/stripe-js/pure`. Comprobado que Stripe sigue llegando al pedir añadir una tarjeta, y solo entonces |

### Peso por página tras el arreglo, medido en frío a 412 px

| Ruta | Antes (porte) | Ahora | Original |
|---|---|---|---|
| `/` | 1.255 kB | **920 kB** | 2.333 kB |
| `/pricing` | 2.136 kB | **916 kB** | 1.485 kB |
| `/about` | 2.374 kB | **1.181 kB** | 1.620 kB |
| `/contact` | 2.318 kB | **1.187 kB** | 1.580 kB |

El porte pasa a descargar menos que el original en las cuatro.

## B ter. Defectos encontrados en el front ACTUAL (no en el porte)

La certificación compara contra la aplicación que se está reemplazando, así que cuando la que falla es
ella, el hallazgo es sobre lo que hoy está en producción. Aquí no se ha tocado nada: se deja escrito.

| # | Qué pasa | Cómo se vio |
|---|---|---|
| R-1 | **Sin sesión, `/orders`, `/wallet`, `/profile` y `/admin` se quedan en «CARGANDO…» para siempre.** No rebotan a la pantalla de acceso. No hay fuga de datos —el backend los niega— pero quien entra por un enlace guardado se queda mirando un cargador eterno sin enterarse de que tiene que identificarse | El porte sí rebota. Se exigía paridad y saltaba en rojo; replicarlo habría sido copiar el defecto |
| R-2 | **Al rebotar al acceso desde una zona privada, pide `/login.data` en bucle.** La red no queda en reposo nunca | Reventó seis pruebas que esperaban a que la red se calmara, agotando 60 s cada una |

## B quater. Defectos menores abiertos en la documentación

Encontrados por la batería de maqueta, que es nueva. Son de estructura, no de contenido visible: en
pantalla se lee lo mismo.

| # | Qué pasa | Medida |
|---|---|---|
| D-1 | **CERRADO.** «Nuestra misión» iba como `h2` donde el original usa `h3`. Rompe la jerarquía de encabezados de la página, que es lo que usan los lectores de pantalla para moverse por secciones y los buscadores para entender el esquema | 28 titulares frente a 23, sin que falte ni un texto |
| D-2 | **CERRADO.** Faltaba la tabla de estado de los entornos en el panel lateral; se pintaba como dos líneas sueltas. El contenido está —los entornos y su estado— pero no como `<table>`, así que no se navega como tabla | 17 tablas frente a 18, solo en escritorio |

## B quinquies. Lo que encontró certificar las ACCIONES (7 de septiembre)

Hasta esta tanda, la certificación comprobaba que las pantallas ABREN. Ejecutar cada acción de verdad,
con los dos papeles, destapó lo siguiente. Ninguno lo veía ninguna de las 2.916 pruebas de unidad,
porque cada una monta su componente con sus dobles y ahí todo responde.

| # | Qué pasaba | Por qué nadie lo veía |
|---|---|---|
| E-1 | **No se podía borrar NADA en toda la aplicación.** El diálogo de confirmación existía, estaba probado y no lo montaba nadie: se pulsaba «Eliminar» y no pasaba absolutamente nada —ni error, ni petición—. Cincuenta ficheros dependían de él | En las pruebas de unidad el diálogo se inyecta y responde. Solo aparece usando la aplicación |
| E-2 | **16 componentes escritos y nunca montados**, entre ellos el **aviso de cookies** (dos implementaciones, ninguna en pantalla: incumplimiento del RGPD), el cajón de la cesta, la campana de avisos, el buscador del panel y la guía de bienvenida | Las cuatro ranuras de los marcos estaban vacías: los marcos se montaban como etiqueta autocerrada |
| E-3 | **Añadir a la cesta desde la tarjeta no actualizaba la cesta.** El catálogo escribía su propio `PUT /me/cart` y había dos cestas: el contador no subía y la cesta no traía el producto hasta recargar | |
| E-4 | **Cambiar de moneda no cambiaba los precios** hasta recargar a mano. La salida del selector no la enlazaba nadie | Un `output` hay que acordarse de atarlo; una dependencia declarada en la lectura, no |
| E-5 | **En «Mis favoritos» los corazones salían apagados** y al pulsarlos volvían a añadir en vez de quitar | |
| E-6 | **Las pestañas «Inventario» y «Precios» del panel llegaban vacías.** Eran los dos únicos bloques diferidos del proyecto SIN disparador, y con hidratación incremental eso no se materializa nunca | No se podían gestionar variantes ni tramos de precio, y sin un error por ningún lado |
| E-7 | **Borrar imágenes y tramos de precio no preguntaba**: desaparecían al primer clic. Las tres traducciones de la pregunta llevaban tiempo escritas en los ocho diccionarios sin usar | Las pruebas comprobaban que la acción llega al caso de uso, no que haya un paso previo |
| E-8 | **Los vídeos sonaban.** `muted` en la plantilla de Angular es un ATRIBUTO, y el navegador solo lo consulta al crear el elemento: con la dirección llegando por enlace, llega tarde | Su prueba comprobaba `hasAttribute('muted')`, así que daba verde mientras sonaban |
| E-9 | **En el móvil no se podía cerrar sesión.** La barra de pestañas tapaba el botón del cajón, que es el único sitio para salir a esa anchura | El original tiene el mismo defecto y sigue teniéndolo |
| E-10 | **El asistente se le plantaba delante a quien acababa de llegar** con una capa que captura los clics. El original solo lo muestra con sesión | |

### Cuatro pruebas que daban verde justo en el caso que importaba

Merece la pena tenerlas juntas, porque el patrón se repite:

1. La del panel medía el `body` con un umbral de 120 caracteres, y **el menú lateral ya los supera**: daba verde con el panel de control EN BLANCO y una ruta en 404.
2. La de rendimiento **solo sumaba respuestas con `content-length`**, y el original sirve comprimido en trozos sin esa cabecera: le contaba 43 kB en una pantalla de 1,5 MB, y el porte parecía pesar doce veces más.
3. La del vídeo comprobaba **el atributo en vez de la propiedad**: verde con el audio sonando.
4. El detector de «404» buscaba **la cifra en vez del código**: la tasa de la rupia india (94.40425) marcaba la pantalla de monedas como página de error.

La lección común: **cuando una prueba mide el contenedor, la etiqueta o el envoltorio en vez del efecto, falla en silencio justo donde importa.**

## C. Pendiente de decisión del titular

1. **H-1**, arriba.
2. **La ficha de producto no se prerenderiza** (7.729 productos: generar una página por cada uno no es
   viable). Sus etiquetas para compartir, que el código ya escribe bien, no llegan a quien recibe el
   enlace. O se deja como está —igual que el React hoy— o se prerenderizan solo las destacadas.
3. **Papeles en el panel.** El React daba acceso uniforme a `ADMIN` y `OPERATOR` en todas las pantallas.
   Al portar se reservó a `ADMIN` lo que mueve dinero, cambia identidades, reparte credenciales o
   escribe a toda la base, dejando a `OPERATOR` el panel, soporte, academia, mentores, perfil y guía de
   estilo. **Es más restrictivo que el original**, así que conviene ratificarlo antes de certificar: si
   no, la certificación lo marcará como diferencia de comportamiento — que es exactamente lo que es.
