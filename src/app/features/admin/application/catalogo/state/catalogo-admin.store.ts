import { Injectable, computed, inject, signal } from '@angular/core';
import { PreferenciasService } from '@core/preferences/preferencias';
import { TraduccionService } from '@core/i18n/traduccion.service';
import { Divisa, convierte, formateaImporte } from '../../../domain/catalogo/model/divisa';
import {
  CriterioDeCatalogo,
  EstadoDeProducto,
  OrdenDeCatalogo,
  numeroDeFiltro,
  siguienteOrdenDePrecio,
  tendenciaAFraccion,
} from '../../../domain/catalogo/model/producto-admin';

/** Cuántos productos trae cada página del listado. */
export const PRODUCTOS_POR_PAGINA = 30;

/**
 * Los filtros, la página y la selección del listado del catálogo.
 *
 * <p>SOLO GUARDA: no llama al backend. Quien lee es el caso de uso, y tenerlo separado es lo que
 * permite que la página, la barra de acciones y los diálogos de recargo miren el mismo estado sin
 * pasárselo unos a otros.
 *
 * <p>Los filtros numéricos se guardan como TEXTO porque salen de campos de formulario: el vacío es «sin
 * filtro», y convertirlos a número aquí haría que un campo a medio escribir —«1,»— viajara como `NaN`.
 */
@Injectable()
export class CatalogoAdminStore {
  private readonly preferencias = inject(PreferenciasService);
  private readonly traduccion = inject(TraduccionService);

  readonly estado = signal<EstadoDeProducto | undefined>(undefined);
  readonly categoriaId = signal<string | null>(null);
  readonly texto = signal('');
  /** Cadena vacía = todos; `'true'` = certificados; `'false'` = pendientes. Es lo que viaja en la URL. */
  readonly verificado = signal('');
  readonly orden = signal<OrdenDeCatalogo | undefined>(undefined);
  readonly precioMinimo = signal('');
  readonly precioMaximo = signal('');
  readonly ventasMinimas = signal('');
  readonly tendenciaMinima = signal('');
  readonly pagina = signal(0);

  /** Las tasas de cambio, que las trae la pantalla: el almacén no llama a nadie. */
  readonly divisas = signal<readonly Divisa[]>([]);

  private readonly _seleccion = signal<ReadonlySet<string>>(new Set());
  readonly seleccion = this._seleccion.asReadonly();
  readonly seleccionados = computed(() => this._seleccion().size);

  readonly hayFiltros = computed(
    () =>
      !!this.texto() ||
      this.estado() !== undefined ||
      !!this.categoriaId() ||
      !!this.verificado() ||
      !!this.precioMinimo() ||
      !!this.precioMaximo() ||
      !!this.ventasMinimas() ||
      !!this.tendenciaMinima(),
  );

  /**
   * Lo que vale UN yuan en la moneda de quien administra.
   *
   * <p>Hace falta porque la columna «Precio» enseña el COSTE —que el backend guarda en yuanes—
   * convertido a esa moneda, y el filtro tiene que deshacer la conversión con LA MISMA tasa. Sin esto,
   * escribir «20» filtraba por 20 yuanes mientras la tabla enseñaba euros: se filtraba por una cosa y
   * se veía otra.
   */
  private readonly valorDelYuan = computed(
    () => convierte(1, 'CNY', this.preferencias.moneda(), this.divisas()) || 1,
  );

  /** Un importe tecleado en la moneda activa, devuelto a yuanes, que es lo que entiende el servidor. */
  private aYuanes(texto: string): number | undefined {
    const importe = numeroDeFiltro(texto);
    return importe === undefined ? undefined : importe / this.valorDelYuan();
  }

  /** El coste tal como se pinta en la tabla: convertido y formateado en la moneda de quien mira. */
  formatea(importe: number, divisaDeOrigen: string): string {
    const moneda = this.preferencias.moneda();
    const convertido = convierte(importe, divisaDeOrigen, moneda, this.divisas());
    return formateaImporte(convertido, moneda, this.traduccion.idioma());
  }

  readonly criterio = computed<CriterioDeCatalogo>(() => ({
    estado: this.estado(),
    categoriaId: this.categoriaId() ?? undefined,
    texto: this.texto() || undefined,
    verificado: this.verificado() === '' ? undefined : this.verificado() === 'true',
    orden: this.orden(),
    pagina: this.pagina(),
    tamano: PRODUCTOS_POR_PAGINA,
    idioma: this.traduccion.idioma(),
    costeMinimo: this.aYuanes(this.precioMinimo()),
    costeMaximo: this.aYuanes(this.precioMaximo()),
    ventasMinimas: numeroDeFiltro(this.ventasMinimas()),
    tendenciaMinima: tendenciaAFraccion(this.tendenciaMinima()),
  }));

  /** Cambiar un filtro devuelve a la primera página: seguir en la siete de una lista nueva no es útil. */
  fijaFiltro(accion: () => void): void {
    accion();
    this.pagina.set(0);
  }

  limpiaFiltros(): void {
    this.texto.set('');
    this.estado.set(undefined);
    this.categoriaId.set(null);
    this.verificado.set('');
    this.precioMinimo.set('');
    this.precioMaximo.set('');
    this.ventasMinimas.set('');
    this.tendenciaMinima.set('');
    this.pagina.set(0);
  }

  alternaOrdenDePrecio(): void {
    this.orden.set(siguienteOrdenDePrecio(this.orden()));
    this.pagina.set(0);
  }

  alternaSeleccion(id: string): void {
    this._seleccion.update((actual) => {
      const copia = new Set(actual);
      if (copia.has(id)) {
        copia.delete(id);
      } else {
        copia.add(id);
      }
      return copia;
    });
  }

  /** Marca o desmarca de golpe los de la página que se está viendo, nunca el catálogo entero. */
  alternaTodos(ids: readonly string[], marcados: boolean): void {
    this._seleccion.update((actual) => {
      const copia = new Set(actual);
      for (const id of ids) {
        if (marcados) {
          copia.delete(id);
        } else {
          copia.add(id);
        }
      }
      return copia;
    });
  }

  limpiaSeleccion(): void {
    this._seleccion.set(new Set());
  }
}
