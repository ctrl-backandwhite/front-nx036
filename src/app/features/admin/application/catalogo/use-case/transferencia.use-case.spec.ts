import { TestBed } from '@angular/core/testing';
import { creaError } from '@shared/error/app-error';
import { exito, fallo } from '@shared/result/result';
import { BORRADOR_DE_ALTA_VACIO, CAMPOS_DE_ALTA_VACIOS } from '../../../domain/catalogo/model/alta-de-producto';
import { ALTA_DE_PRODUCTO_PORT } from '../../../domain/catalogo/port/alta-de-producto.port';
import { CATEGORIAS_ADMIN_PORT } from '../../../domain/catalogo/port/categorias-admin.port';
import {
  IDIOMAS_DE_TIENDA_PORT,
  TASAS_DE_CAMBIO_PORT,
} from '../../../domain/catalogo/port/catalogo-comun.port';
import {
  DESCARGA_DE_ARCHIVOS_PORT,
  EXPORTACION_DE_CATALOGO_PORT,
  EXPORTACION_EN_FLUJO_PORT,
  IMPORTACION_DE_CATALOGO_PORT,
  LECTOR_DE_ARCHIVOS_PORT,
} from '../../../domain/catalogo/port/transferencia-de-catalogo.port';
import { ConsultaIdiomas } from './consulta-idiomas.use-case';
import { ConsultaTasasDeCambio } from './consulta-tasas-de-cambio.use-case';
import { CreaProducto } from './crea-producto.use-case';
import { ExportaCategorias } from './exporta-categorias.use-case';
import { ExportaSegmento } from './exporta-productos.use-case';
import { ImportaFilas } from './importa-filas.use-case';
import { ImportaNdjson } from './importa-ndjson.use-case';
import { LeeArchivoDeImportacion } from './lee-archivo-de-importacion.use-case';
import {
  ExportaProducto,
  ReemplazaProductoConJson,
} from './reemplaza-producto-con-json.use-case';
import { ReindexaCatalogo } from './reindexa-catalogo.use-case';

const importacion = {
  importaProductos: vi.fn(),
  importaCategorias: vi.fn(),
  reindexa: vi.fn(),
  estadoDeReindexado: vi.fn(),
};
const exportacion = { cuenta: vi.fn(), exporta: vi.fn(), exportaProducto: vi.fn() };
const descarga = { guarda: vi.fn() };
const flujo = { descargaTodo: vi.fn() };
const lector = { leeTexto: vi.fn(), recorreNdjson: vi.fn() };
const categorias = { listaTodas: vi.fn() };
const alta = { crea: vi.fn() };
const idiomas = { lista: vi.fn() };
const tasas = { listaDivisas: vi.fn() };

