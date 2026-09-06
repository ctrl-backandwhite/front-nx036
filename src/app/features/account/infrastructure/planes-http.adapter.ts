import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { ApiService } from '@core/http/api.service';
import { APP_CONFIG } from '@core/config/app-config';
import { Result, exito, mapea } from '@shared/result/result';
import { AppError } from '@shared/error/app-error';
import { Factura, Periodo, Plan, Suscripcion } from '../domain/model/plan';
import { FacturasPort, PlanesPort } from '../domain/port/planes.port';
import { FicheroDescargable } from '../domain/port/descarga.port';
import { descargaBinaria } from './descarga-binaria';

interface PlanDto {
  id: string;
  code: string;
  name: string;
  description?: string;
  priceMonthlyCents: number;
  priceYearlyCents: number;
  displayMonthlyFormatted?: string;
  displayYearlyFormatted?: string;
  position: number;
  limits?: Record<string, number>;
}

interface SuscripcionDto {
  planId: string;
  status: string;
  billingPeriod: string;
  currentPeriodEnd?: string;
  cancelAt?: string;
  pendingPlanCode?: string;
  pendingPlanAt?: string;
}

interface FacturaDto {
  number?: string;
  totalFormatted?: string;
  status?: string;
  created?: number;
}

function aPlan(dto: PlanDto): Plan {
  return {
    id: dto.id,
    codigo: dto.code,
    nombre: dto.name,
    descripcion: dto.description,
    centimosMensuales: dto.priceMonthlyCents,
    centimosAnuales: dto.priceYearlyCents,
    precioMensualFormateado: dto.displayMonthlyFormatted,
    precioAnualFormateado: dto.displayYearlyFormatted,
    posicion: dto.position,
    limites: dto.limits ?? {},
  };
}

/** El backend habla en inglés de periodicidad; el dominio, no. La traducción vive aquí. */
function aPeriodoDto(periodo: Periodo): string {
  return periodo === 'MENSUAL' ? 'MONTHLY' : 'YEARLY';
}

@Injectable()
export class PlanesHttpAdapter implements PlanesPort {
  private readonly api = inject(ApiService);

  async lista(): Promise<Result<readonly Plan[], AppError>> {
    return mapea(await this.api.get<PlanDto[]>('/billing/plans'), (planes) => planes.map(aPlan));
  }

  /**
   * La suscripción vigente, o nada.
   *
   * <p>Sin suscripción el backend responde 204 y el cuerpo llega vacío. No es un error: es «esta cuenta
   * no tiene plan», y tratarlo como fallo pintaría un aviso rojo a todo el que nunca contrató nada.
   */
  async suscripcionActual(): Promise<Result<Suscripcion | null, AppError>> {
    const respuesta = await this.api.get<SuscripcionDto | null>('/me/subscription');
    if (!respuesta.ok) {
      return respuesta;
    }
    const dto = respuesta.valor;
    return exito(
      dto
        ? {
            idPlan: dto.planId,
            estado: dto.status,
            periodoDeFacturacion: dto.billingPeriod,
            finDelPeriodo: dto.currentPeriodEnd,
            cancelaEl: dto.cancelAt,
            planPendiente: dto.pendingPlanCode,
            planPendienteEl: dto.pendingPlanAt,
          }
        : null,
    );
  }

  async contrata(codigoDePlan: string, periodo: Periodo): Promise<Result<string, AppError>> {
    const respuesta = await this.api.post<{ subscriptionId: string; status: string }>(
      '/me/subscription',
      { planCode: codigoDePlan, period: aPeriodoDto(periodo) },
    );
    return mapea(respuesta, (dto) => dto.status);
  }

  async cancela(): Promise<Result<void, AppError>> {
    return mapea(await this.api.post<unknown>('/me/subscription/cancel'), () => undefined);
  }

}

/**
 * Las facturas, en su propio adaptador.
 *
 * <p>Comparten servicio con los planes pero NO método: `lista()` significa cosas distintas en cada
 * puerto, y una sola clase no podría cumplir los dos contratos a la vez. Es el caso en el que segregar
 * las interfaces obliga de verdad a separar las implementaciones, y se agradece.
 */
@Injectable()
export class FacturasHttpAdapter implements FacturasPort {
  private readonly api = inject(ApiService);
  private readonly http = inject(HttpClient);
  private readonly config = inject(APP_CONFIG);

  async lista(): Promise<Result<readonly Factura[], AppError>> {
    return mapea(await this.api.get<FacturaDto[]>('/me/billing/invoices'), (facturas) =>
      facturas.map((dto) => ({
        numero: dto.number,
        totalFormateado: dto.totalFormatted,
        estado: dto.status,
        creadaEl: dto.created,
      })),
    );
  }

  async descarga(numero: string): Promise<Result<FicheroDescargable, AppError>> {
    // La factura del plan la emite NUESTRO backend con nuestro diseño, el mismo PDF que los pedidos.
    // El enlace hospedado de la pasarela quedó atrás: enseñaba su marca y no la nuestra.
    const camino = `/me/billing/invoices/${encodeURIComponent(numero)}/invoice.pdf`;
    const contenido = await descargaBinaria(this.http, this.config.apiBase, camino);
    return contenido.ok
      ? exito({ nombre: `factura-${numero}.pdf`, contenido: contenido.valor })
      : contenido;
  }
}
