import { Component, effect, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CapturaDeReferido } from '@features/affiliate/presentation/component/captura-de-referido';
import { Dialogo } from '@ds/component/dialogo/dialogo';
import { Avisos } from '@ds/component/avisos/avisos';
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
  imports: [RouterOutlet, CapturaDeReferido, Dialogo, Avisos],
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
   */
  template: '<router-outlet /><nx-captura-de-referido /><nx-dialogo /><nx-avisos />',
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
