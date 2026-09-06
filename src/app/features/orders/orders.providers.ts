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
import { CancelaPedido } from './application/use-case/cancela-pedido.use-case';
import { ConsultaPedido } from './application/use-case/consulta-pedido.use-case';
import { DescargaFactura } from './application/use-case/descarga-factura.use-case';
import { ListaPedidos } from './application/use-case/lista-pedidos.use-case';
import { SiguePedido } from './application/use-case/sigue-pedido.use-case';

/**
 * Ata los puertos de «orders» con sus adaptadores.
 *
 * <p>Es el único sitio del contexto donde aparece una clase de infraestructura: casos de uso, dominio y
 * pantallas solo conocen las interfaces, así que poner un doble en una prueba —o cambiar de backend— es
 * cambiar estas líneas y nada más.
 *
 * <p>Los CASOS DE USO se registran aquí también, en vez de marcarse `providedIn: 'root'`. Un servicio de
 * la raíz solo ve los proveedores de la raíz: `ListaPedidos` allí no encontraría el `PEDIDOS_PORT` que
 * se declara en esta ruta y la pantalla moría al abrirla («NG0201: No provider found»). Las pruebas no
 * lo veían porque en ellas caso de uso y doble del puerto se dan en el mismo banco.
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

    // Los casos de uso, junto a los puertos de los que dependen: mismo inyector, misma vida.
    CancelaPedido,
    ConsultaPedido,
    DescargaFactura,
    ListaPedidos,
    SiguePedido,
  ]);
}
