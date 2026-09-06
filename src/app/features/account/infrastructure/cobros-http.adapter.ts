import { Injectable, inject } from '@angular/core';
import { ApiService } from '@core/http/api.service';
import { Result, mapea } from '@shared/result/result';
import { AppError } from '@shared/error/app-error';
import { ConfiguracionDeCobro, MetodoDePago, TipoDeMetodo } from '../domain/model/cobro';
import { MetodosDePagoPort } from '../domain/port/cobros.port';

interface ConfiguracionDto {
  publishableKey: string;
  enabled: boolean;
  freeTrialUsed?: boolean;
}

interface MetodoDePagoDto {
  id: string;
  type: 'CARD' | 'PAYPAL';
  paypalEmail?: string;
  brand?: string;
  last4?: string;
  expMonth?: number;
  expYear?: number;
  isDefault: boolean;
}

function aMetodo(dto: MetodoDePagoDto): MetodoDePago {
  const tipo: TipoDeMetodo = dto.type === 'PAYPAL' ? 'PAYPAL' : 'TARJETA';
  return {
    referencia: dto.id,
    tipo,
    correoPaypal: dto.paypalEmail,
    marca: dto.brand,
    ultimosCuatro: dto.last4,
    mesDeCaducidad: dto.expMonth,
    anioDeCaducidad: dto.expYear,
    porDefecto: dto.isDefault,
  };
}

@Injectable()
export class CobrosHttpAdapter implements MetodosDePagoPort {
  private readonly api = inject(ApiService);

  async configuracion(): Promise<Result<ConfiguracionDeCobro, AppError>> {
    return mapea(await this.api.get<ConfiguracionDto>('/me/billing/config'), (dto) => ({
      clavePublicable: dto.publishableKey ?? '',
      activo: !!dto.enabled,
      pruebaGratisGastada: !!dto.freeTrialUsed,
    }));
  }

  async lista(): Promise<Result<readonly MetodoDePago[], AppError>> {
    return mapea(await this.api.get<MetodoDePagoDto[]>('/me/payment-methods'), (lista) =>
      lista.map(aMetodo),
    );
  }

  async marcaPorDefecto(referencia: string): Promise<Result<void, AppError>> {
    const camino = `/me/payment-methods/${encodeURIComponent(referencia)}/default`;
    return mapea(await this.api.post<unknown>(camino), () => undefined);
  }

  async guardaPaypal(correo: string): Promise<Result<void, AppError>> {
    // El correo se cifra en el servidor; de vuelta solo llega enmascarado.
    const respuesta = await this.api.post<unknown>('/me/payment-methods/paypal', { email: correo });
    return mapea(respuesta, () => undefined);
  }

  async pideCodigoDeBaja(referencia: string): Promise<Result<void, AppError>> {
    const camino = `/me/payment-methods/${encodeURIComponent(referencia)}/delete-code`;
    return mapea(await this.api.post<unknown>(camino), () => undefined);
  }

  async elimina(referencia: string, codigo: string): Promise<Result<void, AppError>> {
    // El código va como parámetro de consulta, que es como lo espera el backend; el servidor responde
    // 422 si no cuadra y ese mensaje es el que se enseña.
    const camino = `/me/payment-methods/${encodeURIComponent(referencia)}`;
    return mapea(await this.api.delete<unknown>(camino, { code: codigo }), () => undefined);
  }

  async abreAltaDeTarjeta(): Promise<Result<string, AppError>> {
    const respuesta = await this.api.post<{ clientSecret: string }>(
      '/me/payment-methods/setup-intent',
    );
    return mapea(respuesta, (dto) => dto.clientSecret);
  }
}
