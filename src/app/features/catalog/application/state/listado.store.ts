import { Injectable, computed, signal } from '@angular/core';
import { PaginaDeProductos, ResumenDeProducto } from '../../domain/model/producto';

/**
 * Lo que el comprador lleva desplegado del listado: las páginas acumuladas y sus recuentos.
 *
 * <p>Vive AQUÍ y no dentro de la pantalla por una razón concreta: al entrar en una ficha el componente
 * del listado se destruye, y con él se perdían las páginas cargadas. Al volver, el documento era otra
 * vez corto —36 productos y arriba del todo—, así que la restauración de la posición del enrutador no
 * tenía adónde volver: no es que restaurase mal, es que la altura a la que se estaba ya no existía.
 * El estado cuelga de los proveedores de la RUTA del catálogo, que sí sobreviven a ir a la ficha y
 * volver, y desaparece al recargar el navegador o al salir del contexto.
 *
 * <p>Lo guardado se identifica con una HUELLA —el criterio, el idioma y la baraja, serializados—. Al
 * montar la pantalla, si la huella coincide se restaura tal cual; si cambió un filtro, el orden o se
 * pidió refrescar, la huella es otra y no sirve nada de lo guardado. Es lo que impide que quede
 * memoria rancia de una búsqueda anterior.
 */
@Injectable()
export class ListadoStore {
  private readonly _huella = signal<string | null>(null);
  private readonly _productos = signal<readonly ResumenDeProducto[]>([]);
  private readonly _paginasPedidas = signal(0);
  private readonly _total = signal(0);
  private readonly _totalDePaginas = signal(0);

  readonly productos = this._productos.asReadonly();
  /** Cuántas páginas hay ya traídas. La siguiente que pedir es exactamente este número. */
  readonly paginasPedidas = this._paginasPedidas.asReadonly();
  readonly total = this._total.asReadonly();
  readonly hayMas = computed(() => this._paginasPedidas() < this._totalDePaginas());

  /** ¿Lo guardado sirve para esta búsqueda? Solo si es la misma y hay algo que enseñar. */
  sirve(huella: string): boolean {
    return this._huella() === huella && this._productos().length > 0;
  }

  /** Tira lo guardado y anota para qué búsqueda se va a llenar. */
  empieza(huella: string): void {
    this._huella.set(huella);
    this._productos.set([]);
    this._paginasPedidas.set(0);
    this._total.set(0);
    this._totalDePaginas.set(0);
  }

  /**
   * Guarda una página recién traída.
   *
   * <p>Se exige la huella con la que se pidió y se descarta lo que llegue con otra. Dos cambios de
   * filtro seguidos dejan dos peticiones en el aire, y si la primera contesta la última, sus productos
   * se guardarían bajo la huella del filtro nuevo: la pantalla enseñaría el resultado equivocado y,
   * peor, al volver de una ficha lo daría por bueno sin volver a preguntar. Antes de que el estado
   * sobreviviera a la navegación esto se corregía solo al remontar; ahora no.
   */
  guarda(huella: string, datos: PaginaDeProductos): void {
    if (this._huella() !== huella) {
      return;
    }
    this._productos.update((previos) => [...previos, ...datos.items]);
    this._paginasPedidas.update((cuantas) => cuantas + 1);
    this._total.set(datos.total);
    this._totalDePaginas.set(datos.totalDePaginas);
  }
}
