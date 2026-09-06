import { Component, computed, inject, input } from '@angular/core';
import { TraduccionService } from '@core/i18n/traduccion.service';
import { BarraFiltros } from '@ds/component/filtros/barra-filtros';
import { FiltroSeleccion, OpcionFiltro } from '@ds/component/filtros/filtro-seleccion';
import { CampoBusqueda } from '@ds/component/campo-busqueda/campo-busqueda';
import { CatalogoAdminStore } from '../../../application/catalogo/state/catalogo-admin.store';
import {
  ESTADOS_DE_PRODUCTO,
  EstadoDeProducto,
} from '../../../domain/catalogo/model/producto-admin';
import { CategoriaParaElegir } from '../../../domain/catalogo/port/categorias-admin.port';
import { etiquetaDeEstado } from '../etiquetas';
import { FiltroNumerico } from './filtro-numerico';

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
  imports: [BarraFiltros, FiltroSeleccion, CampoBusqueda, FiltroNumerico],
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
      <nx-filtro-seleccion
        [etiqueta]="t('admin.catalog.col.status')"
        [valor]="almacen.estado() ?? null"
        (valorChange)="cambiaEstado($event)"
        [opciones]="opcionesDeEstado()"
        [marcador]="t('filters.all')"
      />
      <nx-filtro-seleccion
        [etiqueta]="t('filters.category')"
        [valor]="almacen.categoriaId()"
        (valorChange)="cambiaCategoria($event)"
        [opciones]="opcionesDeCategoria()"
        [marcador]="t('filters.all')"
      />
      <nx-filtro-seleccion
        [etiqueta]="t('admin.catalog.col.verified')"
        [valor]="almacen.verificado() || null"
        (valorChange)="cambiaVerificado($event)"
        [opciones]="opcionesDeVerificacion()"
        [marcador]="t('filters.all')"
      />
      <nx-filtro-numerico
        [etiqueta]="t('admin.catalog.col.price') + ' ≥'"
        [valor]="almacen.precioMinimo()"
        (valorChange)="cambia(almacen.precioMinimo.set, $event)"
        ancho="w-24"
      />
      <nx-filtro-numerico
        [etiqueta]="t('admin.catalog.col.price') + ' ≤'"
        [valor]="almacen.precioMaximo()"
        (valorChange)="cambia(almacen.precioMaximo.set, $event)"
        ancho="w-24"
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

  protected readonly opcionesDeEstado = computed<readonly OpcionFiltro[]>(() =>
    ESTADOS_DE_PRODUCTO.map((estado) => ({
      value: estado,
      label: etiquetaDeEstado(this.t, estado),
    })),
  );

  protected readonly opcionesDeCategoria = computed<readonly OpcionFiltro[]>(() =>
    this.categorias().map((categoria) => ({ value: categoria.id, label: categoria.etiqueta })),
  );

  protected readonly opcionesDeVerificacion = computed<readonly OpcionFiltro[]>(() => [
    { value: 'true', label: this.t('admin.catalog.verified.yes') },
    { value: 'false', label: this.t('admin.catalog.verified.no') },
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
