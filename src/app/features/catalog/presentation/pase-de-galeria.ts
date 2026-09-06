import { DestroyRef, Injectable, inject, signal } from '@angular/core';
import { DOCUMENT } from '@angular/core';
import {
  ESPERA_INICIAL_MS,
  MAXIMO_DE_FOTOS_DEL_PASE,
  PASO_DEL_PASE_MS,
  pasosDelPase,
} from '../domain/model/galeria';

/**
 * El pase automático de la galería de la ficha.
 *
 * <p>Recorre las primeras fotos UNA sola vez y termina volviendo a la primera, donde se queda.
 * Cualquier interacción de quien mira lo detiene DEFINITIVAMENTE: no se reanuda, porque quien está
 * mirando una foto concreta manda sobre la animación.
 *
 * <p>No arranca con una sola imagen, ni si el sistema pide reducir el movimiento. Esto último no es un
 * detalle de cortesía: hay gente a la que el movimiento automático le provoca mareo.
 *
 * <p>Es un servicio y no un componente porque no pinta nada: solo dice qué foto toca. La galería, que
 * sí pinta, no tiene por qué conocerlo.
 */
@Injectable()
export class PaseDeGaleria {
  private readonly documento = inject(DOCUMENT);
  private readonly _corriendo = signal(false);

  /** Mientras corre, el fundido es largo; en cuanto lo corta alguien, los cambios son inmediatos. */
  readonly corriendo = this._corriendo.asReadonly();

  private temporizador: ReturnType<typeof setTimeout> | undefined;
  private cancelado = false;

  constructor() {
    inject(DestroyRef).onDestroy(() => this.cancela());
  }

  /**
   * Empieza el recorrido. Se vuelve a llamar al cambiar de producto: cada ficha estrena su pase.
   *
   * @param cuantasFotos cuántas tiene la galería
   * @param avanza a qué foto hay que saltar en cada paso
   */
  arranca(cuantasFotos: number, avanza: (indice: number) => void): void {
    this.cancela();
    this.cancelado = false;

    const pasos = pasosDelPase(cuantasFotos, MAXIMO_DE_FOTOS_DEL_PASE);
    if (pasos === 0 || this.pideMenosMovimiento()) {
      return;
    }

    // Empieza en 1: la foto 0 ya está visible al entrar en la ficha.
    let indice = 1;
    const paso = (): void => {
      if (this.cancelado) {
        return;
      }
      if (indice >= pasos) {
        // Fin del recorrido: vuelve a la primera y se queda ahí.
        avanza(0);
        this._corriendo.set(false);
        return;
      }
      avanza(indice);
      indice += 1;
      this.temporizador = setTimeout(paso, PASO_DEL_PASE_MS);
    };

    this._corriendo.set(true);
    this.temporizador = setTimeout(paso, ESPERA_INICIAL_MS);
  }

  /** Detiene el pase para siempre. Es idempotente: llamarlo dos veces no hace nada raro. */
  cancela(): void {
    this.cancelado = true;
    clearTimeout(this.temporizador);
    this.temporizador = undefined;
    this._corriendo.set(false);
  }

  private pideMenosMovimiento(): boolean {
    const ventana = this.documento.defaultView;
    // Al prerenderizar no hay ventana y no hay nada que animar: se sale sin arrancar.
    return !ventana?.matchMedia
      ? true
      : ventana.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }
}
