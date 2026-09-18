import { Component, computed, inject, output, resource, signal } from '@angular/core';
import { FormField, form, min, required, validate } from '@angular/forms/signals';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faDownload, faSpinner } from '@fortawesome/free-solid-svg-icons';
import { TraduccionService } from '@core/i18n/traduccion.service';
import { AvisosStore } from '@ds/component/avisos/avisos.store';
import {
  CuentaExportables,
  ExportaCatalogoCompleto,
  ExportaSegmento,
} from '../../../application/catalogo/use-case/exporta-productos.use-case';
import { CatalogoAdminStore } from '../../../application/catalogo/state/catalogo-admin.store';
import {
  FiltroDeExportacion,
  SegmentoDeExportacion,
  filtroDesdeLaLista,
  segmentos,
  tamanoDelSegmento,
} from '../../../domain/catalogo/model/exportacion';
import { EstadoDeCampo, falloDelCampo, mensajeDeError } from '../etiquetas';
import { VentanaModal } from './ventana-modal';

/** Cuántos productos trae cada fichero por omisión. */
const TAMANO_DE_SEGMENTO = 1000;

/**
 * Lo que se rellena AQUÍ: el tamaño del tramo y el rango por fecha de carga.
 *
 * <p>El resto del filtro —estado, categoría, texto, certificación, coste, ventas y tendencia— NO se
 * repite: se hereda de la lista. Duplicarlo obligaba a acertar dos veces y, mientras no se acertaba,
 * lo que se descargaba no era lo que se estaba mirando.
 */
