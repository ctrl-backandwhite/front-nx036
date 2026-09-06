import { Injectable, inject } from '@angular/core';
import { ApiService } from '@core/http/api.service';
import { Result, exito, fallo, mapea } from '@shared/result/result';
import { AppError } from '@shared/error/app-error';
import {
  AccionSobrePedido,
  CriterioDePedidos,
  FichaDePedido,
  PaginaDePedidos,
  PedidoNuevo,
  ResultadoDeImportacion,
  ResultadoEnLote,
  cantidadValida,
} from '../../domain/logistica/model/pedido';
import {
  AltaDePedidosPort,
  FalloDeLectura,
  LectorDePedidosPegadosPort,
  PedidosAdminPort,
  TransicionesDePedidoPort,
} from '../../domain/logistica/port/pedidos-admin.port';
import { FichaDePedidoDto, PedidoDto, aFicha, aPedido } from './pedido.dto';

interface PaginaDto {
  items: PedidoDto[];
  totalElements: number;
  totalPages: number;
  page: number;
}

interface LoteDto {
  succeeded: number;
  failed: number;
  errors: string[];
}

interface ImportacionDto {
  imported: number;
  failed: number;
  errors: string[];
}

/** Las cinco transiciones, con el trozo de ruta que le corresponde a cada una en el backend. */
const RUTA_DE_ACCION: Readonly<Record<AccionSobrePedido, string>> = {
  forward: 'forward',
  ship: 'ship',
  deliver: 'deliver',
  cancel: 'cancel',
  refund: 'refund',
};

/**
 * Los pedidos del panel contra nuestro backend.
 *
 * <p>Cumple tres puertos porque los tres se resuelven contra el mismo servicio. Lo que importa es que
 * quien los consume vea contratos pequeños: la pantalla de alta no tiene delante los métodos de lote.
 */
@Injectable()
export class PedidosAdminHttpAdapter
  implements PedidosAdminPort, TransicionesDePedidoPort, AltaDePedidosPort, LectorDePedidosPegadosPort
{
  private readonly api = inject(ApiService);

  async busca(criterio: CriterioDePedidos): Promise<Result<PaginaDePedidos, AppError>> {
    const respuesta = await this.api.get<PaginaDto>('/admin/orders', {
      status: criterio.estado,
      q: criterio.texto,
      page: criterio.pagina,
      size: criterio.tamano,
    });
    return mapea(respuesta, (dto) => ({
      pedidos: (dto.items ?? []).map(aPedido),
      total: dto.totalElements ?? 0,
      paginas: dto.totalPages ?? 1,
      pagina: dto.page ?? criterio.pagina,
    }));
  }

  async ficha(id: string, idioma: string): Promise<Result<FichaDePedido, AppError>> {
    // El idioma va en la petición: sin él los títulos de línea vuelven en chino, que es como se
    // cargaron, y el operador no reconoce lo que tiene que comprar.
    const respuesta = await this.api.get<FichaDePedidoDto>(`/admin/orders/${id}`, { lang: idioma });
    return mapea(respuesta, aFicha);
  }

  async reindexa(): Promise<Result<number, AppError>> {
    const respuesta = await this.api.post<{ indexed: number }>('/admin/orders/reindex');
    return mapea(respuesta, (r) => r.indexed ?? 0);
  }

  async aplica(id: string, accion: AccionSobrePedido): Promise<Result<void, AppError>> {
    const respuesta = await this.api.post<unknown>(`/admin/orders/${id}/${RUTA_DE_ACCION[accion]}`);
    return mapea(respuesta, () => undefined);
  }

  async aplicaEnLote(
    ids: readonly string[],
    accion: AccionSobrePedido,
  ): Promise<Result<ResultadoEnLote, AppError>> {
    const respuesta = await this.api.post<LoteDto>(
      `/admin/orders/bulk-${RUTA_DE_ACCION[accion]}`,
      [...ids],
    );
    return mapea(respuesta, (dto) => ({
      correctas: dto.succeeded ?? 0,
      fallidas: dto.failed ?? 0,
      errores: dto.errors ?? [],
    }));
  }

  async crea(pedido: PedidoNuevo): Promise<Result<void, AppError>> {
    const respuesta = await this.api.post<unknown>('/admin/orders', aPedidoDto(pedido));
    return mapea(respuesta, () => undefined);
  }

  async importa(
    pedidos: readonly PedidoNuevo[],
  ): Promise<Result<ResultadoDeImportacion, AppError>> {
    const respuesta = await this.api.post<ImportacionDto>('/admin/orders/import', {
      orders: pedidos.map(aPedidoDto),
    });
    return mapea(respuesta, (dto) => ({
      importados: dto.imported ?? 0,
      fallidos: dto.failed ?? 0,
      errores: dto.errors ?? [],
    }));
  }

  async creaDemostracion(): Promise<Result<void, AppError>> {
    return mapea(await this.api.post<unknown>('/admin/orders/demo'), () => undefined);
  }

  /**
   * Lee el volcado pegado en el importador y lo traduce al dominio.
   *
   * <p>Vive aquí porque lo que se pega tiene la forma del BACKEND: es el mismo cuerpo que acepta el
   * endpoint, copiado de otro sistema. Interpretarlo es traducir, y traducir es el trabajo del adaptador.
   */
  interpreta(texto: string): Result<readonly PedidoNuevo[], FalloDeLectura> {
    let leido: unknown;
    try {
      leido = JSON.parse(texto);
    } catch {
      return fallo<FalloDeLectura>('formato');
    }
    if (!Array.isArray(leido) || leido.length === 0) {
      return fallo<FalloDeLectura>('vacio');
    }
    return exito(leido.map(aPedidoNuevo));
  }
}

