import { Component, computed, inject, output, resource, signal } from '@angular/core';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faDownload, faSpinner } from '@fortawesome/free-solid-svg-icons';
import { TraduccionService } from '@core/i18n/traduccion.service';
import { AvisosStore } from '@ds/component/avisos/avisos.store';
import {
  CuentaExportables,
  ExportaCatalogoCompleto,
  ExportaSegmento,
} from '../../../application/catalogo/use-case/exporta-productos.use-case';
import {
  FiltroDeExportacion,
  SegmentoDeExportacion,
  segmentos,
  tamanoDelSegmento,
} from '../../../domain/catalogo/model/exportacion';
import { mensajeDeError } from '../etiquetas';
import { VentanaModal } from './ventana-modal';

/** Cuántos productos trae cada fichero por omisión. */
const TAMANO_DE_SEGMENTO = 1000;

/**
 * La exportación de productos.
 *
 * <p>Sale en el MISMO formato que acepta la importación, así que lo exportado se vuelve a importar tal
 * cual: es la vía por la que el catálogo cruza de un entorno a otro y no se puede romper.
 *
 * <p>Va por TRAMOS porque un catálogo entero en un fichero no se descarga —cada ficha pesa unos 33 kB—,
 * y para el volcado completo hay una descarga por flujo en NDJSON que escribe a disco a medida que
 * llega.
 */
@Component({
  selector: 'nx-dialogo-exportacion',
  imports: [FaIconComponent, VentanaModal],
  template: `
    <nx-ventana-modal [titulo]="t('admin.export.title')" ancho="sm:max-w-lg" (cierra)="cierra.emit()">
      <p class="text-[12px] text-ink-500">{{ t('admin.export.help') }}</p>

      <div class="flex flex-col sm:flex-row sm:items-end gap-3 mt-3">
        <div>
          <label for="export-tamano" class="text-[12px] font-medium text-ink-600 mb-1 block">
            {{ t('admin.export.segment_size') }}
          </label>
          <input
            id="export-tamano"
            type="number"
            min="1"
            class="input input-bordered input-sm w-32"
            [value]="tamano()"
            (input)="tamano.set(+$any($event.target).value)"
          />
        </div>
        <div class="text-[12px] text-ink-500 pb-1.5">
          {{ total.isLoading() ? '…' : tCon('admin.export.total', { n: cuantos() }) }}
        </div>
      </div>

      <div class="flex flex-col sm:flex-row sm:items-end gap-3 flex-wrap mt-3">
        <div>
          <label for="export-desde" class="text-[12px] font-medium text-ink-600 mb-1 block">
            {{ t('admin.export.date_from') }}
          </label>
          <input
            id="export-desde"
            type="date"
            class="input input-bordered input-sm"
            [value]="desde()"
            [max]="hasta() || null"
            (input)="desde.set($any($event.target).value)"
          />
        </div>
        <div>
          <label for="export-hasta" class="text-[12px] font-medium text-ink-600 mb-1 block">
            {{ t('admin.export.date_to') }}
          </label>
          <input
            id="export-hasta"
            type="date"
            class="input input-bordered input-sm"
            [value]="hasta()"
            [min]="desde() || null"
            (input)="hasta.set($any($event.target).value)"
          />
        </div>
        <!--
          La certificación va en la MISMA fila que las fechas porque se combinan entre sí, no se
          excluyen. Reutiliza las etiquetas del filtro de la lista para que quien las conoce allí las
          reconozca aquí.
        -->
        <div>
          <label for="export-verificado" class="text-[12px] font-medium text-ink-600 mb-1 block">
            {{ t('admin.catalog.col.verified') }}
          </label>
          <select
            id="export-verificado"
            class="select select-bordered select-sm"
            [value]="verificado()"
            (change)="verificado.set($any($event.target).value)"
          >
            <option value="">{{ t('admin.export.verified_all') }}</option>
            <option value="true">{{ t('admin.catalog.verified.yes') }}</option>
            <option value="false">{{ t('admin.catalog.verified.no') }}</option>
          </select>
        </div>
        @if (hayFiltro()) {
          <button type="button" class="btn btn-ghost btn-xs self-end pb-1.5" (click)="limpia()">
            {{ t('admin.export.date_clear') }}
          </button>
        }
      </div>
      <p class="text-[11px] text-ink-400 mt-1">{{ t('admin.export.date_hint') }}</p>

      @if (cuantos() > 0) {
        <button
          type="button"
          class="btn btn-primary btn-sm w-full gap-2 mt-3"
          [disabled]="ocupado() !== null"
          (click)="descargaTodo()"
        >
          <fa-icon
            [icon]="ocupado() === 'todo' ? iconos.girando : iconos.descargar"
            [class.fa-spin]="ocupado() === 'todo'"
          />
          {{
            ocupado() === 'todo'
              ? t('admin.export.exporting')
              : tCon('admin.export.download_all_stream', { n: cuantos() })
          }}
        </button>
        <div class="text-[11px] text-ink-400 mt-1">{{ t('admin.export.segments_hint') }}</div>
      } @else if (!total.isLoading()) {
        <div class="text-[12px] text-ink-400 text-center py-4">{{ t('admin.export.empty') }}</div>
      }

      @if (tramos().length > 0) {
        <div class="space-y-1 max-h-[45vh] overflow-y-auto mt-3">
          @for (tramo of tramos(); track tramo.desde) {
            <button
              type="button"
              class="w-full flex items-center justify-between px-3 py-2 rounded-md border border-ink-100 text-[13px] hover:bg-ink-50"
              [class.border-primary]="ocupado() === clave(tramo)"
              [disabled]="ocupado() !== null"
              (click)="descarga(tramo)"
            >
              <span class="font-mono">{{ tramo.desde }} – {{ tramo.hasta }}</span>
              <span class="flex items-center gap-2 text-ink-500">
                {{
                  ocupado() === clave(tramo)
                    ? t('admin.export.exporting')
                    : tCon('admin.export.products', { n: cuantosEn(tramo) })
                }}
                <fa-icon
                  [icon]="ocupado() === clave(tramo) ? iconos.girando : iconos.descargar"
                  [class.fa-spin]="ocupado() === clave(tramo)"
                />
              </span>
            </button>
          }
        </div>
      }

      <ng-container pie>
        <button type="button" class="btn btn-ghost btn-sm" (click)="cierra.emit()">
          {{ t('common.cancel') }}
        </button>
      </ng-container>
    </nx-ventana-modal>
  `,
})
export class DialogoExportacion {
  readonly cierra = output<void>();

