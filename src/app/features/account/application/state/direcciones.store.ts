import { Injectable, computed, signal } from '@angular/core';
import { Direccion } from '../../domain/model/direccion';

/** Cuántas direcciones caben en la pestaña del perfil antes de mandar a la página completa. */
export const DIRECCIONES_EN_EL_PERFIL = 4;

/**
 * El libro de direcciones, en memoria.
 *
 * <p>Lo comparten la pestaña del perfil y la página de direcciones, que es lo que permite que guardar
 * en una se vea en la otra sin volver a preguntar al servidor.
 */
@Injectable()
export class DireccionesStore {
  private readonly _direcciones = signal<readonly Direccion[]>([]);
  private readonly _cargando = signal(false);
  private readonly _cargadas = signal(false);

  readonly direcciones = this._direcciones.asReadonly();
  readonly cargando = this._cargando.asReadonly();
  readonly cargadas = this._cargadas.asReadonly();

  readonly vacio = computed(() => this._cargadas() && this._direcciones().length === 0);

  /** Las que caben en el perfil; el resto se ven en la página dedicada. */
  readonly primeras = computed(() => this._direcciones().slice(0, DIRECCIONES_EN_EL_PERFIL));

  readonly cuantasSobran = computed(() =>
    Math.max(0, this._direcciones().length - DIRECCIONES_EN_EL_PERFIL),
  );

  /** La primera dirección de una cuenta se marca por defecto sola: no hay nada con qué competir. */
  readonly seraLaPrimera = computed(() => this._direcciones().length === 0);

  fija(direcciones: readonly Direccion[]): void {
    this._direcciones.set(direcciones);
    this._cargadas.set(true);
  }

  marcaCargando(cargando: boolean): void {
    this._cargando.set(cargando);
  }
}
