import {
  Component,
  ElementRef,
  computed,
  effect,
  inject,
  resource,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faList, faRotateRight, faTableCells } from '@fortawesome/free-solid-svg-icons';
import { TraduccionService } from '@core/i18n/traduccion.service';
import { PreferenciasService } from '@core/preferences/preferencias';
import { ALMACEN_LOCAL } from '@core/storage/almacen.port';
import { Plataforma } from '@core/platform/plataforma';
import { BotonSubir } from '@ds/component/desplazamiento/boton-subir';
import { TAXONOMIA_PORT } from '../../domain/port/catalogo.port';
import {
  CRITERIO_VACIO,
  CriterioDeBusqueda,
  GRUPO_DEL_CARRITO,
  aParametros,
  barajaEfectiva,
  cuantosFiltros,
  desdeParametros,
  otraBaraja,
} from '../../domain/model/criterio-de-busqueda';
import {
  aplanaCategorias,
  categoriasConProductos,
} from '../../domain/model/catalogo-auxiliar';
import { BuscaProductos, TAMANO_DE_PAGINA } from '../../application/use-case/busca-productos.use-case';
import { RECUPERADOR_DE_SESION } from '@core/auth/recuperador-de-sesion.port';
import { SesionActual } from '@core/auth/sesion-actual';
import { AlternaFavorito } from '../../application/use-case/alterna-favorito.use-case';
import { ListadoStore } from '../../application/state/listado.store';
import { BarraDeFiltros } from '../component/barra-de-filtros';
import { CuadriculaProductos } from '../component/cuadricula-productos';
import { FilaListado } from '../component/fila-listado';
import { DistintivoFiltro } from '../component/distintivo-filtro';

/** Dónde se recuerda si el catálogo se ve en cuadrícula o en lista. */
const CLAVE_DE_VISTA = 'nx036-catalog-view';

type Vista = 'grid' | 'list';

/**
 * Píxeles de antelación mínimos del centinela.
 *
 * <p>Con la primera página aún corta —o en una pantalla muy alta— la mitad de lo cargado se queda en
 * nada y el centinela solo dispararía al tocar el fondo. Este suelo garantiza que siempre se pida con
 * algo de margen.
 */
const MARGEN_MINIMO = 300;

/**
 * La baraja de ESTA carga de página.
 *
 * <p>Vive en el módulo y no en el componente porque tiene que sobrevivir a que el comprador entre en
 * una ficha y vuelva —ahí el componente se destruye y se vuelve a crear— pero desaparecer al recargar
 * de verdad. Un módulo de JavaScript se evalúa una vez por carga de documento, que es exactamente esa
 * vida. Es lo que permite que volver atrás encuentre el catálogo tal y como se dejó, en vez de
 * rebarajado y con la posición perdida.
 */
let barajaDeLaVisita: number | null = null;

/**
 * El listado del catálogo.
 *
 * <p>Los filtros viven en la DIRECCIÓN, no dentro de la pantalla: es lo que hace que un enlace se
 * pueda compartir con la búsqueda puesta y que volver atrás recupere lo que se estaba mirando. La
 * pantalla lee la dirección y escribe en ella; el criterio y su traducción son del dominio.
 *
 * <p>Las páginas se ACUMULAN: bajar carga la siguiente y salir a una ficha y volver conserva lo
 * cargado, que es lo que permite recuperar la posición del desplazamiento.
 */
