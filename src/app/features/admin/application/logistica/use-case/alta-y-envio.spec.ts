import { TestBed } from '@angular/core/testing';
import { exito, fallo } from '@shared/result/result';
import { creaError } from '@shared/error/app-error';
import {
  ALTA_DE_PEDIDOS_PORT,
  BUSCADOR_DE_PRODUCTOS_PORT,
  FACTURA_DE_PEDIDO_PORT,
  LECTOR_DE_PEDIDOS_PEGADOS_PORT,
  SEGUIMIENTO_ADMIN_PORT,
} from '../../../domain/logistica/port/pedidos-admin.port';
import { DESCARGA_DE_FICHEROS_PORT } from '../../../domain/logistica/port/navegador.port';
import { PedidoNuevo } from '../../../domain/logistica/model/pedido';
import {
  BuscaProductosParaPedido,
  CreaPedido,
  CreaPedidoDeDemostracion,
  ImportaPedidos,
} from './alta-de-pedidos.use-case';
import { LeePedidosPegados } from './lee-pedidos-pegados.use-case';
import { ConsultaSeguimiento, DescargaFactura, SincronizaSeguimiento } from './sigue-el-envio.use-case';

const DIRECCION = {
  nombreCompleto: 'Juan Pérez',
  linea1: 'C/ Mayor 1',
  ciudad: 'Madrid',
  pais: 'ES',
};

function pedidoNuevo(parcial: Partial<PedidoNuevo> = {}): PedidoNuevo {
  return {
    direccionDeEnvio: DIRECCION,
    lineas: [{ productoId: 'x', cantidad: 1 }],
    ...parcial,
  };
}

function dobleDeAlta() {
  return {
    crea: vi.fn().mockResolvedValue(exito(undefined)),
    importa: vi
      .fn()
      .mockResolvedValue(exito({ importados: 3, fallidos: 0, errores: [] })),
    creaDemostracion: vi.fn().mockResolvedValue(exito(undefined)),
  };
}

describe('CreaPedido', () => {
  function monta(puerto: ReturnType<typeof dobleDeAlta>) {
    TestBed.configureTestingModule({
      providers: [CreaPedido, { provide: ALTA_DE_PEDIDOS_PORT, useValue: puerto }],
    });
    return TestBed.inject(CreaPedido);
  }

  it('manda el pedido cuando está completo', async () => {
    const puerto = dobleDeAlta();
    const resultado = await monta(puerto).ejecuta(pedidoNuevo());

    expect(resultado.ok).toBe(true);
    expect(puerto.crea).toHaveBeenCalled();
  });

  /** Un pedido sin líneas no es un pedido: se dice CUÁL de las dos cosas falta, sin gastar petición. */
  it('rechaza sin llamar al backend un pedido sin líneas', async () => {
    const puerto = dobleDeAlta();
    const resultado = await monta(puerto).ejecuta(pedidoNuevo({ lineas: [] }));

    expect(resultado.ok).toBe(false);
    expect(resultado.ok || resultado.error).toBe('sin-lineas');
    expect(puerto.crea).not.toHaveBeenCalled();
  });

  it('rechaza sin llamar al backend un pedido sin dirección completa', async () => {
    const puerto = dobleDeAlta();
    const resultado = await monta(puerto).ejecuta(
      pedidoNuevo({ direccionDeEnvio: { ...DIRECCION, ciudad: '' } }),
    );

    expect(resultado.ok || resultado.error).toBe('sin-direccion');
    expect(puerto.crea).not.toHaveBeenCalled();
  });
});

describe('importación de pedidos', () => {
  it('devuelve el parte del backend', async () => {
    const puerto = dobleDeAlta();
    TestBed.configureTestingModule({
      providers: [ImportaPedidos, { provide: ALTA_DE_PEDIDOS_PORT, useValue: puerto }],
    });

    const resultado = await TestBed.inject(ImportaPedidos).ejecuta([pedidoNuevo()]);

    expect(resultado.ok && resultado.valor.importados).toBe(3);
  });

  it('el pedido de demostración llega al puerto', async () => {
    const puerto = dobleDeAlta();
    TestBed.configureTestingModule({
      providers: [CreaPedidoDeDemostracion, { provide: ALTA_DE_PEDIDOS_PORT, useValue: puerto }],
    });

    await TestBed.inject(CreaPedidoDeDemostracion).ejecuta();

    expect(puerto.creaDemostracion).toHaveBeenCalled();
  });

  it('la lectura del volcado delega en el puerto, que es quien conoce la forma del backend', () => {
    const lector = { interpreta: vi.fn().mockReturnValue(fallo('formato')) };
    TestBed.configureTestingModule({
      providers: [LeePedidosPegados, { provide: LECTOR_DE_PEDIDOS_PEGADOS_PORT, useValue: lector }],
    });

    const resultado = TestBed.inject(LeePedidosPegados).ejecuta('{ roto');

    expect(lector.interpreta).toHaveBeenCalledWith('{ roto');
    expect(resultado.ok).toBe(false);
  });
});

