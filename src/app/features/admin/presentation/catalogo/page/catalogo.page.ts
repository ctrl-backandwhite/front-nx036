import { Component, computed, effect, inject, resource, signal, untracked } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { TraduccionService } from '@core/i18n/traduccion.service';
import { AvisosStore } from '@ds/component/avisos/avisos.store';
import { DialogoStore } from '@ds/component/dialogo/dialogo.store';
import { BotonSubir } from '@ds/component/desplazamiento/boton-subir';
import { CatalogoAdminStore } from '../../../application/catalogo/state/catalogo-admin.store';
import { ConsultaArbolDeCategorias } from '../../../application/catalogo/use-case/consulta-arbol-de-categorias.use-case';
import { ConsultaTasasDeCambio } from '../../../application/catalogo/use-case/consulta-tasas-de-cambio.use-case';
import { ListaProductos } from '../../../application/catalogo/use-case/lista-productos.use-case';
import { EstadoDeProducto, saleDelFiltro } from '../../../domain/catalogo/model/producto-admin';
import {
  PeticionDeRecargo,
  PeticionDeSubvencion,
} from '../../../domain/catalogo/port/productos-admin.port';
import { AccionesDeCatalogo } from '../component/acciones-de-catalogo';
import { AccionSobreProducto, TablaDeProductos } from '../component/tabla-de-productos';
import { AvisoAnunciosBus } from '../component/aviso-anuncios-bus';
import { DialogoAltaDeProducto } from '../component/dialogo-alta-de-producto';
import { DialogoExportacion } from '../component/dialogo-exportacion';
import { DialogoRecargo } from '../component/dialogo-recargo';
import { DialogoSubvencion } from '../component/dialogo-subvencion';
import { FiltrosDeCatalogo } from '../component/filtros-de-catalogo';
import { Paginacion } from '../component/paginacion';
import { AccionesDelCatalogo } from './catalogo-acciones';
import { CompresionDelHistorico } from './catalogo-compresion';
import { AnunciosDelBus } from './catalogo-bus';

/**
 * El listado del catálogo del panel.
 *
 * <p>La columna «Precio» es el COSTE de origen: lo que paga quien compra lo calcula el backend con el
 * margen, el IVA, el envío y el arancel, y aquí no se replica ninguna de esas fórmulas.
 *
 * <p>Los filtros viven en el almacén y se reflejan en la DIRECCIÓN, de modo que un enlace al catálogo
 * filtrado por categoría —el que reparte el menú— lleva a la misma lista que se estaba viendo.
 */