@Component({
  selector: 'nx-listado',
  imports: [
    FaIconComponent,
    BotonSubir,
    BarraDeFiltros,
    CuadriculaProductos,
    FilaListado,
    DistintivoFiltro,
  ],
  template: `
    <div class="space-y-5">
      <nx-boton-subir />

      @if (categoriaActiva(); as categoria) {
        <section
          class="rounded-xl bg-gradient-to-r from-brand-50 via-base-100 to-amber-50 border border-ink-100 px-6 py-8 lg:px-10 lg:py-10"
        >
          <div class="text-[11px] uppercase tracking-wider text-brand-700 font-medium">
            {{ t('catalog.category_hero.label') }}
          </div>
          <h1 class="mt-1 text-3xl font-medium">{{ categoria.nombre }}</h1>
          <div class="mt-3 inline-flex items-center gap-3 text-[12px] text-ink-500">
            <span>
              <strong class="text-ink-700">{{ categoria.cuantosProductos }}</strong>
              {{ t('catalog.category_hero.products') }}
            </span>
            <button type="button" (click)="cambia({ categoria: undefined })" class="text-brand-700 hover:underline">
              {{ t('catalog.category_hero.clear') }}
            </button>
          </div>
        </section>
      }

      <header class="flex flex-wrap items-end justify-between gap-3">
        <div>
          @if (!categoriaActiva()) {
            <h1>{{ t('catalog.title') }}</h1>
            <p class="text-sm text-ink-500 mt-1">{{ t('catalog.subtitle') }}</p>
          }
        </div>
        <div class="flex items-center gap-2">
          <!-- Recargar la lista sin recargar el navegador. El listado se conserva a propósito al ir a
               una ficha y volver —eso es lo que evita perder el desplazamiento y las páginas ya
               cargadas—, así que hace falta una forma explícita de traer lo que haya cambiado. Se
               recarga desde la PRIMERA página: refrescar solo el tramo visible dejaría una lista
               cosida de dos momentos distintos. -->
          <button
            type="button"
            (click)="refresca()"
            [title]="t('catalog.refresh')"
            [attr.aria-label]="t('catalog.refresh')"
            class="btn btn-outline btn-sm"
          >
            <fa-icon [icon]="iconos.refrescar" />
            <span class="hidden sm:inline ml-1">{{ t('catalog.refresh') }}</span>
          </button>
          <div class="join">
            <button
              type="button"
              (click)="cambiaVista('grid')"
              [attr.aria-pressed]="vista() === 'grid'"
              [attr.aria-label]="t('catalog.view.grid')"
              class="btn btn-sm join-item"
              [class.btn-active]="vista() === 'grid'"
            >
              <fa-icon [icon]="iconos.cuadricula" />
              <span class="hidden sm:inline ml-1">{{ t('catalog.view.grid') }}</span>
            </button>
            <button
              type="button"
              (click)="cambiaVista('list')"
              [attr.aria-pressed]="vista() === 'list'"
              [attr.aria-label]="t('catalog.view.list')"
              class="btn btn-sm join-item"
              [class.btn-active]="vista() === 'list'"
            >
              <fa-icon [icon]="iconos.lista" />
              <span class="hidden sm:inline ml-1">{{ t('catalog.view.list') }}</span>
            </button>
          </div>
        </div>
      </header>

      <nx-barra-de-filtros
        [criterio]="criterio()"
        (criterioChange)="fija($event)"
        [categorias]="categoriasConProductos()"
        [proveedores]="proveedores()"
        [esAdministrador]="sesion.esAdministrador()"
        [mostrados]="productos().length"
        [total]="total()"
        (limpia)="limpiaTodo()"
      />

      @if (cuantosFiltros() > 0) {
        <div class="flex flex-wrap items-center gap-1.5">
          @if (criterio().texto) {
            <nx-distintivo-filtro [etiqueta]="'&quot;' + criterio().texto + '&quot;'" (quita)="cambia({ texto: undefined })" />
          }
          @if (criterio().promocion) {
            <nx-distintivo-filtro
              [etiqueta]="t('promo.banner.kicker') + ': ' + (criterio().nombreDePromocion ?? '')"
              (quita)="cambia({ promocion: undefined, nombreDePromocion: undefined })"
            />
          }
          @if (criterio().grupoDeArancel && hayPaisConArancel()) {
            <nx-distintivo-filtro
              [etiqueta]="t('catalog.duty.filter_active')"
              [etiquetaDeQuitar]="t('catalog.duty.filter_remove')"
              (quita)="cambia({ grupoDeArancel: undefined })"
            />
          }
        </div>
      }

      <!-- Envoltorio de los resultados: existe para poder MEDIR el alto de lo ya cargado, que es lo
           que fija con cuánta antelación se pide la página siguiente. -->
      <div #resultados>
        @if (vista() === 'grid') {
          <nx-cuadricula-productos [productos]="productos()" [cargando]="cargando()" />
        } @else {
          @if (productos().length === 0 && !cargando()) {
            <div class="card p-10 text-center">
              <p class="text-sm text-ink-500">{{ t('catalog.empty') }}</p>
            </div>
          }
          <div class="space-y-2">
            @for (producto of productos(); track producto.id) {
              <nx-fila-listado [producto]="producto" />
            }
          </div>
        }
      </div>

      @if (hayMas()) {
        <!-- Centinela del desplazamiento infinito Y respaldo a la vez. El botón SE QUEDA: es lo que
             usa quien navega con el teclado y lo que salva la situación si el observador no llega a
             dispararse (pestaña de fondo, navegador sin soporte, prerenderizado). -->
        <div #centinela class="flex items-center justify-center py-4">
          <button type="button" (click)="cargaMas()" [disabled]="cargando()" class="btn btn-outline text-[12px]">
            {{ cargando() ? t('common.loading') : t('catalog.load_more') }}
          </button>
        </div>
      } @else if (productos().length > 0) {
        <div class="text-center text-[12px] text-ink-400 py-3">{{ t('catalog.end_of_list') }}</div>
      }
    </div>
  `,
})
export class ListadoPage {
  private readonly busca = inject(BuscaProductos);
  private readonly taxonomia = inject(TAXONOMIA_PORT);
  private readonly enrutador = inject(Router);
  private readonly ruta = inject(ActivatedRoute);
  private readonly preferencias = inject(PreferenciasService);
  private readonly almacen = inject(ALMACEN_LOCAL);
  private readonly favoritos = inject(AlternaFavorito);
  private readonly plataforma = inject(Plataforma);
  private readonly listado = inject(ListadoStore);

