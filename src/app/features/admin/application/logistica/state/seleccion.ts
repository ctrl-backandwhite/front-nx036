import { Signal, computed, signal } from '@angular/core';

/**
 * Qué filas hay marcadas en una tabla con acciones en lote.
 *
 * <p>Es una clase suelta y no un servicio inyectable a propósito: cada tabla tiene SU selección, y un
 * servicio compartido haría que marcar tres pedidos dejara marcados tres almacenes al cambiar de
 * pantalla. Se instancia como campo del componente.
 *
 * <p>Solo GUARDA: no llama a nadie ni decide nada. Quien provoca efectos con lo marcado es el caso de
 * uso.
 */
export class Seleccion {
  private readonly _marcados = signal<ReadonlySet<string>>(new Set());

  readonly marcados = this._marcados.asReadonly();
  readonly cuantos = computed(() => this._marcados().size);
  readonly hayAlguno = computed(() => this._marcados().size > 0);

  tiene(id: string): boolean {
    return this._marcados().has(id);
  }

  alterna(id: string): void {
    this._marcados.update((actuales) => {
      const nuevos = new Set(actuales);
      if (nuevos.has(id)) {
        nuevos.delete(id);
      } else {
        nuevos.add(id);
      }
      return nuevos;
    });
  }

  /**
   * Marca o desmarca TODAS las de la lista dada.
   *
   * <p>Se le pasan las visibles y no se guardan «todas» porque al cambiar de página lo visible cambia:
   * la casilla de la cabecera significa «las de esta pantalla», que es lo que espera quien la pulsa.
   */
  alternaTodos(ids: readonly string[]): void {
    const todosMarcados = this.todosMarcados(ids);
    this._marcados.update((actuales) => {
      const nuevos = new Set(actuales);
      for (const id of ids) {
        if (todosMarcados) {
          nuevos.delete(id);
        } else {
          nuevos.add(id);
        }
      }
      return nuevos;
    });
  }

  /** Una lista vacía NO cuenta como «todas marcadas»: dejaría la casilla de cabecera activada sin filas. */
  todosMarcados(ids: readonly string[]): boolean {
    const marcados = this._marcados();
    return ids.length > 0 && ids.every((id) => marcados.has(id));
  }

  /** Señal derivada de si están todas las visibles, para atarla a la casilla de la cabecera. */
  todosMarcadosDe(ids: Signal<readonly string[]>): Signal<boolean> {
    return computed(() => this.todosMarcados(ids()));
  }

  limpia(): void {
    this._marcados.set(new Set());
  }

  /** Las filas marcadas, de entre las que se le den. Conserva el orden de la lista, no el de marcado. */
  filasDe<T extends { readonly id: string }>(filas: readonly T[]): readonly T[] {
    const marcados = this._marcados();
    return filas.filter((fila) => marcados.has(fila.id));
  }
}
