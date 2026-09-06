import { InjectionToken } from '@angular/core';
import { Result } from '@shared/result/result';
import { AppError } from '@shared/error/app-error';
import { ArchivoDescargable, Pedido, ResumenDePedido } from '../model/pedido';
import { Seguimiento } from '../model/seguimiento';

/**
 * Consultar los pedidos de quien mira. Solo lectura.
 *
 * <p>Los puertos se parten por CAPACIDAD: quien pinta el listado no tiene por qué saber cancelar ni
 * emitir facturas, y un doble de prueba del listado no debería verse obligado a fingir las dos cosas.
 */
export interface PedidosPort {
  lista(): Promise<Result<readonly ResumenDePedido[], AppError>>;
  /**
   * El idioma viaja a propósito: el backend devuelve el título del producto traducido en vez de la
   * copia en chino que se guardó al comprar.
   */
  consulta(id: string, idioma: string): Promise<Result<Pedido, AppError>>;
}

export const PEDIDOS_PORT = new InjectionToken<PedidosPort>('PedidosPort');

/** Cancelar un pedido y recuperar el dinero. Es otra capacidad, y mueve dinero: es otro puerto. */
export interface CancelacionDePedidoPort {
  /**
   * @param aLaCartera cierto para abonar al instante en la cartera; falso para devolver al medio de pago
   *        original, con los plazos de la pasarela.
   */
  cancela(id: string, idioma: string, aLaCartera: boolean): Promise<Result<void, AppError>>;
}

export const CANCELACION_DE_PEDIDO_PORT = new InjectionToken<CancelacionDePedidoPort>(
  'CancelacionDePedidoPort',
);

/** El rastro del envío. Se consulta muy a menudo (se refresca solo), así que va aparte. */
export interface SeguimientoDePedidoPort {
  consulta(id: string): Promise<Result<Seguimiento, AppError>>;
}

export const SEGUIMIENTO_DE_PEDIDO_PORT = new InjectionToken<SeguimientoDePedidoPort>(
  'SeguimientoDePedidoPort',
);

/** La factura en PDF. Capacidad aparte porque no devuelve datos, devuelve un archivo. */
export interface FacturaDePedidoPort {
  descarga(id: string, numero: string, idioma: string): Promise<Result<ArchivoDescargable, AppError>>;
}

export const FACTURA_DE_PEDIDO_PORT = new InjectionToken<FacturaDePedidoPort>('FacturaDePedidoPort');
