import { EnvironmentProviders, inject, makeEnvironmentProviders } from '@angular/core';
import {
  CANCELACION_DE_PEDIDO_PORT,
  FACTURA_DE_PEDIDO_PORT,
  PEDIDOS_PORT,
  SEGUIMIENTO_DE_PEDIDO_PORT,
} from './domain/port/pedidos.port';
import { PedidosHttpAdapter } from './infrastructure/pedidos-http.adapter';
import { SeguimientoHttpAdapter } from './infrastructure/seguimiento-http.adapter';
import { FacturaHttpAdapter } from './infrastructure/factura-http.adapter';

/**
 * Ata los puertos de «orders» con sus adaptadores.
 *
 * <p>Es el único sitio del contexto donde aparece una clase de infraestructura: casos de uso, dominio y
 * pantallas solo conocen las interfaces, así que poner un doble en una prueba —o cambiar de backend— es
 * cambiar estas líneas y nada más.
 */
export function proveePedidos(): EnvironmentProviders {
  return makeEnvironmentProviders([
    PedidosHttpAdapter,
    { provide: PEDIDOS_PORT, useFactory: () => inject(PedidosHttpAdapter) },
    { provide: CANCELACION_DE_PEDIDO_PORT, useFactory: () => inject(PedidosHttpAdapter) },
    SeguimientoHttpAdapter,
    { provide: SEGUIMIENTO_DE_PEDIDO_PORT, useFactory: () => inject(SeguimientoHttpAdapter) },
    FacturaHttpAdapter,
    { provide: FACTURA_DE_PEDIDO_PORT, useFactory: () => inject(FacturaHttpAdapter) },
  ]);
}
