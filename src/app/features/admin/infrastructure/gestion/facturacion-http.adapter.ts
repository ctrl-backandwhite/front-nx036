import { Injectable, inject } from '@angular/core';
import { ApiService } from '@core/http/api.service';
import { Result, mapea } from '@shared/result/result';
import { AppError } from '@shared/error/app-error';
import { PaginaDeSuscripciones, Plan, Suscripcion } from '../../domain/gestion/model/facturacion';
import { FacturacionPort, FiltroDeSuscripciones } from '../../domain/gestion/port/facturacion.port';
import { sinCuerpo } from './sin-cuerpo';

interface PlanDto {
  id: string;
  code: string;
  name: string;
  description?: string;
  priceMonthlyCents?: number;
  priceYearlyCents?: number;
  currency?: string;
  active?: boolean;
  position?: number;
}

interface SuscripcionDto {
  id: string;
  userId: string;
  userEmail: string;
  plan: string;
  status: string;
  billingPeriod?: string;
  currentPeriodStart?: string;
  currentPeriodEnd?: string;
}

/** La página tal como la devuelve el backend (`PageResponse`). */
interface PaginaDto {
  items?: SuscripcionDto[];
  page?: number;
  size?: number;
  totalElements?: number;
  totalPages?: number;
}

function aSuscripcion(dto: SuscripcionDto): Suscripcion {
  return {
    id: dto.id,
    idUsuario: dto.userId,
    emailUsuario: dto.userEmail,
    plan: dto.plan,
    estado: dto.status,
    periodo: dto.billingPeriod ?? '',
    ...(dto.currentPeriodStart ? { inicioDelPeriodo: dto.currentPeriodStart } : {}),
    ...(dto.currentPeriodEnd ? { finDelPeriodo: dto.currentPeriodEnd } : {}),
  };
}

function aPlan(dto: PlanDto): Plan {
  return {
    id: dto.id,
    codigo: dto.code,
    nombre: dto.name,
    ...(dto.description ? { descripcion: dto.description } : {}),
    mensualCentimos: dto.priceMonthlyCents ?? 0,
    anualCentimos: dto.priceYearlyCents ?? 0,
    divisa: dto.currency ?? 'USD',
    activo: dto.active ?? false,
    posicion: dto.position ?? 0,
  };
}

@Injectable()
export class FacturacionHttpAdapter implements FacturacionPort {
  private readonly api = inject(ApiService);

  async planes(): Promise<Result<readonly Plan[], AppError>> {
    const respuesta = await this.api.get<PlanDto[]>('/admin/billing/plans');
    return mapea(respuesta, (lista) => (lista ?? []).map(aPlan));
  }

  actualizaPlan(codigo: string, plan: Plan): Promise<Result<void, AppError>> {
    return sinCuerpo(
      this.api.put(`/admin/billing/plans/${codigo}`, {
        code: plan.codigo,
        name: plan.nombre,
        description: plan.descripcion ?? '',
        priceMonthlyCents: plan.mensualCentimos,
        priceYearlyCents: plan.anualCentimos,
        currency: plan.divisa,
        active: plan.activo,
        position: plan.posicion,
      }),
    );
  }

  async suscripciones(filtro: FiltroDeSuscripciones): Promise<Result<PaginaDeSuscripciones, AppError>> {
    const respuesta = await this.api.get<PaginaDto>('/admin/billing/subscriptions', {
      status: filtro.estado,
      page: filtro.pagina ?? 0,
      size: filtro.tamano ?? 25,
    });
    return mapea(respuesta, (dto) => ({
      items: (dto.items ?? []).map(aSuscripcion),
      pagina: dto.page ?? 0,
      tamano: dto.size ?? 25,
      total: dto.totalElements ?? 0,
      totalPaginas: dto.totalPages ?? 0,
    }));
  }
}