@Component({
  selector: 'nx-admin-catalogo',
  imports: [
    AccionesDeCatalogo,
    FiltrosDeCatalogo,
    TablaDeProductos,
    AvisoAnunciosBus,
    Paginacion,
    BotonSubir,
    DialogoRecargo,
    DialogoSubvencion,
    DialogoExportacion,
    DialogoAltaDeProducto,
  ],
  providers: [CatalogoAdminStore, AccionesDelCatalogo, CompresionDelHistorico, AnunciosDelBus],
  template: `
    <div class="space-y-5">
      <header class="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1>{{ t('admin.catalog.title') }}</h1>
          <p class="text-sm text-ink-500 mt-1">{{ t('admin.catalog.subtitle') }}</p>
        </div>
        <nx-acciones-de-catalogo
          [cargando]="productos.isLoading()"
          [ocupado]="acciones.ocupado()"
          [comprimiendo]="compresion.activa()"
          [compresion]="compresion.estado()"
          (cambiaEstado)="cambiaEstadoDeSeleccion($event)"
          (eliminaSeleccion)="eliminaSeleccion()"
          (recarga)="productos.reload()"
          (abreRecargo)="dialogoAbierto.set('recargo')"
          (abreSubvencion)="dialogoAbierto.set('subvencion')"
          (alternaCompresion)="compresion.alterna()"
          (abreExportacion)="dialogoAbierto.set('exportacion')"
          (abreAlta)="dialogoAbierto.set('alta')"
        />
      </header>

      <nx-aviso-anuncios-bus
        [fallidos]="bus.fallidos()"
        [reintentando]="bus.reintentando()"
        (reintenta)="bus.reintenta()"
      />

      <nx-filtros-de-catalogo
        [categorias]="categorias.value()"
        [mostrados]="pagina().productos.length"
        [total]="pagina().total"
      />

      <nx-tabla-de-productos
        [productos]="pagina().productos"
        [cargando]="productos.isLoading()"
        [orden]="almacen.orden()"
        (alternaUno)="almacen.alternaSeleccion($event)"
        (alternaTodos)="alternaTodos()"
        (alternaOrden)="almacen.alternaOrdenDePrecio()"
        (acciona)="atiende($event)"
      />

      <nx-paginacion [pagina]="almacen.pagina()" (paginaChange)="almacen.pagina.set($event)" [paginas]="pagina().paginas" />
      <nx-boton-subir />

      <!--
        Las ventanas emergentes son el trozo más pesado de esta pantalla —el alta de producto sola
        arrastra una docena de componentes— y casi ninguna visita abre ninguna. Se difieren para que su
        código no se descargue hasta que se abre la primera.
      -->
      @defer (when dialogoAbierto() !== null) {
      @switch (dialogoAbierto()) {
        @case ('recargo') {
          <nx-dialogo-recargo
            [seleccion]="seleccionados()"
            [categoriaId]="almacen.categoriaId()"
            [nombreDeCategoria]="nombreDeCategoria()"
            [guardando]="acciones.ocupado()"
            (cierra)="dialogoAbierto.set(null)"
            (confirma)="aplicaRecargo($event)"
          />
        }
        @case ('subvencion') {
          <nx-dialogo-subvencion
            [seleccion]="seleccionados()"
            [categoriaId]="almacen.categoriaId()"
            [nombreDeCategoria]="nombreDeCategoria()"
            [guardando]="acciones.ocupado()"
            (cierra)="dialogoAbierto.set(null)"
            (confirma)="aplicaSubvencion($event)"
          />
        }
        @case ('exportacion') {
          <nx-dialogo-exportacion (cierra)="dialogoAbierto.set(null)" />
        }
        @case ('alta') {
          <nx-dialogo-alta-de-producto
            (cierra)="dialogoAbierto.set(null)"
            (creado)="productos.reload()"
          />
        }
      }
      }
    </div>
  `,
})
export class CatalogoPage {
  protected readonly t = inject(TraduccionService).t;
  protected readonly almacen = inject(CatalogoAdminStore);
  protected readonly acciones = inject(AccionesDelCatalogo);
  protected readonly compresion = inject(CompresionDelHistorico);
  protected readonly bus = inject(AnunciosDelBus);

  private readonly avisos = inject(AvisosStore);
  private readonly dialogos = inject(DialogoStore);
  private readonly router = inject(Router);
  private readonly ruta = inject(ActivatedRoute);
  private readonly listaProductos = inject(ListaProductos);
  private readonly arbol = inject(ConsultaArbolDeCategorias);
  private readonly tasas = inject(ConsultaTasasDeCambio);

  protected readonly dialogoAbierto = signal<
    'recargo' | 'subvencion' | 'exportacion' | 'alta' | null
  >(null);

  protected readonly productos = resource({
    params: () => this.almacen.criterio(),
    loader: async ({ params }) => {
      const resultado = await this.listaProductos.ejecuta(params);
      if (!resultado.ok) {
        this.avisos.error(resultado.error.mensaje || this.t('admin.catalog.actions.error'));
        return { productos: [], total: 0, paginas: 1, pagina: 0 };
      }
      return resultado.valor;
    },
    defaultValue: { productos: [], total: 0, paginas: 1, pagina: 0 },
  });

  protected readonly pagina = computed(() => this.productos.value());

  protected readonly categorias = resource({
    loader: async () => {
      const resultado = await this.arbol.ejecuta('es');
      return resultado.ok ? resultado.valor : [];
    },
    defaultValue: [],
  });

  private readonly divisas = resource({
    loader: async () => {
      const resultado = await this.tasas.ejecuta();
      return resultado.ok ? resultado.valor : [];
    },
    defaultValue: [],
  });

  protected readonly seleccionados = computed(() => [...this.almacen.seleccion()]);

  protected readonly nombreDeCategoria = computed(() => {
    const id = this.almacen.categoriaId();
    return id ? (this.categorias.value().find((c) => c.id === id)?.etiqueta ?? id) : null;
  });

  constructor() {
    this.leeFiltrosDeLaDireccion();
    // Las tasas llegan del servidor y solo sirven para pintar y filtrar el coste: en cuanto están, se
    // dejan en el almacén, que es quien convierte para toda la pantalla.
    effect(() => this.almacen.divisas.set(this.divisas.value()));
    // La dirección refleja los filtros para que un enlace lleve a la misma lista. Se reemplaza en el
    // historial en vez de apilarse: cada tecla del buscador dejaría una entrada para atrás.
    effect(() => this.escribeFiltrosEnLaDireccion());
  }

