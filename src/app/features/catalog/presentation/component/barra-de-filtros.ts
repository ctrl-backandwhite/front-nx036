import { Component, computed, inject, input, model, output } from '@angular/core';
import { faTruckFast, faVideo } from '@fortawesome/free-solid-svg-icons';
import { TraduccionService } from '@core/i18n/traduccion.service';
import { CampoBusqueda } from '@ds/component/campo-busqueda/campo-busqueda';
import { Categoria, Proveedor } from '../../domain/model/catalogo-auxiliar';
import {
  CriterioDeBusqueda,
  OrdenDelCatalogo,
  cuantosFiltros,
} from '../../domain/model/criterio-de-busqueda';
import { FiltroDesplegable, OpcionDeFiltro } from './filtro-desplegable';
import { FiltroInterruptor } from './filtro-interruptor';

/** Países de origen que se ofrecen. Son los almacenes desde los que sale mercancía hoy. */
const ORIGENES = ['CN', 'HK', 'US', 'ES', 'MX'];
/** Certificaciones que el catálogo sabe filtrar. */
const CERTIFICACIONES = ['CE', 'FCC', 'RoHS', 'FDA', 'EN71'];
const ORDENES: readonly OrdenDelCatalogo[] = [
  'best_match',
  'sales',
  'random',
  'newest',
  'rating',
  'inventory',
  'lists',
  'price_asc',
  'price_desc',
];

/**
 * La barra de filtros del catálogo.
 *
 * <p>Recibe el criterio y devuelve el criterio: no guarda estado propio ni sabe nada de la dirección
 * del navegador. Así la misma barra sirve para el escaparate y para el listado del panel, y las
 * pruebas del filtrado no necesitan un enrutador.
 *
 * <p>MOBILE FIRST: los controles se apilan y envuelven sin prefijo, y a partir de `sm` se alinean en
 * una fila. Cada control tiene 44 píxeles de alto en el móvil, que es el objetivo táctil mínimo.
 */
@Component({
  selector: 'nx-barra-de-filtros',
  imports: [CampoBusqueda, FiltroDesplegable, FiltroInterruptor],
  template: `
    <div class="card p-3 sm:p-4 flex flex-col gap-3">
      <div class="flex flex-wrap items-center gap-2">
        <nx-campo-busqueda
          [valor]="criterio().texto ?? ''"
          (valorChange)="cambia({ texto: $event || undefined })"
          [marcador]="t('catalog.search_placeholder')"
          clase="w-full sm:min-w-[240px]"
        />

        @if (categorias().length > 0) {
          <nx-filtro-desplegable
            [etiqueta]="t('filters.category')"
            [marcador]="t('filters.all')"
            [opciones]="opcionesDeCategoria()"
            [valor]="criterio().categoria ?? null"
            (valorChange)="cambia({ categoria: $event ?? undefined })"
          />
        }
        @if (proveedores().length > 0) {
          <nx-filtro-desplegable
            [etiqueta]="t('filters.supplier')"
            [marcador]="t('filters.all')"
            [opciones]="opcionesDeProveedor()"
            [valor]="criterio().proveedor ?? null"
            (valorChange)="cambia({ proveedor: $event ?? undefined })"
          />
        }
        <nx-filtro-desplegable
          [etiqueta]="t('catalog.filters.ship_from')"
          [marcador]="t('filters.all')"
          [opciones]="opcionesDeOrigen"
          [valor]="criterio().enviaDesde ?? null"
          (valorChange)="cambia({ enviaDesde: $event ?? undefined })"
        />
        <nx-filtro-desplegable
          [etiqueta]="t('catalog.filters.certification')"
          [marcador]="t('filters.all')"
          [opciones]="opcionesDeCertificacion"
          [valor]="criterio().certificacion ?? null"
          (valorChange)="cambia({ certificacion: $event ?? undefined })"
        />
        <!-- El filtro de revisión manual es SOLO del administrador: el backend lo ignora para el
             resto, así que ofrecerlo a todo el mundo sería un control que no hace nada. -->
        @if (esAdministrador()) {
          <nx-filtro-desplegable
            [etiqueta]="t('admin.catalog.col.verified')"
            [marcador]="t('filters.all')"
            [opciones]="opcionesDeVerificado()"
            [valor]="criterio().verificado || null"
            (valorChange)="cambia({ verificado: $event ?? '' })"
          />
        }
        <nx-filtro-desplegable
          [etiqueta]="t('catalog.filters.min_rating')"
          [marcador]="t('filters.all')"
          [opciones]="opcionesDeValoracion"
          [valor]="criterio().valoracionMinima ?? null"
          (valorChange)="cambia({ valoracionMinima: $event ?? undefined })"
        />

        <nx-filtro-interruptor
          [etiqueta]="t('catalog.filters.free_shipping')"
          [icono]="iconos.camion"
          [activo]="criterio().envioGratis"
          (activoChange)="cambia({ envioGratis: $event })"
        />
        <nx-filtro-interruptor
          [etiqueta]="t('catalog.filters.has_video')"
          [icono]="iconos.video"
          [activo]="criterio().conVideo"
          (activoChange)="cambia({ conVideo: $event })"
        />

        <div class="flex items-center gap-1.5">
          <label class="sr-only" for="filtro-precio-min">{{ t('catalog.price_min') }}</label>
          <input
            id="filtro-precio-min"
            type="number"
            inputmode="decimal"
            class="input input-bordered input-sm w-24 min-h-11 sm:min-h-8 text-[12px]"
            [placeholder]="t('catalog.price_min')"
            [value]="criterio().precioMinimo ?? ''"
            (change)="cambia({ precioMinimo: valorDe($event) })"
          />
          <span aria-hidden="true" class="text-ink-400">–</span>
          <label class="sr-only" for="filtro-precio-max">{{ t('catalog.price_max') }}</label>
          <input
            id="filtro-precio-max"
            type="number"
            inputmode="decimal"
            class="input input-bordered input-sm w-24 min-h-11 sm:min-h-8 text-[12px]"
            [placeholder]="t('catalog.price_max')"
            [value]="criterio().precioMaximo ?? ''"
            (change)="cambia({ precioMaximo: valorDe($event) })"
          />
        </div>

        <nx-filtro-desplegable
          [etiqueta]="t('catalog.sort')"
          [opciones]="opcionesDeOrden()"
          [valor]="criterio().orden"
          (valorChange)="cambiaOrden($event)"
        />

        <span class="text-[11px] text-ink-400 sm:ml-auto">
          {{ t('pagination.showing') }} <strong>{{ mostrados() }}</strong> / {{ total() }}
        </span>

        @if (cuantos() > 0) {
          <button type="button" (click)="limpia.emit()" class="btn btn-ghost btn-sm text-[12px]">
            {{ t('catalog.clear_all') }} ({{ cuantos() }})
          </button>
        }
      </div>
    </div>
  `,
})
export class BarraDeFiltros {
  readonly criterio = model.required<CriterioDeBusqueda>();
  readonly categorias = input.required<readonly Categoria[]>();
  readonly proveedores = input.required<readonly Proveedor[]>();
  readonly esAdministrador = input(false);
  readonly mostrados = input(0);
  readonly total = input(0);
  readonly limpia = output<void>();

