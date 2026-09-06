import { Injectable, inject } from '@angular/core';
import { ApiService } from '@core/http/api.service';
import { Result, mapea } from '@shared/result/result';
import { AppError } from '@shared/error/app-error';
import { TasaDeCambio } from '../domain/model/tasa-de-cambio';
import { TasasDeCambioPort } from '../domain/port/tasas-de-cambio.port';

interface DivisaDto {
  code: string;
  rateVsUsd: number;
}

/**
 * La tabla de cambio del día.
 *
 * <p>Adaptador PROVISIONAL, igual que su puerto: cuando `core` publique el servicio de divisas de la
 * aplicación, esta clase se borra y el token se ata a aquel. Lo que no cambia es lo que ven las
 * pantallas, porque solo conocen la interfaz.
 */
@Injectable()
export class TasasDeCambioHttpAdapter implements TasasDeCambioPort {
  private readonly api = inject(ApiService);

  async consulta(): Promise<Result<readonly TasaDeCambio[], AppError>> {
    return mapea(await this.api.get<DivisaDto[]>('/currency/rates'), (filas) =>
      filas.map((dto) => ({
        codigo: dto.code,
        // Una tasa de cero o ausente convertiría todo a infinito. Se cae a 1, que como mucho enseña el
        // importe en su divisa de origen: es un fallo visible, no un número inventado.
        porDolar: Number(dto.rateVsUsd) > 0 ? Number(dto.rateVsUsd) : 1,
      })),
    );
  }
}
