import { InjectionToken } from '@angular/core';
import { Result } from '@shared/result/result';
import { AppError } from '@shared/error/app-error';
import {
  AccionSobrePedido,
  CriterioDePedidos,
  FichaDePedido,
  PaginaDePedidos,
  PedidoNuevo,
  ResultadoDeImportacion,
  ResultadoEnLote,
} from '../model/pedido';
import { Seguimiento } from '../model/seguimiento';

/**
 * Consultar pedidos y hacerlos avanzar.
 *
 * <p>Partido por CAPACIDAD: quien solo consulta el listado no arrastra el alta, la importación ni el
 * seguimiento, y un doble de prueba no tiene que fingir doce métodos para comprobar uno.
 */
export interface PedidosAdminPort {
  busca(criterio: CriterioDePedidos): Promise<Result<PaginaDePedidos, AppError>>;
  /** El idioma va en la petición: sin él los títulos de línea vuelven en chino. */
  ficha(id: string, idioma: string): Promise<Result<FichaDePedido, AppError>>;
  reindexa(): Promise<Result<number, AppError>>;
}

export const PEDIDOS_ADMIN_PORT = new InjectionToken<PedidosAdminPort>('PedidosAdminPort');

/**
 * Cambiar el estado de un pedido, de uno en uno o en lote.
 *
 * <p>Las transiciones no válidas cuentan como fallidas en el lote pero no lo abortan: es el backend
 * quien decide, y un pedido en estado incompatible no puede impedir que avancen los demás.
 */
export interface TransicionesDePedidoPort {
  aplica(id: string, accion: AccionSobrePedido): Promise<Result<void, AppError>>;
  aplicaEnLote(
    ids: readonly string[],
    accion: AccionSobrePedido,
  ): Promise<Result<ResultadoEnLote, AppError>>;
}

export const TRANSICIONES_DE_PEDIDO_PORT = new InjectionToken<TransicionesDePedidoPort>(
  'TransicionesDePedidoPort',
);

/** Dar de alta pedidos a mano o volcarlos desde otro sistema. */
export interface AltaDePedidosPort {
  crea(pedido: PedidoNuevo): Promise<Result<void, AppError>>;
  importa(pedidos: readonly PedidoNuevo[]): Promise<Result<ResultadoDeImportacion, AppError>>;
  /** Solo se ofrece en desarrollo: siembra un pedido de mentira para probar el circuito. */
  creaDemostracion(): Promise<Result<void, AppError>>;
}

export const ALTA_DE_PEDIDOS_PORT = new InjectionToken<AltaDePedidosPort>('AltaDePedidosPort');

/** Por qué un volcado pegado no se puede ni intentar. */
export type FalloDeLectura = 'formato' | 'vacio';

/**
 * Interpretar el volcado que alguien pega en el importador.
 *
 * <p>Es un puerto aunque no salga a la red: lo que se pega tiene la forma del BACKEND —es el mismo
 * cuerpo que acepta el endpoint, copiado de otro sistema—, así que entenderlo es traducir del vocabulario
 * ajeno al nuestro, y eso es trabajo del adaptador. Metido en el dominio, los nombres de campo del
 * servidor acabarían dentro de las reglas de negocio.
 */
export interface LectorDePedidosPegadosPort {
  interpreta(texto: string): Result<readonly PedidoNuevo[], FalloDeLectura>;
}

export const LECTOR_DE_PEDIDOS_PEGADOS_PORT = new InjectionToken<LectorDePedidosPegadosPort>(
  'LectorDePedidosPegadosPort',
);

/** Consultar el rastro del envío y forzar una sincronización con el transportista. */
export interface SeguimientoAdminPort {
  consulta(pedidoId: string): Promise<Result<Seguimiento, AppError>>;
  sincroniza(pedidoId: string): Promise<Result<void, AppError>>;
}

export const SEGUIMIENTO_ADMIN_PORT = new InjectionToken<SeguimientoAdminPort>(
  'SeguimientoAdminPort',
);

/**
 * La factura del pedido.
 *
 * <p>Va por aquí y no por un enlace directo porque la descarga está protegida: un `<a href>` viajaría
 * sin la credencial y devolvería un 401 en vez del PDF.
 */
export interface FacturaDePedidoPort {
  descarga(pedidoId: string): Promise<Result<Blob, AppError>>;
}

export const FACTURA_DE_PEDIDO_PORT = new InjectionToken<FacturaDePedidoPort>(
  'FacturaDePedidoPort',
);

/**
 * Buscar productos para montar una línea del pedido nuevo.
 *
 * <p>Es un puerto PROPIO con una sola capacidad, no el catálogo entero del contexto de al lado: aquí se
 * necesitan un identificador y un título para una lista de sugerencias, no la ficha con sus variantes,
 * sus precios y sus imágenes. Depender del puerto grande ataría esta pantalla a cada cambio de aquel.
 */
export interface BuscadorDeProductosPort {
  busca(
    texto: string,
    idioma: string,
  ): Promise<Result<readonly { readonly id: string; readonly titulo: string }[], AppError>>;
}

export const BUSCADOR_DE_PRODUCTOS_PORT = new InjectionToken<BuscadorDeProductosPort>(
  'BuscadorDeProductosPort',
);
