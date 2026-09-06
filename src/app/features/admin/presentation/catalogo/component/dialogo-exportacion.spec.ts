import { render, screen } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { exito } from '@shared/result/result';
import {
  CuentaExportables,
  ExportaCatalogoCompleto,
  ExportaSegmento,
} from '../../../application/catalogo/use-case/exporta-productos.use-case';
import { DialogoExportacion } from './dialogo-exportacion';
import es from '@shared/i18n/dictionary/es';
import en from '@shared/i18n/dictionary/en';

/**
 * El mismo texto que ve quien usa la aplicación.
 *
 * <p>Las claves técnicas ya NO se ven en pantalla: los diccionarios las cubren, así que buscar
 * `admin.export.empty` no encuentra nada. Se consulta por el TEXTO, resuelto con la misma cadena de
 * respaldo que el servicio —idioma activo, inglés, y si no, la clave—, de modo que la prueba sigue
 * delatando el día que alguien escriba en la plantilla una clave que no existe.
 */
const t = (clave: string): string => es[clave] ?? en[clave] ?? clave;

/**
 * El texto de una clave como expresión, para cuando el elemento lleva algo más alrededor.
 *
 * <p>Se escapan los caracteres que significan otra cosa en una expresión regular, y los marcadores
 * `{n}` se sustituyen por «lo que sea»: en pantalla ya llevan el número puesto.
 */
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

const cuenta = { ejecuta: vi.fn() };
const exportaSegmento = { ejecuta: vi.fn() };
const exportaTodo = { ejecuta: vi.fn() };

async function pinta() {
  const vista = await render(DialogoExportacion, {
    providers: [
      { provide: CuentaExportables, useValue: cuenta },
      { provide: ExportaSegmento, useValue: exportaSegmento },
      { provide: ExportaCatalogoCompleto, useValue: exportaTodo },
    ],
  });
  await vista.fixture.whenStable();
  vista.fixture.detectChanges();
  return vista;
}

describe('DialogoExportacion', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    cuenta.ejecuta.mockResolvedValue(exito(2500));
    exportaSegmento.ejecuta.mockResolvedValue(exito(1000));
    exportaTodo.ejecuta.mockResolvedValue(exito(true));
  });

  /** Los tramos salen del total YA FILTRADO: contar sin filtrar ofrecía tramos que venían vacíos. */
  it('ofrece un tramo por cada mil productos del total filtrado', async () => {
    await pinta();

    expect(await screen.findByText('1 – 1000')).toBeInTheDocument();
    expect(screen.getByText('1001 – 2000')).toBeInTheDocument();
    expect(screen.getByText('2001 – 2500')).toBeInTheDocument();
  });

  it('descargar un tramo llama a la exportación con ese rango', async () => {
    await pinta();

    await userEvent.click(await screen.findByText('1001 – 2000'));

    expect(exportaSegmento.ejecuta).toHaveBeenCalledWith(
      { desde: 1001, hasta: 2000 },
      expect.objectContaining({ verificado: undefined }),
    );
  });

  it('el filtro de certificación viaja al contador y a la descarga', async () => {
    await pinta();

    await userEvent.selectOptions(screen.getByLabelText(t('admin.catalog.col.verified')), 'true');

    expect(cuenta.ejecuta).toHaveBeenLastCalledWith(expect.objectContaining({ verificado: true }));
  });

  it('sin productos no se ofrece ningún tramo', async () => {
    cuenta.ejecuta.mockResolvedValue(exito(0));

    await pinta();

    expect(await screen.findByText(t('admin.export.empty'))).toBeInTheDocument();
    expect(screen.queryByText(/1 – /)).toBeNull();
  });

  /** El volcado completo va por flujo: es lo único que aguanta un catálogo entero. */
  it('ofrece descargar el catálogo completo por flujo', async () => {
    await pinta();

    await userEvent.click(
      await screen.findByRole('button', { name: rx('admin.export.download_all_stream') }),
    );

    expect(exportaTodo.ejecuta).toHaveBeenCalled();
  });
});
