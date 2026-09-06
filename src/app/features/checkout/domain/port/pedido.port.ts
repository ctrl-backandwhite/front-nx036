import { InjectionToken } from '@angular/core';
import { Result } from '@shared/result/result';
import { AppError } from '@shared/error/app-error';
import { DireccionDeEnvio, DireccionGuardada, PedidoCreado, SolicitudDePedido } from '../model/pedido';

/** Crear el pedido. Una capacidad y un método: es la operación que no se puede repetir a la ligera. */
export interface PedidoPort {
  crea(solicitud: SolicitudDePedido): Promise<Result<PedidoCreado, AppError>>;
}

export const PEDIDO_PORT = new InjectionToken<PedidoPort>('PedidoPort');

/**
 * Las direcciones de la cuenta, vistas por el pago.
 *
 * <p>Puerto PROPIO de «checkout» sobre un dato que también administra la cuenta. El pago no quiere el
 * mantenimiento de direcciones —renombrar, marcar por defecto, borrar—: quiere la lista para elegir y
 * poder guardar una nueva al vuelo. Declarar lo que se usa evita que un cambio en la pantalla de
 * direcciones rompa el cobro.
 */
export interface DireccionesDeEnvioPort {
  lista(): Promise<Result<readonly DireccionGuardada[], AppError>>;
  crea(direccion: DireccionDeEnvio, porDefecto: boolean): Promise<Result<DireccionGuardada, AppError>>;
}

export const DIRECCIONES_DE_ENVIO_PORT = new InjectionToken<DireccionesDeEnvioPort>(
  'DireccionesDeEnvioPort',
);
