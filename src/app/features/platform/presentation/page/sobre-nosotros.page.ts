import { Component, computed, inject } from '@angular/core';
import { ABOUT, pick } from '@shared/content/site-pages';
import { TraduccionService } from '@core/i18n/traduccion.service';
import { VistaDeDocumento } from '../component/vista-de-documento';

/**
 * «Sobre nosotros».
 *
 * <p>Todo su contenido está compilado en los ocho idiomas: no hay llamada al backend y por eso se
 * prerenderiza entera. Es de las pocas páginas que un buscador indexa palabra por palabra, así que
 * conviene que llegue ya escrita y no montada por el navegador.
 */
@Component({
  selector: 'nx-sobre-nosotros',
  imports: [VistaDeDocumento],
  template: `<nx-vista-de-documento [documento]="documento()" />`,
})
export class SobreNosotrosPage {
  private readonly traduccion = inject(TraduccionService);

  /** `computed`: al cambiar de idioma se repinta el texto sin recargar ni volver a montar la página. */
  protected readonly documento = computed(() => pick(ABOUT, this.traduccion.idioma()));
}
