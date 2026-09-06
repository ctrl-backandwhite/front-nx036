import { Injectable, inject } from '@angular/core';
import { ApiService } from '@core/http/api.service';
import { Result, mapea } from '@shared/result/result';
import { AppError } from '@shared/error/app-error';
import { Pagina } from '../../domain/gestion/model/pagina';
import {
  Afiliado, Comision, ConfiguracionDeAfiliados, DetalleDeAfiliado, PagoPendiente,
} from '../../domain/gestion/model/afiliados';
import {
  AfiliadosPort, PagosDeAfiliadosPort,
} from '../../domain/gestion/port/afiliados.port';
import { PaginaDto, aPagina } from './pagina.dto';
import { cifra } from './cifra';
import { sinCuerpo } from './sin-cuerpo';

interface AfiliadoDto {
  id: string;
  name?: string;
  email?: string;
  status: string;
  codesCount?: number;
  clicks?: number;
  referralsCount?: number;
  pendingCents?: number;
  approvedCents?: number;
  paidCents?: number;
}

interface ComisionDto {
  id: string;
  amountCents?: number;
  percentage?: number;
  status: string;
  createdAt?: string;
}

interface DetalleDto {
  row?: AfiliadoDto;
  codes?: { id: string; code: string; clicks?: number; active?: boolean }[];
  commissions?: ComisionDto[];
}

interface ConfigDto {
  defaultPercent?: number;
  attributionWindowDays?: number;
  returnPeriodDays?: number;
  minPayoutCents?: number;
  currency?: string;
  maxCommissionPeriodCents?: number;
}

interface PagoDto {
  id: string;
  affiliateId: string;
  affiliateName?: string;
  amountCents?: number;
  amountFormatted?: string;
  currency?: string;
  method: string;
  destHolder?: string;
  destIban?: string;
  destBic?: string;
  destPaypalEmail?: string;
  commissionCount?: number;
  requestedAt?: string;
}

function aAfiliado(dto: AfiliadoDto): Afiliado {
  return {
    id: dto.id,
    estado: dto.status,
    codigos: cifra(dto.codesCount),
    clics: cifra(dto.clicks),
    conversiones: cifra(dto.referralsCount),
    pendienteCentimos: cifra(dto.pendingCents),
    aprobadoCentimos: cifra(dto.approvedCents),
    pagadoCentimos: cifra(dto.paidCents),
    ...(dto.name ? { nombre: dto.name } : {}),
    ...(dto.email ? { email: dto.email } : {}),
  };
}

function aComision(dto: ComisionDto): Comision {
  return {
    id: dto.id,
    importeCentimos: dto.amountCents ?? 0,
    porcentaje: dto.percentage ?? 0,
    estado: dto.status,
    ...(dto.createdAt ? { creadaEl: dto.createdAt } : {}),
  };
}

@Injectable()
export class AfiliadosHttpAdapter implements AfiliadosPort {
  private readonly api = inject(ApiService);

  async busca(
    estado: string | undefined,
    pagina: number,
    tamano: number,
  ): Promise<Result<Pagina<Afiliado>, AppError>> {
    const respuesta = await this.api.get<PaginaDto<AfiliadoDto>>('/admin/affiliates', {
      status: estado ?? '',
      page: pagina,
      size: tamano,
    });
    return mapea(respuesta, (dto) => aPagina(dto, aAfiliado));
  }

  async detalle(id: string): Promise<Result<DetalleDeAfiliado, AppError>> {
    const respuesta = await this.api.get<DetalleDto>(`/admin/affiliates/${id}`);
    return mapea(respuesta, (dto) => ({
      ...(dto?.row ? { afiliado: aAfiliado(dto.row) } : {}),
      codigos: (dto?.codes ?? []).map((c) => ({
        id: c.id,
        codigo: c.code,
        clics: c.clicks ?? 0,
        activo: c.active ?? true,
      })),
      comisiones: (dto?.commissions ?? []).map(aComision),
    }));
  }

  cambiaEstado(id: string, estado: string): Promise<Result<void, AppError>> {
    return sinCuerpo(this.api.post(`/admin/affiliates/${id}/status`, { status: estado }));
  }

