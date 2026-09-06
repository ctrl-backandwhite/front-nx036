import { Component, computed, inject, input, linkedSignal, output } from '@angular/core';
import { FormField, form, maxLength } from '@angular/forms/signals';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faSpinner } from '@fortawesome/free-solid-svg-icons';
import { TraduccionService } from '@core/i18n/traduccion.service';
import { FichaDeProducto, normalizaSlug } from '../../../../domain/catalogo/model/ficha-de-producto';
import { EstadoDeCampo, falloDelCampo } from '../../etiquetas';
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
  imports: [FaIconComponent, FormField, FilaDeDato],
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
          [placeholder]="ficha().titulo"
          [formField]="formulario.titulo"
        />
        @if (fallo(formulario.titulo()); as texto) {
          <div class="text-[11px] text-error mt-0.5">{{ texto }}</div>
        }
      </div>
      <div>
        <label for="seo-descripcion" class="text-[12px] font-medium text-ink-600 mb-1 block">
          {{ t('admin.catalog.detail.seo.meta_description') }} ({{ idioma().toUpperCase() }})
        </label>
        <textarea
          id="seo-descripcion"
          class="textarea textarea-bordered textarea-sm w-full h-20"
          [formField]="formulario.descripcion"
        ></textarea>
        @if (fallo(formulario.descripcion()); as texto) {
          <div class="text-[11px] text-error mt-0.5">{{ texto }}</div>
        }
        <div class="text-[11px] text-ink-400 mt-0.5">
          {{ largoDeLaDescripcion() }}/{{ topeDeDescripcion }}
        </div>
      </div>
      <div class="flex justify-end">
        <button
          type="button"
          class="btn btn-primary btn-sm"
          [disabled]="guardando() || formulario().invalid()"
          (click)="guarda.emit({ metaTitulo: modelo().titulo, metaDescripcion: modelo().descripcion })"
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
  protected readonly topeDeDescripcion = TOPE_DE_DESCRIPCION;

  /** Lo tecleado. Se REINICIA con la ficha: al cambiar de idioma llega otra y no se arrastra lo anterior. */
  protected readonly modelo = linkedSignal<FichaDeProducto, { titulo: string; descripcion: string }>({
    source: () => this.ficha(),
    computation: (ficha) => ({
      titulo: ficha.metaTitulo ?? '',
      descripcion: ficha.metaDescripcion ?? '',
    }),
  });

  /**
   * Los dos topes, como regla del formulario.
   *
   * <p>Antes eran `maxlength` en el marcado, que se limita a impedir que se teclee más: un texto pegado
   * desde otro sitio pasaba entero y el backend rechazaba el guardado ENTERO sin decir por qué. Ahora se
   * ve el aviso en el campo y el botón se apaga.
   */
  protected readonly formulario = form(this.modelo, (ruta) => {
    maxLength(ruta.titulo, TOPE_DE_TITULO);
    maxLength(ruta.descripcion, TOPE_DE_DESCRIPCION);
  });

  /** El contador de caracteres: sale de lo tecleado, no se recalcula en la plantilla. */
  protected readonly largoDeLaDescripcion = computed(() => this.modelo().descripcion.length);

  protected readonly slug = computed(() => normalizaSlug(this.ficha().slug));

  protected fallo(estado: EstadoDeCampo): string {
    return falloDelCampo(this.t, estado);
  }
}