  protected readonly t = inject(TraduccionService).t;
  protected readonly iconos = { camion: faTruckFast, video: faVideo };

  protected readonly opcionesDeOrigen: readonly OpcionDeFiltro[] = ORIGENES.map((c) => ({
    valor: c,
    etiqueta: c,
  }));
  protected readonly opcionesDeCertificacion: readonly OpcionDeFiltro[] = CERTIFICACIONES.map((c) => ({
    valor: c,
    etiqueta: c,
  }));
  protected readonly opcionesDeValoracion: readonly OpcionDeFiltro[] = [
    { valor: '4', etiqueta: '4★+' },
    { valor: '3', etiqueta: '3★+' },
  ];

  protected readonly cuantos = computed(() => cuantosFiltros(this.criterio()));

  protected readonly opcionesDeCategoria = computed<readonly OpcionDeFiltro[]>(() =>
    this.categorias().map((c) => ({ valor: c.id, etiqueta: c.nombre })),
  );
  protected readonly opcionesDeProveedor = computed<readonly OpcionDeFiltro[]>(() =>
    this.proveedores().map((p) => ({ valor: p.id, etiqueta: p.nombre })),
  );
  protected readonly opcionesDeVerificado = computed<readonly OpcionDeFiltro[]>(() => [
    { valor: 'true', etiqueta: this.t('admin.catalog.verified.yes') },
    { valor: 'false', etiqueta: this.t('admin.catalog.verified.no') },
  ]);
  protected readonly opcionesDeOrden = computed<readonly OpcionDeFiltro[]>(() =>
    ORDENES.map((orden) => ({ valor: orden, etiqueta: this.t(`catalog.sort.${orden}`) })),
  );

  protected valorDe(evento: Event): string | undefined {
    return (evento.target as HTMLInputElement).value || undefined;
  }

  protected cambia(parcial: Partial<CriterioDeBusqueda>): void {
    this.criterio.set({ ...this.criterio(), ...parcial });
  }

  protected cambiaOrden(valor: string | null): void {
    this.cambia({ orden: (valor as OrdenDelCatalogo | null) ?? 'random' });
  }
}