/**
 * Del vocabulario del dominio al del backend.
 *
 * <p>El mínimo de una unidad se vuelve a aplicar AQUÍ aunque la pantalla ya lo haga: al servidor nunca
 * puede llegar una línea de cero unidades por haberse guardado sin salir del campo.
 */
function aPedidoDto(pedido: PedidoNuevo): Record<string, unknown> {
  const direccion = pedido.direccionDeEnvio;
  return {
    customerEmail: pedido.emailCliente || undefined,
    externalOrderId: pedido.idExterno || undefined,
    shippingAddress: {
      fullName: direccion.nombreCompleto,
      phone: direccion.telefono,
      email: direccion.email,
      line1: direccion.linea1,
      line2: direccion.linea2,
      city: direccion.ciudad,
      state: direccion.provincia,
      postalCode: direccion.codigoPostal,
      country: direccion.pais,
    },
    items: pedido.lineas.map((l) => ({
      productId: l.productoId,
      variantId: l.varianteId,
      quantity: cantidadValida(l.cantidad),
    })),
    notes: pedido.notas || undefined,
  };
}

interface DireccionPegada {
  fullName?: string;
  phone?: string;
  email?: string;
  line1?: string;
  line2?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
}

interface PedidoPegado {
  customerEmail?: string;
  externalOrderId?: string;
  shippingAddress?: DireccionPegada;
  items?: { productId?: string; variantId?: string; quantity?: number }[];
  notes?: string;
}

function aPedidoNuevo(bruto: unknown): PedidoNuevo {
  const dto = (bruto ?? {}) as PedidoPegado;
  const direccion = dto.shippingAddress ?? {};
  return {
    emailCliente: dto.customerEmail,
    idExterno: dto.externalOrderId,
    direccionDeEnvio: {
      nombreCompleto: direccion.fullName ?? '',
      telefono: direccion.phone,
      email: direccion.email,
      linea1: direccion.line1 ?? '',
      linea2: direccion.line2,
      ciudad: direccion.city ?? '',
      provincia: direccion.state,
      codigoPostal: direccion.postalCode,
      pais: direccion.country ?? '',
    },
    lineas: (dto.items ?? []).map((i) => ({
      productoId: i.productId ?? '',
      varianteId: i.variantId,
      cantidad: i.quantity ?? 1,
    })),
    notas: dto.notes,
  };
}