describe('casos de uso de importación y exportación', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    TestBed.configureTestingModule({
      providers: [
        { provide: IMPORTACION_DE_CATALOGO_PORT, useValue: importacion },
        { provide: EXPORTACION_DE_CATALOGO_PORT, useValue: exportacion },
        { provide: DESCARGA_DE_ARCHIVOS_PORT, useValue: descarga },
        { provide: EXPORTACION_EN_FLUJO_PORT, useValue: flujo },
        { provide: LECTOR_DE_ARCHIVOS_PORT, useValue: lector },
        { provide: CATEGORIAS_ADMIN_PORT, useValue: categorias },
        { provide: ALTA_DE_PRODUCTO_PORT, useValue: alta },
        { provide: IDIOMAS_DE_TIENDA_PORT, useValue: idiomas },
        { provide: TASAS_DE_CAMBIO_PORT, useValue: tasas },
        ImportaFilas,
        ImportaNdjson,
        ReindexaCatalogo,
        ExportaSegmento,
        ExportaCategorias,
        ExportaProducto,
        ReemplazaProductoConJson,
        LeeArchivoDeImportacion,
        CreaProducto,
        ConsultaIdiomas,
        ConsultaTasasDeCambio,
      ],
    });
  });

  describe('ImportaFilas', () => {
    it('manda las filas y suma los recuentos de cada lote', async () => {
      importacion.importaProductos.mockResolvedValue(
        exito({ creados: 2, fallidos: 0, errores: [] }),
      );
      const avances: number[] = [];

      const resultado = await ejecutaImportacion(avances);

      expect(resultado.ok && resultado.valor.creados).toBe(2);
      expect(avances).toEqual([2]);
    });

    /** Un lote que se cae no aborta los siguientes: lo que ya entró, entró. */
    it('un lote rechazado cuenta como fallo y deja su motivo con el tramo', async () => {
      importacion.importaProductos.mockResolvedValue(
        fallo(creaError('desconocido', '', { estado: 413 })),
      );

      const resultado = await ejecutaImportacion([]);

      expect(resultado.ok && resultado.valor.fallidos).toBe(2);
      expect(resultado.ok && resultado.valor.errores[0]).toContain('admin.catalog.bulk.err_too_large');
    });

    it('las categorías van por su propia ruta', async () => {
      importacion.importaCategorias.mockResolvedValue(
        exito({ creados: 1, fallidos: 0, errores: [] }),
      );

      await TestBed.inject(ImportaFilas).ejecuta([{ slug: 'a' }], 'categories');

      expect(importacion.importaCategorias).toHaveBeenCalled();
      expect(importacion.importaProductos).not.toHaveBeenCalled();
    });

    async function ejecutaImportacion(avances: number[]) {
      return TestBed.inject(ImportaFilas).ejecuta(
        [{ titleEs: 'a' }, { titleEs: 'b' }],
        'products',
        (avance) => avances.push(avance.hechas),
      );
    }
  });

  describe('ImportaNdjson', () => {
    it('manda los lotes que le entrega el lector y suma las líneas ilegibles', async () => {
      importacion.importaProductos.mockResolvedValue(
        exito({ creados: 2, fallidos: 0, errores: [] }),
      );
      lector.recorreNdjson.mockImplementation(async (_archivo, _tam, alLote) => {
        await alLote([{ titleEs: 'a' }, { titleEs: 'b' }], 100);
        return exito(3);
      });

      const resultado = await TestBed.inject(ImportaNdjson).ejecuta({
        nombre: 'x.ndjson',
        tamano: 100,
        fuente: null,
      });

      expect(resultado.ok && resultado.valor).toEqual({ creados: 2, fallidos: 3, errores: [] });
    });

    it('un fallo de lectura se devuelve tal cual', async () => {
      const error = creaError('desconocido', 'no se pudo leer');
      lector.recorreNdjson.mockResolvedValue(fallo(error));

      const resultado = await TestBed.inject(ImportaNdjson).ejecuta({
        nombre: 'x.ndjson',
        tamano: 1,
        fuente: null,
      });

      expect(resultado).toEqual(fallo(error));
    });
  });

  describe('ReindexaCatalogo', () => {
    /** El envío responde al instante; el recuento final sale del sondeo. */
    it('sondea hasta que el trabajo termina', async () => {
      importacion.reindexa.mockResolvedValue(exito({ enMarcha: true, indexados: 0, arrancado: true }));
      importacion.estadoDeReindexado
        .mockResolvedValueOnce(exito({ enMarcha: true, indexados: 10 }))
        .mockResolvedValueOnce(exito({ enMarcha: false, indexados: 42 }));

      const resultado = await TestBed.inject(ReindexaCatalogo).ejecuta(() => Promise.resolve());

      expect(resultado.ok && resultado.valor).toEqual({ indexados: 42, yaEstabaEnMarcha: false });
    });

    it('si ya había uno corriendo, no se lanza otro', async () => {
      importacion.reindexa.mockResolvedValue(
        exito({ enMarcha: true, indexados: 5, arrancado: false }),
      );

      const resultado = await TestBed.inject(ReindexaCatalogo).ejecuta(() => Promise.resolve());

      expect(resultado.ok && resultado.valor.yaEstabaEnMarcha).toBe(true);
      expect(importacion.estadoDeReindexado).not.toHaveBeenCalled();
    });

    it('un fallo al arrancar se devuelve', async () => {
      importacion.reindexa.mockResolvedValue(fallo(creaError('error-del-servidor')));
      const resultado = await TestBed.inject(ReindexaCatalogo).ejecuta(() => Promise.resolve());
      expect(resultado.ok).toBe(false);
    });
  });

  describe('ExportaSegmento', () => {
    it('descarga el tramo con el nombre del tramo y la fecha', async () => {
      exportacion.exporta.mockResolvedValue(exito([{ titleEs: 'a' }]));

      const resultado = await TestBed.inject(ExportaSegmento).ejecuta(
        { desde: 1, hasta: 1000 },
        {},
        new Date('2026-09-06T00:00:00Z'),
      );

      expect(descarga.guarda).toHaveBeenCalledWith(
        'productos_1-1000_2026-09-06.json',
        expect.stringContaining('titleEs'),
        'application/json',
      );
      expect(resultado).toEqual(exito(1));
    });

    it('si la lectura falla no se descarga nada', async () => {
      exportacion.exporta.mockResolvedValue(fallo(creaError('sin-conexion')));

      await TestBed.inject(ExportaSegmento).ejecuta({ desde: 1, hasta: 10 }, {});

      expect(descarga.guarda).not.toHaveBeenCalled();
    });
  });

  /** El fichero de categorías tiene que poder importarse en otro entorno: el padre viaja por slug. */
  it('la exportación de categorías guarda el árbol entero', async () => {
    categorias.listaTodas.mockResolvedValue(
      exito([
        {
          id: '1',
          slug: 'moda',
          nombreZh: '',
          nombres: { es: 'Moda' },
          posicion: 0,
          activa: true,
          padreId: null,
          numeroDeProductos: 1,
        },
      ]),
    );

    const resultado = await TestBed.inject(ExportaCategorias).ejecuta(
      new Date('2026-09-06T00:00:00Z'),
    );

    expect(descarga.guarda).toHaveBeenCalledWith(
      'categorias-2026-09-06.json',
      expect.stringContaining('moda'),
      'application/json',
    );
    expect(resultado).toEqual(exito(1));
  });

  describe('ReemplazaProductoConJson', () => {
    it('acepta tanto un objeto suelto como una lista de uno', async () => {
      importacion.importaProductos.mockResolvedValue(exito({ creados: 1, fallidos: 0, errores: [] }));

      await TestBed.inject(ReemplazaProductoConJson).ejecuta('{"titleEs":"a"}');
      await TestBed.inject(ReemplazaProductoConJson).ejecuta('[{"titleEs":"a"}]');

      expect(importacion.importaProductos).toHaveBeenNthCalledWith(1, [{ titleEs: 'a' }]);
      expect(importacion.importaProductos).toHaveBeenNthCalledWith(2, [{ titleEs: 'a' }]);
    });

    it('un JSON mal formado se rechaza antes de mandarlo', async () => {
      const resultado = await TestBed.inject(ReemplazaProductoConJson).ejecuta('{');

      expect(resultado.ok).toBe(false);
      expect(importacion.importaProductos).not.toHaveBeenCalled();
    });

    /** El backend acepta la petición y rechaza la fila: sin esto el editor decía «guardado». */
    it('una fila rechazada NO se da por guardada', async () => {
      importacion.importaProductos.mockResolvedValue(
        exito({ creados: 0, fallidos: 1, errores: ['Falta el envío'] }),
      );

      const resultado = await TestBed.inject(ReemplazaProductoConJson).ejecuta('{"titleEs":"a"}');

      expect(resultado.ok).toBe(false);
      expect(!resultado.ok && resultado.error.mensaje).toContain('Falta el envío');
    });
  });

  it('el editor en bloque carga la ficha entera del producto', async () => {
    exportacion.exportaProducto.mockResolvedValue(exito({ titleEs: 'a' }));
    expect(await TestBed.inject(ExportaProducto).ejecuta('p1')).toEqual(exito({ titleEs: 'a' }));
  });

  describe('LeeArchivoDeImportacion', () => {
    it('devuelve las filas de un archivo válido', async () => {
      lector.leeTexto.mockResolvedValue(exito('[{"slug":"a"}]'));
      expect(await TestBed.inject(LeeArchivoDeImportacion).ejecuta(archivo())).toEqual(
        exito([{ slug: 'a' }]),
      );
    });

    it('rechaza lo que no es una lista', async () => {
      lector.leeTexto.mockResolvedValue(exito('{"slug":"a"}'));
      expect((await TestBed.inject(LeeArchivoDeImportacion).ejecuta(archivo())).ok).toBe(false);
    });

    it('rechaza un JSON roto', async () => {
      lector.leeTexto.mockResolvedValue(exito('[{'));
      expect((await TestBed.inject(LeeArchivoDeImportacion).ejecuta(archivo())).ok).toBe(false);
    });

    it('un fallo de lectura se devuelve tal cual', async () => {
      lector.leeTexto.mockResolvedValue(fallo(creaError('peticion-invalida')));
      expect((await TestBed.inject(LeeArchivoDeImportacion).ejecuta(archivo())).ok).toBe(false);
    });
  });

  describe('CreaProducto', () => {
    it('valida antes de mandar y dice cuál es el motivo', async () => {
      const resultado = await TestBed.inject(CreaProducto).ejecuta(BORRADOR_DE_ALTA_VACIO);

      expect(resultado.ok).toBe(false);
      expect(!resultado.ok && resultado.error.codigo).toBe('sin_categoria');
      expect(alta.crea).not.toHaveBeenCalled();
    });

    it('un borrador completo se manda ya interpretado', async () => {
      alta.crea.mockResolvedValue(exito('p-nuevo'));

      const resultado = await TestBed.inject(CreaProducto).ejecuta({
        ...BORRADOR_DE_ALTA_VACIO,
        campos: { ...CAMPOS_DE_ALTA_VACIOS, categorySlug: 'ropa', price: '29.9' },
        contenido: { es: { titulo: 'Auricular', descripcion: '' } },
      });

      expect(alta.crea).toHaveBeenCalledWith(expect.objectContaining({ categoriaSlug: 'ropa' }));
      expect(resultado).toEqual(exito('p-nuevo'));
    });
  });

  describe('ConsultaIdiomas', () => {
    it('devuelve solo los activos', async () => {
      idiomas.lista.mockResolvedValue(
        exito([
          { codigo: 'es', etiqueta: 'ES', activo: true, porDefecto: true },
          { codigo: 'de', etiqueta: 'DE', activo: false, porDefecto: false },
        ]),
      );

      const resultado = await TestBed.inject(ConsultaIdiomas).ejecuta();

      expect(resultado.ok && resultado.valor.map((i) => i.codigo)).toEqual(['es']);
    });

    /** Quedarse sin selector de idioma impide revisar la ficha entera. */
    it('sin respuesta cae a los cuatro idiomas con los que se opera', async () => {
      idiomas.lista.mockResolvedValue(fallo(creaError('sin-conexion')));

      const resultado = await TestBed.inject(ConsultaIdiomas).ejecuta();

      expect(resultado.ok && resultado.valor.length).toBe(4);
    });

    it('una lista vacía también cae al respaldo', async () => {
      idiomas.lista.mockResolvedValue(exito([]));
      const resultado = await TestBed.inject(ConsultaIdiomas).ejecuta();
      expect(resultado.ok && resultado.valor.length).toBe(4);
    });
  });

  /** Sin tasas los importes se enseñan en su divisa de origen: peor, pero cierto. */
  it('las tasas que no llegan no dejan la tabla en blanco', async () => {
    tasas.listaDivisas.mockResolvedValue(fallo(creaError('sin-conexion')));
    expect(await TestBed.inject(ConsultaTasasDeCambio).ejecuta()).toEqual(exito([]));
  });

  function archivo() {
    return { nombre: 'x.json', tamano: 10, fuente: null };
  }
});
