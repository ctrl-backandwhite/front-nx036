import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { render, screen } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { creaError } from '@shared/error/app-error';
import { exito, fallo } from '@shared/result/result';
import { DialogoStore } from '@ds/component/dialogo/dialogo.store';
import { ALTA_DE_PRODUCTO_PORT } from '../../../domain/catalogo/port/alta-de-producto.port';
import {
  ARBOL_DE_CATEGORIAS_PORT,
  CATEGORIAS_ADMIN_PORT,
} from '../../../domain/catalogo/port/categorias-admin.port';
import {
  IDIOMAS_DE_TIENDA_PORT,
  TASAS_DE_CAMBIO_PORT,
} from '../../../domain/catalogo/port/catalogo-comun.port';
import {
  ANUNCIOS_AL_BUS_PORT,
  COMPRESION_DE_IMAGENES_PORT,
  PRODUCTOS_ADMIN_PORT,
  PRODUCTOS_MASIVOS_PORT,
} from '../../../domain/catalogo/port/productos-admin.port';
import {
  DESCARGA_DE_ARCHIVOS_PORT,
  EXPORTACION_DE_CATALOGO_PORT,
  EXPORTACION_EN_FLUJO_PORT,
  IMPORTACION_DE_CATALOGO_PORT,
  LECTOR_DE_ARCHIVOS_PORT,
} from '../../../domain/catalogo/port/transferencia-de-catalogo.port';
import { CASOS_DE_USO_DE_CATALOGO } from '../../../application/catalogo/casos-de-uso';
import { CatalogoPage } from './catalogo.page';
import es from '@shared/i18n/dictionary/es';
import en from '@shared/i18n/dictionary/en';

/**
 * El mismo texto que ve quien usa la aplicación.
 *
 * <p>Las claves técnicas ya NO se ven en pantalla: los diccionarios las cubren, así que buscar
 * `admin.catalog.title` no encuentra nada. Se consulta por el TEXTO, resuelto con la misma cadena de
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

const producto = {
  id: 'p1',
  slug: 'auricular',
  titulo: 'Auricular inalámbrico',
  coste: 72,
  divisa: 'CNY',
  ventasMensuales: 1200,
  tendencia: 0.73,
  estado: 'ACTIVE',
  verificado: false,
};

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
const arbol = { consulta: vi.fn() };
const tasas = { listaDivisas: vi.fn() };
const vacio = new Proxy({}, { get: () => vi.fn().mockResolvedValue(exito([])) });

async function pinta() {
  const vista = await render(CatalogoPage, {
    providers: [
      provideRouter([]),
      ...CASOS_DE_USO_DE_CATALOGO,
      { provide: PRODUCTOS_ADMIN_PORT, useValue: productos },
      { provide: PRODUCTOS_MASIVOS_PORT, useValue: masivos },
      { provide: ANUNCIOS_AL_BUS_PORT, useValue: bus },
      { provide: COMPRESION_DE_IMAGENES_PORT, useValue: compresion },
      { provide: ARBOL_DE_CATEGORIAS_PORT, useValue: arbol },
      { provide: TASAS_DE_CAMBIO_PORT, useValue: tasas },
      { provide: CATEGORIAS_ADMIN_PORT, useValue: vacio },
      { provide: IDIOMAS_DE_TIENDA_PORT, useValue: vacio },
      { provide: ALTA_DE_PRODUCTO_PORT, useValue: vacio },
      { provide: IMPORTACION_DE_CATALOGO_PORT, useValue: vacio },
      { provide: EXPORTACION_DE_CATALOGO_PORT, useValue: vacio },
      { provide: EXPORTACION_EN_FLUJO_PORT, useValue: vacio },
      { provide: LECTOR_DE_ARCHIVOS_PORT, useValue: vacio },
      { provide: DESCARGA_DE_ARCHIVOS_PORT, useValue: { guarda: vi.fn() } },
    ],
  });
  await vista.fixture.whenStable();
  return vista;
}

describe('CatalogoPage', () => {
  beforeEach(() => {
    // Las pruebas corren en ESPAÑOL: el idioma sale de la cookie de preferencias y, sin ella, del
    // navegador —que en el banco de pruebas pide inglés—, y los rótulos cambiarían de una máquina a
    // otra.
    document.cookie = 'nx036-locale=es';
    vi.clearAllMocks();
    productos.lista.mockResolvedValue(
      exito({ productos: [producto], total: 1, paginas: 1, pagina: 0 }),
    );
    bus.fallidos.mockResolvedValue(exito([]));
    arbol.consulta.mockResolvedValue(exito([{ id: 'c1', etiqueta: 'Ropa' }]));
    tasas.listaDivisas.mockResolvedValue(exito([{ codigo: 'CNY', porDolar: 7.2 }]));
  });

  it('pinta el listado con el título y el producto que llega', async () => {
    await pinta();

    expect(screen.getByRole('heading', { name: t('admin.catalog.title') })).toBeInTheDocument();
    expect(await screen.findByText('Auricular inalámbrico')).toBeInTheDocument();
  });

  /** Sin este aviso, un producto certificado que no llegó a producción no se echa en falta. */
  it('avisa de los anuncios al bus que se dieron por perdidos', async () => {
    bus.fallidos.mockResolvedValue(
      exito([
        {
          id: 'p9',
          idExterno: '979',
          slug: 'gorro',
          titulo: 'Gorro de lana',
          intentos: 3,
          error: 'timeout',
          actualizadoEn: null,
        },
      ]),
    );

    await pinta();

    expect(await screen.findByRole('alert')).toHaveTextContent('Gorro de lana');
  });

  it('las acciones en lote solo aparecen con algo marcado', async () => {
    const vista = await pinta();

    expect(screen.queryByText(rx('admin.catalog.bulk_delete'))).toBeNull();

    // Se acota al `input`: el marcador de la imagen que falta es un `role="img"` con el MISMO
    // `aria-label` —el título del producto—, así que sin el selector la consulta encuentra dos.
    await userEvent.click(
      await screen.findByLabelText('Auricular inalámbrico', { selector: 'input' }),
    );
    vista.fixture.detectChanges();

    expect(screen.getByText(rx('admin.catalog.bulk_delete'))).toBeInTheDocument();
  });

  /** El borrado pide confirmación: es lo que impide vaciar el catálogo por un clic de más. */
  it('el borrado en lote pide confirmación y solo entonces se ejecuta', async () => {
    masivos.eliminaEnLote.mockResolvedValue(exito({ correctos: 2, fallidos: 0, errores: [] }));
    const vista = await pinta();
    vi.spyOn(TestBed.inject(DialogoStore), 'confirma').mockResolvedValue(false);

    // Se acota al `input`: el marcador de la imagen que falta es un `role="img"` con el MISMO
    // `aria-label` —el título del producto—, así que sin el selector la consulta encuentra dos.
    await userEvent.click(
      await screen.findByLabelText('Auricular inalámbrico', { selector: 'input' }),
    );
    vista.fixture.detectChanges();
    await userEvent.click(screen.getByText(rx('admin.catalog.bulk_delete')));

    expect(productos.elimina).not.toHaveBeenCalled();
    expect(masivos.eliminaEnLote).not.toHaveBeenCalled();
  });

  it('un fallo del listado no deja la pantalla rota', async () => {
    productos.lista.mockResolvedValue(fallo(creaError('error-del-servidor', 'Se rompió')));

    await pinta();

    expect(await screen.findByText(t('filters.no_results'))).toBeInTheDocument();
  });
});
