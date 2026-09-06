import { Injectable, inject } from '@angular/core';
import { ApiService } from '@core/http/api.service';
import { Result, mapea } from '@shared/result/result';
import { AppError } from '@shared/error/app-error';
import { MetodoDeRecarga, OpcionesDeRecarga, Recarga } from '../domain/model/recarga';
import { PeticionDeRecarga, RecargaPort } from '../domain/port/cartera.port';

interface RecargaDto {
  paymentId: string;
  method: MetodoDeRecarga;
  status: string;
  amountUsdCents: number;
  chargeCurrency?: string;
  chargeFormatted?: string;
  provider: string;
  clientSecret?: string;
  approveUrl?: string;
  cryptoAddress?: string;
  cryptoChain?: string;
  qrUrl?: string;
}

interface OpcionesDto {
  currency: string;
  symbol: string;
  presets: { amount: number; formatted: string }[];
}

/** El cobro de la recarga contra nuestro backend. Se registra en `wallet.providers.ts`. */
@Injectable()
export class RecargaHttpAdapter implements RecargaPort {
  private readonly api = inject(ApiService);

  async opciones(divisa: string): Promise<Result<OpcionesDeRecarga, AppError>> {
    const respuesta = await this.api.get<OpcionesDto>('/me/wallet/recharge/options', {
      currency: divisa,
    });
    return mapea(respuesta, (dto) => ({
      divisa: dto.currency,
      simbolo: dto.symbol,
      sugeridos: (dto.presets ?? []).map((p) => ({ importe: p.amount, formateado: p.formatted })),
    }));
  }

  /**
   * Abre la recarga.
   *
   * <p>Se manda el importe en la divisa ACTIVA y es el backend quien deriva el dólar canónico y la
   * moneda de cobro. Mandar ya convertido significaría dos tipos de cambio distintos —el del navegador y
   * el del servidor— para un mismo cobro.
   */
  async inicia(peticion: PeticionDeRecarga): Promise<Result<Recarga, AppError>> {
    const respuesta = await this.api.post<RecargaDto>('/me/wallet/recharge', {
      method: peticion.metodo,
      currencyDisplay: peticion.divisa,
      amountDisplay: peticion.importe,
      cryptoChain: peticion.metodo === 'USDT' ? peticion.cadenaCripto : undefined,
    });
    return mapea(respuesta, (dto) => ({
      idDePago: dto.paymentId,
      metodo: dto.method,
      estado: dto.status,
      importeFormateado: dto.chargeFormatted ?? `$${(dto.amountUsdCents / 100).toFixed(2)}`,
      divisaDeCobro: dto.chargeCurrency ?? 'USD',
      proveedor: dto.provider,
      secretoDeCliente: dto.clientSecret,
      urlDeAprobacion: dto.approveUrl,
      direccionCripto: dto.cryptoAddress,
      cadenaCripto: dto.cryptoChain,
      urlQr: dto.qrUrl,
    }));
  }

  async confirma(idDePago: string): Promise<Result<void, AppError>> {
    return mapea(
      await this.api.post<unknown>(`/me/wallet/recharge/${idDePago}/confirm`),
      () => undefined,
    );
  }

  async capturaPaypal(idDePago: string): Promise<Result<void, AppError>> {
    return mapea(
      await this.api.post<unknown>(
        `/me/wallet/paypal/capture?paymentId=${encodeURIComponent(idDePago)}`,
      ),
      () => undefined,
    );
  }

  async confirmaSimulada(idDePago: string): Promise<Result<void, AppError>> {
    return mapea(
      await this.api.post<unknown>(
        `/me/wallet/confirm-mock?paymentId=${encodeURIComponent(idDePago)}`,
      ),
      () => undefined,
    );
  }
}
