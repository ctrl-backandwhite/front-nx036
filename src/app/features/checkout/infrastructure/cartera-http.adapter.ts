import { Injectable, inject } from '@angular/core';
import { ApiService } from '@core/http/api.service';
import { Result, mapea } from '@shared/result/result';
import { AppError } from '@shared/error/app-error';
import { CarteraPort, SaldoDeCartera } from '../domain/port/cartera.port';

/** El saldo del monedero, recortado a los dos datos que el pago necesita. */
@Injectable()
export class CarteraHttpAdapter implements CarteraPort {
  private readonly api = inject(ApiService);

  async saldo(): Promise<Result<SaldoDeCartera, AppError>> {
    const respuesta = await this.api.get<{
      availableUsdCents?: number;
      balanceUsdFormatted?: string;
    }>('/me/wallet');
    return mapea(respuesta, (dto) => ({
      disponibleCentimosUsd: dto?.availableUsdCents ?? 0,
      disponibleFormateado: dto?.balanceUsdFormatted,
    }));
  }
}
