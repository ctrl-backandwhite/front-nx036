import { render, screen } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { AvisosStore } from '@ds/component/avisos/avisos.store';
import { creaError } from '@shared/error/app-error';
import { exito, fallo } from '@shared/result/result';
import { ImportaFilas } from '../../../application/catalogo/use-case/importa-filas.use-case';
import { ImportaNdjson } from '../../../application/catalogo/use-case/importa-ndjson.use-case';
import { LeeArchivoDeImportacion } from '../../../application/catalogo/use-case/lee-archivo-de-importacion.use-case';
import { ImportadorMasivo } from './importador-masivo';
import es from '@shared/i18n/dictionary/es';
import en from '@shared/i18n/dictionary/en';

/**
 * El mismo texto que ve quien usa la aplicación.
 *
 * <p>Las claves técnicas ya NO se ven en pantalla: los diccionarios las cubren, así que buscar
 * `admin.catalog.bulk.help` no encuentra nada. Se consulta por el TEXTO, resuelto con la misma cadena
 * de respaldo que el servicio —idioma activo, inglés, y si no, la clave—, de modo que la prueba sigue
 * delatando el día que alguien escriba en la plantilla una clave que no existe.
 */
const t = (clave: string): string => es[clave] ?? en[clave] ?? clave;

/** El texto de una clave como expresión, para cuando el elemento lleva algo más alrededor. */
const rx = (clave: string): RegExp =>
  new RegExp(
    t(clave)
      .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      .replace(/\\\{[a-zA-Z]+\\\}/g, '.+'),
  );

/**
 * Las pruebas corren en ESPAÑOL: el idioma sale de la cookie de preferencias y, sin ella, el navegador
 * de pruebas pide inglés. Fijarlo aquí deja las comprobaciones contra el diccionario real.
 */
beforeEach(() => {
  document.cookie = 'nx036-locale=es';
});

const importaFilas = { ejecuta: vi.fn() };
const importaNdjson = { ejecuta: vi.fn() };
const leeArchivo = { ejecuta: vi.fn() };

async function pinta(terminados: number[] = []) {
  return render(ImportadorMasivo, {
    providers: [
      { provide: ImportaFilas, useValue: importaFilas },
      { provide: ImportaNdjson, useValue: importaNdjson },
      { provide: LeeArchivoDeImportacion, useValue: leeArchivo },
    ],
    inputs: { clase: 'products' },
    on: { terminado: () => terminados.push(1) },
  });
}

