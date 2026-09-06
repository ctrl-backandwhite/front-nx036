import { Injectable, inject } from '@angular/core';
import { Result, exito } from '@shared/result/result';
import { AppError } from '@shared/error/app-error';
import { DatosDePerfil } from '../../domain/model/perfil';
import { PERFIL_PORT } from '../../domain/port/perfil.port';
import { RecuperaCuenta } from './recupera-cuenta.use-case';

/**
 * Guarda los datos personales.
 *
 * <p>Después de guardar VUELVE a leer el titular. No es un adorno: el servidor normaliza el teléfono,
 * puede recortar el nombre y decide qué idioma queda activo, así que sin releer la pantalla enseñaría lo
 * que se tecleó y no lo que quedó guardado — y el siguiente guardado escribiría encima lo viejo.
 */
@Injectable({ providedIn: 'root' })
export class GuardaPerfil {
  private readonly perfil = inject(PERFIL_PORT);
  private readonly recupera = inject(RecuperaCuenta);

  async ejecuta(datos: DatosDePerfil): Promise<Result<void, AppError>> {
    const resultado = await this.perfil.actualiza(datos);
    if (!resultado.ok) {
      return resultado;
    }
    await this.recupera.ejecuta();
    return exito(undefined);
  }
}