  async reindexa(): Promise<Result<number, AppError>> {
    const respuesta = await this.api.post<{ indexed?: number }>('/admin/affiliates/reindex');
    return mapea(respuesta, (dto) => dto?.indexed ?? 0);
  }

  async configuracion(): Promise<Result<ConfiguracionDeAfiliados, AppError>> {
    const respuesta = await this.api.get<ConfigDto>('/admin/affiliates/config');
    return mapea(respuesta, (dto) => ({
      porcentajePorDefecto: cifra(dto?.defaultPercent),
      ventanaDeAtribucionDias: cifra(dto?.attributionWindowDays),
      periodoDeDevolucionDias: cifra(dto?.returnPeriodDays),
      minimoDePagoCentimos: cifra(dto?.minPayoutCents),
      // La divisa del programa NO es la del panel: es en la que se transfiere al afiliado.
      divisa: dto?.currency ?? 'EUR',
      maximoPorPeriodoCentimos: cifra(dto?.maxCommissionPeriodCents),
    }));
  }

  guardaConfiguracion(config: ConfiguracionDeAfiliados): Promise<Result<void, AppError>> {
    return sinCuerpo(
      this.api.put('/admin/affiliates/config', {
        defaultPercent: config.porcentajePorDefecto,
        attributionWindowDays: config.ventanaDeAtribucionDias,
        returnPeriodDays: config.periodoDeDevolucionDias,
        minPayoutCents: config.minimoDePagoCentimos,
        currency: config.divisa,
        maxCommissionPeriodCents: config.maximoPorPeriodoCentimos,
      }),
    );
  }
}

@Injectable()
export class PagosDeAfiliadosHttpAdapter implements PagosDeAfiliadosPort {
  private readonly api = inject(ApiService);

  async pendientes(): Promise<Result<readonly PagoPendiente[], AppError>> {
    const respuesta = await this.api.get<PagoDto[]>('/admin/affiliates/payouts/pending');
    return mapea(respuesta, (lista) =>
      (lista ?? []).map((dto): PagoPendiente => ({
        id: dto.id,
        idAfiliado: dto.affiliateId,
        importeCentimos: cifra(dto.amountCents),
        // El importe ya viene formateado por el backend en la divisa del programa: se enseña ese y no
        // uno recompuesto aquí, para que coincida exactamente con lo que se transfiere.
        importeFormateado: dto.amountFormatted ?? '',
        divisa: dto.currency ?? 'EUR',
        metodo: dto.method,
        comisiones: cifra(dto.commissionCount),
        nombre: dto.affiliateName,
        titular: dto.destHolder,
        iban: dto.destIban,
        bic: dto.destBic,
        emailPaypal: dto.destPaypalEmail,
        solicitadoEl: dto.requestedAt,
      })),
    );
  }

  aprueba(id: string, referencia?: string): Promise<Result<void, AppError>> {
    return sinCuerpo(this.api.post(`/admin/affiliates/payouts/${id}/approve`, { reference: referencia }));
  }

  rechaza(id: string, motivo: string): Promise<Result<void, AppError>> {
    return sinCuerpo(this.api.post(`/admin/affiliates/payouts/${id}/reject`, { reason: motivo }));
  }

  async paga(idAfiliado: string): Promise<Result<number, AppError>> {
    const respuesta = await this.api.post<{ paidCents?: number }>(
      `/admin/affiliates/${idAfiliado}/payout`,
    );
    return mapea(respuesta, (dto) => dto?.paidCents ?? 0);
  }

  async apruebaVencidas(): Promise<Result<number, AppError>> {
    const respuesta = await this.api.post<{ approved?: number }>('/admin/affiliates/approve-due');
    return mapea(respuesta, (dto) => dto?.approved ?? 0);
  }

  revisaComision(idComision: string, aprueba: boolean): Promise<Result<void, AppError>> {
    return sinCuerpo(
      this.api.post(`/admin/affiliates/commissions/${idComision}/review?approve=${aprueba}`),
    );
  }
}
