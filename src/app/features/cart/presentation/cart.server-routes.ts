import { RenderMode, ServerRoute } from '@angular/ssr';

/**
 * Cómo se genera el HTML de las rutas de «cart».
 *
 * <p>Va PEGADO a las rutas del contexto y no en un fichero central a propósito: quien crea una pantalla
 * es quien sabe si su contenido es el mismo para todo el mundo —y entonces se escribe al construir— o
 * depende de quién mira —y entonces lo monta el navegador. En un fichero central, esa decisión se olvida,
 * y olvidarla del lado malo deja el esqueleto de una cuenta cacheado en el borde.
 *
 * <p>Va en un fichero aparte de `cart.routes.ts` para que al construir el HTML no se arrastren los
 * componentes: aquí solo hay datos.
 *
 * <p>La cesta es de QUIEN MIRA: sus líneas, su lista guardada y sus importes en su divisa. Prerenderizarla
 * dejaría en el borde el esqueleto de una cesta ajena, así que la monta el navegador.
 */
export const rutasDeServidor: ServerRoute[] = [{ path: 'cart', renderMode: RenderMode.Client }];
