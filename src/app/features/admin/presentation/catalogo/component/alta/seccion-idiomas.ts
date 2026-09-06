import { Component, inject, input, output, signal } from '@angular/core';
import { TraduccionService } from '@core/i18n/traduccion.service';
import { ContenidoDeIdioma } from '../../../../domain/catalogo/model/alta-de-producto';
import { IdiomaDeTienda } from '../../../../domain/catalogo/port/catalogo-comun.port';

/** Qué idioma se ha tocado y con qué contenido queda. */
export interface CambioDeContenido {
  readonly idioma: string;
  readonly contenido: ContenidoDeIdioma;
}

/**
 * El título y la descripción, idioma a idioma.
 *
 * <p>Los idiomas son ILIMITADOS y salen del registro que se administra en el panel: no se pueden
 * escribir aquí. Las pestañas llevan un punto verde cuando ese idioma ya tiene título, que es la única
 * forma de ver de un vistazo cuántos quedan sin rellenar.
 */
@Component({
  selector: 'nx-seccion-idiomas',
  template: `
    <div class="flex flex-wrap gap-1 border-b border-ink-100 mb-1">
      @for (idioma of idiomas(); track idioma.codigo) {
        <button
          type="button"
          [class]="
            'px-3 py-1.5 text-[12px] -mb-px border-b-2 transition-colors ' +
            (activo() === idioma.codigo
              ? 'border-brand-600 text-brand-700 font-medium'
              : 'border-transparent text-ink-500')
          "
          (click)="activo.set(idioma.codigo)"
        >
          {{ idioma.etiqueta }}
          @if (relleno(idioma.codigo)) {
            <span class="text-emerald-500" aria-hidden="true"> •</span>
          }
        </button>
      }
    </div>

    <label class="block">
      <span class="text-[12px] font-medium text-ink-600 mb-1 block">
        {{ t('admin.create_product.title_field') }} ({{ etiquetaActiva() }})
      </span>
      <input
        class="input input-bordered input-sm w-full"
        [value]="deIdioma(activo()).titulo"
        (input)="escribe('titulo', $event)"
      />
    </label>
    <label class="block">
      <span class="text-[12px] font-medium text-ink-600 mb-1 block">
        {{ t('admin.create_product.desc') }} ({{ etiquetaActiva() }})
      </span>
      <textarea
        class="textarea textarea-bordered textarea-sm w-full h-20"
        [value]="deIdioma(activo()).descripcion"
        (input)="escribe('descripcion', $event)"
      ></textarea>
    </label>
    <p class="text-[11px] text-ink-400">{{ t('admin.create_product.multilang_hint') }}</p>
  `,
})
export class SeccionIdiomas {
  readonly idiomas = input.required<readonly IdiomaDeTienda[]>();
  readonly contenido = input.required<Readonly<Record<string, ContenidoDeIdioma>>>();
  readonly cambia = output<CambioDeContenido>();

  protected readonly t = inject(TraduccionService).t;
  protected readonly activo = signal('es');

  protected etiquetaActiva(): string {
    return this.idiomas().find((i) => i.codigo === this.activo())?.etiqueta ?? this.activo();
  }

  protected deIdioma(codigo: string): ContenidoDeIdioma {
    return this.contenido()[codigo] ?? { titulo: '', descripcion: '' };
  }

  protected relleno(codigo: string): boolean {
    return this.deIdioma(codigo).titulo.trim() !== '';
  }

  protected escribe(campo: 'titulo' | 'descripcion', evento: Event): void {
    const valor = (evento.target as HTMLInputElement).value;
    this.cambia.emit({
      idioma: this.activo(),
      contenido: { ...this.deIdioma(this.activo()), [campo]: valor },
    });
  }
}
