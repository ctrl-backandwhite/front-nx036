import { TestBed } from '@angular/core/testing';
import { DOCUMENT } from '@angular/core';
import { APP_CONFIG } from '@core/config/app-config';
import { ALMACEN_LOCAL } from '@core/storage/almacen.port';
import { AlmacenMemoriaAdapter } from '@core/storage/almacen-memoria.adapter';
import { TokenStore } from '@core/auth/token-store';
import { FilaDeImportacion } from '../../domain/catalogo/model/importacion-masiva';
import { ArchivosNavegadorAdapter } from './archivos-navegador.adapter';

/**
 * La lectura y la escritura de ficheros del disco, para la carga y el volcado masivos.
 *
 * <p>Lo que de verdad hay que fijar es el recorrido del NDJSON, porque su comportamiento ante lo roto es
 * una decisión de producto y no un detalle: **una línea ilegible NO tira el fichero entero**. En un
 * volcado de un millón de filas, abortar la carga por una línea mal escrita es mucho peor que dejarla
 * fuera y decir cuántas quedaron fuera.
 *
 * <p>Y el otro: los trozos que llegan de la red no vienen partidos por líneas. Un registro puede quedar
 * a caballo entre dos, y si el resto no se guarda de una lectura a la siguiente, esa fila se pierde sin
 * ruido — y con ella, a veces, la mitad del fichero.
 */
