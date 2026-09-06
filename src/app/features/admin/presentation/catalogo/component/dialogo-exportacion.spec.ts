import { render, screen } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { exito } from '@shared/result/result';
import {
  CuentaExportables,
  ExportaCatalogoCompleto,
  ExportaSegmento,
} from '../../../application/catalogo/use-case/exporta-productos.use-case';
import { DialogoExportacion } from './dialogo-exportacion';

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

    await userEvent.selectOptions(screen.getByLabelText('admin.catalog.col.verified'), 'true');

    expect(cuenta.ejecuta).toHaveBeenLastCalledWith(expect.objectContaining({ verificado: true }));
  });

  it('sin productos no se ofrece ningún tramo', async () => {
    cuenta.ejecuta.mockResolvedValue(exito(0));

    await pinta();

    expect(await screen.findByText('admin.export.empty')).toBeInTheDocument();
    expect(screen.queryByText(/1 – /)).toBeNull();
  });

  /** El volcado completo va por flujo: es lo único que aguanta un catálogo entero. */
  it('ofrece descargar el catálogo completo por flujo', async () => {
    await pinta();

    await userEvent.click(
      await screen.findByRole('button', { name: /admin.export.download_all_stream/ }),
    );

    expect(exportaTodo.ejecuta).toHaveBeenCalled();
  });
});
