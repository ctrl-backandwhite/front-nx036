import { Injectable, inject } from '@angular/core';
import { ApiService } from '@core/http/api.service';
import { Result, mapea } from '@shared/result/result';
import { AppError } from '@shared/error/app-error';
import {
  DireccionDeEnvio,
  DireccionGuardada,
  PedidoCreado,
  SolicitudDePedido,
} from '../domain/model/pedido';
import { DireccionesDeEnvioPort, PedidoPort } from '../domain/port/pedido.port';

interface DireccionDto {
  id: string;
  label?: string;
  fullName: string;
  phone?: string;
  line1: string;
  line2?: string;
  city: string;
  state?: string;
  postalCode?: string;
  country: string;
  default: boolean;
}

function aDireccion(dto: DireccionDto): DireccionGuardada {
  return {
    id: dto.id,
    etiqueta: dto.label,
    nombreCompleto: dto.fullName,
    telefono: dto.phone,
    linea1: dto.line1,
    linea2: dto.line2,
    ciudad: dto.city,
    provincia: dto.state,
    codigoPostal: dto.postalCode,
    pais: dto.country,
    porDefecto: dto.default,
  };
}

function aDireccionDto(direccion: DireccionDeEnvio): Record<string, unknown> {
  return {
    fullName: direccion.nombreCompleto,
    phone: direccion.telefono,
    line1: direccion.linea1,
    line2: direccion.linea2,
    city: direccion.ciudad,
    state: direccion.provincia,
    postalCode: direccion.codigoPostal,
    country: direccion.pais,
  };
}

/** Crear el pedido contra nuestro backend. */
@Injectable()
export class PedidoHttpAdapter implements PedidoPort {
  private readonly api = inject(ApiService);

  async crea(solicitud: SolicitudDePedido): Promise<Result<PedidoCreado, AppError>> {
    const respuesta = await this.api.post<{ id: string; orderNumber?: string }>(
      '/me/orders/checkout',
      {
        items: solicitud.items.map((item) => ({
          productId: item.productId,
          variantId: item.variantId || undefined,
          quantity: item.cantidad,
        })),
        notes: solicitud.notas || undefined,
        paymentMethod: solicitud.metodoDePago,
        couponCode: solicitud.codigoDeCupon || undefined,
        shippingOptionCode: solicitud.opcionDeEnvio || undefined,
        shippingAddressId: solicitud.idDeDireccion,
        shippingAddressInline: solicitud.direccionSuelta
          ? aDireccionDto(solicitud.direccionSuelta)
          : undefined,
      },
    );
    return mapea(respuesta, (dto) => ({ id: dto.id, numero: dto.orderNumber }));
  }
}

/** Las direcciones de la cuenta, recortadas a lo que el pago usa. */
@Injectable()
export class DireccionesDeEnvioHttpAdapter implements DireccionesDeEnvioPort {
  private readonly api = inject(ApiService);

  async lista(): Promise<Result<readonly DireccionGuardada[], AppError>> {
    const respuesta = await this.api.get<DireccionDto[]>('/me/addresses');
    return mapea(respuesta, (lista) => (lista ?? []).map(aDireccion));
  }

  async crea(
    direccion: DireccionDeEnvio,
    porDefecto: boolean,
  ): Promise<Result<DireccionGuardada, AppError>> {
    const respuesta = await this.api.post<DireccionDto>('/me/addresses', {
      ...aDireccionDto(direccion),
      isDefault: porDefecto,
    });
    return mapea(respuesta, aDireccion);
  }
}
