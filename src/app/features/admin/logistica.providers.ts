import { EnvironmentProviders, inject, makeEnvironmentProviders } from '@angular/core';
import {
  ALTA_DE_PEDIDOS_PORT,
  BUSCADOR_DE_PRODUCTOS_PORT,
  FACTURA_DE_PEDIDO_PORT,
  LECTOR_DE_PEDIDOS_PEGADOS_PORT,
  PEDIDOS_ADMIN_PORT,
  SEGUIMIENTO_ADMIN_PORT,
  TRANSICIONES_DE_PEDIDO_PORT,
} from './domain/logistica/port/pedidos-admin.port';
import {
  AVANCE_DE_COMPRA_PORT,
  COMPRAS_PORT,
  HOJA_DE_EMPAQUETADO_PORT,
} from './domain/logistica/port/compras.port';
import {
  ALMACENES_ADMIN_PORT,
  CUMPLIMIENTO_PORT,
  IMPUESTOS_PORT,
  LIMITES_DE_TRANSPORTISTA_PORT,
} from './domain/logistica/port/configuracion-logistica.port';
import {
  MIS_GANANCIAS_PORT,
  REPORTE_DE_OPERADORES_PORT,
} from './domain/logistica/port/operadores.port';
import {
  DESCARGA_DE_FICHEROS_PORT,
  PORTAPAPELES_PORT,
} from './domain/logistica/port/navegador.port';
import { PedidosAdminHttpAdapter } from './infrastructure/logistica/pedidos-admin-http.adapter';
import { SeguimientoHttpAdapter } from './infrastructure/logistica/seguimiento-http.adapter';
import { ComprasHttpAdapter } from './infrastructure/logistica/compras-http.adapter';
import { LimitesTransportistaHttpAdapter } from './infrastructure/logistica/limites-transportista-http.adapter';
import { AlmacenesHttpAdapter } from './infrastructure/logistica/almacenes-http.adapter';
import { ImpuestosHttpAdapter } from './infrastructure/logistica/impuestos-http.adapter';
import { CumplimientoHttpAdapter } from './infrastructure/logistica/cumplimiento-http.adapter';
import { OperadoresHttpAdapter } from './infrastructure/logistica/operadores-http.adapter';
import { BuscadorDeProductosHttpAdapter } from './infrastructure/logistica/buscador-de-productos-http.adapter';
import {
  DescargaDeFicherosAdapter,
  PortapapelesAdapter,
} from './infrastructure/logistica/navegador.adapter';

import {
  BuscaPedidos,
  CambiaEstadoDePedido,
  CambiaEstadoEnLote,
  ConsultaPedido,
  ReindexaPedidos,
} from './application/logistica/use-case/gestiona-pedidos.use-case';
import {
  BuscaProductosParaPedido,
  CreaPedido,
  CreaPedidoDeDemostracion,
  ImportaPedidos,
} from './application/logistica/use-case/alta-de-pedidos.use-case';
import { LeePedidosPegados } from './application/logistica/use-case/lee-pedidos-pegados.use-case';
import {
  ConsultaSeguimiento,
  DescargaFactura,
  SincronizaSeguimiento,
} from './application/logistica/use-case/sigue-el-envio.use-case';
import {
  AnulaCompra,
  ConsultaCompras,
  CopiaDireccionDeAlmacen,
  DescargaHojaDeEmpaquetado,
  MarcaCompraHecha,
  MarcaEnvioDelProveedor,
  MarcaRecepcionEnAlmacen,
  MarcaReempaquetado,
  ReexportaCompra,
} from './application/logistica/use-case/gestiona-compras.use-case';
import {
  AlternaLimiteDeTransportista,
  AplicaLoteDeAlmacenes,
  BorraAlmacen,
  BorraLimiteDeTransportista,
  ConsultaAlmacenes,
  ConsultaLimitesDeTransportista,
  GuardaAlmacen,
  GuardaLimiteDeTransportista,
} from './application/logistica/use-case/configura-logistica.use-case';
import {
  AlternaImpuestoDePais,
  AlternaRegionFiscal,
  BorraImpuestoDePais,
  BorraRegionFiscal,
  ConsultaImpuestos,
  GuardaImpuestoDePais,
  GuardaRegionFiscal,
} from './application/logistica/use-case/gestiona-impuestos.use-case';
import {
  ConsultaCumplimiento,
  GuardaOperadorEconomico,
} from './application/logistica/use-case/gestiona-cumplimiento.use-case';
import {
  ConsultaMisGanancias,
  ConsultaReporteDeOperadores,
  ReindexaOperaciones,
} from './application/logistica/use-case/consulta-ganancias.use-case';

