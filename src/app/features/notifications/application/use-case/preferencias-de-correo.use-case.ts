import { Injectable, inject, signal } from '@angular/core';
import { Result } from '@shared/result/result';
import { AppError } from '@shared/error/app-error';
import { PREFERENCIAS_DE_CORREO_PORT } from '../../domain/port/boletin.port';

/**
 * Qué correos quiere recibir quien ya tiene cuenta.
 *
 * <p>Se guarda el «no quiero publicidad» y no el «sí quiero»: es el campo que manda el backend, y darle
 * la vuelta aquí en vez de en la pantalla evita el error clásico de guardar lo contrario de lo que se
 * pulsó. La pantalla enseña el interruptor en positivo; el dominio y el servidor hablan en negativo.
 */
@Injectable({ providedIn: 'root' })
export class PreferenciasDeCorreo {
  private readonly puerto = inject(PREFERENCIAS_DE_CORREO_PORT);

  private readonly _sinPublicidad = signal<boolean | null>(null);

  /** `null` mientras no se sepa: pintar un interruptor apagado antes de saberlo miente. */
  readonly sinPublicidad = this._sinPublicidad.asReadonly();

  async consulta(): Promise<void> {
    const resultado = await this.puerto.consulta();
    if (resultado.ok) {
      this._sinPublicidad.set(resultado.valor.sinPublicidad);
    }
    // Si no se puede saber, no se pinta el interruptor: enseñarlo en una posición inventada es peor.
  }

  /** @param quiereRecibir lo que acaba de marcar quien mira, en positivo. */
  async fija(quiereRecibir: boolean): Promise<Result<void, AppError>> {
    const resultado = await this.puerto.actualiza(!quiereRecibir);
    if (resultado.ok) {
      this._sinPublicidad.set(resultado.valor.sinPublicidad);
      return { ok: true, valor: undefined };
    }
    return resultado;
  }
}