describe('ImportadorMasivo', () => {
  beforeEach(() => vi.clearAllMocks());

  /** La plantilla completa viene precargada: es lo único que enseña todos los campos que se aceptan. */
  it('arranca con la plantilla completa dentro del editor', async () => {
    await pinta();

    const editor = screen.getByLabelText(t('admin.catalog.bulk.help')) as HTMLTextAreaElement;
    expect(editor.value).toContain('shippingCny');
    expect(editor.value).toContain('customsMaterial');
  });

  it('la referencia de campos enseña cuáles son obligatorios', async () => {
    await pinta();

    await userEvent.click(screen.getByRole('button', { name: rx('admin.catalog.bulk.fields') }));

    expect(screen.getByText('shippingCny')).toBeInTheDocument();
    expect(screen.getAllByText(t('admin.catalog.bulk.required_badge')).length).toBeGreaterThan(0);
  });

  it('un JSON mal formado se avisa antes de mandar nada', async () => {
    await pinta();
    const editor = screen.getByLabelText(t('admin.catalog.bulk.help'));

    await userEvent.clear(editor);
    // «[[» y «{{» se teclean como un solo «[» y un solo «{»: en `userEvent.type` los corchetes y las
    // llaves sueltas anuncian una tecla especial —«{Enter}»— y sin duplicarlos revienta al analizarlos.
    await userEvent.type(editor, '[[{{');

    expect(screen.getByText(rx('admin.catalog.bulk.invalid_json'))).toBeInTheDocument();
    expect(importaFilas.ejecuta).not.toHaveBeenCalled();
  });

  it('un JSON válido se puede importar y avisa al terminar', async () => {
    importaFilas.ejecuta.mockResolvedValue(exito({ creados: 1, fallidos: 0, errores: [] }));
    const terminados: number[] = [];
    await pinta(terminados);
    const editor = screen.getByLabelText(t('admin.catalog.bulk.help'));

    await userEvent.clear(editor);
    await userEvent.paste('[{"titleEs":"A","shippingCny":1,"ivaCny":0}]');
    await userEvent.click(screen.getByRole('button', { name: rx('admin.catalog.bulk.import') }));

    expect(importaFilas.ejecuta).toHaveBeenCalledWith(
      [{ titleEs: 'A', shippingCny: 1, ivaCny: 0 }],
      'products',
      expect.any(Function),
    );
    expect(terminados.length).toBe(1);
  });

  /** Tras una carga de horas, «fallidos: 200» sin decir cuáles no deja nada que corregir. */
  it('los fallos del servidor se quedan a la vista al terminar', async () => {
    importaFilas.ejecuta.mockResolvedValue(
      exito({ creados: 0, fallidos: 1, errores: ['[1-1] Falta el envío'] }),
    );
    await pinta();
    const editor = screen.getByLabelText(t('admin.catalog.bulk.help'));

    await userEvent.clear(editor);
    await userEvent.paste('[{"titleEs":"A","shippingCny":1,"ivaCny":0}]');
    await userEvent.click(screen.getByRole('button', { name: rx('admin.catalog.bulk.import') }));

    expect(await screen.findByText('[1-1] Falta el envío')).toBeInTheDocument();
  });

  it('el ejemplo mínimo sustituye a la plantilla completa', async () => {
    await pinta();

    await userEvent.click(screen.getByRole('button', { name: rx('admin.catalog.bulk.example') }));

    const editor = screen.getByLabelText(t('admin.catalog.bulk.help')) as HTMLTextAreaElement;
    expect(editor.value).not.toContain('customsMaterial');
    expect(editor.value).toContain('shippingCny');
  });
});

/**
 * La carga masiva por JSON pegado o por fichero.
 *
 * <p>Es la pantalla desde la que entra el catálogo entero, y el comportamiento que hay que garantizar no
 * es el camino feliz: es qué queda cuando algo sale mal.
 *
 * <p>**Los errores NO se borran al terminar.** Tras una carga de horas, un «fallidos: 200» sin decir
 * cuáles ni por qué no deja absolutamente nada que corregir: hay que volver a empezar a ciegas.
 *
 * <p>Y el análisis del JSON va EN VIVO, mientras se pega: el error típico —una coma de más— se arregla
 * en dos segundos si se ve dónde está, y cuesta una carga entera si solo se descubre al enviar.
 */
interface OpcionesDeCarga {
  resultado?: { creados: number; fallidos: number; errores: readonly string[] };
  importar?: 'falla';
}

async function montaConDobles(opciones: OpcionesDeCarga = {}) {
  const importaFilas = {
    ejecuta: vi.fn(async (_filas: unknown, _clase: string, _avance: unknown) =>
      opciones.importar === 'falla'
        ? fallo(creaError('error-del-servidor', 'El servidor no pudo'))
        : exito(opciones.resultado ?? { creados: 2, fallidos: 0, errores: [] }),
    ),
  };
  const importaNdjson = { ejecuta: vi.fn(async () => exito({ creados: 0, fallidos: 0, errores: [] })) };
  const leeArchivo = { ejecuta: vi.fn(async () => exito([])) };
  const cerrado = vi.fn();
  const terminado = vi.fn();

  const vista = await render(ImportadorMasivo, {
    inputs: { clase: 'products' },
    on: { cierra: cerrado, terminado },
    providers: [
      AvisosStore,
      { provide: ImportaFilas, useValue: importaFilas },
      { provide: ImportaNdjson, useValue: importaNdjson },
      { provide: LeeArchivoDeImportacion, useValue: leeArchivo },
    ],
  });
  await vista.fixture.whenStable();
  vista.fixture.detectChanges();

  const asienta = async () => {
    await vista.fixture.whenStable();
    vista.fixture.detectChanges();
    await vista.fixture.whenStable();
    vista.fixture.detectChanges();
  };

  return {
    vista,
    asienta,
    importaFilas,
    cerrado,
    terminado,
    avisos: vista.fixture.debugElement.injector.get<AvisosStore>(AvisosStore),
  };
}