/**
 * Ata los puertos del área de PEDIDOS Y LOGÍSTICA del panel con sus adaptadores.
 *
 * <p>Es el único sitio de esta área donde aparece una clase de infraestructura. Todo lo demás —casos de
 * uso, estado, pantallas— solo conoce las interfaces, así que cambiar de transportista, de pasarela o
 * poner un doble en una prueba es cambiar estas líneas y nada más.
 *
 * <p>Va colgado de las RUTAS del área y no de la raíz para que su código no pese en el arranque de quien
 * entra al escaparate: aquí hay diez pantallas que solo mira quien administra.
 */
export function proveeAdminLogistica(): EnvironmentProviders {
  return makeEnvironmentProviders([
    PedidosAdminHttpAdapter,
    { provide: PEDIDOS_ADMIN_PORT, useFactory: () => inject(PedidosAdminHttpAdapter) },
    { provide: TRANSICIONES_DE_PEDIDO_PORT, useFactory: () => inject(PedidosAdminHttpAdapter) },
    { provide: ALTA_DE_PEDIDOS_PORT, useFactory: () => inject(PedidosAdminHttpAdapter) },
    {
      provide: LECTOR_DE_PEDIDOS_PEGADOS_PORT,
      useFactory: () => inject(PedidosAdminHttpAdapter),
    },

    SeguimientoHttpAdapter,
    { provide: SEGUIMIENTO_ADMIN_PORT, useFactory: () => inject(SeguimientoHttpAdapter) },
    { provide: FACTURA_DE_PEDIDO_PORT, useFactory: () => inject(SeguimientoHttpAdapter) },

    ComprasHttpAdapter,
    { provide: COMPRAS_PORT, useFactory: () => inject(ComprasHttpAdapter) },
    { provide: AVANCE_DE_COMPRA_PORT, useFactory: () => inject(ComprasHttpAdapter) },
    { provide: HOJA_DE_EMPAQUETADO_PORT, useFactory: () => inject(ComprasHttpAdapter) },

    LimitesTransportistaHttpAdapter,
    {
      provide: LIMITES_DE_TRANSPORTISTA_PORT,
      useFactory: () => inject(LimitesTransportistaHttpAdapter),
    },

    AlmacenesHttpAdapter,
    { provide: ALMACENES_ADMIN_PORT, useFactory: () => inject(AlmacenesHttpAdapter) },

    ImpuestosHttpAdapter,
    { provide: IMPUESTOS_PORT, useFactory: () => inject(ImpuestosHttpAdapter) },

    CumplimientoHttpAdapter,
    { provide: CUMPLIMIENTO_PORT, useFactory: () => inject(CumplimientoHttpAdapter) },

    OperadoresHttpAdapter,
    { provide: MIS_GANANCIAS_PORT, useFactory: () => inject(OperadoresHttpAdapter) },
    { provide: REPORTE_DE_OPERADORES_PORT, useFactory: () => inject(OperadoresHttpAdapter) },

    BuscadorDeProductosHttpAdapter,
    { provide: BUSCADOR_DE_PRODUCTOS_PORT, useFactory: () => inject(BuscadorDeProductosHttpAdapter) },

    DescargaDeFicherosAdapter,
    { provide: DESCARGA_DE_FICHEROS_PORT, useFactory: () => inject(DescargaDeFicherosAdapter) },
    PortapapelesAdapter,
    { provide: PORTAPAPELES_PORT, useFactory: () => inject(PortapapelesAdapter) },

    /* Los CASOS DE USO se registran aquí y no con `providedIn: 'root'` porque sus puertos viven en
     * este ámbito: un servicio de la raíz no ve lo que se declara en una ruta, así que se quedaría sin
     * adaptador justo al entrar por una dirección profunda. */
    BuscaPedidos,
    ConsultaPedido,
    ReindexaPedidos,
    CambiaEstadoDePedido,
    CambiaEstadoEnLote,
    CreaPedido,
    ImportaPedidos,
    CreaPedidoDeDemostracion,
    BuscaProductosParaPedido,
    LeePedidosPegados,
    ConsultaSeguimiento,
    SincronizaSeguimiento,
    DescargaFactura,
    ConsultaCompras,
    MarcaCompraHecha,
    MarcaEnvioDelProveedor,
    MarcaRecepcionEnAlmacen,
    MarcaReempaquetado,
    AnulaCompra,
    ReexportaCompra,
    DescargaHojaDeEmpaquetado,
    CopiaDireccionDeAlmacen,
    ConsultaLimitesDeTransportista,
    GuardaLimiteDeTransportista,
    AlternaLimiteDeTransportista,
    BorraLimiteDeTransportista,
    ConsultaAlmacenes,
    GuardaAlmacen,
    BorraAlmacen,
    AplicaLoteDeAlmacenes,
    ConsultaImpuestos,
    GuardaImpuestoDePais,
    AlternaImpuestoDePais,
    BorraImpuestoDePais,
    GuardaRegionFiscal,
    AlternaRegionFiscal,
    BorraRegionFiscal,
    ConsultaCumplimiento,
    GuardaOperadorEconomico,
    ConsultaMisGanancias,
    ConsultaReporteDeOperadores,
    ReindexaOperaciones,
  ]);
}
