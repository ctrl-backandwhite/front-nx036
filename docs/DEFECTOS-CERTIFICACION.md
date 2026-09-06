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
