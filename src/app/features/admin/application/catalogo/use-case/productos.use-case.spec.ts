import { TestBed } from '@angular/core/testing';
import { creaError } from '@shared/error/app-error';
import { exito, fallo } from '@shared/result/result';
import {
  ANUNCIOS_AL_BUS_PORT,
  COMPRESION_DE_IMAGENES_PORT,
  PRODUCTOS_ADMIN_PORT,
  PRODUCTOS_MASIVOS_PORT,
} from '../../../domain/catalogo/port/productos-admin.port';
import { AplicaRecargo } from './aplica-recargo.use-case';
import { AplicaSubvencion } from './aplica-subvencion.use-case';
import { CambiaEstadoDeProductos } from './cambia-estado-de-productos.use-case';
import { ComprimeImagenesHistoricas } from './comprime-imagenes-historicas.use-case';
import { EliminaProductos } from './elimina-productos.use-case';
import { ListaProductos } from './lista-productos.use-case';
import { MarcaProductoVerificado } from './marca-producto-verificado.use-case';
import { ReintentaAnunciosAlBus } from './reintenta-anuncios-al-bus.use-case';

/** Dobles con lo justo: cada puerto es pequeño a propósito para poder hacer esto en tres líneas. */
const productos = {
  lista: vi.fn(),
  cambiaEstado: vi.fn(),
  marcaVerificado: vi.fn(),
  duplica: vi.fn(),
  elimina: vi.fn(),
};
const masivos = {
  cambiaEstados: vi.fn(),
  eliminaEnLote: vi.fn(),
  fijaRecargo: vi.fn(),
  fijaSubvencion: vi.fn(),
};
const bus = { fallidos: vi.fn(), reintenta: vi.fn() };
const compresion = { estado: vi.fn(), encolaLote: vi.fn() };

function monta() {
  TestBed.configureTestingModule({
    providers: [
      { provide: PRODUCTOS_ADMIN_PORT, useValue: productos },
      { provide: PRODUCTOS_MASIVOS_PORT, useValue: masivos },
      { provide: ANUNCIOS_AL_BUS_PORT, useValue: bus },
      { provide: COMPRESION_DE_IMAGENES_PORT, useValue: compresion },
      ListaProductos,
      CambiaEstadoDeProductos,
      EliminaProductos,
      MarcaProductoVerificado,
      AplicaRecargo,
      AplicaSubvencion,
      ReintentaAnunciosAlBus,
      ComprimeImagenesHistoricas,
    ],
  });
}

