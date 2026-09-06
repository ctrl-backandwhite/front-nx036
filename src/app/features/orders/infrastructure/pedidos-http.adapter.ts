import { Injectable, inject } from '@angular/core';
import { ApiService } from '@core/http/api.service';
import { Result, mapea } from '@shared/result/result';
import { AppError } from '@shared/error/app-error';
import {
  DireccionDePedido,
  EstadoDePedido,
  LineaDePedido,
  MetodoDePago,
  Pedido,
  ResumenDePedido,
} from '../domain/model/pedido';
import { CancelacionDePedidoPort, PedidosPort } from '../domain/port/pedidos.port';

/** La forma en que el BACKEND habla. Vive aquí y no sale de este fichero. */
interface DireccionDto {
  fullName: string;
  phone?: string;
  line1: string;
  line2?: string;
  city: string;
  state?: string;
  postalCode?: string;
  country: string;
}

interface LineaDto {
  id: string;
  productTitle: string;
  variantName?: string;
  imageUrl?: string;
  quantity: number;
  unitPriceFormatted?: string;
  lineTotalFormatted?: string;
}

interface ResumenDto {
  id: string;
  orderNumber: string;
  status: EstadoDePedido;
  paymentMethod?: MetodoDePago;
  cancellable?: boolean;
  totalFormatted?: string;
  itemCount: number;
  placedAt: string;
}

interface PedidoDto {
  id: string;
  orderNumber: string;
  status: EstadoDePedido;
  paymentMethod?: MetodoDePago;
  cancellable?: boolean;
  subtotalFormatted?: string;
  shippingFormatted?: string;
  taxFormatted?: string;
  discountFormatted?: string;
  totalFormatted?: string;
  discount?: string;
  shippingAddress?: DireccionDto;
  notes?: string;
  trackingCarrier?: string;
  trackingNumber?: string;
  placedAt?: string;
  shippedAt?: string;
  deliveredAt?: string;
  cancelledAt?: string;
  items: LineaDto[];
}

/**
 * Se pinta lo que el backend ya formateó, y nada más.
 *
 * <p>El front de React tenía aquí un respaldo que CONVERTÍA la cifra canónica en dólares a la moneda
 * activa cuando el importe formateado no venía. Ese respaldo no viaja: la norma del proyecto es que los
 * importes los calcula el servidor, y una conversión hecha en el navegador enseña un número distinto del
 * que se cobra en cuanto el tipo de cambio del cliente y el del servidor no coinciden. Sin importe
 * formateado se pinta un guion, que dice la verdad.
 */
function importe(formateado?: string): string {
  return formateado ?? '';
}

function aDireccion(dto: DireccionDto): DireccionDePedido {
  return {
    nombreCompleto: dto.fullName,
    telefono: dto.phone,
    linea1: dto.line1,
    linea2: dto.line2,
    ciudad: dto.city,
    provincia: dto.state,
    codigoPostal: dto.postalCode,
    pais: dto.country,
  };
}

function aLinea(dto: LineaDto): LineaDePedido {
  return {
    id: dto.id,
    titulo: dto.productTitle,
    variante: dto.variantName,
    imagenUrl: dto.imageUrl,
    cantidad: dto.quantity,
    precioUnitarioFormateado: importe(dto.unitPriceFormatted),
    totalDeLineaFormateado: importe(dto.lineTotalFormatted),
  };
}

function aResumen(dto: ResumenDto): ResumenDePedido {
  return {
    id: dto.id,
    numero: dto.orderNumber,
    estado: dto.status,
    metodoDePago: dto.paymentMethod,
    cancelable: !!dto.cancellable,
    totalFormateado: importe(dto.totalFormatted),
    articulos: dto.itemCount,
    realizadoEl: dto.placedAt,
  };
}

function aPedido(dto: PedidoDto): Pedido {
  return {
    id: dto.id,
    numero: dto.orderNumber,
    estado: dto.status,
    metodoDePago: dto.paymentMethod,
    cancelable: !!dto.cancellable,
    subtotalFormateado: importe(dto.subtotalFormatted),
    envioFormateado: importe(dto.shippingFormatted),
    impuestosFormateado: importe(dto.taxFormatted),
    // El descuento solo se enseña si de verdad lo hubo: el backend manda «0» cuando no aplica y una
    // línea «Descuento −0,00 €» hace pensar que se perdió una promoción por el camino.
    descuentoFormateado: Number(dto.discount ?? 0) > 0 ? importe(dto.discountFormatted) : '',
    totalFormateado: importe(dto.totalFormatted),
    direccionDeEnvio: dto.shippingAddress ? aDireccion(dto.shippingAddress) : undefined,
    notas: dto.notes,
    transportista: dto.trackingCarrier,
    numeroDeSeguimiento: dto.trackingNumber,
    realizadoEl: dto.placedAt,
    enviadoEl: dto.shippedAt,
    entregadoEl: dto.deliveredAt,
    canceladoEl: dto.cancelledAt,
    lineas: (dto.items ?? []).map(aLinea),
  };
}

/**
 * Los pedidos contra nuestro backend.
 *
 * <p>Implementa dos puertos porque los dos se resuelven contra el mismo servicio; lo que importa es que
 * quien los consume vea contratos pequeños. No lleva `providedIn: 'root'`: se registra en
 * `orders.providers.ts`.
 */
@Injectable()
export class PedidosHttpAdapter implements PedidosPort, CancelacionDePedidoPort {
  private readonly api = inject(ApiService);

  async lista(): Promise<Result<readonly ResumenDePedido[], AppError>> {
    const respuesta = await this.api.get<ResumenDto[]>('/me/orders');
    return mapea(respuesta, (lista) => (lista ?? []).map(aResumen));
  }

  async consulta(id: string, idioma: string): Promise<Result<Pedido, AppError>> {
    const respuesta = await this.api.get<PedidoDto>(`/me/orders/${id}`, { lang: idioma });
    return mapea(respuesta, aPedido);
  }

  async cancela(id: string, idioma: string, aLaCartera: boolean): Promise<Result<void, AppError>> {
    // Los dos datos van en la consulta y no en el cuerpo porque así lo espera el backend: el cuerpo de
    // esta llamada es vacío a propósito.
    const respuesta = await this.api.post<unknown>(
      `/me/orders/${id}/cancel?lang=${encodeURIComponent(idioma)}&refundToWallet=${aLaCartera}`,
    );
    return mapea(respuesta, () => undefined);
  }
}