  /** Un enlace profundo —el del menú, por ejemplo— llega con los filtros puestos en la dirección. */
  private leeFiltrosDeLaDireccion(): void {
    const parametros = this.ruta.snapshot.queryParamMap;
    this.almacen.estado.set((parametros.get('status') as EstadoDeProducto | null) ?? undefined);
    this.almacen.categoriaId.set(parametros.get('categoryId'));
    this.almacen.texto.set(parametros.get('q') ?? '');
    this.almacen.verificado.set(parametros.get('verified') ?? '');
    this.almacen.precioMinimo.set(parametros.get('minPrice') ?? '');
    this.almacen.precioMaximo.set(parametros.get('maxPrice') ?? '');
    this.almacen.ventasMinimas.set(parametros.get('minSales') ?? '');
    this.almacen.tendenciaMinima.set(parametros.get('minTrend') ?? '');
  }

  private escribeFiltrosEnLaDireccion(): void {
    const queryParams = {
      status: this.almacen.estado() ?? null,
      categoryId: this.almacen.categoriaId(),
      q: this.almacen.texto() || null,
      verified: this.almacen.verificado() || null,
      minPrice: this.almacen.precioMinimo() || null,
      maxPrice: this.almacen.precioMaximo() || null,
      minSales: this.almacen.ventasMinimas() || null,
      minTrend: this.almacen.tendenciaMinima() || null,
    };
    untracked(() =>
      this.router.navigate([], { relativeTo: this.ruta, queryParams, replaceUrl: true }),
    );
  }

  protected alternaTodos(): void {
    const ids = this.pagina().productos.map((producto) => producto.id);
    const marcados = ids.length > 0 && ids.every((id) => this.almacen.seleccion().has(id));
    this.almacen.alternaTodos(ids, marcados);
  }

  /** Una fila que deja de cumplir el filtro activo obliga a recargar; si no, basta con corregirla. */
  private refrescaSiHaceFalta(fuera: boolean): void {
    if (fuera) {
      this.productos.reload();
    }
  }

  protected async atiende(accion: AccionSobreProducto): Promise<void> {
    const { producto, clase } = accion;
    if (clase === 'estado' && accion.estado) {
      // Recargar solo si la fila deja de cumplir el filtro activo: repintar treinta productos por un
      // cambio de uno hace parpadear la tabla y pierde el sitio donde se estaba.
      const fuera = saleDelFiltro(this.almacen.estado(), accion.estado);
      const hecho = await this.acciones.cambiaEstado([producto.id], accion.estado);
      this.refrescaSiHaceFalta(hecho && fuera);
      return;
    }
    if (clase === 'verificado') {
      const marcado = accion.verificado === true;
      const filtro = this.almacen.verificado();
      const hecho = await this.acciones.marcaVerificado(producto.id, marcado);
      this.refrescaSiHaceFalta(hecho && filtro !== '' && (filtro === 'true') !== marcado);
      return;
    }
    if (clase === 'duplicar') {
      await this.acciones.duplica(producto.id);
      this.productos.reload();
      return;
    }
    const confirmado = await this.dialogos.confirma(
      this.t('admin.catalog.actions.delete_confirm').replace(
        '{title}',
        producto.titulo || producto.slug,
      ),
    );
    if (confirmado) {
      await this.acciones.elimina([producto.id]);
      this.productos.reload();
    }
  }

  protected async cambiaEstadoDeSeleccion(estado: EstadoDeProducto): Promise<void> {
    await this.acciones.cambiaEstado(this.seleccionados(), estado);
    this.almacen.limpiaSeleccion();
    this.productos.reload();
  }

  protected async eliminaSeleccion(): Promise<void> {
    const ids = this.seleccionados();
    if (!ids.length) {
      return;
    }
    const confirmado = await this.dialogos.confirma(
      this.t('admin.catalog.bulk_delete_confirm').replace('{n}', String(ids.length)),
    );
    if (!confirmado) {
      return;
    }
    await this.acciones.elimina(ids);
    this.almacen.limpiaSeleccion();
    this.productos.reload();
  }

  protected async aplicaRecargo(peticion: PeticionDeRecargo): Promise<void> {
    if (await this.acciones.recargo(peticion)) {
      this.dialogoAbierto.set(null);
      this.almacen.limpiaSeleccion();
      this.productos.reload();
    }
  }

  protected async aplicaSubvencion(peticion: PeticionDeSubvencion): Promise<void> {
    if (await this.acciones.subvencion(peticion)) {
      this.dialogoAbierto.set(null);
      this.almacen.limpiaSeleccion();
      this.productos.reload();
    }
  }
}
