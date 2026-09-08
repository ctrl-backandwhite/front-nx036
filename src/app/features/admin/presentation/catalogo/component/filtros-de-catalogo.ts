import { Component, computed, inject, input } from '@angular/core';
import { TraduccionService } from '@core/i18n/traduccion.service';
import { BarraFiltros } from '@ds/component/filtros/barra-filtros';
import { FiltroDesplegable, OpcionDeFiltro } from '@ds/component/filtros/filtro-desplegable';
import { CampoBusqueda } from '@ds/component/campo-busqueda/campo-busqueda';
import { CatalogoAdminStore } from '../../../application/catalogo/state/catalogo-admin.store';
import {
  ESTADOS_DE_PRODUCTO,
  EstadoDeProducto,
} from '../../../domain/catalogo/model/producto-admin';
import { CategoriaParaElegir } from '../../../domain/catalogo/port/categorias-admin.port';
import { etiquetaDeEstado } from '../etiquetas';
import { FiltroNumerico } from './filtro-numerico';
import { RangoNumerico, RangoPublicado } from '@ds/component/filtros/rango-numerico';

/**
 * La barra de filtros del catálogo.
 *
 * <p>El PRECIO se teclea en la moneda de quien administra y se filtra por el COSTE, que es lo que
 * enseña esa columna. La conversión la hace el almacén con la misma tasa que usa para pintarla: sin
 * eso, escribir «20» filtraba por 20 yuanes mientras la tabla enseñaba euros.
 *
 * <p>Ventas y tendencia son MÍNIMOS y no rangos: en una tabla ordenable lo que se busca es «de aquí
 * para arriba», y un máximo obligaría a rellenar dos campos para el caso raro.
 */
@Component({
  selector: 'nx-filtros-de-catalogo',
  imports: [BarraFiltros, FiltroDesplegable, CampoBusqueda, FiltroNumerico, RangoNumerico],
  template: `
    <nx-barra-filtros
      [activos]="cuantosFiltros()"
      [hayActivos]="almacen.hayFiltros()"
      (limpia)="almacen.limpiaFiltros()"
    >
      <nx-campo-busqueda
        [valor]="almacen.texto()"
        (valorChange)="cambiaTexto($event)"
        [marcador]="t('admin.catalog.search_placeholder')"
        clase="w-full md:min-w-[260px]"
      />
      <nx-filtro-desplegable
        [etiqueta]="t('admin.catalog.col.status')"
        [valor]="almacen.estado() ?? null"
        (valorChange)="cambiaEstado($event)"
        [opciones]="opcionesDeEstado()"
        [marcador]="t('filters.all')"
      />
      <nx-filtro-desplegable
        [etiqueta]="t('filters.category')"
        [valor]="almacen.categoriaId()"
        (valorChange)="cambiaCategoria($event)"
        [opciones]="opcionesDeCategoria()"
        [marcador]="t('filters.all')"
      />
      <nx-filtro-desplegable
        [etiqueta]="t('admin.catalog.col.verified')"
        [valor]="almacen.verificado() || null"
        (valorChange)="cambiaVerificado($event)"
        [opciones]="opcionesDeVerificacion()"
        [marcador]="t('filters.all')"
      />
      <!-- El precio es un RANGO, y ahora se dice así: eran dos campos sueltos rotulados «≥» y «≤», sin
           ninguna regla, de modo que teclear un mínimo por encima del máximo dejaba la tabla en blanco
           sin explicar por qué. El componente del sistema de diseño trae ese aviso, y es el mismo que
           usa el catálogo del escaparate. -->
      <nx-rango-numerico
        identificador="filtro-precio"
        [etiqueta]="t('admin.catalog.col.price')"
        [minimo]="almacen.precioMinimo()"
        [maximo]="almacen.precioMaximo()"
        (cambiado)="cambiaElPrecio($event)"
      />
      <nx-filtro-numerico
        [etiqueta]="t('admin.catalog.col.sales') + ' ≥'"
        [valor]="almacen.ventasMinimas()"
        (valorChange)="cambia(almacen.ventasMinimas.set, $event)"
      />
      <nx-filtro-numerico
        [etiqueta]="t('admin.catalog.col.trend') + ' ≥'"
        [valor]="almacen.tendenciaMinima()"
        (valorChange)="cambia(almacen.tendenciaMinima.set, $event)"
      />
      <span class="text-[11px] text-ink-400 md:ml-auto">
        {{ t('pagination.showing') }} <strong>{{ mostrados() }}</strong> / {{ total() }}
      </span>
    </nx-barra-filtros>
  `,
})
export class FiltrosDeCatalogo {
  readonly categorias = input<readonly CategoriaParaElegir[]>([]);
  readonly mostrados = input(0);
  readonly total = input(0);

  protected readonly t = inject(TraduccionService).t;
  protected readonly almacen = inject(CatalogoAdminStore);

  protected readonly opcionesDeEstado = computed<readonly OpcionDeFiltro[]>(() =>
    ESTADOS_DE_PRODUCTO.map((estado) => ({
      valor: estado,
      etiqueta: etiquetaDeEstado(this.t, estado),
    })),
  );

  protected readonly opcionesDeCategoria = computed<readonly OpcionDeFiltro[]>(() =>
    this.categorias().map((categoria) => ({ valor: categoria.id, etiqueta: categoria.etiqueta })),
  );

  protected readonly opcionesDeVerificacion = computed<readonly OpcionDeFiltro[]>(() => [
    { valor: 'true', etiqueta: this.t('admin.catalog.verified.yes') },
    { valor: 'false', etiqueta: this.t('admin.catalog.verified.no') },
  ]);

  /** Cuántos filtros hay puestos: es el número que el móvil enseña sobre el botón de filtros. */
  protected readonly cuantosFiltros = computed(
    () =>
      [
        this.almacen.texto(),
        this.almacen.estado(),
        this.almacen.categoriaId(),
        this.almacen.verificado(),
        this.almacen.precioMinimo(),
        this.almacen.precioMaximo(),
        this.almacen.ventasMinimas(),
        this.almacen.tendenciaMinima(),
      ].filter(Boolean).length,
  );

  protected cambia(fija: (valor: string) => void, valor: string): void {
    this.almacen.fijaFiltro(() => fija(valor));
  }

  /** Los dos extremos viajan juntos: son un solo filtro y se aplican en una sola relectura. */
  protected cambiaElPrecio(rango: RangoPublicado): void {
    this.almacen.fijaFiltro(() => {
      this.almacen.precioMinimo.set(rango.minimo);
      this.almacen.precioMaximo.set(rango.maximo);
    });
  }

  protected cambiaTexto(valor: string): void {
    this.almacen.fijaFiltro(() => this.almacen.texto.set(valor));
  }

  protected cambiaEstado(valor: string | null): void {
    this.almacen.fijaFiltro(() =>
      this.almacen.estado.set((valor as EstadoDeProducto | null) ?? undefined),
    );
  }

  protected cambiaCategoria(valor: string | null): void {
    this.almacen.fijaFiltro(() => this.almacen.categoriaId.set(valor));
  }

  protected cambiaVerificado(valor: string | null): void {
    this.almacen.fijaFiltro(() => this.almacen.verificado.set(valor ?? ''));
  }
}
