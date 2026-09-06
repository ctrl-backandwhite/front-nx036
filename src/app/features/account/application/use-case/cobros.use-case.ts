import { Injectable, inject } from '@angular/core';
import { Result, exito, fallo } from '@shared/result/result';
import { AppError, creaError } from '@shared/error/app-error';
import { cobroConTarjetaDisponible, titularDeTarjetaValido } from '../../domain/model/cobro';
import { CampoDeTarjeta, METODOS_DE_PAGO_PORT } from '../../domain/port/cobros.port';
import { CobrosStore } from '../state/cobros.store';

/** El titular de la tarjeta llegó vacío. Lo comprueba el negocio, no el formulario. */
export const FALTA_EL_TITULAR = 'BILLING_CARD_NAME_REQUIRED';

/**
 * Trae la configuración de cobro y, si hay pasarela, los métodos guardados.
 *
 * <p>El orden importa: sin pasarela activa NO se pide la lista. Pedirla igualmente era una llamada
 * condenada al error en toda instalación sin cobros configurados, y ensuciaba el registro con fallos que
 * no lo eran.
 */
@Injectable()
export class CargaCobros {
  private readonly metodos = inject(METODOS_DE_PAGO_PORT);
  private readonly almacen = inject(CobrosStore);

  async ejecuta(): Promise<Result<void, AppError>> {
    const configuracion = await this.metodos.configuracion();
    if (!configuracion.ok) {
      // Sin configuración la sección no se pinta. No es un error que haya que enseñar: es que esta
      // instalación no cobra con tarjeta.
      this.almacen.fijaConfiguracion(null);
      return configuracion;
    }
    this.almacen.fijaConfiguracion(configuracion.valor);
    if (!cobroConTarjetaDisponible(configuracion.valor)) {
      return exito(undefined);
    }
    return this.refrescaMetodos();
  }

  async refrescaMetodos(): Promise<Result<void, AppError>> {
    const lista = await this.metodos.lista();
    if (!lista.ok) {
      return lista;
    }
    this.almacen.fijaMetodos(lista.valor);
    return exito(undefined);
  }
}

/**
 * Guarda una tarjeta nueva.
 *
 * <p>Tres pasos que van SIEMPRE juntos: abrir la intención en nuestro servidor, dejar que la pasarela
 * confirme el alta con los datos que solo ella ha visto, y refrescar la lista. El número de la tarjeta
 * no pasa por aquí en ningún momento: vive dentro del campo de la pasarela y de ahí no sale.
 */
@Injectable()
export class AnadeTarjeta {
  private readonly metodos = inject(METODOS_DE_PAGO_PORT);
  private readonly cobros = inject(CargaCobros);

  async ejecuta(campo: CampoDeTarjeta, titular: string): Promise<Result<void, AppError>> {
    if (!titularDeTarjetaValido(titular)) {
      return fallo(creaError('peticion-invalida', '', { codigo: FALTA_EL_TITULAR }));
    }
    const secreto = await this.metodos.abreAltaDeTarjeta();
    if (!secreto.ok) {
      return secreto;
    }
    const alta = await campo.confirmaAlta(secreto.valor, titular);
    if (!alta.ok) {
      return alta;
    }
    campo.limpia();
    return this.cobros.refrescaMetodos();
  }
}

/** Guarda una cuenta de PayPal como método de pago. El correo se cifra en el servidor. */
@Injectable()
export class AnadePaypal {
  private readonly metodos = inject(METODOS_DE_PAGO_PORT);
  private readonly cobros = inject(CargaCobros);

  async ejecuta(correo: string): Promise<Result<void, AppError>> {
    const resultado = await this.metodos.guardaPaypal(correo.trim());
    return resultado.ok ? this.cobros.refrescaMetodos() : resultado;
  }
}

/** Cambia cuál es el método con el que se cobra por omisión. */
@Injectable()
export class MarcaMetodoPorDefecto {
  private readonly metodos = inject(METODOS_DE_PAGO_PORT);
  private readonly cobros = inject(CargaCobros);

  async ejecuta(referencia: string): Promise<Result<void, AppError>> {
    const resultado = await this.metodos.marcaPorDefecto(referencia);
    return resultado.ok ? this.cobros.refrescaMetodos() : resultado;
  }
}

/**
 * Paso 1 de la baja de un método de pago: pedir el código por correo.
 *
 * <p>Se confirma por correo porque quitar la tarjeta con la que se cobra la suscripción es una acción
 * con consecuencias: quien entrara un minuto con la sesión abierta podría dejar la cuenta sin cobro y
 * sin que el titular se enterara.
 */
@Injectable()
export class PideCodigoDeBajaDeMetodo {
  private readonly metodos = inject(METODOS_DE_PAGO_PORT);

  async ejecuta(referencia: string): Promise<Result<void, AppError>> {
    return this.metodos.pideCodigoDeBaja(referencia);
  }
}

/** Paso 2: eliminar el método validando el código recibido. */
@Injectable()
export class EliminaMetodoDePago {
  private readonly metodos = inject(METODOS_DE_PAGO_PORT);
  private readonly cobros = inject(CargaCobros);

  async ejecuta(referencia: string, codigo: string): Promise<Result<void, AppError>> {
    const resultado = await this.metodos.elimina(referencia, codigo.trim());
    return resultado.ok ? this.cobros.refrescaMetodos() : resultado;
  }
}
