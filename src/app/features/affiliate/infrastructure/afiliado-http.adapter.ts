import { Injectable, inject } from '@angular/core';
import { ApiService } from '@core/http/api.service';
import { TraduccionService } from '@core/i18n/traduccion.service';
import { Result, mapea } from '@shared/result/result';
import { AppError } from '@shared/error/app-error';
import {
  CodigoDeReferido,
  Comision,
  EstadoDeAfiliado,
  EstadoDeComision,
  PanelDeAfiliado,
} from '../domain/model/afiliado';
import { PanelDeAfiliadoPort } from '../domain/port/afiliado.port';

interface CodigoDto {
  id: string;
  code: string;
  clicks: number;
  url: string;
}

interface ComisionDto {
  id: string;
  amountCents: number;
  percentage: number;
  status: EstadoDeComision;
  createdAt?: string;
  baseAmountCents: number;
}

interface PanelDto {
  status: EstadoDeAfiliado;
  commissionPercent: number;
  joined: boolean;
  canRequestPayout: boolean;
  minPayoutCents: number;
  payoutRequested: boolean;
  codes: CodigoDto[];
  stats: {
    clicks: number;
    conversions: number;
    pendingCents: number;
    approvedCents: number;
    paidCents: number;
    currency: string;
  };
  recentCommissions: ComisionDto[];
}

function aCodigo(dto: CodigoDto): CodigoDeReferido {
  return { id: dto.id, codigo: dto.code, clics: dto.clicks, camino: dto.url };
}

/**
 * El panel de afiliados contra nuestro backend.
 *
 * <p>Aquí se da FORMA a los céntimos, que es lo único que este endpoint devuelve: no manda cadenas ya
 * formateadas como el resto de la aplicación. Formatear no es convertir —se escribe el número en la
 * MISMA divisa que declara el servidor y sin aplicar ningún tipo de cambio—, así que la norma de que los
 * importes los calcula el backend se respeta entera.
 */
@Injectable()
export class AfiliadoHttpAdapter implements PanelDeAfiliadoPort {
  private readonly api = inject(ApiService);
  private readonly traduccion = inject(TraduccionService);

  async consulta(): Promise<Result<PanelDeAfiliado, AppError>> {
    return mapea(await this.api.get<PanelDto>('/me/affiliate'), (dto) => this.aPanel(dto));
  }

  async inscribe(): Promise<Result<PanelDeAfiliado, AppError>> {
    return mapea(await this.api.post<PanelDto>('/me/affiliate/join'), (dto) => this.aPanel(dto));
  }

  async creaCodigo(etiqueta: string): Promise<Result<CodigoDeReferido, AppError>> {
    return mapea(await this.api.post<CodigoDto>('/me/affiliate/codes', { label: etiqueta }), aCodigo);
  }

  private aEstadisticas(dto: PanelDto, divisa: string): PanelDeAfiliado['estadisticas'] {
    const stats = dto.stats;
    return {
      clics: stats?.clicks ?? 0,
      conversiones: stats?.conversions ?? 0,
      pendienteFormateado: this.formatea(stats?.pendingCents ?? 0, divisa),
      aprobadoFormateado: this.formatea(stats?.approvedCents ?? 0, divisa),
      pagadoFormateado: this.formatea(stats?.paidCents ?? 0, divisa),
    };
  }

  private aComision(dto: ComisionDto, divisa: string): Comision {
    return {
      id: dto.id,
      creadaEl: dto.createdAt,
      baseFormateada: this.formatea(dto.baseAmountCents, divisa),
      porcentaje: dto.percentage,
      importeFormateado: this.formatea(dto.amountCents, divisa),
      estado: dto.status,
    };
  }

  private aPanel(dto: PanelDto): PanelDeAfiliado {
    const divisa = dto.stats?.currency ?? 'EUR';
    return {
      estado: dto.status,
      porcentajeDeComision: dto.commissionPercent,
      inscrito: !!dto.joined,
      puedePedirCobro: !!dto.canRequestPayout,
      minimoDeCobroFormateado: this.formatea(dto.minPayoutCents, divisa),
      cobroSolicitado: !!dto.payoutRequested,
      codigos: (dto.codes ?? []).map(aCodigo),
      estadisticas: this.aEstadisticas(dto, divisa),
      comisiones: (dto.recentCommissions ?? []).map((c) => this.aComision(c, divisa)),
    };
  }

  private formatea(centimos: number, divisa: string): string {
    try {
      return new Intl.NumberFormat(this.traduccion.idioma(), {
        style: 'currency',
        currency: divisa,
      }).format(centimos / 100);
    } catch {
      // Un código de moneda que `Intl` no conozca hace que lance. Antes que dejar la tabla sin importes,
      // se escribe la cifra con el código detrás.
      return `${(centimos / 100).toFixed(2)} ${divisa}`;
    }
  }
}
