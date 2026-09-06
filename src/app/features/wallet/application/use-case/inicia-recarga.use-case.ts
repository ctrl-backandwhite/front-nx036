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

  ejecuta(
    metodo: MetodoDeRecarga,
    importeTecleado: string,
    cadenaCripto?: string,
  ): Promise<Result<Recarga, AppError>> {
    if (!importeValido(importeTecleado)) {
      return Promise.resolve(fallo(creaError('peticion-invalida')));
    }
    return this.recarga.inicia({
      metodo,
      divisa: this.preferencias.moneda(),
      importe: Number.parseFloat(importeTecleado),
      cadenaCripto,
    });
  }
}