describe('ArchivosNavegadorAdapter', () => {
  function monta() {
    TestBed.configureTestingModule({
      providers: [
        ArchivosNavegadorAdapter,
        TokenStore,
        { provide: ALMACEN_LOCAL, useClass: AlmacenMemoriaAdapter },
        {
          provide: APP_CONFIG,
          useValue: { apiBase: '', produccion: false, urlPublica: '', entorno: 'prueba' },
        },
      ],
    });
    return {
      adaptador: TestBed.inject(ArchivosNavegadorAdapter),
      documento: TestBed.inject(DOCUMENT),
    };
  }

  /**
   * Un archivo del disco.
   *
   * <p>Se construye a mano en vez de con `File` porque el DOM simulado no implementa `stream()`, que es
   * justo lo que usa el recorrido. `trozos` permite además partir el contenido por donde se quiera: los
   * trozos que llegan de verdad NO vienen partidos por líneas, y un registro a caballo entre dos es el
   * caso que rompe un recorrido escrito a la ligera.
   */
  function archivo(contenido: string, trozos?: readonly string[]) {
    const codificador = new TextEncoder();
    const partes = (trozos ?? [contenido]).map((parte) => codificador.encode(parte));
    return {
      nombre: 'catalogo.ndjson',
      tamano: codificador.encode(contenido).byteLength,
      fuente: {
        stream: () =>
          new ReadableStream<Uint8Array>({
            start(control) {
              for (const parte of partes) {
                control.enqueue(parte);
              }
              control.close();
            },
          }),
      },
    };
  }

  /** Recoge los lotes que va entregando el recorrido. */
  function recolector() {
    const lotes: FilaDeImportacion[][] = [];
    return {
      lotes,
      todas: () => lotes.flat(),
      alLote: async (filas: readonly FilaDeImportacion[]) => {
        if (filas.length) {
          lotes.push([...filas]);
        }
      },
    };
  }

  describe('leeTexto', () => {
    it('devuelve el contenido del archivo', async () => {
      const { adaptador } = monta();

      const resultado = await adaptador.leeTexto({
        nombre: 'x.json',
        tamano: 4,
        fuente: new File(['hola'], 'x.json'),
      });

      expect(resultado.ok && resultado.valor).toBe('hola');
    });

    it('un archivo que no se puede leer vuelve como error, no como excepción', async () => {
      const { adaptador } = monta();

      const resultado = await adaptador.leeTexto({
        nombre: 'x',
        tamano: 0,
        fuente: { text: () => Promise.reject(new Error('permiso denegado')) },
      });

      expect(resultado.ok).toBe(false);
    });
  });

  describe('recorreNdjson', () => {
    it('entrega todas las filas del fichero', async () => {
      const { adaptador } = monta();
      const recoge = recolector();

      const resultado = await adaptador.recorreNdjson(
        archivo('{"id":"p1"}\n{"id":"p2"}\n{"id":"p3"}\n'),
        10,
        recoge.alLote,
      );

      expect(resultado.ok && resultado.valor, 'no debería haber ninguna ilegible').toBe(0);
      expect(recoge.todas()).toEqual([{ id: 'p1' }, { id: 'p2' }, { id: 'p3' }]);
    });

    it('la última línea sin salto final también cuenta', async () => {
      const { adaptador } = monta();
      const recoge = recolector();

      /* Un fichero que no termina en salto de línea es lo normal cuando lo genera otra herramienta.
       * Sin este caso, la última fila se perdía en silencio. */
      await adaptador.recorreNdjson(archivo('{"id":"p1"}\n{"id":"p2"}'), 10, recoge.alLote);

      expect(recoge.todas()).toEqual([{ id: 'p1' }, { id: 'p2' }]);
    });

    /**
     * El caso que se olvida: los trozos que llegan de la red no respetan los saltos de línea. Si lo que
     * sobra de un trozo no se guarda para el siguiente, la fila partida se pierde sin ruido — y con
     * ella, según por dónde caiga el corte, buena parte del fichero.
     */
    it('un registro partido entre dos trozos NO se pierde', async () => {
      const { adaptador } = monta();
      const recoge = recolector();

      const resultado = await adaptador.recorreNdjson(
        archivo('{"id":"p1"}\n{"id":"p2"}\n', ['{"id":"p1"}\n{"id"', ':"p2"}\n']),
        10,
        recoge.alLote,
      );

      expect(resultado.ok && resultado.valor).toBe(0);
      expect(recoge.todas()).toEqual([{ id: 'p1' }, { id: 'p2' }]);
    });

    it('parte en lotes del tamaño pedido', async () => {
      const { adaptador } = monta();
      const recoge = recolector();
      const lineas = Array.from({ length: 5 }, (_, i) => `{"id":"p${i}"}`).join('\n') + '\n';

      await adaptador.recorreNdjson(archivo(lineas), 2, recoge.alLote);

      expect(recoge.lotes.map((l) => l.length)).toEqual([2, 2, 1]);
    });

    /** Tirar un millón de filas por una mal escrita es peor que dejarla fuera y decirlo. */
    it('una línea rota se cuenta y se sigue; NO se aborta el fichero', async () => {
      const { adaptador } = monta();
      const recoge = recolector();

      const resultado = await adaptador.recorreNdjson(
        archivo('{"id":"p1"}\nesto no es json\n{"id":"p2"}\n'),
        10,
        recoge.alLote,
      );

      expect(resultado.ok && resultado.valor, 'tiene que decir CUÁNTAS quedaron fuera').toBe(1);
      expect(recoge.todas()).toEqual([{ id: 'p1' }, { id: 'p2' }]);
    });

    it('las líneas en blanco no son filas ni son errores', async () => {
      const { adaptador } = monta();
      const recoge = recolector();

      const resultado = await adaptador.recorreNdjson(
        archivo('{"id":"p1"}\n\n   \n{"id":"p2"}\n'),
        10,
        recoge.alLote,
      );

      expect(resultado.ok && resultado.valor).toBe(0);
      expect(recoge.todas()).toHaveLength(2);
    });

    it('un fichero vacío no entrega nada y tampoco falla', async () => {
      const { adaptador } = monta();
      const recoge = recolector();

      const resultado = await adaptador.recorreNdjson(archivo(''), 10, recoge.alLote);

      expect(resultado.ok && resultado.valor).toBe(0);
      expect(recoge.todas()).toEqual([]);
    });

    it('un archivo ilegible vuelve como error', async () => {
      const { adaptador } = monta();
      const recoge = recolector();

      const resultado = await adaptador.recorreNdjson(
        { nombre: 'x', tamano: 0, fuente: {} },
        10,
        recoge.alLote,
      );

      expect(resultado.ok).toBe(false);
    });
  });

  describe('guarda', () => {
    it('pulsa un enlace de descarga y libera la dirección temporal', () => {
      const { adaptador, documento } = monta();
      const crea = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:x');
      const libera = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined);
      let pulsado: HTMLAnchorElement | null = null;
      const original = documento.createElement.bind(documento);
      vi.spyOn(documento, 'createElement').mockImplementation((etiqueta: string) => {
        const elemento = original(etiqueta);
        if (etiqueta === 'a') {
          (elemento as HTMLAnchorElement).click = () => {
            pulsado = elemento as HTMLAnchorElement;
          };
        }
        return elemento;
      });

      adaptador.guarda('catalogo.json', '{"a":1}', 'application/json');

      expect(pulsado!.download).toBe('catalogo.json');
      /* Sin liberar, el navegador guarda el fichero entero en memoria hasta recargar la página, y esta
       * pantalla se usa descargando una hoja detrás de otra. */
      expect(libera).toHaveBeenCalledWith('blob:x');
      crea.mockRestore();
      libera.mockRestore();
      vi.restoreAllMocks();
    });
  });

  /**
   * El volcado completo del catálogo a NDJSON.
   *
   * <p>Tiene dos caminos y los dos importan. Con `showSaveFilePicker` —lo traen los navegadores de
   * escritorio— el flujo va del servidor AL DISCO sin pasar por memoria, que es lo único viable con
   * miles de productos. Sin él, se acumula en memoria y se descarga como un fichero: vale para volúmenes
   * moderados y es el único camino que queda donde no existe.
   *
   * <p>Y el detalle que no se ve: CANCELAR el selector no es un fallo. Tratarlo como error sacaría un
   * aviso rojo por cerrar un diálogo a propósito.
   */
  describe('descargaTodo', () => {
    /** Sustituye `fetch` y devuelve lo que se pidió, para poder comprobar filtros y cabecera. */
    function fingeLaRed(respuesta: Partial<Response> & { ok: boolean; status: number }) {
      const llamadas: { url: string; opciones?: RequestInit }[] = [];
      const original = globalThis.fetch;
      globalThis.fetch = ((url: string, opciones?: RequestInit) => {
        llamadas.push({ url, opciones });
        return Promise.resolve(respuesta as Response);
      }) as typeof globalThis.fetch;
      return { llamadas, restaura: () => (globalThis.fetch = original) };
    }

    /** El selector de archivo del navegador, cuando lo hay. */
    function ponSelector(selector: unknown) {
      const ventana = document.defaultView as unknown as Record<string, unknown>;
      const previo = ventana['showSaveFilePicker'];
      ventana['showSaveFilePicker'] = selector;
      return () => {
        if (previo === undefined) {
          delete ventana['showSaveFilePicker'];
        } else {
          ventana['showSaveFilePicker'] = previo;
        }
      };
    }

    it('los filtros viajan en la dirección, y los vacíos no', async () => {
      const { adaptador } = monta();
      /* `body` tiene que venir: el adaptador se niega a seguir sin flujo, porque una respuesta correcta
       * y sin cuerpo escribiría un fichero vacío sin decir nada. */
      const red = fingeLaRed({ ok: true, status: 200, body: {} as ReadableStream, text: async () => '' });
      const quita = ponSelector(undefined);
      const crea = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:x');
      const libera = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined);

      const original = document.createElement.bind(document);
      const creaElemento = vi.spyOn(document, 'createElement').mockImplementation((etiqueta: string) => {
        const elemento = original(etiqueta);
        if (etiqueta === 'a') {
          (elemento as HTMLAnchorElement).click = () => undefined;
        }
        return elemento;
      });

      await adaptador.descargaTodo(
        { creadoDesde: '2026-01-01', verificado: true },
        'catalogo.ndjson',
      );
      creaElemento.mockRestore();

      const direccion = red.llamadas[0].url;
      expect(direccion).toContain('createdFrom=2026-01-01');
      expect(direccion).toContain('verified=true');
      /* Sin fecha de fin, el parámetro no viaja: mandarlo vacío haría filtrar por «hasta la nada». */
      expect(direccion).not.toContain('createdTo=');
      red.restaura();
      quita();
      crea.mockRestore();
      libera.mockRestore();
    });

    it('sin selector de archivo se acumula en memoria y se descarga', async () => {
      const { adaptador, documento } = monta();
      const red = fingeLaRed({
        ok: true,
        status: 200,
        body: {} as ReadableStream,
        text: async () => '{"id":"p1"}\n',
      });
      const quita = ponSelector(undefined);
      const crea = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:x');
      const libera = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined);
      /* El enlace de descarga no se puede pulsar de verdad en el DOM simulado: navegar no está
       * implementado y la excepción se leería como «no hay red». */
      const original = documento.createElement.bind(documento);
      const creaElemento = vi.spyOn(documento, 'createElement').mockImplementation((etiqueta: string) => {
        const elemento = original(etiqueta);
        if (etiqueta === 'a') {
          (elemento as HTMLAnchorElement).click = () => undefined;
        }
        return elemento;
      });

      const resultado = await adaptador.descargaTodo({}, 'catalogo.ndjson');

      expect(resultado.ok && resultado.valor).toBe(true);
      expect(crea).toHaveBeenCalled();
      red.restaura();
      quita();
      creaElemento.mockRestore();
      crea.mockRestore();
      libera.mockRestore();
    });

    /** Cerrar el diálogo a propósito no puede sacar un aviso rojo. */
    it('cancelar el selector NO es un fallo', async () => {
      const { adaptador } = monta();
      const quita = ponSelector(() => {
        const error = new Error('cancelado');
        error.name = 'AbortError';
        return Promise.reject(error);
      });

      const resultado = await adaptador.descargaTodo({}, 'catalogo.ndjson');

      expect(resultado.ok).toBe(true);
      expect(resultado.ok && resultado.valor, 'no se ha descargado nada, y eso hay que decirlo').toBe(
        false,
      );
      quita();
    });

    it('cualquier otro fallo del selector sí es un error', async () => {
      const { adaptador } = monta();
      const quita = ponSelector(() => Promise.reject(new Error('permiso denegado')));

      const resultado = await adaptador.descargaTodo({}, 'catalogo.ndjson');

      expect(resultado.ok).toBe(false);
      quita();
    });

    it('una respuesta que no es correcta vuelve como error con su estado', async () => {
      const { adaptador } = monta();
      const red = fingeLaRed({ ok: false, status: 503 });
      const quita = ponSelector(undefined);

      const resultado = await adaptador.descargaTodo({}, 'catalogo.ndjson');

      expect(resultado.ok).toBe(false);
      expect(!resultado.ok && resultado.error.estado).toBe(503);
      red.restaura();
      quita();
    });

    it('quedarse sin red vuelve como error, no como excepción', async () => {
      const { adaptador } = monta();
      const original = globalThis.fetch;
      globalThis.fetch = (() => Promise.reject(new Error('sin red'))) as typeof globalThis.fetch;
      const quita = ponSelector(undefined);

      const resultado = await adaptador.descargaTodo({}, 'catalogo.ndjson');

      expect(resultado.ok).toBe(false);
      globalThis.fetch = original;
      quita();
    });
  });
});