interface FormularioDeExportacion {
  tamano: number | null;
  desde: string;
  hasta: string;
}

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
  imports: [FaIconComponent, FormField, VentanaModal],
  template: `
    <nx-ventana-modal [titulo]="t('admin.export.title')" ancho="sm:max-w-lg" (cierra)="cierra.emit()">
      <p class="text-[12px] text-ink-500">{{ t('admin.export.help') }}</p>

      <!--
        Qué se va a llevar. Se dice ARRIBA y con el recuento delante porque es la decisión que se toma
        aquí: la diferencia entre bajarse las treinta fichas que se estaban mirando y las nueve mil del
        catálogo no se puede deducir de una lista de botones con tramos.
      -->
      <div
        class="mt-3 rounded-md border border-ink-100 bg-ink-50/60 px-3 py-2 text-[12px] text-ink-600"
      >
        <span class="font-medium">
          {{ total.isLoading() ? '…' : tCon('admin.export.total', { n: cuantos() }) }}
        </span>
        <span class="text-ink-500">
          · {{ heredaFiltros() ? t('admin.export.scope_filtered') : t('admin.export.scope_all') }}
        </span>
      </div>

      <!--
        Una rejilla, no una fila: a la anchura del diálogo los tres campos y el botón no caben seguidos,
        y ajustando por filas el último caía suelto contra el borde. En el móvil es una columna.
      -->
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-x-3 gap-y-2 mt-3">
        <div>
          <label for="export-tamano" class="text-[12px] font-medium text-ink-600 mb-1 block">
            {{ t('admin.export.segment_size') }}
          </label>
          <input
            id="export-tamano"
            type="number"
            class="input input-bordered input-sm w-full"
            [formField]="formulario.tamano"
          />
          @if (fallo(formulario.tamano()); as texto) {
            <div class="text-[11px] text-error mt-0.5">{{ texto }}</div>
          }
        </div>
        <div>
          <label for="export-desde" class="text-[12px] font-medium text-ink-600 mb-1 block">
            {{ t('admin.export.date_from') }}
          </label>
          <input
            id="export-desde"
            type="date"
            class="input input-bordered input-sm w-full"
            [max]="modelo().hasta || null"
            [formField]="formulario.desde"
          />
        </div>
        <div>
          <label for="export-hasta" class="text-[12px] font-medium text-ink-600 mb-1 block">
            {{ t('admin.export.date_to') }}
          </label>
          <input
            id="export-hasta"
            type="date"
            class="input input-bordered input-sm w-full"
            [min]="modelo().desde || null"
            [formField]="formulario.hasta"
          />
          @if (fallo(formulario.hasta()); as texto) {
            <div class="text-[11px] text-error mt-0.5">{{ texto }}</div>
          }
        </div>
      </div>

      <div class="flex items-center justify-between gap-2 mt-1">
        <p class="text-[11px] text-ink-400">{{ t('admin.export.date_hint') }}</p>
        @if (hayFechas()) {
          <button type="button" class="btn btn-ghost btn-xs shrink-0" (click)="limpia()">
            {{ t('admin.export.date_clear') }}
          </button>
        }
      </div>

      @if (cuantos() > 0) {
        <button
          type="button"
          class="btn btn-primary btn-sm w-full gap-2 mt-3"
          [disabled]="ocupado() !== null || formulario().invalid()"
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
              [disabled]="ocupado() !== null || formulario().invalid()"
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
  private readonly almacen = inject(CatalogoAdminStore);
  private readonly cuenta = inject(CuentaExportables);
  private readonly exportaSegmento = inject(ExportaSegmento);
  private readonly exportaTodo = inject(ExportaCatalogoCompleto);

  protected readonly iconos = { descargar: faDownload, girando: faSpinner };

  protected readonly modelo = signal<FormularioDeExportacion>({
    tamano: TAMANO_DE_SEGMENTO,
    desde: '',
    hasta: '',
  });

  /**
   * Las reglas de la exportación.
   *
   * <p>El tamaño del tramo era un `min="1"` del marcado: dejarlo vacío calculaba tramos de uno en uno y
   * ofrecía dos mil quinientos botones. Y el rango de fechas no puede ir del revés —el `min`/`max` de
   * los selectores lo impide con el ratón, pero no al teclear—: es una regla que mira DOS campos, así
   * que se declara sobre el segundo leyendo el primero.
   */
  protected readonly formulario = form(this.modelo, (ruta) => {
    required(ruta.tamano);
    min(ruta.tamano, 1);
    validate(ruta.hasta, ({ value, valueOf }) => {
      const desde = valueOf(ruta.desde);
      return value() && desde && value() < desde
        ? { kind: 'min', message: 'admin.export.date_hint' }
        : undefined;
    });
  });

  /** Qué se está descargando: `'todo'`, la clave de un tramo, o nada. */
  protected readonly ocupado = signal<string | null>(null);

  /**
   * Lo que se va a exportar: EXACTAMENTE lo que la lista está enseñando, más el rango de fechas.
   *
   * <p>Es el arreglo del defecto: antes este diálogo solo conocía fecha y certificación, así que con la
   * lista filtrada a treinta productos ofrecía los nueve mil del catálogo. Y no avisaba de nada —los
   * tramos salían del total sin filtrar—, así que quien descargaba creía llevarse su selección.
   */
  protected readonly filtro = computed<FiltroDeExportacion>(() =>
    filtroDesdeLaLista(this.almacen.criterio(), {
      creadoDesde: this.modelo().desde || undefined,
      creadoHasta: this.modelo().hasta || undefined,
    }),
  );

  protected readonly hayFechas = computed(() => !!this.modelo().desde || !!this.modelo().hasta);

  /** Si la lista está filtrada, se dice: la diferencia entre exportar 30 fichas y exportar 9.000. */
  protected readonly heredaFiltros = computed(() => this.almacen.hayFiltros());

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
  protected readonly tramos = computed(() =>
    segmentos(this.cuantos(), this.modelo().tamano ?? 0),
  );

  protected clave(tramo: SegmentoDeExportacion): string {
    return `${tramo.desde}-${tramo.hasta}`;
  }

  protected cuantosEn(tramo: SegmentoDeExportacion): number {
    return tamanoDelSegmento(tramo);
  }

  protected fallo(estado: EstadoDeCampo): string {
    return falloDelCampo(this.t, estado);
  }

  protected limpia(): void {
    this.modelo.update((actual) => ({ ...actual, desde: '', hasta: '' }));
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
