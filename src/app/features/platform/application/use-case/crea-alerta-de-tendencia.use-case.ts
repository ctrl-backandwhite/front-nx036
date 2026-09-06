import { Injectable, inject } from '@angular/core';
import { Result } from '@shared/result/result';
import { AppError } from '@shared/error/app-error';
import { AlertaDeTendencia, umbralNormalizado } from '../../domain/model/inteligencia';
import { ALERTAS_DE_TENDENCIA_PORT } from '../../domain/port/inteligencia.port';

/**
 * Crear una alerta de tendencia.
 *
 * <p>Existe por el CAMBIO DE ESCALA: el formulario pide el umbral de 0 a 100, que es como se enseña la
 * puntuación en la tabla, y el backend lo guarda de 0 a 1. Hacer esa cuenta en la plantilla es
 * exactamente cómo se acaba con dos conversiones distintas del mismo número; hacerla aquí la deja en un
 * sitio y probada.
 */
@Injectable()
export class CreaAlertaDeTendencia {
  private readonly alertas = inject(ALERTAS_DE_TENDENCIA_PORT);

  async ejecuta(
    palabraClave: string,
    umbralSobreCien: string,
    canal: string,
  ): Promise<Result<AlertaDeTendencia, AppError>> {
    return this.alertas.crea({
      palabraClave: palabraClave.trim() || undefined,
      umbral: umbralNormalizado(umbralSobreCien),
      canal,
    });
  }
}
