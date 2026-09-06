import { render, screen } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { exito } from '@shared/result/result';
import { ImportaFilas } from '../../../application/catalogo/use-case/importa-filas.use-case';
import { ImportaNdjson } from '../../../application/catalogo/use-case/importa-ndjson.use-case';
import { LeeArchivoDeImportacion } from '../../../application/catalogo/use-case/lee-archivo-de-importacion.use-case';
import { ImportadorMasivo } from './importador-masivo';

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

    const editor = screen.getByLabelText('admin.catalog.bulk.help') as HTMLTextAreaElement;
    expect(editor.value).toContain('shippingCny');
    expect(editor.value).toContain('customsMaterial');
  });

  it('la referencia de campos enseña cuáles son obligatorios', async () => {
    await pinta();

    await userEvent.click(screen.getByRole('button', { name: /admin.catalog.bulk.fields/ }));

    expect(screen.getByText('shippingCny')).toBeInTheDocument();
    expect(screen.getAllByText('admin.catalog.bulk.required_badge').length).toBeGreaterThan(0);
  });

  it('un JSON mal formado se avisa antes de mandar nada', async () => {
    await pinta();
    const editor = screen.getByLabelText('admin.catalog.bulk.help');

    await userEvent.clear(editor);
    await userEvent.type(editor, '[{');

    expect(screen.getByText(/admin.catalog.bulk.invalid_json/)).toBeInTheDocument();
    expect(importaFilas.ejecuta).not.toHaveBeenCalled();
  });

  it('un JSON válido se puede importar y avisa al terminar', async () => {
    importaFilas.ejecuta.mockResolvedValue(exito({ creados: 1, fallidos: 0, errores: [] }));
    const terminados: number[] = [];
    await pinta(terminados);
    const editor = screen.getByLabelText('admin.catalog.bulk.help');

    await userEvent.clear(editor);
    await userEvent.paste('[{"titleEs":"A","shippingCny":1,"ivaCny":0}]');
    await userEvent.click(screen.getByRole('button', { name: /admin.catalog.bulk.import/ }));

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
    const editor = screen.getByLabelText('admin.catalog.bulk.help');

    await userEvent.clear(editor);
    await userEvent.paste('[{"titleEs":"A","shippingCny":1,"ivaCny":0}]');
    await userEvent.click(screen.getByRole('button', { name: /admin.catalog.bulk.import/ }));

    expect(await screen.findByText('[1-1] Falta el envío')).toBeInTheDocument();
  });

  it('el ejemplo mínimo sustituye a la plantilla completa', async () => {
    await pinta();

    await userEvent.click(screen.getByRole('button', { name: /admin.catalog.bulk.example/ }));

    const editor = screen.getByLabelText('admin.catalog.bulk.help') as HTMLTextAreaElement;
    expect(editor.value).not.toContain('customsMaterial');
    expect(editor.value).toContain('shippingCny');
  });
});
