import { Component, inject, input, output, signal } from '@angular/core';
import { NgOptimizedImage } from '@angular/common';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faSpinner, faTrash } from '@fortawesome/free-solid-svg-icons';
import { TraduccionService } from '@core/i18n/traduccion.service';
import {
  EjeDeVariacion,
  ValorDeVariacion,
  esEjeDeColor,
  tieneEtiquetaGuardada,
} from '../../../../domain/catalogo/model/eje-de-variacion';

/**
 * Las etiquetas visibles de los valores de variación (los colores y los estampados).
 *
 * <p>Se corrigen a mano cuando el origen trae nombres ambiguos —«Blanco 2» y «Blanco 3» que en realidad
 * son estampados distintos—. Cambia SOLO la etiqueta: el valor canónico en chino no se toca nunca,
 * porque es el que casa con el catálogo de origen.
 *
 * <p>Un valor GUARDADO se distingue de un hueco: texto firme con borde verde y un punto al lado; el
 * hueco enseña el valor de origen como marcador. Sin esa diferencia no había forma de saber cuáles
 * quedaban por revisar.
 *
 * <p>La dirección de la foto solo se ofrece en los ejes de COLOR: es donde la regla del catálogo exige
 * una imagen real, y un color sin ella no se publica.
 */
@Component({
  selector: 'nx-etiquetas-de-variacion',
  imports: [NgOptimizedImage, FaIconComponent],
  template: `
    <div class="card overflow-hidden p-4 space-y-3">
      <div class="flex items-center justify-between gap-2 flex-wrap">
        <h3 class="text-[13px] font-semibold text-ink-700">
          {{ t('admin.catalog.detail.labels.title') }}
        </h3>
        @if (marcados().size > 0) {
          <button
            type="button"
            class="btn btn-outline btn-xs border-red-300 text-red-700 hover:bg-red-50"
            [disabled]="ocupado()"
            (click)="borraMarcados()"
          >
            <fa-icon [icon]="ocupado() ? iconos.girando : iconos.borrar" [class.fa-spin]="ocupado()" />
            {{ t('admin.catalog.detail.labels.delete_selected') }} ({{ marcados().size }})
          </button>
        }
      </div>
      <p class="text-[11px] text-ink-400">{{ t('admin.catalog.detail.labels.hint') }}</p>

      @for (eje of ejes(); track eje.id) {
        <div class="space-y-1.5">
          <div class="text-[12px] font-medium text-ink-500">{{ eje.nombre || eje.nombreZh }}</div>
          <div class="grid gap-2">
            @for (valor of eje.valores; track valor.id) {
              <div
                class="flex flex-wrap sm:flex-nowrap items-center gap-2 px-2 py-1 rounded"
                [class.bg-red-50]="marcados().has(valor.id)"
              >
                <input
                  type="checkbox"
                  class="checkbox checkbox-xs shrink-0"
                  [checked]="marcados().has(valor.id)"
                  (change)="alterna(valor.id)"
                  [attr.aria-label]="t('admin.catalog.detail.labels.select')"
                />
                @if (valor.urlImagen) {
                  <img
                    [ngSrc]="valor.urlImagen"
                    width="32"
                    height="32"
                    alt=""
                    class="w-8 h-8 rounded object-cover shrink-0"
                  />
                }
                <span class="text-[11px] text-ink-400 w-20 shrink-0 truncate" [title]="valor.valorZh">
                  {{ valor.valorZh }}
                </span>
                <div class="flex-1 min-w-32 relative">
                  <label [for]="'etiqueta-' + valor.id" class="sr-only">
                    {{ t('admin.catalog.detail.labels.title') }}
                  </label>
                  <input
                    [id]="'etiqueta-' + valor.id"
                    [class]="
                      'input input-xs w-full ' +
                      (guardado(valor) ? 'text-ink-800 font-medium border-emerald-300' : 'text-ink-500')
                    "
                    [placeholder]="valor.valorZh"
                    [value]="valor.valor ?? ''"
                    (blur)="renombra(valor, $any($event.target).value)"
                    (keydown.enter)="$any($event.target).blur()"
                  />
                  @if (guardado(valor)) {
                    <span
                      class="absolute right-1.5 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-emerald-500"
                      [title]="t('admin.catalog.detail.labels.saved')"
                    ></span>
                  }
                </div>
                @if (esColor(eje)) {
                  <label [for]="'foto-' + valor.id" class="sr-only">
                    {{ t('admin.catalog.detail.labels.image_url') }}
                  </label>
                  <input
                    [id]="'foto-' + valor.id"
                    class="input input-xs flex-1 min-w-40"
                    [placeholder]="t('admin.catalog.detail.labels.image_url')"
                    [value]="valor.urlImagen ?? ''"
                    (blur)="fijaFoto(valor, $any($event.target).value)"
                    (keydown.enter)="$any($event.target).blur()"
                  />
                }
                <button
                  type="button"
                  class="btn btn-ghost btn-xs btn-square shrink-0 hover:text-red-700"
                  [title]="t('admin.catalog.detail.labels.delete')"
                  [attr.aria-label]="t('admin.catalog.detail.labels.delete')"
                  (click)="borra.emit([valor.id])"
                >
                  <fa-icon [icon]="iconos.borrar" />
                </button>
              </div>
            }
          </div>
        </div>
      }
    </div>
  `,
})
export class EtiquetasDeVariacion {
  readonly ejes = input.required<readonly EjeDeVariacion[]>();
  readonly ocupado = input(false);

  readonly renombrado = output<{ id: string; etiqueta: string }>();
  readonly fotoFijada = output<{ id: string; url: string }>();
  readonly borra = output<readonly string[]>();

  protected readonly t = inject(TraduccionService).t;
  protected readonly iconos = { borrar: faTrash, girando: faSpinner };
  protected readonly marcados = signal<ReadonlySet<string>>(new Set());

  protected esColor(eje: EjeDeVariacion): boolean {
    return esEjeDeColor(eje);
  }

  protected guardado(valor: ValorDeVariacion): boolean {
    return tieneEtiquetaGuardada(valor);
  }

  protected alterna(id: string): void {
    this.marcados.update((actual) => {
      const copia = new Set(actual);
      if (copia.has(id)) {
        copia.delete(id);
      } else {
        copia.add(id);
      }
      return copia;
    });
  }

  protected borraMarcados(): void {
    this.borra.emit([...this.marcados()]);
    this.marcados.set(new Set());
  }

  /** Solo se manda si de verdad cambió: salir del campo sin tocarlo no puede gastar una escritura. */
  protected renombra(valor: ValorDeVariacion, etiqueta: string): void {
    const limpia = etiqueta.trim();
    if (limpia !== (valor.valor ?? '')) {
      this.renombrado.emit({ id: valor.id, etiqueta: limpia });
    }
  }

  protected fijaFoto(valor: ValorDeVariacion, url: string): void {
    const limpia = url.trim();
    if (limpia !== (valor.urlImagen ?? '')) {
      this.fotoFijada.emit({ id: valor.id, url: limpia });
    }
  }
}
