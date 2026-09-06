import { EnvironmentProviders, Provider, inject, makeEnvironmentProviders } from '@angular/core';
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
import { CancelacionDePedido } from './presentation/service/cancelacion-de-pedido';

/**
 * Los casos de uso de «orders».
 *
 * <p>Se listan aparte de los adaptadores para poder montarlos en una prueba EXACTAMENTE como los monta
 * la ruta. Es la lección del fallo que arregló esta lista: mientras cada clase se declaraba a sí misma
 * `providedIn: 'root'`, el banco de pruebas las tenía siempre a mano y la aplicación de verdad no, así
 * que 2.800 pruebas en verde convivían con pantallas que reventaban al abrirlas. Con una sola lista,
 * añadir un caso de uso lo mete a la vez en la ruta y en las pruebas, y no hay forma de que diverjan.
 */
export const APLICACION_DE_PEDIDOS: Provider[] = [
  CancelaPedido,
  ConsultaPedido,
  DescargaFactura,
  ListaPedidos,
  SiguePedido,
];

/**
 * La conversación de cancelar un pedido: un servicio de PRESENTACIÓN, no un caso de uso, porque lo que
 * hace es hablar con quien mira. Se registra igualmente aquí porque inyecta `CancelaPedido`, y quien
 * depende de algo que vive en la ruta no puede vivir en la raíz.
 *
 * <p>Va aparte de `APLICACION_DE_PEDIDOS` para no mezclar capas en una misma lista: lo que las une es el
 * inyector, no el hexágono.
 */
export const PRESENTACION_DE_PEDIDOS: Provider[] = [CancelacionDePedido];

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

    ...APLICACION_DE_PEDIDOS,
    ...PRESENTACION_DE_PEDIDOS,
  ]);
}