  protected readonly t = inject(TraduccionService).t;
  protected readonly tCon = inject(TraduccionService).tCon;
  private readonly avisos = inject(AvisosStore);
  private readonly cuenta = inject(CuentaExportables);
  private readonly exportaSegmento = inject(ExportaSegmento);
  private readonly exportaTodo = inject(ExportaCatalogoCompleto);

  protected readonly iconos = { descargar: faDownload, girando: faSpinner };

  protected readonly tamano = signal(TAMANO_DE_SEGMENTO);
  protected readonly desde = signal('');
  protected readonly hasta = signal('');
  protected readonly verificado = signal('');
  /** Qué se está descargando: `'todo'`, la clave de un tramo, o nada. */
  protected readonly ocupado = signal<string | null>(null);

  protected readonly filtro = computed<FiltroDeExportacion>(() => ({
    creadoDesde: this.desde() || undefined,
    creadoHasta: this.hasta() || undefined,
    verificado: this.verificado() === '' ? undefined : this.verificado() === 'true',
  }));

  protected readonly hayFiltro = computed(
    () => !!this.desde() || !!this.hasta() || !!this.verificado(),
  );

  /**
   * El recuento se pide con el FILTRO puesto: los tramos que se ofrecen salen de este total, y contar
   * sin filtrar ofrecía tramos que después venían vacíos.
   */
  protected readonly total = resource({
    params: () => this.filtro(),
    loader: async ({ params }) => {
      const resultado = await this.cuenta.ejecuta(params);
      return resultado.ok ? resultado.valor : 0;
    },
    defaultValue: 0,
  });

  protected readonly cuantos = computed(() => this.total.value());
  protected readonly tramos = computed(() => segmentos(this.cuantos(), this.tamano()));

  protected clave(tramo: SegmentoDeExportacion): string {
    return `${tramo.desde}-${tramo.hasta}`;
  }

  protected cuantosEn(tramo: SegmentoDeExportacion): number {
    return tamanoDelSegmento(tramo);
  }

  protected limpia(): void {
    this.desde.set('');
    this.hasta.set('');
    this.verificado.set('');
  }

  protected async descarga(tramo: SegmentoDeExportacion): Promise<void> {
    this.ocupado.set(this.clave(tramo));
    try {
      const resultado = await this.exportaSegmento.ejecuta(tramo, this.filtro());
      if (!resultado.ok) {
        this.avisos.error(mensajeDeError(this.t, resultado.error));
      }
    } finally {
      this.ocupado.set(null);
    }
  }

  protected async descargaTodo(): Promise<void> {
    this.ocupado.set('todo');
    try {
      const resultado = await this.exportaTodo.ejecuta(this.filtro());
      if (!resultado.ok) {
        this.avisos.error(mensajeDeError(this.t, resultado.error));
      }
    } finally {
      this.ocupado.set(null);
    }
  }
}
