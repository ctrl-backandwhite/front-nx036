import { render, screen } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { creaError } from '@shared/error/app-error';
import { exito, fallo } from '@shared/result/result';
import {
  ExportaProducto,
  ReemplazaProductoConJson,
} from '../../../application/catalogo/use-case/reemplaza-producto-con-json.use-case';
import { EditorJsonDeProducto } from './editor-json-de-producto';
import es from '@shared/i18n/dictionary/es';
import en from '@shared/i18n/dictionary/en';

/**
 * El mismo texto que ve quien usa la aplicación.
 *
 * <p>Las claves técnicas ya NO se ven en pantalla: los diccionarios las cubren, así que buscar
 * `admin.json.title` no encuentra nada. Se consulta por el TEXTO, resuelto con la misma cadena de
 * respaldo que el servicio —idioma activo, inglés, y si no, la clave—, de modo que la prueba sigue
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

const exporta = { ejecuta: vi.fn() };
const reemplaza = { ejecuta: vi.fn() };

async function pinta(guardados: number[] = []) {
  const vista = await render(EditorJsonDeProducto, {
    providers: [
      { provide: ExportaProducto, useValue: exporta },
      { provide: ReemplazaProductoConJson, useValue: reemplaza },
    ],
    inputs: { productoId: 'p1' },
    on: { guardado: () => guardados.push(1) },
  });
  await vista.fixture.whenStable();
  vista.fixture.detectChanges();
  return vista;
}

describe('EditorJsonDeProducto', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    exporta.ejecuta.mockResolvedValue(exito({ externalId: '979', titleEs: 'Auricular' }));
  });

  /**
   * Carga la ficha COMPLETA a propósito: el guardado es un reemplazo destructivo, así que lo que no
   * aparezca en este texto se pierde. La norma es reenviar el JSON entero, nunca una fila mínima.
   */
  it('carga la ficha entera del producto en el editor', async () => {
    await pinta();

    // Se acota al `textarea`: la ventana emergente se llama IGUAL que el campo —el título del diálogo
    // es también la etiqueta del editor—, así que sin el selector la consulta encuentra dos elementos.
    const editor = (await screen.findByLabelText(t('admin.json.title'), {
      selector: 'textarea',
    })) as HTMLTextAreaElement;
    expect(editor.value).toContain('"externalId": "979"');
    expect(screen.getByText(t('admin.json.hint'))).toBeInTheDocument();
  });

  it('guarda el texto tal cual y avisa a quien lo monta', async () => {
    reemplaza.ejecuta.mockResolvedValue(exito(1));
    const guardados: number[] = [];
    await pinta(guardados);

    await userEvent.click(screen.getByRole('button', { name: rx('admin.json.save') }));

    expect(reemplaza.ejecuta).toHaveBeenCalledWith(expect.stringContaining('externalId'));
    expect(guardados.length).toBe(1);
  });

  /** El backend acepta la petición y rechaza la fila: sin esto el editor decía «guardado». */
  it('un rechazo del backend se enseña y no se da por guardado', async () => {
    reemplaza.ejecuta.mockResolvedValue(
      fallo(creaError('peticion-invalida', 'Falta el envío (shippingCny)')),
    );
    const guardados: number[] = [];
    await pinta(guardados);

    await userEvent.click(screen.getByRole('button', { name: rx('admin.json.save') }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Falta el envío');
    expect(guardados.length).toBe(0);
  });
});
