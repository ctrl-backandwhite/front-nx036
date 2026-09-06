import { render, screen } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { exito } from '@shared/result/result';
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