  protected readonly sesion = inject(SesionActual);
  protected readonly t = inject(TraduccionService).t;
  protected readonly iconos = {
    refrescar: faRotateRight,
    cuadricula: faTableCells,
    lista: faList,
  };

  /** Los parámetros de la dirección, como signal: cambiarlos vuelve a pedir sin remontar la página. */
  private readonly parametros = toSignal(this.ruta.queryParamMap, {
    initialValue: this.ruta.snapshot.queryParamMap,
  });

  protected readonly criterio = computed<CriterioDeBusqueda>(() => {
    const mapa = this.parametros();
    const parametros = new URLSearchParams();
    for (const clave of mapa.keys) {
      parametros.set(clave, mapa.get(clave) ?? '');
    }
    return desdeParametros(parametros);
  });

  protected readonly vista = signal<Vista>(this.vistaGuardada());
  private readonly baraja = signal<number | null>(barajaDeLaVisita);
  protected readonly cargando = signal(false);

  /** El envoltorio de los resultados y el centinela del final, para medir y para observar. */
  private readonly resultados = viewChild<ElementRef<HTMLElement>>('resultados');
  private readonly centinela = viewChild<ElementRef<HTMLElement>>('centinela');

  /**
   * Qué búsqueda representa lo que hay guardado: criterio, idioma y baraja, en una sola cadena.
   *
   * <p>Es la llave de la memoria del listado. Mientras no cambie, volver de una ficha recupera las
   * páginas cargadas; en cuanto cambia —otro filtro, otro orden, otro idioma o un refresco— lo
   * guardado deja de servir y se pide desde la primera página.
   */
  private readonly huella = computed(() =>
    JSON.stringify([
      aParametros(this.criterio()),
      this.preferencias.idioma(),
      barajaEfectiva(this.criterio(), this.baraja()) ?? null,
    ]),
  );