describe('casos de uso del catálogo', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    monta();
  });

  it('el listado pasa el criterio tal cual al puerto', async () => {
    const pagina = { productos: [], total: 0, paginas: 1, pagina: 0 };
    productos.lista.mockResolvedValue(exito(pagina));
    const criterio = { pagina: 0, tamano: 30, idioma: 'es' };

    const resultado = await TestBed.inject(ListaProductos).ejecuta(criterio);

    expect(productos.lista).toHaveBeenCalledWith(criterio);
    expect(resultado).toEqual(exito(pagina));
  });

  describe('CambiaEstadoDeProductos', () => {
    /** Con uno va por la ruta de uno, que devuelve el motivo de aduana redactado por el backend. */
    it('con un solo producto usa la ruta individual', async () => {
      productos.cambiaEstado.mockResolvedValue(exito(undefined));

      const resultado = await TestBed.inject(CambiaEstadoDeProductos).ejecuta(['p1'], 'ACTIVE');

      expect(productos.cambiaEstado).toHaveBeenCalledWith('p1', 'ACTIVE');
      expect(masivos.cambiaEstados).not.toHaveBeenCalled();
      expect(resultado).toEqual(exito({ correctos: 1, fallidos: 0, errores: [] }));
    });

    it('con varios usa la ruta de lote', async () => {
      masivos.cambiaEstados.mockResolvedValue(exito({ correctos: 2, fallidos: 0, errores: [] }));

      await TestBed.inject(CambiaEstadoDeProductos).ejecuta(['p1', 'p2'], 'PAUSED');

      expect(masivos.cambiaEstados).toHaveBeenCalledWith(['p1', 'p2'], 'PAUSED');
    });

    /** El backend niega publicar sin los datos de aduana: ese mensaje tiene que llegar a la pantalla. */
    it('deja pasar el motivo por el que el backend se niega', async () => {
      const error = creaError('conflicto', 'Falta la partida arancelaria');
      productos.cambiaEstado.mockResolvedValue(fallo(error));

      const resultado = await TestBed.inject(CambiaEstadoDeProductos).ejecuta(['p1'], 'ACTIVE');

      expect(resultado).toEqual(fallo(error));
    });

    it('sin productos no llama a nadie', async () => {
      await TestBed.inject(CambiaEstadoDeProductos).ejecuta([], 'ACTIVE');
      expect(productos.cambiaEstado).not.toHaveBeenCalled();
      expect(masivos.cambiaEstados).not.toHaveBeenCalled();
    });
  });

  describe('EliminaProductos', () => {
    it('con uno usa la ruta individual y con varios la de lote', async () => {
      productos.elimina.mockResolvedValue(exito(undefined));
      masivos.eliminaEnLote.mockResolvedValue(exito({ correctos: 2, fallidos: 1, errores: ['x'] }));

      await TestBed.inject(EliminaProductos).ejecuta(['p1']);
      await TestBed.inject(EliminaProductos).ejecuta(['p1', 'p2', 'p3']);

      expect(productos.elimina).toHaveBeenCalledWith('p1');
      expect(masivos.eliminaEnLote).toHaveBeenCalledWith(['p1', 'p2', 'p3']);
    });

    it('sin productos devuelve un recuento vacío', async () => {
      const resultado = await TestBed.inject(EliminaProductos).ejecuta([]);
      expect(resultado).toEqual(exito({ correctos: 0, fallidos: 0, errores: [] }));
    });
  });

  it('la certificación viaja con el idioma con el que se está revisando', async () => {
    productos.marcaVerificado.mockResolvedValue(exito(undefined));

    await TestBed.inject(MarcaProductoVerificado).ejecuta('p1', true, 'pt');

    expect(productos.marcaVerificado).toHaveBeenCalledWith('p1', true, 'pt');
  });

  describe('AplicaRecargo', () => {
    it('manda el recargo con su ámbito', async () => {
      masivos.fijaRecargo.mockResolvedValue(exito(12));

      const resultado = await TestBed.inject(AplicaRecargo).ejecuta({
        recargoCny: 3,
        categoriaId: 'c1',
      });

      expect(resultado).toEqual(exito(12));
    });

    /** Un recargo negativo no significa nada y no puede llegar al servidor. */
    it('rechaza un importe negativo sin llamar al servidor', async () => {
      const resultado = await TestBed.inject(AplicaRecargo).ejecuta({ recargoCny: -1 });

      expect(resultado.ok).toBe(false);
      expect(masivos.fijaRecargo).not.toHaveBeenCalled();
    });
  });

  describe('AplicaSubvencion', () => {
    /** Las dos bolsas son estancas: se puede tocar el envío sin pisar el arancel. */
    it('admite fijar solo una de las dos bolsas', async () => {
      masivos.fijaSubvencion.mockResolvedValue(exito(5));

      await TestBed.inject(AplicaSubvencion).ejecuta({ envioCny: 2 });

      expect(masivos.fijaSubvencion).toHaveBeenCalledWith({ envioCny: 2 });
    });

    it('sin ningún importe no hay nada que hacer', async () => {
      const resultado = await TestBed.inject(AplicaSubvencion).ejecuta({});

      expect(resultado.ok).toBe(false);
      expect(masivos.fijaSubvencion).not.toHaveBeenCalled();
    });

    it('rechaza un importe negativo', async () => {
      const resultado = await TestBed.inject(AplicaSubvencion).ejecuta({ arancelCny: -3 });
      expect(resultado.ok).toBe(false);
    });
  });

  it('reintentar el bus devuelve cuántos se reencolaron', async () => {
    bus.reintenta.mockResolvedValue(exito(7));
    expect(await TestBed.inject(ReintentaAnunciosAlBus).ejecuta()).toEqual(exito(7));
  });

  describe('ComprimeImagenesHistoricas', () => {
    const sinEspera = () => Promise.resolve();

    it('encadena lotes hasta que no queda nada pendiente', async () => {
      compresion.estado
        .mockResolvedValueOnce(exito({ pendientes: 900, enCola: 0 }))
        .mockResolvedValueOnce(exito({ pendientes: 0, enCola: 0 }));
      compresion.encolaLote.mockResolvedValue(exito({ pendientes: 400, enCola: 500 }));
      const avances: number[] = [];

      const resultado = await TestBed.inject(ComprimeImagenesHistoricas).ejecuta(
        () => true,
        (estado) => avances.push(estado.pendientes),
        sinEspera,
      );

      expect(resultado.ok).toBe(true);
      expect(compresion.encolaLote).toHaveBeenCalledTimes(1);
      expect(avances).toEqual([900, 0]);
    });

    /** Amontonar lotes no acelera nada y deja miles de imágenes marcadas sin necesidad. */
    it('no pide otro lote mientras el espejador está drenando el anterior', async () => {
      compresion.estado
        .mockResolvedValueOnce(exito({ pendientes: 900, enCola: 300 }))
        .mockResolvedValueOnce(exito({ pendientes: 0, enCola: 0 }));

      await TestBed.inject(ComprimeImagenesHistoricas).ejecuta(() => true, () => undefined, sinEspera);

      expect(compresion.encolaLote).not.toHaveBeenCalled();
    });

    it('se para en cuanto se apaga el interruptor', async () => {
      const resultado = await TestBed.inject(ComprimeImagenesHistoricas).ejecuta(
        () => false,
        () => undefined,
        sinEspera,
      );

      expect(resultado.ok).toBe(true);
      expect(compresion.estado).not.toHaveBeenCalled();
    });

    it('un fallo del servidor corta la cadena y se devuelve', async () => {
      const error = creaError('error-del-servidor', '', { estado: 404 });
      compresion.estado.mockResolvedValue(fallo(error));

      const resultado = await TestBed.inject(ComprimeImagenesHistoricas).ejecuta(
        () => true,
        () => undefined,
        sinEspera,
      );

      expect(resultado).toEqual(fallo(error));
    });
  });
});