describe('BuscaProductosParaPedido', () => {
  it('devuelve solo identificador y título', async () => {
    const puerto = { busca: vi.fn().mockResolvedValue(exito([{ id: 'x', titulo: 'Gorro' }])) };
    TestBed.configureTestingModule({
      providers: [
        BuscaProductosParaPedido,
        { provide: BUSCADOR_DE_PRODUCTOS_PORT, useValue: puerto },
      ],
    });

    const resultado = await TestBed.inject(BuscaProductosParaPedido).ejecuta('gorro', 'es');

    expect(puerto.busca).toHaveBeenCalledWith('gorro', 'es');
    expect(resultado.ok && resultado.valor).toEqual([{ id: 'x', titulo: 'Gorro' }]);
  });
});

describe('seguimiento del envío', () => {
  function dobleDeSeguimiento() {
    return {
      consulta: vi.fn().mockResolvedValue(
        exito({ eventos: [], bultos: [], declaraciones: [] }),
      ),
      sincroniza: vi.fn().mockResolvedValue(exito(undefined)),
    };
  }

  it('consultar pasa el identificador al puerto', async () => {
    const puerto = dobleDeSeguimiento();
    TestBed.configureTestingModule({
      providers: [ConsultaSeguimiento, { provide: SEGUIMIENTO_ADMIN_PORT, useValue: puerto }],
    });

    await TestBed.inject(ConsultaSeguimiento).ejecuta('p1');

    expect(puerto.consulta).toHaveBeenCalledWith('p1');
  });

  /** Sincronizar sin volver a leer deja la pantalla igual: quien pulsa quiere VER el cambio. */
  it('tras sincronizar vuelve a leer el rastro', async () => {
    const puerto = dobleDeSeguimiento();
    TestBed.configureTestingModule({
      providers: [SincronizaSeguimiento, { provide: SEGUIMIENTO_ADMIN_PORT, useValue: puerto }],
    });

    const resultado = await TestBed.inject(SincronizaSeguimiento).ejecuta('p1');

    expect(puerto.sincroniza).toHaveBeenCalledWith('p1');
    expect(puerto.consulta).toHaveBeenCalledWith('p1');
    expect(resultado.ok).toBe(true);
  });

  it('si la sincronización falla NO se vuelve a leer: no habría nada nuevo que ver', async () => {
    const puerto = dobleDeSeguimiento();
    puerto.sincroniza.mockResolvedValue(fallo(creaError('error-del-servidor')));
    TestBed.configureTestingModule({
      providers: [SincronizaSeguimiento, { provide: SEGUIMIENTO_ADMIN_PORT, useValue: puerto }],
    });

    const resultado = await TestBed.inject(SincronizaSeguimiento).ejecuta('p1');

    expect(resultado.ok).toBe(false);
    expect(puerto.consulta).not.toHaveBeenCalled();
  });
});

describe('DescargaFactura', () => {
  function monta(factura: { descarga: ReturnType<typeof vi.fn> }) {
    const ficheros = { guarda: vi.fn() };
    TestBed.configureTestingModule({
      providers: [
        DescargaFactura,
        { provide: FACTURA_DE_PEDIDO_PORT, useValue: factura },
        { provide: DESCARGA_DE_FICHEROS_PORT, useValue: ficheros },
      ],
    });
    return { caso: TestBed.inject(DescargaFactura), ficheros };
  }

  it('guarda el PDF con el número de pedido como nombre', async () => {
    const blob = new Blob(['pdf']);
    const { caso, ficheros } = monta({ descarga: vi.fn().mockResolvedValue(exito(blob)) });

    const resultado = await caso.ejecuta('p1', 'NX-1001');

    expect(resultado.ok).toBe(true);
    expect(ficheros.guarda).toHaveBeenCalledWith('NX-1001.pdf', blob);
  });

  it('sin número de pedido usa un nombre neutro en vez de dejar el fichero sin nombre', async () => {
    const { caso, ficheros } = monta({
      descarga: vi.fn().mockResolvedValue(exito(new Blob(['pdf']))),
    });

    await caso.ejecuta('p1', '');

    expect(ficheros.guarda).toHaveBeenCalledWith('factura.pdf', expect.any(Blob));
  });

  it('si la descarga falla no se guarda nada', async () => {
    const { caso, ficheros } = monta({
      descarga: vi.fn().mockResolvedValue(fallo(creaError('sin-permiso'))),
    });

    const resultado = await caso.ejecuta('p1', 'NX-1');

    expect(resultado.ok).toBe(false);
    expect(ficheros.guarda).not.toHaveBeenCalled();
  });
});