  private readonly categorias = resource({
    params: () => ({ idioma: this.preferencias.idioma() }),
    loader: async () => {
      const resultado = await this.taxonomia.arbolDeCategorias();
      return resultado.ok ? aplanaCategorias(resultado.valor) : [];
    },
  });

  private readonly proveedoresRecurso = resource({
    loader: async () => {
      const resultado = await this.taxonomia.proveedores();
      return resultado.ok ? resultado.valor : [];
    },
  });

  protected readonly proveedores = computed(() => this.proveedoresRecurso.value() ?? []);
  protected readonly categoriasConProductos = computed(() =>
    categoriasConProductos(this.categorias.value() ?? []),
  );
  protected readonly categoriaActiva = computed(() => {
    const id = this.criterio().categoria;
    return id ? ((this.categorias.value() ?? []).find((c) => c.id === id) ?? null) : null;
  });

  protected readonly productos = this.listado.productos;
  protected readonly total = this.listado.total;
  protected readonly hayMas = this.listado.hayMas;
  protected readonly cuantosFiltros = computed(() => cuantosFiltros(this.criterio()));

  /**
   * ¿El país del comprador cobra derecho por artículo? Se deduce del propio listado: el backend solo
   * manda grupo donde ese importe existe. No hay un segundo interruptor que alguien pueda olvidar
   * mover, y así la etiqueta del filtro no se queda colgada al cambiar a un país sin arancel.
   */
  protected readonly hayPaisConArancel = computed(() =>
    this.productos().some((producto) => !!producto.arancel.grupo),
  );

  constructor() {
    // La primera visita estrena baraja; volver de una ficha reutiliza la que ya había, y con ella la
    // caché del listado y la posición del desplazamiento.
    if (barajaDeLaVisita === null) {
      barajaDeLaVisita = otraBaraja(null);
      this.baraja.set(barajaDeLaVisita);
    }
    // La sesión la resuelve el núcleo; con ella resuelta ya se pueden traer los favoritos y encender
    // el corazón de las tarjetas que ya estén pintadas.
    void inject(RECUPERADOR_DE_SESION)
      .asegura()
      .then(() => this.favoritos.carga());

    // Cada cambio de criterio, de idioma o de baraja empieza el listado de cero. Lo hace un efecto y
    // no cada manejador porque los filtros entran también desde fuera —del cartel de rebajas, de una
    // tarjeta— sin que esta pantalla se entere de otra manera.
    //
    // Y al montar la pantalla NO siempre se pide: si lo guardado es de esta misma búsqueda —volver de
    // una ficha—, se restaura tal cual. Es lo que devuelve al comprador donde estaba, porque la
    // restauración de la posición del enrutador necesita que la página vuelva a ser igual de alta.
    effect(() => {
      const huella = this.huella();
      untracked(() => {
        if (!this.listado.sirve(huella)) {
          void this.recarga(huella);
        }
      });
    });

    // El desplazamiento infinito.
    //
    // El centinela está abajo del todo, pero cuenta con un margen de MEDIA pantalla de resultados: así
    // la página siguiente se pide al pasar por la mitad de lo ya cargado y, cuando el comprador termina
    // de bajar por lo que hay, las tarjetas nuevas ya han llegado y no se ve el corte. Con un margen
    // fijo de 300 px la petición salía prácticamente al tocar el fondo.
    //
    // El observador se rehace en cada cambio y se DESCONECTA en la limpieza del efecto —que corre
    // también al destruir el componente—: sin eso quedaría uno vivo por cada visita al catálogo.
    effect((alLimpiar) => {
      const centinela = this.centinela()?.nativeElement;
      // Al prerenderizar no hay observador ni pantalla a la que asomarse —tampoco alturas que medir—;
      // ahí manda el botón. Por eso la comprobación va ANTES de tocar nada del navegador.
      if (!this.plataforma.esNavegador || !centinela) {
        return;
      }
      const margen = this.margenDeAnticipacion();
      const observador = new IntersectionObserver(
        (entradas) => {
          if (entradas.some((entrada) => entrada.isIntersecting)) {
            void this.cargaMas();
          }
        },
        { rootMargin: `${margen}px` },
      );
      observador.observe(centinela);
      alLimpiar(() => observador.disconnect());
    });
  }

