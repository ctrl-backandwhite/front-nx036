import { EnvironmentProviders, inject, makeEnvironmentProviders } from '@angular/core';
import { CARTERA_PORT } from './domain/port/cartera.port';
import { COTIZACION_DE_LA_COMPRA_PORT } from './domain/port/cotizacion-de-la-compra.port';
import { COBERTURA_DE_ENVIO_PORT, ENVIO_PORT } from './domain/port/envio.port';
import {
  METODOS_DE_PAGO_PORT,
  PAGO_CON_TARJETA_GUARDADA_PORT,
  PAGO_PORT,
} from './domain/port/pago.port';
import { PASARELA_DE_PAGO_PORT } from './domain/port/pasarela-de-pago.port';
import { DIRECCIONES_DE_ENVIO_PORT, PEDIDO_PORT } from './domain/port/pedido.port';
import { REFERIDO_PORT } from './domain/port/referido.port';
import { CarteraHttpAdapter } from './infrastructure/cartera-http.adapter';
import { CotizacionDeLaCompraHttpAdapter } from './infrastructure/cotizacion-de-la-compra-http.adapter';
import { CoberturaDeEnvioHttpAdapter, EnvioHttpAdapter } from './infrastructure/envio-http.adapter';
import {
  MetodosDePagoHttpAdapter,
  PagoConTarjetaGuardadaHttpAdapter,
  PagoHttpAdapter,
} from './infrastructure/pago-http.adapter';
import {
  DireccionesDeEnvioHttpAdapter,
  PedidoHttpAdapter,
} from './infrastructure/pedido-http.adapter';
import { ReferidoHttpAdapter } from './infrastructure/referido-http.adapter';
import { StripeAdapter } from './infrastructure/stripe.adapter';
import { CompraStore } from './application/state/compra.store';
import { AplicaElReferido } from './application/use-case/aplica-el-referido.use-case';
import { ConfirmaElDeposito } from './application/use-case/confirma-el-deposito.use-case';
import { ConfirmaElPago } from './application/use-case/confirma-el-pago.use-case';
import { ConsultaLaCobertura } from './application/use-case/consulta-la-cobertura.use-case';
import { CotizaElEnvio } from './application/use-case/cotiza-el-envio.use-case';
import { PreparaLaCompra } from './application/use-case/prepara-la-compra.use-case';
import { PreparaLaPasarela } from './application/use-case/prepara-la-pasarela.use-case';
import { RealizaElPedido } from './application/use-case/realiza-el-pedido.use-case';
import { RetiraLoQueYaNoEsta } from './application/use-case/retira-lo-que-ya-no-esta.use-case';
import { ValoraLaCompra } from './application/use-case/valora-la-compra.use-case';

/**
 * Ata los puertos de «checkout» con sus adaptadores.
 *
 * <p>Es el único sitio del contexto donde aparece una clase de infraestructura, y el único donde aparece
 * el nombre de una pasarela de pago. Cambiar de proveedor es cambiar una línea de aquí.
 *
 * <p>NO ata la cesta, y no es un olvido. El pago opera sobre ella —la lee para componer el pedido, ajusta
 * cantidades cuando el destino no admite el importe y la vacía cuando el cobro se confirma— y lo hace por
 * el contrato público de «cart», `CARRITO_COMPARTIDO_PORT`. Pero ATARLO es cosa de la raíz de composición:
 * un contexto no puede llamar a `proveeCarrito()` de otro, y el lint lo impide con razón. `proveeCarrito()`
 * tiene que declararse en `app.config.ts` junto a `proveeAuth()`, por el mismo motivo que aquel: la cesta es
 * transversal —el cajón lateral, la insignia del icono y el pago la necesitan—, no una pantalla. Queda
 * anotado en el informe como el único paso de integración que este porte deja pendiente.
 */
export function proveeCheckout(): EnvironmentProviders {
  return makeEnvironmentProviders([
    EnvioHttpAdapter,
    { provide: ENVIO_PORT, useFactory: () => inject(EnvioHttpAdapter) },
    CoberturaDeEnvioHttpAdapter,
    { provide: COBERTURA_DE_ENVIO_PORT, useFactory: () => inject(CoberturaDeEnvioHttpAdapter) },
    PedidoHttpAdapter,
    { provide: PEDIDO_PORT, useFactory: () => inject(PedidoHttpAdapter) },
    DireccionesDeEnvioHttpAdapter,
    { provide: DIRECCIONES_DE_ENVIO_PORT, useFactory: () => inject(DireccionesDeEnvioHttpAdapter) },
    CarteraHttpAdapter,
    { provide: CARTERA_PORT, useFactory: () => inject(CarteraHttpAdapter) },
    CotizacionDeLaCompraHttpAdapter,
    {
      provide: COTIZACION_DE_LA_COMPRA_PORT,
      useFactory: () => inject(CotizacionDeLaCompraHttpAdapter),
    },
    PagoHttpAdapter,
    { provide: PAGO_PORT, useFactory: () => inject(PagoHttpAdapter) },
    PagoConTarjetaGuardadaHttpAdapter,
    {
      provide: PAGO_CON_TARJETA_GUARDADA_PORT,
      useFactory: () => inject(PagoConTarjetaGuardadaHttpAdapter),
    },
    MetodosDePagoHttpAdapter,
    { provide: METODOS_DE_PAGO_PORT, useFactory: () => inject(MetodosDePagoHttpAdapter) },
    ReferidoHttpAdapter,
    { provide: REFERIDO_PORT, useFactory: () => inject(ReferidoHttpAdapter) },

    // La ÚNICA línea del proyecto que decide que la pasarela es Stripe.
    StripeAdapter,
    { provide: PASARELA_DE_PAGO_PORT, useFactory: () => inject(StripeAdapter) },

    CompraStore,
    PreparaLaCompra,
    PreparaLaPasarela,
    CotizaElEnvio,
    ValoraLaCompra,
    RealizaElPedido,
    RetiraLoQueYaNoEsta,
    ConfirmaElPago,
    ConfirmaElDeposito,
    AplicaElReferido,
    ConsultaLaCobertura,
  ]);
}
