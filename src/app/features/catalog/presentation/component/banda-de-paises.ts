import { Component, inject, resource } from '@angular/core';
import { CintaDePaises } from '@ds/component/pais/cinta-de-paises';
import { PAISES_DE_ENVIO_PORT } from '../../domain/port/paises-de-envio.port';

/**
 * La banda de países de la portada.
 *
 * <p>Faltaba entera en el porte: el front anterior cierra la portada con esta cinta y aquí no había
 * nada. No es adorno, es el argumento de alcance del sitio —«enviamos a noventa países»— y va cotejado
 * con la cobertura REAL del transportista, no con una lista escrita a mano que se queda desfasada
 * prometiendo envíos imposibles.
 *
 * <p>Solo pone los datos: el dibujo lo pone el sistema de diseño, que es de donde lo toma también la
 * cobertura del pago. Si no llegan países, la cinta no pinta nada y la portada se cierra sin hueco.
 */
@Component({
  selector: 'nx-banda-de-paises',
  imports: [CintaDePaises],
  template: `<nx-cinta-de-paises [paises]="paises.value()" />`,
})
export class BandaDePaises {
  private readonly puerto = inject(PAISES_DE_ENVIO_PORT);

  /* La cobertura cambia rara vez, así que se pide UNA sola vez por visita y el fallo se traga: sin
   * países la cinta desaparece, que es mejor cierre de portada que un aviso de error por un adorno. */
  protected readonly paises = resource({
    defaultValue: [],
    loader: async () => {
      const resultado = await this.puerto.lista();
      return resultado.ok ? resultado.valor : [];
    },
  });
}
