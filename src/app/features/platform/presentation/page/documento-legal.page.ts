import { Component, computed, effect, inject, input, signal } from '@angular/core';
import { COOKIE_TABLE, CookieRow } from '@shared/content/legal-pages';
import { DocContent, pick } from '@shared/content/site-pages';
import { TraduccionService } from '@core/i18n/traduccion.service';
import { TablaCookies } from '@ds/component/cookies/tabla-cookies';
import {
  TipoDeDocumentoLegal,
  esTipoDeDocumentoLegal,
  respaldoCompilado,
} from '../../domain/model/documento-legal';
import { ConsultaDocumentoLegal } from '../../application/use-case/consulta-documento-legal.use-case';
import { VistaDeDocumento } from '../component/vista-de-documento';
import { NoEncontradaPage } from './no-encontrada.page';

/**
 * Los cinco documentos legales: privacidad, condiciones, cookies, aviso legal y desistimiento.
 *
 * <p>El texto que se enseña sale del caso de uso, que decide entre lo publicado y el respaldo
 * compilado. La pantalla nunca se queda en blanco: arranca con el respaldo ya pintado y lo sustituye
 * cuando llega la respuesta. Al prerenderizar, eso es justo lo que se escribe en el HTML — un
 * documento legal completo, no un esqueleto.
 *
 * <p>La de cookies añade la tabla con cada cookie concreta, que es lo que exige la norma: describir
 * categorías en abstracto no cumple.
 */
@Component({
  selector: 'nx-documento-legal',
  imports: [VistaDeDocumento, TablaCookies, NoEncontradaPage],
  template: `
    @if (tipo(); as documento) {
      <nx-vista-de-documento [documento]="contenido()" />
      @if (documento === 'cookies') {
        <!-- La tabla va DESPUÉS de todo el texto de la política: nadie la ve sin bajar hasta el final. -->
        @defer (hydrate on viewport) {
          <nx-tabla-cookies [filas]="filasDeCookies()" />
        }
      }
    } @else {
      <!-- /legal/loquesea no es una página legal vacía: es una dirección que no existe. -->
      <nx-no-encontrada />
    }
  `,
})
export class DocumentoLegalPage {
  /** Llega de la ruta (`withComponentInputBinding`). Puede ser cualquier cosa: se valida antes de usar. */
  readonly doc = input<string>('');

  private readonly traduccion = inject(TraduccionService);
  private readonly consulta = inject(ConsultaDocumentoLegal);

  protected readonly tipo = computed<TipoDeDocumentoLegal | null>(() => {
    // Se guarda en una constante para que el guardián de tipo estreche: llamar dos veces a la señal
    // devolvería `string` la segunda vez y el compilador dejaría de saber que ya está validada.
    const pedido = this.doc();
    return esTipoDeDocumentoLegal(pedido) ? pedido : null;
  });

  /** Lo que trajo el servidor. `null` mientras no haya llegado nada. */
  private readonly publicado = signal<DocContent | null>(null);

  /**
   * Manda lo publicado en cuanto llega; hasta entonces, el respaldo compilado. No hay estado de
   * «cargando»: enseñar un texto legal íntegro y sustituirlo es mejor que enseñar un hueco.
   */
  protected readonly contenido = computed<DocContent>(() => {
    const tipo = this.tipo();
    if (!tipo) {
      return { title: '', intro: '', sections: [] };
    }
    return this.publicado() ?? respaldoCompilado(tipo, this.traduccion.idioma());
  });

  protected readonly filasDeCookies = computed<readonly CookieRow[]>(() =>
    pick(COOKIE_TABLE, this.traduccion.idioma()),
  );

  constructor() {
    // Se vuelve a pedir al cambiar de documento y al cambiar de idioma: son los dos ejes que cambian
    // el texto. `effect` y no una llamada en el constructor porque los dos vienen de signals.
    effect(() => {
      const tipo = this.tipo();
      const idioma = this.traduccion.idioma();
      if (!tipo) {
        this.publicado.set(null);
        return;
      }
      void this.carga(tipo, idioma);
    });
  }

  private async carga(tipo: TipoDeDocumentoLegal, idioma: string): Promise<void> {
    const documento = await this.consulta.ejecuta(tipo, idioma);
    // Se comprueba que la respuesta siga siendo la del documento que se está mirando: cambiar de
    // idioma dos veces seguidas deja dos peticiones en vuelo y la primera puede llegar la última.
    if (this.tipo() === tipo && this.traduccion.idioma() === idioma) {
      this.publicado.set(documento);
    }
  }
}
