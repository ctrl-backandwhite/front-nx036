import { Component, computed, inject, input, linkedSignal, model, output, signal } from '@angular/core';
import { FieldTree, FormField, form, min, validate } from '@angular/forms/signals';
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
import { FiltroDesplegable, OpcionDeFiltro } from './filtro-desplegable';
import { FiltroInterruptor } from './filtro-interruptor';

/** Países de origen que se ofrecen. Son los almacenes desde los que sale mercancía hoy. */
const ORIGENES = ['CN', 'HK', 'US', 'ES', 'MX'];
/** Certificaciones que el catálogo sabe filtrar. */
const CERTIFICACIONES = ['CE', 'FCC', 'RoHS', 'FDA', 'EN71'];
/**
 * El rango de precio tal y como lo maneja el formulario: dos números que SIEMPRE existen.
 *
 * <p>El criterio del negocio los guarda como texto opcional —así viajan en la dirección del navegador
 * y así los espera el backend—, pero Signal Forms construye un campo por cada clave que EXISTE en el
 * objeto: un criterio sin precio puesto no tiene la clave y la plantilla se quedaría sin nada a lo que
 * atarse. Aquí las dos claves están siempre, con el nulo como «sin poner».
 */
interface RangoDePrecio {
  readonly minimo: number | null;
  readonly maximo: number | null;
}

/** El texto del criterio, como número para el campo. Lo que no sea un número es «sin poner». */
function aNumero(texto: string | undefined): number | null {
  const valor = Number(texto);
  return texto && Number.isFinite(valor) ? valor : null;
}

/** Y al revés, para devolverlo al criterio: sin valor no se manda la clave, no una cadena vacía. */
function aTexto(valor: number | null): string | undefined {
  return valor === null ? undefined : String(valor);
}

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
  imports: [CampoBusqueda, FaIconComponent, FiltroDesplegable, FiltroInterruptor, FormField],
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

          <!-- El envoltorio solo existe para poder colgar el aviso DEBAJO de la pastilla: dentro de
               ella se metería entre el mínimo y el máximo. -->
          <div>
            <div
              class="inline-flex items-center gap-1.5 text-[12px] rounded-full border border-ink-200 bg-white px-2 py-0.5"
            >
              <span class="text-ink-500 pl-1">{{ t('catalog.price_range') }}:</span>
              <input
                id="filtro-precio-min"
                type="number"
                inputmode="decimal"
                class="w-14 px-1 py-1 min-h-11 sm:min-h-0 text-[12px] focus:outline-none bg-transparent"
                [placeholder]="t('catalog.price_min')"
                [attr.aria-label]="t('catalog.price_range') + ' ' + t('catalog.price_min')"
                [formField]="formulario.minimo"
                (change)="publicaElRango()"
              />
              <span aria-hidden="true" class="text-ink-300">–</span>
              <input
                id="filtro-precio-max"
                type="number"
                inputmode="decimal"
                class="w-14 px-1 py-1 min-h-11 sm:min-h-0 text-[12px] focus:outline-none bg-transparent"
                [placeholder]="t('catalog.price_max')"
                [attr.aria-label]="t('catalog.price_range') + ' ' + t('catalog.price_max')"
                [formField]="formulario.maximo"
                (change)="publicaElRango()"
              />
            </div>
            @if (falloDelRango(); as fallo) {
              <span role="alert" class="text-xs text-error mt-1 block">{{ fallo }}</span>
            }
          </div>

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

  /**
   * El rango de precio, normalizado y con las dos claves puestas.
   *
   * <p>Se DERIVA del criterio que llega, así que «limpiar filtros» o un enlace compartido vacían los
   * campos solos, sin sincronizar nada a mano.
   */
  private readonly rango = linkedSignal<RangoDePrecio>(() => ({
    minimo: aNumero(this.criterio().precioMinimo),
    maximo: aNumero(this.criterio().precioMaximo),
  }));

  /**
   * Las dos reglas del rango, declaradas en vez de repartidas.
   *
   * <p>Un precio negativo no existe y solo devolvería la lista entera. Y un mínimo por encima del
   * máximo no devuelve NADA: el catálogo se queda en blanco y quien busca no entiende por qué. Antes
   * ninguna de las dos se decía en ninguna parte.
   */
  protected readonly formulario = form(this.rango, (ruta) => {
    min(ruta.minimo, 0, { message: () => this.t('dialog.field.min') });
    min(ruta.maximo, 0, { message: () => this.t('dialog.field.min') });
    validate(ruta, ({ value }) => {
      const { minimo, maximo } = value();
      // `dialog.field.range` —«el final va antes que el principio»— es exactamente esto. Antes iba sin
      // mensaje porque no existía la clave, y el filtro se quedaba en rojo sin decir qué pasaba.
      return minimo !== null && maximo !== null && minimo > maximo
        ? { kind: 'rango-invertido', message: this.t('dialog.field.range') }
        : null;
    });
  });

  /**
   * Un solo aviso para el par: son un rango, y dos mensajes idénticos uno debajo de otro no dicen más
   * que uno.
   */
  protected readonly falloDelRango = computed(
    () => this.falloDe(this.formulario.minimo) ?? this.falloDe(this.formulario.maximo),
  );

  protected alterna(): void {
    this.abierto.update((v) => !v);
  }

  /**
   * El mensaje que toca enseñar bajo el par de campos, o nulo. Se calla hasta que el campo se ha
   * TOCADO: pintar de rojo un filtro recién abierto acusa a quien todavía no ha escrito nada.
   */
  private falloDe<T>(campo: FieldTree<T>): string | null {
    const estado = campo();
    return estado.touched() ? (estado.errors()[0]?.message ?? null) : null;
  }

  /**
   * El rango sube al SALIR del campo, no en cada tecleada.
   *
   * <p>No es un detalle de estilo: el criterio acaba en la dirección del navegador, así que publicarlo
   * por dígito sería una navegación —y una búsqueda entera— por cada tecla. El valor ya lo lleva el
   * formulario; esto solo lo publica.
   */
  protected publicaElRango(): void {
    const { minimo, maximo } = this.rango();
    this.cambia({ precioMinimo: aTexto(minimo), precioMaximo: aTexto(maximo) });
  }

  protected cambia(parcial: Partial<CriterioDeBusqueda>): void {
    this.criterio.set({ ...this.criterio(), ...parcial });
  }

  protected cambiaOrden(valor: string | null): void {
    this.cambia({ orden: (valor as OrdenDelCatalogo | null) ?? 'random' });
  }
}
