---
description: Las trampas del navegador en este escaparate, que dan fallos sin mencionar su causa
globs: ["e2e/**"]
---

# Pruebas de navegador

Las tres primeras ya están resueltas en `e2e/certificacion/sesion-certificada.ts`: **úsalo** en vez
de volver a escribir el acceso.

1. **La hidratación vacía los formularios.** La página llega renderizada del servidor y Angular la
   hidrata después, reiniciando los controles. Rellenar y enviar antes manda el formulario en
   blanco: ni alerta ni navegación, solo tiempo agotado, y de forma intermitente. Escribir y
   *comprobar* que el valor quedó no basta — la hidratación llega después de esa comprobación. Lo
   que funciona es reintentar el ciclo entero con `toPass`.
2. **La guía del asistente se planta en medio** con un velo a pantalla completa que intercepta los
   clics; el fallo sale como «no se pudo pulsar». Se siembra respondida con `nx036.welcome.v1`.
3. **El primer listado no genera petición XHR**: llega del servidor. Esperar su respuesta se agota
   sin que nada esté roto.
4. **El contador parpadea a «0 / 0»** medio segundo tras pulsar un filtro. Una espera que solo pida
   «un valor distinto» captura el parpadeo y acusa al filtro de devolver cero estando sano.
5. **El resumen del checkout se pinta por partes.** En cuanto hay país aparece la fila del envío,
   pero el arancel y el IVA llegan con la cotización. Esperar a que se vea una fila no es esperar al
   desglose: hay que esperar a la RESPUESTA de `/shipping/quote`. Con un backend recién reiniciado
   la ventana es de segundos, y la prueba acusa de no cobrar aranceles a un país que sí los cobra —
   España, el 16-oct, que sola volvía a pasar.

**Y lo que vale para cualquier prueba de datos reales: mide el dato en el entorno donde va a
correr.** El catálogo de producción es seis veces menor que el de preproducción y no tiene las
mismas familias; un término con 51 fichas en PRE puede tener cero en PRO, y entonces la prueba falla
por falta de catálogo mientras parece que se rompió la funcionalidad.

`ng lint` **no mira esta carpeta**: si tocas algo aquí, pásale `npx eslint e2e/` tú.

## Certificar un cobro

`pago-tarjeta.spec.ts` paga un pedido con tarjeta en el Checkout hospedado de Stripe. Dos cosas que
no son evidentes:

6. **El backend puede tener Stripe en modo SIMULADO** (`STRIPE_ENABLED=false`, que es el valor por
   defecto). Entonces no hay redirección a la pasarela: vuelve directo a `/checkout/return?…&mock=1`
   y el pedido se da por pagado. Una prueba que solo mire «¿acabó PAID?» sale **verde sin haber
   certificado nada**. Por eso el caso se declara SIN EJECUTAR cuando detecta `mock=1`.
7. **Antes de teclear una tarjeta hay que comprobar que la sesión es de prueba.** El identificador
   empieza por `cs_test_`. Las claves de producción y las de prueba viven en la misma variable, así
   que un despliegue con la clave cambiada convertiría la certificación en una compra real. La
   comprobación va **antes** de rellenar el formulario, no después.

Y los selectores de la página de Stripe son suyos, no nuestros: `#cardNumber`, `#cardExpiry`,
`#cardCvc` y `.SubmitButton`. Si Stripe los cambia, esta prueba se rompe sin que nuestro código
tenga nada que ver.
