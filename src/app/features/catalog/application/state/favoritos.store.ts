import { Injectable, computed, signal } from '@angular/core';

/**
 * Los identificadores de lo marcado con el corazón.
 *
 * <p>Se cargan UNA vez y los comparten todas las tarjetas de la cuadrícula: con cien productos en
 * pantalla, preguntar por cada uno serían cien peticiones para pintar cien iconos.
 *
 * <p>El alternado es OPTIMISTA —se pinta antes de que conteste el servidor— porque un corazón que
 * tarda medio segundo en encenderse se percibe como que no ha funcionado, y la gente vuelve a pulsar.
 * Deshacerlo si falla es cosa del caso de uso.
 */
@Injectable()
export class FavoritosStore {
  private readonly _ids = signal<ReadonlySet<string>>(new Set());
  private readonly _cargados = signal(false);

  readonly cuantos = computed(() => this._ids().size);
  readonly cargados = this._cargados.asReadonly();

  /** Se expone como signal para que una tarjeta se repinte sola al marcarla desde otra pantalla. */
  readonly ids = this._ids.asReadonly();

  esFavorito(id: string): boolean {
    return this._ids().has(id);
  }

  fija(ids: readonly string[]): void {
    this._ids.set(new Set(ids));
    this._cargados.set(true);
  }

  alterna(id: string): void {
    this._ids.update((actuales) => {
      const siguiente = new Set(actuales);
      if (!siguiente.delete(id)) {
        siguiente.add(id);
      }
      return siguiente;
    });
  }

  limpia(): void {
    this._ids.set(new Set());
    this._cargados.set(false);
  }
}
