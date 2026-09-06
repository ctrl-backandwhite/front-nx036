import { TestBed } from '@angular/core/testing';
import { exito, fallo } from '@shared/result/result';
import { creaError } from '@shared/error/app-error';
import {
  AVANCE_DE_COMPRA_PORT,
  COMPRAS_PORT,
  HOJA_DE_EMPAQUETADO_PORT,
} from '../../../domain/logistica/port/compras.port';
import {
  DESCARGA_DE_FICHEROS_PORT,
  PORTAPAPELES_PORT,
} from '../../../domain/logistica/port/navegador.port';
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
} from './gestiona-compras.use-case';

function dobleDeAvance() {
  return {
    marcaComprada: vi.fn().mockResolvedValue(exito(undefined)),
    marcaEnviada: vi.fn().mockResolvedValue(exito(undefined)),
    marcaRecibida: vi.fn().mockResolvedValue(exito(undefined)),
    marcaReempaquetada: vi.fn().mockResolvedValue(exito(undefined)),
    anula: vi.fn().mockResolvedValue(exito(undefined)),
    reexporta: vi.fn().mockResolvedValue(exito(undefined)),
  };
}

describe('avance de una compra', () => {
  function monta(puerto: ReturnType<typeof dobleDeAvance>) {
    TestBed.configureTestingModule({
      providers: [
        MarcaCompraHecha,
        MarcaEnvioDelProveedor,
        MarcaRecepcionEnAlmacen,
        MarcaReempaquetado,
        AnulaCompra,
        ReexportaCompra,
        { provide: AVANCE_DE_COMPRA_PORT, useValue: puerto },
      ],
    });
  }

  it('marcar comprada lleva la referencia y los importes', async () => {
    const puerto = dobleDeAvance();
    monta(puerto);

    await TestBed.inject(MarcaCompraHecha).ejecuta('c1', { referencia: 'R-1', costeCny: 40 });

    expect(puerto.marcaComprada).toHaveBeenCalledWith('c1', {
      referencia: 'R-1',
      costeCny: 40,
    });
  });

  /** El seguimiento doméstico es el dato que dispara la guía internacional. */
  it('marcar enviada lleva el seguimiento doméstico', async () => {
    const puerto = dobleDeAvance();
    monta(puerto);

    await TestBed.inject(MarcaEnvioDelProveedor).ejecuta('c1', { seguimiento: 'SF123' });

    expect(puerto.marcaEnviada).toHaveBeenCalledWith('c1', { seguimiento: 'SF123' });
  });

  it('marcar recibida no necesita datos', async () => {
    const puerto = dobleDeAvance();
    monta(puerto);

    await TestBed.inject(MarcaRecepcionEnAlmacen).ejecuta('c1');

    expect(puerto.marcaRecibida).toHaveBeenCalledWith('c1');
  });

  it('el re-empaquetado arrastra el tipo de servicio sugerido', async () => {
    const puerto = dobleDeAvance();
    monta(puerto);

    await TestBed.inject(MarcaReempaquetado).ejecuta('c1', {
      numeroDeOrden: 'PK-9',
      tipoDeServicio: 'BPA',
    });

    expect(puerto.marcaReempaquetada).toHaveBeenCalledWith('c1', {
      numeroDeOrden: 'PK-9',
      tipoDeServicio: 'BPA',
    });
  });

  it('anular puede ir sin motivo', async () => {
    const puerto = dobleDeAvance();
    monta(puerto);

    await TestBed.inject(AnulaCompra).ejecuta('c1');

    expect(puerto.anula).toHaveBeenCalledWith('c1', undefined);
  });

  it('un fallo del backend llega tal cual a quien lo pidió', async () => {
    const puerto = dobleDeAvance();
    puerto.reexporta.mockResolvedValue(fallo(creaError('conflicto', 'ya tiene orden')));
    monta(puerto);

    const resultado = await TestBed.inject(ReexportaCompra).ejecuta('c1');

    expect(resultado.ok).toBe(false);
  });
});

describe('cola de compras', () => {
  it('lee la cola y el avance de la hoja por separado', async () => {
    const compras = { cola: vi.fn().mockResolvedValue(exito([])) };
    const hoja = {
      avance: vi.fn().mockResolvedValue(exito({ exportables: 3, incidencias: [] })),
      descarga: vi.fn(),
    };
    TestBed.configureTestingModule({
      providers: [
        ConsultaCompras,
        { provide: COMPRAS_PORT, useValue: compras },
        { provide: HOJA_DE_EMPAQUETADO_PORT, useValue: hoja },
      ],
    });
    const caso = TestBed.inject(ConsultaCompras);

    await caso.cola();
    const avance = await caso.avanceDeLaHoja();

    expect(compras.cola).toHaveBeenCalled();
    expect(avance.ok && avance.valor.exportables).toBe(3);
  });
});

describe('DescargaHojaDeEmpaquetado', () => {
  function monta(hoja: { descarga: ReturnType<typeof vi.fn>; avance?: unknown }) {
    const ficheros = { guarda: vi.fn() };
    TestBed.configureTestingModule({
      providers: [
        DescargaHojaDeEmpaquetado,
        { provide: HOJA_DE_EMPAQUETADO_PORT, useValue: hoja },
        { provide: DESCARGA_DE_FICHEROS_PORT, useValue: ficheros },
      ],
    });
    return { caso: TestBed.inject(DescargaHojaDeEmpaquetado), ficheros };
  }

  it('guarda el fichero con la marca de tiempo, para saber cuál fue la última descarga', async () => {
    const blob = new Blob(['xls']);
    const { caso, ficheros } = monta({ descarga: vi.fn().mockResolvedValue(exito(blob)) });

    const resultado = await caso.ejecuta(new Date(2026, 8, 6, 7, 5));

    expect(resultado.ok).toBe(true);
    expect(ficheros.guarda).toHaveBeenCalledWith(
      'yunfulfillment-packorder_2026-09-06_07-05.xls',
      blob,
    );
  });

  it('si el backend rechaza la descarga no se guarda un fichero vacío', async () => {
    const { caso, ficheros } = monta({
      descarga: vi.fn().mockResolvedValue(fallo(creaError('conflicto', 'nada que exportar'))),
    });

    const resultado = await caso.ejecuta();

    expect(resultado.ok).toBe(false);
    expect(ficheros.guarda).not.toHaveBeenCalled();
  });
});

describe('CopiaDireccionDeAlmacen', () => {
  function monta(copia: ReturnType<typeof vi.fn>) {
    TestBed.configureTestingModule({
      providers: [CopiaDireccionDeAlmacen, { provide: PORTAPAPELES_PORT, useValue: { copia } }],
    });
    return TestBed.inject(CopiaDireccionDeAlmacen);
  }

  it('copia la dirección cuando la hay', async () => {
    const copia = vi.fn().mockResolvedValue(true);

    expect(await monta(copia).ejecuta('浙江省义乌市 …')).toBe(true);
    expect(copia).toHaveBeenCalledWith('浙江省义乌市 …');
  });

  /** Cantar «copiado» sin comprobarlo dejaba a quien compra pegando una dirección que no estaba. */
  it('sin dirección no dice que copió', async () => {
    const copia = vi.fn().mockResolvedValue(true);

    expect(await monta(copia).ejecuta(undefined)).toBe(false);
    expect(copia).not.toHaveBeenCalled();
  });

  it('si el portapapeles lo rechaza, tampoco', async () => {
    expect(await monta(vi.fn().mockResolvedValue(false)).ejecuta('algo')).toBe(false);
  });
});
