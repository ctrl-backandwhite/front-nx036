import { Component, computed, inject, input, model, output, signal } from '@angular/core';
import {
  faChevronDown,
  faChevronUp,
  faFilter,
  faTruckFast,
  faVideo,
  faXmark,
} from '@fortawesome/free-solid-svg-icons';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { TraduccionService } from '@core/i18n/traduccion.service';
import { CampoBusqueda } from '@ds/component/campo-busqueda/campo-busqueda';
import { Categoria, Proveedor } from '../../domain/model/catalogo-auxiliar';
import {
  CriterioDeBusqueda,
  OrdenDelCatalogo,
  cuantosFiltros,
} from '../../domain/model/criterio-de-busqueda';
import { FiltroDesplegable, OpcionDeFiltro } from '@ds/component/filtros/filtro-desplegable';
import { FiltroInterruptor } from './filtro-interruptor';
import { RangoNumerico, RangoPublicado } from '@ds/component/filtros/rango-numerico';

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
 * <p>MOBILE FIRST, y aquí eso significa algo más que envolver: en el MÓVIL los filtros arrancan
 * PLEGADOS y el rótulo «Filtros» es el botón que los abre. Desplegados ocupaban media pantalla —seis
 * pastillas apiladas más el buscador— y el primer producto quedaba fuera de la vista. Quien entra al
 * catálogo va a mirar productos; quien quiere filtrar lo busca a propósito. La cuenta de filtros
 * puestos va en la insignia del propio botón para que nunca se filtre sin saberlo. En el escritorio no
 * se pliega nada: ahí caben en una fila y esconderlos solo añadiría un clic.
 */
@Component({
  selector: 'nx-barra-de-filtros',
  imports: [
    CampoBusqueda,
    FaIconComponent,
    FiltroDesplegable,
    FiltroInterruptor,
    RangoNumerico,
  ],
  template: `
    <div class="card p-3">
      <div class="flex flex-wrap items-center gap-2">
        <!-- En móvil el rótulo es el BOTÓN que despliega; en escritorio es solo una etiqueta, y por eso
             deja de recibir el ratón: ahí no hay nada que plegar. -->
        <button
          type="button"
          (click)="alterna()"
          [attr.aria-expanded]="abierto()"
          aria-controls="filtros-del-catalogo"
          class="md:pointer-events-none inline-flex items-center gap-1.5 min-h-11 md:min-h-0 text-[11px]
                 text-ink-500 uppercase tracking-wider font-medium pr-2 md:border-r md:border-ink-100"
        >
          <fa-icon [icon]="iconos.embudo" class="text-[10px]" />
          {{ t('filters.label') }}
          @if (cuantos() > 0) {
            <span
              class="ml-1 inline-flex items-center justify-center w-4 h-4 rounded-full bg-brand-600 text-white text-[10px] font-medium"
            >
              {{ cuantos() }}
            </span>
          }
          <fa-icon
            [icon]="abierto() ? iconos.arriba : iconos.abajo"
            class="md:hidden text-[9px] ml-0.5"
          />
        </button>

        <div
          id="filtros-del-catalogo"
          class="md:flex w-full md:w-auto flex-wrap items-center gap-2"
          [class.flex]="abierto()"
          [class.hidden]="!abierto()"
        >
          <!--
            Se escucha «busca» y NO «valorChange»: el segundo no avisa cuando se vuelve a teclear lo
            mismo, y si la consulta anterior no llegó a aplicarse eso dejaba la búsqueda muerta sin
            más salida que vaciar el campo. (Sin comillas invertidas: esto va dentro de una plantilla
            literal y las partiría.)
          -->
          <nx-campo-busqueda
            [valor]="criterio().texto ?? ''"
            (busca)="cambia({ texto: $event || undefined })"
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

          <nx-rango-numerico
            identificador="filtro-precio"
            [etiqueta]="t('catalog.price_range')"
            [minimo]="criterio().precioMinimo ?? ''"
            [maximo]="criterio().precioMaximo ?? ''"
            [marcadorMinimo]="t('catalog.price_min')"
            [marcadorMaximo]="t('catalog.price_max')"
            (cambiado)="publicaElRango($event)"
          />

          <nx-filtro-desplegable
            [etiqueta]="t('catalog.sort')"
            [opciones]="opcionesDeOrden()"
            [valor]="criterio().orden"
            (valorChange)="cambiaOrden($event)"
          />

          <span class="text-[11px] text-ink-400 ml-auto">
            {{ t('pagination.showing') }} <strong>{{ mostrados() }}</strong> / {{ total() }}
          </span>

          @if (cuantos() > 0) {
            <button
              type="button"
              (click)="limpia.emit()"
              class="md:ml-auto inline-flex items-center gap-1 min-h-11 md:min-h-0 text-[12px] text-ink-500 hover:text-red-600"
            >
              <fa-icon [icon]="iconos.aspa" class="text-[10px]" /> {{ t('filters.clear') }}
            </button>
          }
        </div>
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
  protected readonly iconos = {
    camion: faTruckFast,
    video: faVideo,
    embudo: faFilter,
    aspa: faXmark,
    abajo: faChevronDown,
    arriba: faChevronUp,
  };

  /**
   * Solo manda en el móvil. En el escritorio el bloque lleva `md:flex`, que gana a `hidden`, así que
   * el estado existe pero no se nota: no hace falta un segundo camino para cada anchura.
   */
  protected readonly abierto = signal(false);

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

  protected alterna(): void {
    this.abierto.update((v) => !v);
  }

  /**
   * El rango sube al SALIR del campo: de eso se encarga el propio componente de rango. Aquí solo se
   * traduce el vacío a «sin clave», que es como el criterio dice «sin filtro» —una cadena vacía en la
   * dirección del navegador dejaría un `precioMinimo=` colgando y el backend la recibiría igual—.
   */
  protected publicaElRango(rango: RangoPublicado): void {
    this.cambia({
      precioMinimo: rango.minimo || undefined,
      precioMaximo: rango.maximo || undefined,
    });
  }

  protected cambia(parcial: Partial<CriterioDeBusqueda>): void {
    this.criterio.set({ ...this.criterio(), ...parcial });
  }

  protected cambiaOrden(valor: string | null): void {
    this.cambia({ orden: (valor as OrdenDelCatalogo | null) ?? 'random' });
  }
}
