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