const editorJson = () => document.querySelector<HTMLTextAreaElement>('#importador-json')!;
const botonImportar = () => screen.getByRole('button', { name: /^Importar$/ });

async function pegaEnElEditor(texto: string, asienta: () => Promise<void>) {
  editorJson().value = texto;
  editorJson().dispatchEvent(new Event('input', { bubbles: true }));
  await asienta();
}

describe('ImportadorMasivo · validación en vivo y resultado parcial', () => {
  beforeEach(() => {
    document.cookie = 'nx036-locale=es';
  });

  /** La plantilla es lo único que enseña de golpe todos los campos que se aceptan. */
  it('arranca con la plantilla completa, no con el editor en blanco', async () => {
    await montaConDobles();

    expect(editorJson().value.length).toBeGreaterThan(0);
    expect(botonImportar()).not.toBeDisabled();
  });

  it('un JSON roto apaga el botón y dice qué pasa, mientras se escribe', async () => {
    const { asienta } = await montaConDobles();

    await pegaEnElEditor('[{"sku": "A",}]', asienta);

    /* En vivo: una coma de más se arregla en dos segundos si se ve dónde está, y cuesta una carga
     * entera si solo se descubre al enviar. */
    expect(botonImportar()).toBeDisabled();
  });

  it('una lista vacía tampoco se puede importar', async () => {
    const { asienta } = await montaConDobles();

    await pegaEnElEditor('[]', asienta);

    expect(botonImportar()).toBeDisabled();
  });

  it('con filas válidas se importa y se dice el recuento', async () => {
    const { importaFilas, avisos, cerrado, terminado, asienta } = await montaConDobles();

    await userEvent.click(botonImportar());
    await asienta();

    expect(importaFilas.ejecuta).toHaveBeenCalled();
    expect(avisos.avisos().at(-1)?.tipo).toBe('success');
    /* Sin fallos se cierra sola: quedarse abierta obliga a cerrarla a mano sin nada que mirar. */
    expect(cerrado).toHaveBeenCalled();
    expect(terminado).toHaveBeenCalled();
  });

  /**
   * Lo que de verdad importa de esta pantalla: con fallos NO se cierra y los motivos se QUEDAN. Un
   * «fallidos: 200» sin decir cuáles obliga a repetir la carga entera a ciegas.
   */
  it('con fallos se queda abierta y enseña los motivos', async () => {
    const { avisos, cerrado, terminado, asienta } = await montaConDobles({
      resultado: {
        creados: 8,
        fallidos: 2,
        errores: ['fila 3: falta el SKU', 'fila 7: categoría desconocida'],
      },
    });

    await userEvent.click(botonImportar());
    await asienta();

    expect(avisos.avisos().at(-1)?.tipo).toBe('error');
    expect(cerrado, 'se ha cerrado llevándose los motivos').not.toHaveBeenCalled();
    expect(screen.getByText(/fila 3: falta el SKU/)).toBeInTheDocument();
    expect(screen.getByText(/fila 7: categoría desconocida/)).toBeInTheDocument();
    /* Aunque haya fallos, la pantalla de detrás tiene que recargarse: ocho productos SÍ entraron. */
    expect(terminado).toHaveBeenCalled();
  });

  it('un rechazo del servidor se avisa con SU mensaje', async () => {
    const { avisos, cerrado, asienta } = await montaConDobles({ importar: 'falla' });

    await userEvent.click(botonImportar());
    await asienta();

    expect(avisos.avisos().at(-1)).toMatchObject({
      tipo: 'error',
      mensaje: 'El servidor no pudo',
    });
    expect(cerrado).not.toHaveBeenCalled();
  });

  it('el botón de ejemplo deja algo importable en el editor', async () => {
    const { importaFilas, asienta } = await montaConDobles();

    await userEvent.click(screen.getByRole('button', { name: /Insertar ejemplo/ }));
    await asienta();
    await userEvent.click(botonImportar());
    await asienta();

    expect(importaFilas.ejecuta).toHaveBeenCalled();
  });

  it('cancelar cierra sin importar nada', async () => {
    const { importaFilas, cerrado } = await montaConDobles();

    await userEvent.click(screen.getByRole('button', { name: 'Cancelar' }));

    expect(cerrado).toHaveBeenCalled();
    expect(importaFilas.ejecuta).not.toHaveBeenCalled();
  });

  describe('adjuntar un fichero', () => {
    /** Simula elegir un fichero en el campo oculto del navegador. */
    async function adjunta(nombre: string, contenido: string, asienta: () => Promise<void>) {
      const campo = document.querySelector<HTMLInputElement>('input[type="file"]')!;
      const archivo = new File([contenido], nombre, { type: 'application/json' });
      Object.defineProperty(campo, 'files', { configurable: true, value: [archivo] });
      campo.dispatchEvent(new Event('change', { bubbles: true }));
      await asienta();
    }

    it('un JSON adjunto sustituye al editor, que se apaga', async () => {
      const { asienta } = await montaConDobles();

      await adjunta('catalogo.json', '[{"sku":"A"}]', asienta);

      /* Con fichero manda el fichero: dejar el editor vivo daría dos fuentes para la misma carga y
       * ninguna forma de saber cuál se va a usar. */
      expect(screen.getByText(/catalogo.json/)).toBeInTheDocument();
      expect(editorJson()).toBeDisabled();
    });

    it('se puede quitar el adjunto y volver al editor', async () => {
      const { asienta } = await montaConDobles();
      await adjunta('catalogo.json', '[{"sku":"A"}]', asienta);

      /* «Cancelar» rotula también el botón que cierra la ventana: el que quita el adjunto es el que
       * está junto al nombre del fichero, o sea el primero. */
      await userEvent.click(screen.getAllByRole('button', { name: /Cancelar/ })[0]);
      await asienta();

      expect(screen.queryByText(/catalogo.json/)).toBeNull();
      expect(editorJson()).not.toBeDisabled();
    });

    /** Un fichero ilegible se cuenta en la lista de problemas, no en un aviso que se cierra solo. */
    it('un fichero que no se puede leer se explica y NO queda adjunto', async () => {
      const { vista, asienta } = await montaConDobles();
      const lector = vista.fixture.debugElement.injector.get(
        LeeArchivoDeImportacion,
      ) as unknown as { ejecuta: ReturnType<typeof vi.fn> };
      lector.ejecuta.mockResolvedValueOnce(fallo(creaError('peticion-invalida', 'JSON roto')));

      await adjunta('roto.json', 'no es json', asienta);

      expect(screen.queryByText(/roto.json/)).toBeNull();
      expect(botonImportar()).not.toBeDisabled();
    });
  });

  describe('las ayudas del editor', () => {
    it('la plantilla completa vuelve a poner todos los campos', async () => {
      const { asienta } = await montaConDobles();
      const plantilla = editorJson().value;

      await userEvent.click(screen.getByRole('button', { name: /Insertar ejemplo/ }));
      await asienta();
      const ejemplo = editorJson().value;

      await userEvent.click(screen.getByRole('button', { name: /Plantilla completa/ }));
      await asienta();

      /* El ejemplo es el mínimo con el que se carga algo; la plantilla, la referencia de TODO lo que se
       * acepta. Poder ir y volver entre las dos es lo que hace útil el botón. */
      expect(ejemplo.length).toBeLessThan(plantilla.length);
      expect(editorJson().value).toBe(plantilla);
    });

    it('copiar el contenido al portapapeles no revienta si el navegador lo deniega', async () => {
      Object.defineProperty(navigator, 'clipboard', {
        configurable: true,
        value: {
          writeText: async () => {
            throw new Error('denegado');
          },
        },
      });
      const { asienta } = await montaConDobles();

      await userEvent.click(screen.getByRole('button', { name: /Copiar/ }));
      await asienta();

      /* Sin portapapeles no hay nada que avisar: el texto sigue en pantalla para copiarlo a mano. */
      expect(editorJson().value.length).toBeGreaterThan(0);
    });

    it('la referencia de campos se despliega bajo demanda', async () => {
      const { vista, asienta } = await montaConDobles();
      const antes = (vista.fixture.nativeElement.textContent as string).length;

      await userEvent.click(screen.getByRole('button', { name: /Campos|campos/ }));
      await asienta();

      expect((vista.fixture.nativeElement.textContent as string).length).toBeGreaterThan(antes);
    });
  });
});
