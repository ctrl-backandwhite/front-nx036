import { Injectable, inject } from '@angular/core';
import { ApiService } from '@core/http/api.service';
import { Result, mapea } from '@shared/result/result';
import { AppError } from '@shared/error/app-error';
import { BorradorDePromocion, Promocion } from '../../domain/gestion/model/promociones';
import { PromocionesPort } from '../../domain/gestion/port/promociones.port';
import { OpcionDeAmbito } from '../../domain/gestion/port/precios.port';
import { sinCuerpo } from './sin-cuerpo';

interface PromocionDto {
  id: string;
  name: string;
  code?: string;
  kind: string;
  scope: string;
  percentOff?: number;
  amountOffCents?: number;
  startsAt?: string;
  endsAt?: string;
  active: boolean;
  live: boolean;
  priority?: number;
  maxUses?: number;
  usedCount?: number;
  minOrderCents?: number;
  maxUsesPerUser?: number;
  categoryIds?: string[];
  productIds?: string[];
}

/** Los campos que pueden faltar se copian tal cual: un `undefined` es lo mismo que no ponerlos. */
function aPromocion(dto: PromocionDto): Promocion {
  return {
    id: dto.id,
    nombre: dto.name,
    clase: dto.kind,
    ambito: dto.scope,
    activa: dto.active,
    vigente: dto.live,
    prioridad: dto.priority ?? 0,
    usos: dto.usedCount ?? 0,
    categorias: dto.categoryIds ?? [],
    productos: dto.productIds ?? [],
    codigo: dto.code,
    porcentaje: dto.percentOff,
    importeCentimos: dto.amountOffCents,
    empiezaEl: dto.startsAt,
    terminaEl: dto.endsAt,
    usosMaximos: dto.maxUses,
    pedidoMinimoCentimos: dto.minOrderCents,
    usosPorPersona: dto.maxUsesPerUser,
  };
}

function aCuerpo(borrador: BorradorDePromocion): Record<string, unknown> {
  return {
    name: borrador.nombre,
    // El código va SIEMPRE en mayúsculas: quien lo teclea en el pago no distingue, y guardarlo en
    // minúsculas haría que el cupón no se encontrara.
    code: borrador.codigo?.trim() ? borrador.codigo.trim().toUpperCase() : undefined,
    kind: borrador.clase,
    scope: borrador.ambito,
    percentOff: borrador.porcentaje,
    amountOffCents: borrador.importeCentimos,
    startsAt: borrador.empiezaEl,
    endsAt: borrador.terminaEl,
    active: borrador.activa,
    priority: borrador.prioridad ?? 0,
    maxUses: borrador.usosMaximos,
    minOrderCents: borrador.pedidoMinimoCentimos,
    maxUsesPerUser: borrador.usosPorPersona,
    categoryIds: borrador.categorias ?? [],
    productIds: borrador.productos ?? [],
    notifyUsers: borrador.avisaUsuarios ?? false,
  };
}

@Injectable()
export class PromocionesHttpAdapter implements PromocionesPort {
  private readonly api = inject(ApiService);

  async lista(): Promise<Result<readonly Promocion[], AppError>> {
    const respuesta = await this.api.get<PromocionDto[]>('/admin/promotions');
    return mapea(respuesta, (lista) => (lista ?? []).map(aPromocion));
  }

  crea(borrador: BorradorDePromocion): Promise<Result<void, AppError>> {
    return sinCuerpo(this.api.post('/admin/promotions', aCuerpo(borrador)));
  }

  actualiza(id: string, borrador: BorradorDePromocion): Promise<Result<void, AppError>> {
    return sinCuerpo(this.api.put(`/admin/promotions/${id}`, aCuerpo(borrador)));
  }

  alterna(id: string): Promise<Result<void, AppError>> {
    return sinCuerpo(this.api.post(`/admin/promotions/${id}/toggle`));
  }

  async anuncia(id: string): Promise<Result<number, AppError>> {
    const respuesta = await this.api.post<{ notified?: number }>(`/admin/promotions/${id}/announce`);
    return mapea(respuesta, (dto) => dto?.notified ?? 0);
  }

  borra(id: string): Promise<Result<void, AppError>> {
    return sinCuerpo(this.api.delete(`/admin/promotions/${id}`));
  }

  async categorias(): Promise<Result<readonly OpcionDeAmbito[], AppError>> {
    const respuesta = await this.api.get<{ id: string; name?: string; slug?: string }[]>(
      '/catalog/categories',
      { lang: 'es' },
    );
    return mapea(respuesta, (lista) =>
      (lista ?? []).map((d) => ({ id: d.id, nombre: d.name ?? d.slug ?? d.id })),
    );
  }
}
