import { render, screen } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { exito } from '@shared/result/result';
import {
  CuentaExportables,
  ExportaCatalogoCompleto,
  ExportaSegmento,
} from '../../../application/catalogo/use-case/exporta-productos.use-case';
import { CatalogoAdminStore } from '../../../application/catalogo/state/catalogo-admin.store';
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

/**
 * El almacén de la lista va DE VERDAD, no simulado: lo que se comprueba es que el diálogo exporta lo
 * que la lista enseña, y con un doble eso se convertiría en comprobar que se llama a un doble.
 */
async function pinta(preparaLaLista?: (almacen: CatalogoAdminStore) => void) {
  const vista = await render(DialogoExportacion, {
    providers: [
      CatalogoAdminStore,
      { provide: CuentaExportables, useValue: cuenta },
      { provide: ExportaSegmento, useValue: exportaSegmento },
      { provide: ExportaCatalogoCompleto, useValue: exportaTodo },
    ],
  });
  preparaLaLista?.(vista.fixture.debugElement.injector.get(CatalogoAdminStore));
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

  /**
   * EL DEFECTO QUE ESTO IMPIDE: el diálogo tenía su propio filtro —solo fecha y certificación— y no
   * miraba el de la lista. Con la lista acotada a treinta productos, «Exportar» contaba nueve mil,
   * ofrecía nueve tramos y descargaba el catálogo entero. Nada fallaba: el fichero era el equivocado.
   */
  it('cuenta con los filtros que tiene puestos la lista', async () => {
    await pinta((almacen) => {
      almacen.verificado.set('true');
      almacen.estado.set('ACTIVE');
      almacen.texto.set('bailarinas');
      almacen.ventasMinimas.set('50');
    });

    expect(cuenta.ejecuta).toHaveBeenLastCalledWith(
      expect.objectContaining({
        verificado: true,
        estado: 'ACTIVE',
        texto: 'bailarinas',
        ventasMinimas: 50,
      }),
    );
  });

  it('descarga el tramo con esos mismos filtros', async () => {
    await pinta((almacen) => almacen.estado.set('PAUSED'));

    await userEvent.click(await screen.findByText('1 – 1000'));

    expect(exportaSegmento.ejecuta).toHaveBeenLastCalledWith(
      { desde: 1, hasta: 1000 },
      expect.objectContaining({ estado: 'PAUSED' }),
    );
  });

  /** La página y el orden NO viajan: se exporta todo lo que cumple el filtro, no la página visible. */
  it('la página y el orden de la lista no acotan la exportación', async () => {
    await pinta((almacen) => {
      almacen.pagina.set(7);
      almacen.alternaOrdenDePrecio();
    });

    const filtro = cuenta.ejecuta.mock.lastCall?.[0] ?? {};
    expect(filtro).not.toHaveProperty('pagina');
    expect(filtro).not.toHaveProperty('orden');
  });

  // Se avisa de lo que va a caer porque los tramos no lo dicen: «1 – 1000» tiene la misma pinta tanto
  // si detrás hay una selección de treinta como si está el catálogo entero.
  it('sin filtros en la lista avisa de que se lleva el catálogo entero', async () => {
    await pinta();

    expect(await screen.findByText(new RegExp(t('admin.export.scope_all')))).toBeInTheDocument();
  });

  it('con la lista filtrada avisa de que se lleva lo que la lista enseña', async () => {
    await pinta((almacen) => almacen.texto.set('botas'));

    expect(
      await screen.findByText(new RegExp(t('admin.export.scope_filtered'))),
    ).toBeInTheDocument();
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
