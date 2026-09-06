import { Component, inject } from '@angular/core';
import { CintaDePaises } from '@ds/component/pais/cinta-de-paises';
import { ConsultaLaCobertura } from '../../application/use-case/consulta-la-cobertura.use-case';

/**
 * Los países a los que se envía, en una cinta que gira.
 *
 * <p>Se cotejan en vivo con la cobertura real del transportista, no con una lista escrita a mano: una
 * lista propia se queda desfasada y promete envíos que después no se pueden hacer. Sin datos no se pinta
 * nada, en vez de un hueco vacío.
 *
 * <p>Vive en «checkout» porque quien sabe adónde se puede enviar es el pago. Lo que ya no vive aquí es
 * el DIBUJO de la cinta: se mudó a `@ds/component/pais/cinta-de-paises` cuando la portada —que está en
 * «catalog», y tiene prohibido ver este contexto— necesitó la misma banda. Este componente se queda con
 * lo suyo: de dónde salen los países.
 */
@Component({
  selector: 'nx-banner-de-paises',
  imports: [CintaDePaises],
  template: `<nx-cinta-de-paises [paises]="paises.value()" />`,
})
export class BannerDePaises {
  protected readonly paises = inject(ConsultaLaCobertura).paises();
}
