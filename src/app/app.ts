import { Component, effect, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CapturaDeReferido } from '@features/affiliate/presentation/component/captura-de-referido';
import { Dialogo } from '@ds/component/dialogo/dialogo';
import { Avisos } from '@ds/component/avisos/avisos';
import { ConsentimientoDeCookies } from '@core/cookies/consentimiento-de-cookies';
import { CajonDelCarrito } from '@features/cart/presentation/component/cajon-del-carrito';
import { DOCUMENT } from '@angular/core';
import { PreferenciasService } from '@core/preferences/preferencias';

/**
 * El armazón de la aplicación. No pinta nada por sí mismo: coloca la pantalla que toque y mantiene el
 * documento en sintonía con las preferencias.
 *
 * <p>El idioma y el tema se escriben en el elemento raíz porque de ahí cuelgan cosas que no pasan por
 * Angular: `data-theme` es lo que lee daisyUI para repintar la paleta entera, y `lang` es lo que usan el
 * lector de pantalla para elegir voz y el navegador para partir palabras.
 */
@Component({
  selector: 'nx-root',
  imports: [
    RouterOutlet,
    CapturaDeReferido,
    Dialogo,
    Avisos,
    ConsentimientoDeCookies,
    CajonDelCarrito,
  ],
  /**
   * La captura de referido no pinta nada: se limita a mirar la dirección y registrar de quién viene la
   * visita. Va aquí, en el armazón, porque un enlace de afiliado puede apuntar a cualquier página.
   *
   * <p>El DIÁLOGO y los AVISOS también van aquí, y su ausencia era un agujero de los gordos: los dos
   * componentes existían, estaban escritos y probados, y no los montaba NADIE. El resultado es que en
   * toda la aplicación no había forma de confirmar nada ni de enterarse de si algo había salido bien.
   *
   * <p>Se veía así: quien administra pulsaba «Eliminar producto», o la papelera de una foto, y no
   * pasaba nada en absoluto. El código pedía confirmación, la confirmación no se pintaba, la promesa se
   * quedaba esperando y la acción no llegaba a ejecutarse. Ni un error en la consola. Cincuenta
   * ficheros dependen de este diálogo, así que estaban rotos los cincuenta: borrar un producto, una
   * imagen, una variante, una dirección, una tienda.
   *
   * <p>Van en el armazón porque los dos se pintan por encima de cualquier pantalla y ninguna en
   * concreto es su dueña. Es el mismo motivo por el que el marco de la tienda vive aquí y no dentro de
   * una página.
   *
   * <p>El AVISO DE COOKIES y el CAJÓN DE LA CESTA están aquí por lo mismo, y estaban igual de ausentes.
   *
   * <p>El de cookies es el grave: escrito, probado y sin montar, la web se servía sin ninguna forma de
   * aceptar ni de rechazar nada. Eso no es una pieza que falta, es incumplir el RGPD en producción —y
   * se veía a simple vista comparando con el front anterior, donde el aviso sí sale—. Va en el armazón
   * y no en el marco de la tienda porque tiene que aparecer TAMBIÉN en el panel y en las pantallas
   * sueltas de acceso, que no llevan marco: la ley no distingue por sección.
   *
   * <p>El cajón de la cesta va aquí porque lo abren los dos marcos —el icono del escaparate y el del
   * panel— y su estado vive en el almacén de la cesta, que es de raíz. Montado dentro de un marco
   * habría dos cajones, y al pasar del panel a la tienda se cerraría solo. Mientras no estuvo, el
   * icono de la cesta se limitaba a navegar a `/cart`: llevaba a la página correcta, así que nadie lo
   * leía como un fallo, pero era otra pantalla en vez del panel lateral del front anterior.
   */
  template:
    '<router-outlet /><nx-captura-de-referido /><nx-dialogo /><nx-avisos />' +
    '<nx-cajon-del-carrito /><nx-consentimiento-de-cookies />',
})
export class App {
  private readonly preferencias = inject(PreferenciasService);
  private readonly documento = inject(DOCUMENT);

  constructor() {
    effect(() => {
      const raiz = this.documento.documentElement;
      raiz.lang = this.preferencias.idioma();
      const elegido = this.preferencias.tema();
      if (elegido) {
        raiz.setAttribute('data-theme', elegido);
      } else {
        // Sin elección explícita se QUITA el atributo, en vez de poner el claro: el atributo gana sobre
        // la preferencia del sistema, así que ponerlo condena a modo claro a quien tiene el equipo en
        // oscuro. Sin él, daisyUI resuelve por `prefers-color-scheme`.
        raiz.removeAttribute('data-theme');
      }
    });
  }
}
