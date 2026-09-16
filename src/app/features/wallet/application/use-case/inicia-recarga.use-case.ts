import { Injectable, inject } from '@angular/core';
import { Result, fallo } from '@shared/result/result';
import { AppError, creaError } from '@shared/error/app-error';
import { PreferenciasService } from '@core/preferences/preferencias';
import { MetodoDeRecarga, OpcionesDeRecarga, Recarga, importeValido } from '../../domain/model/recarga';
import { RECARGA_PORT } from '../../domain/port/cartera.port';

/**
 * Abrir una recarga de la cartera.
 *
 * <p>La recarga trabaja SIEMPRE en la divisa activa de la web: el importe se teclea en esa moneda y el
 * backend deriva el dólar canónico y la moneda de cobro. La divisa la pone este caso de uso leyéndola de
 * las preferencias, no la pantalla: así no puede haber dos pantallas que envíen monedas distintas.
 *
 * <p>El importe se valida ANTES de salir a la red. Un «1e999» pegado en el campo viaja como `null` al
 * serializar el JSON, y el servidor recibiría una recarga sin importe.
 */
@Injectable()
export class IniciaRecarga {
  private readonly recarga = inject(RECARGA_PORT);
  private readonly preferencias = inject(PreferenciasService);

  opciones(): Promise<Result<OpcionesDeRecarga, AppError>> {
    return this.recarga.opciones(this.preferencias.moneda());
  }

  /**
   * Clave del intento de recarga: la misma mientras no cambie lo que se recarga, para que el doble clic
   * —o el reintento del navegador— no abran un segundo cobro. Cambia al cambiar método, divisa o importe,
   * porque eso ya es otra intención.
   */
  private intento: { firma: string; clave: string } | null = null;

  private claveDelIntento(peticion: {
    metodo: string;
    divisa: string;
    importe: number;
    cadenaCripto?: string;
  }): string {
    const firma = `${peticion.metodo}|${peticion.divisa}|${peticion.importe}|${peticion.cadenaCripto ?? ''}`;
    if (this.intento?.firma !== firma) {
      this.intento = { firma, clave: crypto.randomUUID() };
    }
    return this.intento.clave;
  }

  ejecuta(
    metodo: MetodoDeRecarga,
    importeTecleado: string,
    cadenaCripto?: string,
  ): Promise<Result<Recarga, AppError>> {
    if (!importeValido(importeTecleado)) {
      return Promise.resolve(fallo(creaError('peticion-invalida')));
    }
    const peticion = {
      metodo,
      divisa: this.preferencias.moneda(),
      importe: Number.parseFloat(importeTecleado),
      cadenaCripto,
    };
    return this.recarga.inicia(peticion, this.claveDelIntento(peticion));
  }
}
