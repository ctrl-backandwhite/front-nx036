import { Injectable, inject } from '@angular/core';
import { ApiService } from '@core/http/api.service';
import { Result, mapea } from '@shared/result/result';
import { AppError } from '@shared/error/app-error';
import { CobroConTarjetaGuardada, CobroIniciado, MetodoGuardado } from '../domain/model/pago';
import { MetodoDePago } from '../domain/model/pedido';
import {
  ConfiguracionDePasarela,
  MetodosDePagoPort,
  PagoConTarjetaGuardadaPort,
  PagoPort,
} from '../domain/port/pago.port';

interface CobroDto {
  id: string;
  orderId?: string;
  approveUrl?: string;
  cryptoAddress?: string;
  cryptoChain?: string;
  cryptoExpiresAt?: string;
}

/** El cobro de un pedido contra nuestro backend. */
@Injectable()
export class PagoHttpAdapter implements PagoPort {
  private readonly api = inject(ApiService);

  async inicia(
    idDePedido: string,
    metodo: MetodoDePago,
  ): Promise<Result<CobroIniciado, AppError>> {
    const respuesta = await this.api.post<CobroDto>(`/me/orders/${idDePedido}/payment-intent`, {
      method: metodo,
    });
    return mapea(respuesta, (dto) => ({
      id: dto.id,
      idDePedido: dto.orderId ?? idDePedido,
      urlDeAprobacion: dto.approveUrl,
      deposito: dto.cryptoAddress
        ? { direccion: dto.cryptoAddress, red: dto.cryptoChain, caducaEl: dto.cryptoExpiresAt }
        : undefined,
    }));
  }

  async confirma(idDePedido: string, idDeCobro: string): Promise<Result<void, AppError>> {
    return mapea(
      await this.api.post<void>(`/me/orders/${idDePedido}/payments/${idDeCobro}/confirm`),
      () => undefined,
    );
  }

  async confirmaSimulado(idDePedido: string, idDeCobro: string): Promise<Result<void, AppError>> {
    return mapea(
      await this.api.post<void>(`/me/orders/${idDePedido}/payments/${idDeCobro}/confirm-mock`),
      () => undefined,
    );
  }
}

/** El cobro con tarjeta guardada: sucede en el servidor y solo sale al navegador si el banco lo exige. */
@Injectable()
export class PagoConTarjetaGuardadaHttpAdapter implements PagoConTarjetaGuardadaPort {
  private readonly api = inject(ApiService);

  async cobra(
    idDePedido: string,
    idDeMetodo: string,
  ): Promise<Result<CobroConTarjetaGuardada, AppError>> {
    const respuesta = await this.api.post<{
      status: string;
      clientSecret: string | null;
      paymentId: string | null;
    }>(`/me/orders/${idDePedido}/pay-saved-card`, { paymentMethodId: idDeMetodo });
    return mapea(respuesta, (dto) => ({
      resuelto: dto.status === 'succeeded',
      secretoDeCliente: dto.clientSecret ?? undefined,
      idDeCobro: dto.paymentId ?? undefined,
    }));
  }

  async confirma(idDePedido: string, idDeCobro: string): Promise<Result<void, AppError>> {
    return mapea(
      await this.api.post<void>(`/me/orders/${idDePedido}/pay-saved-card/${idDeCobro}/confirm`),
      () => undefined,
    );
  }
}

interface MetodoDto {
  id: string;
  type: 'CARD' | 'PAYPAL';
  brand?: string;
  last4?: string;
  paypalEmail?: string;
  isDefault: boolean;
}

/** Los métodos ya guardados y la configuración de la pasarela. */
@Injectable()
export class MetodosDePagoHttpAdapter implements MetodosDePagoPort {
  private readonly api = inject(ApiService);

  async guardados(): Promise<Result<readonly MetodoGuardado[], AppError>> {
    const respuesta = await this.api.get<MetodoDto[]>('/me/payment-methods');
    return mapea(respuesta, (lista) =>
      (lista ?? []).map((dto) => ({
        id: dto.id,
        clase: dto.type,
        marca: dto.brand,
        ultimosCuatro: dto.last4,
        correoDePaypal: dto.paypalEmail,
        porDefecto: dto.isDefault,
      })),
    );
  }

  async configuracion(): Promise<Result<ConfiguracionDePasarela, AppError>> {
    const respuesta = await this.api.get<{ publishableKey?: string; enabled?: boolean }>(
      '/me/billing/config',
    );
    return mapea(respuesta, (dto) => ({
      clavePublica: dto?.publishableKey,
      habilitada: dto?.enabled === true,
    }));
  }
}
