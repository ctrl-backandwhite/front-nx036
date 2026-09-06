import { Component, inject, input, model, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import {
  faArrowLeft,
  faBoxArchive,
  faCode,
  faCopy,
  faPause,
  faPen,
  faPlay,
  faTrash,
} from '@fortawesome/free-solid-svg-icons';
import { TraduccionService } from '@core/i18n/traduccion.service';
import {
  FichaDeProducto,
  PESTANAS_DE_FICHA,
  PestanaDeFicha,
  tituloEnIdioma,
} from '../../../../domain/catalogo/model/ficha-de-producto';
import { IdiomaDeTienda } from '../../../../domain/catalogo/port/catalogo-comun.port';

/** Lo que se pide desde la cabecera. La decisión y el aviso son de la página. */
export type AccionDeFicha = 'publicar' | 'pausar' | 'archivar' | 'duplicar' | 'eliminar' | 'json' | 'editar';

/**
 * La cabecera de la ficha: volver, las acciones, el título y las pestañas.
 *
 * <p>El selector de IDIOMA previsualiza y edita el contenido —título, descripción y SEO— en cada idioma
 * sin cambiar el idioma de toda la aplicación: revisar las ocho traducciones de una ficha cambiando la
 * interfaz ocho veces era inviable.
 *
 * <p>MOBILE FIRST: las acciones se reparten en varias filas y las pestañas se desplazan en horizontal;
 * en el escritorio caben todas a la vista.
 */
@Component({
  selector: 'nx-cabecera-de-ficha',
  imports: [RouterLink, FaIconComponent],
  template: `
    <div class="flex items-center justify-between gap-2 flex-wrap">
      <a routerLink="/admin/catalog" class="text-brand-700 text-[12px]">
        <fa-icon [icon]="iconos.atras" /> {{ t('admin.catalog.title') }}
      </a>
      <div class="flex gap-1 flex-wrap">
        @if (ficha().estado === 'ACTIVE') {
          <button type="button" class="btn btn-outline text-[12px]" (click)="acciona.emit('pausar')">
            <fa-icon [icon]="iconos.pausar" /> {{ t('admin.catalog.actions.pause') }}
          </button>
        } @else {
          <button type="button" class="btn btn-outline text-[12px]" (click)="acciona.emit('publicar')">
            <fa-icon [icon]="iconos.publicar" /> {{ t('admin.catalog.actions.publish') }}
          </button>
        }
        <button
          type="button"
          class="btn btn-outline text-[12px]"
          [disabled]="ocupado()"
          (click)="acciona.emit('duplicar')"
        >
          <fa-icon [icon]="iconos.duplicar" /> {{ t('admin.catalog.actions.duplicate') }}
        </button>
        <button type="button" class="btn btn-outline text-[12px]" (click)="acciona.emit('archivar')">
          <fa-icon [icon]="iconos.archivar" /> {{ t('admin.catalog.actions.archive') }}
        </button>
        <button
          type="button"
          class="btn btn-outline text-[12px] text-red-600 border-red-300 hover:bg-red-50"
          [disabled]="ocupado()"
          (click)="acciona.emit('eliminar')"
        >
          <fa-icon [icon]="iconos.borrar" /> {{ t('admin.catalog.actions.delete') }}
        </button>
        <button type="button" class="btn btn-outline text-[12px]" (click)="acciona.emit('json')">
          <fa-icon [icon]="iconos.codigo" /> {{ t('admin.json.btn') }}
        </button>
        <button type="button" class="btn btn-primary text-[12px]" (click)="acciona.emit('editar')">
          <fa-icon [icon]="iconos.editar" /> {{ t('admin.catalog.actions.edit') }}
        </button>
      </div>
    </div>

    <header>
      <h1>{{ titulo() }}</h1>
      @if (idioma() === 'zh' && ficha().tituloZh) {
        <p class="text-ink-500 text-sm">{{ ficha().tituloZh }}</p>
      }
      <div class="text-[12px] text-ink-500 mt-1">
        {{ ficha().origen }} · {{ ficha().idExterno }} · MOQ {{ ficha().moq }}
      </div>
    </header>

    <nav class="flex gap-1 border-b border-ink-100 items-center overflow-x-auto">
      @for (pestana of pestanas; track pestana) {
        <button
          type="button"
          [class]="
            'px-3 py-2 text-[12px] -mb-px border-b-2 whitespace-nowrap ' +
            (activa() === pestana
              ? 'border-brand-600 text-brand-700 font-medium'
              : 'border-transparent text-ink-500 hover:text-ink-700')
          "
          (click)="activa.set(pestana)"
        >
          {{ t('admin.catalog.detail.tab.' + pestana) }}
        </button>
      }
      <div class="ml-auto flex items-center gap-1 pb-1 shrink-0">
        <label for="ficha-idioma" class="text-[11px] text-ink-400">{{ t('picker.language') }}:</label>
        <select
          id="ficha-idioma"
          class="select select-bordered select-xs"
          [value]="idioma()"
          (change)="idioma.set($any($event.target).value)"
        >
          @for (opcion of idiomas(); track opcion.codigo) {
            <option [value]="opcion.codigo">
              {{ opcion.etiqueta }} ({{ opcion.codigo.toUpperCase() }})
            </option>
          }
        </select>
      </div>
    </nav>
  `,
})
export class CabeceraDeFicha {
  readonly ficha = input.required<FichaDeProducto>();
  readonly idiomas = input<readonly IdiomaDeTienda[]>([]);
  readonly ocupado = input(false);
  readonly activa = model.required<PestanaDeFicha>();
  readonly idioma = model.required<string>();

  readonly acciona = output<AccionDeFicha>();

  protected readonly t = inject(TraduccionService).t;
  protected readonly pestanas = PESTANAS_DE_FICHA;
  protected readonly iconos = {
    atras: faArrowLeft,
    publicar: faPlay,
    pausar: faPause,
    duplicar: faCopy,
    archivar: faBoxArchive,
    borrar: faTrash,
    codigo: faCode,
    editar: faPen,
  };

  protected titulo(): string {
    return tituloEnIdioma(this.ficha(), this.idioma());
  }
}