  /**
   * Con cuánta antelación se pide la página siguiente: la mitad del alto de lo ya cargado.
   *
   * <p>Se MIDE en vez de fijar un número de píxeles porque el mismo listado ocupa alturas muy
   * distintas según la vista —cuadrícula o lista— y el ancho de la pantalla: en un móvil una página
   * es varias veces más alta que en un escritorio. Leer los productos y la vista aquí dentro es lo que
   * hace que el efecto rehaga el observador cuando cualquiera de las dos cambia.
   */
  private margenDeAnticipacion(): number {
    this.productos();
    this.vista();
    const alto = this.resultados()?.nativeElement.getBoundingClientRect().height ?? 0;
    return Math.max(MARGEN_MINIMO, Math.round(alto / 2));
  }

  protected fija(criterio: CriterioDeBusqueda): void {
    void this.enrutador.navigate([], {
      relativeTo: this.ruta,
      queryParams: aParametros(criterio),
      replaceUrl: true,
    });
  }

  protected cambia(parcial: Partial<CriterioDeBusqueda>): void {
    this.fija({ ...this.criterio(), ...parcial });
  }

  protected limpiaTodo(): void {
    // El grupo de arancel también se va: llega de fuera, y dejarlo puesto tras «limpiar» era el filtro
    // invisible que nadie sabía quitar.
    this.fija(CRITERIO_VACIO);
  }

  /** Refrescar y ver EXACTAMENTE lo mismo no parecería un refresco: la baraja cambia siempre. */
  protected refresca(): void {
    barajaDeLaVisita = otraBaraja(this.baraja());
    this.baraja.set(barajaDeLaVisita);
  }

  protected cambiaVista(vista: Vista): void {
    this.vista.set(vista);
    // El almacenamiento puede estar BLOQUEADO (modo privado, «bloquear todas las cookies») y lanzar.
    // El adaptador lo absorbe: perder la preferencia es aceptable, quedarse sin catálogo no.
    this.almacen.guarda(CLAVE_DE_VISTA, vista);
  }

  /** Trae la página siguiente. La piden el centinela y el botón, y con una en vuelo no se pide otra. */
  protected async cargaMas(): Promise<void> {
    if (this.cargando() || !this.hayMas()) {
      return;
    }
    await this.pide(this.listado.paginasPedidas(), this.huella());
  }

  private async recarga(huella: string): Promise<void> {
    this.listado.empieza(huella);
    // La referencia del arancel solo se refresca con el listado en su primera página: cambiarla más
    // abajo tiraría todo lo cargado y devolvería al comprador al principio.
    await this.busca.refrescaLaReferencia();
    await this.pide(0, huella);
  }

  private async pide(pagina: number, huella: string): Promise<void> {
    this.cargando.set(true);
    try {
      const resultado = await this.busca.ejecuta({
        criterio: this.criterio(),
        pagina,
        tamano: TAMANO_DE_PAGINA,
        baraja: barajaEfectiva(this.criterio(), this.baraja()),
      });
      // Se guarda con la huella con la que se pidió: lo que llegue tarde de una búsqueda anterior se
      // descarta en el estado en vez de colarse bajo el filtro nuevo.
      if (resultado.ok) {
        this.listado.guarda(huella, resultado.valor);
      }
    } finally {
      this.cargando.set(false);
    }
  }

  private vistaGuardada(): Vista {
    return this.almacen.lee(CLAVE_DE_VISTA) === 'list' ? 'list' : 'grid';
  }
}

/** El centinela del filtro de arancel, reexportado para las pruebas de la pantalla. */
export { GRUPO_DEL_CARRITO };
