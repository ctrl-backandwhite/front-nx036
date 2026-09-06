import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { ApiService } from '@core/http/api.service';
import { APP_CONFIG } from '@core/config/app-config';
import { mapeaError } from '@core/http/mapea-error';
import { Result, exito, fallo, mapea } from '@shared/result/result';
import { AppError } from '@shared/error/app-error';
import {
  Bulto,
  DeclaracionDeEnvio,
  DestinatarioDeclarado,
  EventoDeSeguimiento,
  LineaDeclarada,
  Seguimiento,
} from '../../domain/logistica/model/seguimiento';
import {
  FacturaDePedidoPort,
  SeguimientoAdminPort,
} from '../../domain/logistica/port/pedidos-admin.port';

interface EventoDto {
  status: string;
  description?: string;
  location?: string;
  occurredAt?: string;
}

interface BultoDto {
  sequenceNo: number;
  carrier?: string;
  trackingNumber?: string;
  status?: string;
  weightGrams?: number;
  estimatedDeliveryAt?: string;
  events?: EventoDto[];
  items?: { title?: string; imageUrl?: string; variantName?: string; quantity?: number }[];
}

interface DeclaracionDto {
  sequenceNo: number;
  waybillNumber?: string;
  declaration?: {
    receiver?: {
      firstName?: string;
      lastName?: string;
      countryCode?: string;
      province?: string;
      city?: string;
      addressLines?: string[];
      postalCode?: string;
      phone?: string;
      email?: string;
    };
    lines?: {
      nameEn?: string;
      nameLocal?: string;
      hsCode?: string;
      quantity?: number;
      unitPrice?: number;
      currency?: string;
      unitWeightKg?: number;
    }[];
  };
}

interface SeguimientoDto {
  status?: string;
  carrier?: string;
  trackingNumber?: string;
  estimatedDeliveryAt?: string;
  lastTrackedAt?: string;
  events?: EventoDto[];
  shipments?: BultoDto[];
  declarations?: DeclaracionDto[];
}

function aEvento(dto: EventoDto): EventoDeSeguimiento {
  return {
    estado: dto.status,
    descripcion: dto.description,
    lugar: dto.location,
    ocurridoEl: dto.occurredAt,
  };
}

function aBulto(dto: BultoDto): Bulto {
  return {
    secuencia: dto.sequenceNo,
    transportista: dto.carrier,
    numeroDeSeguimiento: dto.trackingNumber,
    estado: dto.status,
    pesoGramos: dto.weightGrams ?? 0,
    entregaPrevistaEl: dto.estimatedDeliveryAt,
    eventos: (dto.events ?? []).map(aEvento),
    articulos: (dto.items ?? []).map((i) => ({
      titulo: i.title,
      imagenUrl: i.imageUrl,
      variante: i.variantName,
      cantidad: i.quantity ?? 0,
    })),
  };
}

function aDestinatario(
  dto: NonNullable<NonNullable<DeclaracionDto['declaration']>['receiver']>,
): DestinatarioDeclarado {
  return {
    nombre: dto.firstName,
    apellidos: dto.lastName,
    pais: dto.countryCode,
    provincia: dto.province,
    ciudad: dto.city,
    lineas: dto.addressLines ?? [],
    codigoPostal: dto.postalCode,
    telefono: dto.phone,
    email: dto.email,
  };
}

function aLineaDeclarada(
  dto: NonNullable<NonNullable<DeclaracionDto['declaration']>['lines']>[number],
): LineaDeclarada {
  return {
    descripcionEn: dto.nameEn,
    descripcionLocal: dto.nameLocal,
    partidaArancelaria: dto.hsCode,
    cantidad: dto.quantity ?? 0,
    valorUnitario: dto.unitPrice,
    moneda: dto.currency,
    pesoUnitarioKg: dto.unitWeightKg,
  };
}

function aDeclaracion(dto: DeclaracionDto): DeclaracionDeEnvio {
  const declaracion = dto.declaration ?? {};
  return {
    secuencia: dto.sequenceNo,
    numeroDeGuia: dto.waybillNumber,
    destinatario: declaracion.receiver ? aDestinatario(declaracion.receiver) : undefined,
    lineas: (declaracion.lines ?? []).map(aLineaDeclarada),
  };
}

/**
 * El seguimiento del envío y la factura, contra nuestro backend.
 *
 * <p>La FACTURA no pasa por `ApiService` porque este devuelve JSON: un PDF hay que pedirlo como binario.
 * Se usa el cliente HTTP directamente y el fallo se traduce con el mismo `mapeaError`, para que hacia
 * el dominio siga saliendo un `AppError` y no un `HttpErrorResponse`.
 */
@Injectable()
export class SeguimientoHttpAdapter implements SeguimientoAdminPort, FacturaDePedidoPort {
  private readonly api = inject(ApiService);
  private readonly http = inject(HttpClient);
  private readonly config = inject(APP_CONFIG);

  async consulta(pedidoId: string): Promise<Result<Seguimiento, AppError>> {
    const respuesta = await this.api.get<SeguimientoDto>(`/admin/orders/${pedidoId}/tracking`);
    return mapea(respuesta, (dto) => ({
      estado: dto.status,
      transportista: dto.carrier,
      numeroDeSeguimiento: dto.trackingNumber,
      entregaPrevistaEl: dto.estimatedDeliveryAt,
      ultimaConsultaEl: dto.lastTrackedAt,
      eventos: (dto.events ?? []).map(aEvento),
      bultos: (dto.shipments ?? []).map(aBulto),
      declaraciones: (dto.declarations ?? []).map(aDeclaracion),
    }));
  }

  async sincroniza(pedidoId: string): Promise<Result<void, AppError>> {
    const respuesta = await this.api.post<unknown>(`/admin/orders/${pedidoId}/sync-tracking`);
    return mapea(respuesta, () => undefined);
  }

  async descarga(pedidoId: string): Promise<Result<Blob, AppError>> {
    try {
      const blob = await firstValueFrom(
        this.http.get(`${this.config.apiBase}/api/admin/orders/${pedidoId}/invoice.pdf`, {
          responseType: 'blob',
        }),
      );
      return exito(blob);
    } catch (error) {
      return fallo(mapeaError(error));
    }
  }
}
