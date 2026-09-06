import { Component, inject, input, linkedSignal, output } from '@angular/core';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faSpinner } from '@fortawesome/free-solid-svg-icons';
import { TraduccionService } from '@core/i18n/traduccion.service';
import { FichaDeProducto, normalizaSlug } from '../../../../domain/catalogo/model/ficha-de-producto';
import { FilaDeDato } from './fila-de-dato';

/** Cuánto admite cada campo. Son los topes del backend, y pasarse hace que rechace el guardado entero. */
const TOPE_DE_TITULO = 200;
const TOPE_DE_DESCRIPCION = 400;

/**
 * El SEO del producto, por idioma.
 *
 * <p>Los metadatos son POR IDIOMA: se revisan uno a uno con el selector de la ficha, sin cambiar el
 * idioma de toda la aplicación. Por eso el borrador se reinicia cuando cambia la ficha —al cambiar de
 * idioma llega otra— y no arrastra lo tecleado en el anterior.
 */
@Component({
  selector: 'nx-seo-de-ficha',
  imports: [FaIconComponent, FilaDeDato],
  template: `
    <div class="card p-5 space-y-3 text-sm">
      <nx-fila-de-dato
        [etiqueta]="t('admin.catalog.detail.seo.slug')"
        [valor]="slug()"
        [monoespaciado]="true"
      />
      <div>
        <label for="seo-titulo" class="text-[12px] font-medium text-ink-600 mb-1 block">
          {{ t('admin.catalog.detail.seo.meta_title') }} ({{ idioma().toUpperCase() }})
        </label>
        <input
          id="seo-titulo"
          class="input input-bordered input-sm w-full"
          [attr.maxlength]="topeDeTitulo"
          [placeholder]="ficha().titulo"
          [value]="titulo()"
          (input)="titulo.set($any($event.target).value)"
        />
      </div>
      <div>
        <label for="seo-descripcion" class="text-[12px] font-medium text-ink-600 mb-1 block">
          {{ t('admin.catalog.detail.seo.meta_description') }} ({{ idioma().toUpperCase() }})
        </label>
        <textarea
          id="seo-descripcion"
          class="textarea textarea-bordered textarea-sm w-full h-20"
          [attr.maxlength]="topeDeDescripcion"
          [value]="descripcion()"
          (input)="descripcion.set($any($event.target).value)"
        ></textarea>
        <div class="text-[11px] text-ink-400 mt-0.5">
          {{ descripcion().length }}/{{ topeDeDescripcion }}
        </div>
      </div>
      <div class="flex justify-end">
        <button
          type="button"
          class="btn btn-primary btn-sm"
          [disabled]="guardando()"
          (click)="guarda.emit({ metaTitulo: titulo(), metaDescripcion: descripcion() })"
        >
          @if (guardando()) {
            <fa-icon [icon]="iconoGirando" class="fa-spin" />
          }
          {{ t('actions.save') }}
        </button>
      </div>
      <p class="text-ink-500 text-[12px]">{{ t('admin.catalog.detail.seo.hint') }}</p>
    </div>
  `,
})
export class SeoDeFicha {
  readonly ficha = input.required<FichaDeProducto>();
  readonly idioma = input.required<string>();
  readonly guardando = input(false);
  readonly guarda = output<{ metaTitulo: string; metaDescripcion: string }>();

  protected readonly t = inject(TraduccionService).t;
  protected readonly iconoGirando = faSpinner;
  protected readonly topeDeTitulo = TOPE_DE_TITULO;
  protected readonly topeDeDescripcion = TOPE_DE_DESCRIPCION;

  protected readonly titulo = linkedSignal<FichaDeProducto, string>({
    source: () => this.ficha(),
    computation: (ficha) => ficha.metaTitulo ?? '',
  });

  protected readonly descripcion = linkedSignal<FichaDeProducto, string>({
    source: () => this.ficha(),
    computation: (ficha) => ficha.metaDescripcion ?? '',
  });

  protected slug(): string {
    return normalizaSlug(this.ficha().slug);
  }
}
