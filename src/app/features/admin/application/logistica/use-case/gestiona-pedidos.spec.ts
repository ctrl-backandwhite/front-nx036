import { TestBed } from '@angular/core/testing';
import { exito, fallo } from '@shared/result/result';
import { creaError } from '@shared/error/app-error';
import {
  PEDIDOS_ADMIN_PORT,
  TRANSICIONES_DE_PEDIDO_PORT,
} from '../../../domain/logistica/port/pedidos-admin.port';
import {
  BuscaPedidos,
  CambiaEstadoDePedido,
  CambiaEstadoEnLote,
  ConsultaPedido,
  ReindexaPedidos,
} from './gestiona-pedidos.use-case';

/** Doble del puerto de transiciones. Cuenta qué se le pidió, que es lo que se quiere comprobar. */
function dobleDeTransiciones() {
  return {
    aplica: vi.fn().mockResolvedValue(exito(undefined)),
    aplicaEnLote: vi
      .fn()
      .mockResolvedValue(exito({ correctas: 2, fallidas: 0, errores: [] })),
  };
}

function dobleDePedidos() {
  return {
    busca: vi.fn().mockResolvedValue(exito({ pedidos: [], total: 0, paginas: 1, pagina: 0 })),
    ficha: vi.fn().mockResolvedValue(fallo(creaError('no-encontrado'))),
    reindexa: vi.fn().mockResolvedValue(exito(7)),
  };
}

describe('CambiaEstadoDePedido', () => {
  it('aplica la transición cuando el estado la admite', async () => {
    const puerto = dobleDeTransiciones();
    TestBed.configureTestingModule({
      providers: [CambiaEstadoDePedido, { provide: TRANSICIONES_DE_PEDIDO_PORT, useValue: puerto }],
    });

    const resultado = await TestBed.inject(CambiaEstadoDePedido).ejecuta(
      { id: 'p1', estado: 'PAID' },
      'forward',
    );

    expect(resultado.ok).toBe(true);
    expect(puerto.aplica).toHaveBeenCalledWith('p1', 'forward');
  });

  /**
   * Ahorra una petición que ya se sabe que va a fallar, y un mensaje de error que quien lo lee no
   * entendería —desde su punto de vista el botón estaba ahí.
   */
  it('rechaza sin llamar al backend una transición que el estado no admite', async () => {
    const puerto = dobleDeTransiciones();
    TestBed.configureTestingModule({
      providers: [CambiaEstadoDePedido, { provide: TRANSICIONES_DE_PEDIDO_PORT, useValue: puerto }],
    });

    const resultado = await TestBed.inject(CambiaEstadoDePedido).ejecuta(
      { id: 'p1', estado: 'CANCELLED' },
      'ship',
    );

    expect(resultado.ok).toBe(false);
    expect(puerto.aplica).not.toHaveBeenCalled();
  });

  it('deja pasar el fallo del backend tal cual', async () => {
    const puerto = dobleDeTransiciones();
    puerto.aplica.mockResolvedValue(fallo(creaError('peticion-invalida', 'falta el HSCode')));
    TestBed.configureTestingModule({
      providers: [CambiaEstadoDePedido, { provide: TRANSICIONES_DE_PEDIDO_PORT, useValue: puerto }],
    });

    const resultado = await TestBed.inject(CambiaEstadoDePedido).ejecuta(
      { id: 'p1', estado: 'PAID' },
      'forward',
    );

    expect(resultado.ok).toBe(false);
    expect(resultado.ok || resultado.error.mensaje).toBe('falta el HSCode');
  });
});

describe('CambiaEstadoEnLote', () => {
  function monta(puerto: ReturnType<typeof dobleDeTransiciones>) {
    TestBed.configureTestingModule({
      providers: [CambiaEstadoEnLote, { provide: TRANSICIONES_DE_PEDIDO_PORT, useValue: puerto }],
    });
    return TestBed.inject(CambiaEstadoEnLote);
  }

  /**
   * Mandarlos todos haría que el backend devolviera fallos por estado incompatible mezclados con
   * fallos de verdad, y quien mira el parte no sabría cuáles repetir.
   */
  it('manda solo los elegibles y cuenta aparte los saltados', async () => {
    const puerto = dobleDeTransiciones();
    const caso = monta(puerto);

    const resultado = await caso.ejecuta(
      [
        { id: 'a', estado: 'PAID' },
        { id: 'b', estado: 'CANCELLED' },
        { id: 'c', estado: 'PENDING' },
      ],
      'forward',
    );

    expect(puerto.aplicaEnLote).toHaveBeenCalledWith(['a', 'c'], 'forward');
    expect(resultado.ok && resultado.valor.saltadas).toBe(1);
  });

  it('sin ningún elegible no llama al backend y devuelve un parte a cero', async () => {
    const puerto = dobleDeTransiciones();
    const caso = monta(puerto);

    const resultado = await caso.ejecuta([{ id: 'a', estado: 'CANCELLED' }], 'ship');

    expect(puerto.aplicaEnLote).not.toHaveBeenCalled();
    expect(resultado.ok && resultado.valor).toEqual({
      correctas: 0,
      fallidas: 0,
      errores: [],
      saltadas: 1,
    });
  });

  it('propaga el fallo del backend en vez de inventarse un parte', async () => {
    const puerto = dobleDeTransiciones();
    puerto.aplicaEnLote.mockResolvedValue(fallo(creaError('error-del-servidor', 'se cayó')));
    const caso = monta(puerto);

    const resultado = await caso.ejecuta([{ id: 'a', estado: 'PAID' }], 'forward');

    expect(resultado.ok).toBe(false);
  });

  it('sabe contar cuántos aceptarían la acción, para no ofrecer un botón vacío', () => {
    const caso = monta(dobleDeTransiciones());

    expect(
      caso.cuantosElegibles([{ estado: 'PAID' }, { estado: 'REFUNDED' }], 'cancel'),
    ).toBe(1);
  });
});

describe('lecturas de pedidos', () => {
  function monta(puerto: ReturnType<typeof dobleDePedidos>) {
    TestBed.configureTestingModule({
      providers: [
        BuscaPedidos,
        ConsultaPedido,
        ReindexaPedidos,
        { provide: PEDIDOS_ADMIN_PORT, useValue: puerto },
      ],
    });
  }

  it('la búsqueda pasa el criterio tal cual', async () => {
    const puerto = dobleDePedidos();
    monta(puerto);

    await TestBed.inject(BuscaPedidos).ejecuta({ estado: 'PAID', pagina: 2, tamano: 25 });

    expect(puerto.busca).toHaveBeenCalledWith({ estado: 'PAID', pagina: 2, tamano: 25 });
  });

  /** Sin idioma los títulos de línea vuelven en chino y el operador no reconoce lo que compra. */
  it('la ficha viaja con el idioma del panel', async () => {
    const puerto = dobleDePedidos();
    monta(puerto);

    const resultado = await TestBed.inject(ConsultaPedido).ejecuta('p1', 'fr');

    expect(puerto.ficha).toHaveBeenCalledWith('p1', 'fr');
    expect(resultado.ok).toBe(false);
  });

  it('el reindexado devuelve cuántos se indexaron', async () => {
    const puerto = dobleDePedidos();
    monta(puerto);

    const resultado = await TestBed.inject(ReindexaPedidos).ejecuta();

    expect(resultado.ok && resultado.valor).toBe(7);
  });
});
