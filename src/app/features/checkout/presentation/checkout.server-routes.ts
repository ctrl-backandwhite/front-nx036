import { RenderMode, ServerRoute } from '@angular/ssr';

/**
 * Cómo se genera el HTML de las rutas de «checkout».
 *
 * <p>Va PEGADO a las rutas del contexto y no en un fichero central a propósito: quien crea una pantalla
 * es quien sabe si su contenido es el mismo para todo el mundo —y entonces se escribe al construir— o
 * depende de quién mira —y entonces lo monta el navegador. En un fichero central, esa decisión se olvida,
 * y olvidarla del lado malo deja el esqueleto de una cuenta cacheado en el borde.
 *
 * <p>Va en un fichero aparte de `checkout.routes.ts` para que al construir el HTML no se arrastren los
 * componentes: aquí solo hay datos.
 *
 * <p>Las dos son de QUIEN MIRA. El pago enseña sus direcciones, su saldo, sus tarjetas y el precio en su
 * divisa; el retorno de la pasarela confirma un cobro concreto que llega en la dirección. Prerenderizar
 * cualquiera de las dos dejaría en el borde el esqueleto de un pago ajeno.
 */
export const rutasDeServidor: ServerRoute[] = [
  { path: 'checkout', renderMode: RenderMode.Client },
  { path: 'checkout/return', renderMode: RenderMode.Client },
];
