import { Injectable, inject } from '@angular/core';
import { REFERIDO_PORT } from '../../domain/port/referido.port';

/** Cómo acabó aplicar un código. */
export type ResultadoDelReferido = 'aplicado' | 'no-valido';

/**
 * Atribuye la venta a quien la recomendó.
 *
 * <p>NO cambia el importe a pagar: solo apunta de dónde vino la compra para que el pedido calcule la
 * comisión. Se puede aplicar aunque se haya llegado por un enlace —entonces ya viene puesto— o
 * escribiéndolo a mano en el pago.
 *
 * <p>Un código que no existe NO es un error de la aplicación: es una respuesta legítima del servidor que
 * hay que enseñar bajo el campo. Por eso vuelve como valor y no como fallo.
 */
@Injectable()
export class AplicaElReferido {
  private readonly puerto = inject(REFERIDO_PORT);

  /** El que venía guardado de haber llegado por un enlace, si lo hubo. */
  pendiente(): string | null {
    return this.puerto.pendiente();
  }

  async ejecuta(codigo: string): Promise<ResultadoDelReferido> {
    const limpio = codigo.trim();
    if (!limpio) {
      return 'no-valido';
    }
    const resultado = await this.puerto.aplica(limpio);
    return resultado.ok && resultado.valor ? 'aplicado' : 'no-valido';
  }
}
