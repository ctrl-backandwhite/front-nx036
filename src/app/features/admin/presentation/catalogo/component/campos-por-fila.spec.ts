import { provideRouter } from '@angular/router';
import { render, screen } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { exito } from '@shared/result/result';
import { CatalogoAdminStore } from '../../../application/catalogo/state/catalogo-admin.store';
import { ListaTodasLasCategorias } from '../../../application/catalogo/use-case/administra-categorias.use-case';
import { ConsultaIdiomas } from '../../../application/catalogo/use-case/consulta-idiomas.use-case';
import { CreaProducto } from '../../../application/catalogo/use-case/crea-producto.use-case';
import { EliminaVariante } from '../../../application/catalogo/use-case/elimina-variante.use-case';
import { GuardaVariante } from '../../../application/catalogo/use-case/guarda-variante.use-case';
import { GuardaVariantesEnLote } from '../../../application/catalogo/use-case/guarda-variantes-en-lote.use-case';
import { ListaVariantes } from '../../../application/catalogo/use-case/lista-variantes.use-case';
import { DialogoAltaDeProducto } from './dialogo-alta-de-producto';
import { GestorDeVariantes } from './gestor-de-variantes';
import { EjeDeVariacion } from '../../../domain/catalogo/model/eje-de-variacion';
import { FichaDeProducto } from '../../../domain/catalogo/model/ficha-de-producto';
import { VarianteDeProducto } from '../../../domain/catalogo/model/variante-de-producto';
import { EtiquetasDeVariacion } from './ficha/etiquetas-de-variacion';
import { PreciosDeFicha } from './ficha/precios-de-ficha';
import es from '@shared/i18n/dictionary/es';
import en from '@shared/i18n/dictionary/en';

/**
 * Los formularios que se pintan POR FILA: un campo por variante y dos por valor de variación.
 *
 * <p>Se prueban aparte porque comparten el mismo mecanismo —un modelo indexado por identificador del que
 * cuelga un campo por fila— y es el que más fácil se rompe: si la clave de una fila no existe en el
 * modelo, el campo no tiene a qué atarse y la pantalla revienta al pintarla, no al compilarla.
 */
const t = (clave: string): string => es[clave] ?? en[clave] ?? clave;

/** El texto de una clave como expresión, para cuando el elemento lleva un icono al lado. */
const rx = (clave: string): RegExp =>
  new RegExp(t(clave).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));

beforeEach(() => {
  document.cookie = 'nx036-locale=es';
});

const variante = (extra: Partial<VarianteDeProducto> = {}): VarianteDeProducto => ({
  id: 'v1',
  sku: 'SKU-1',
  titulo: 'Rojo / M',
  precio: 30,
  existencias: 10,
  opciones: {},
  activa: true,
  ...extra,
});

const ficha = (variantes: readonly VarianteDeProducto[]): FichaDeProducto => ({
  id: 'p1',
  slug: 'auricular',
  titulo: 'Auricular',
  tituloZh: '耳机',
  origen: '1688',
  idExterno: '979',
  estado: 'ACTIVE',
  moq: 1,
  coste: 20,
  divisa: 'CNY',
  ventasMensuales: 0,
  yuanes: {},
  yuanesFormateados: {},
  imagenes: [],
  variantes,
  ejes: [],
  tramos: [],
  titulosPorIdioma: {},
});

const ejeDeColor: EjeDeVariacion = {
  id: 'e1',
  nombre: 'Color',
  nombreZh: '颜色',
  posicion: 0,
  valores: [
    { id: 'v1', valorZh: '白色', valor: 'Blanco', urlImagen: 'https://cdn/a.jpg', posicion: 0 },
    { id: 'v2', valorZh: '黑色', posicion: 1 },
  ],
};

describe('PreciosDeFicha', () => {
  async function pinta(
    variantes: readonly VarianteDeProducto[],
    cambios: { id: string; precio: number; anterior: number }[] = [],
  ) {
    return render(PreciosDeFicha, {
      providers: [CatalogoAdminStore],
      inputs: { ficha: ficha(variantes) },
      on: { cambiaPrecio: (cambio: { id: string; precio: number; anterior: number }) => cambios.push(cambio) },
    });
  }

  it('cada variante trae su casilla con el precio crudo que tiene hoy', async () => {
    await pinta([variante(), variante({ id: 'v2', sku: 'SKU-2', precio: 45 })]);

    const casillas = screen.getAllByLabelText(t('admin.catalog.col.price')) as HTMLInputElement[];
    expect(casillas.map((casilla) => casilla.value)).toEqual(['30', '45']);
  });

  /** Sin precio propio manda el coste de la ficha: es lo que la variante cuesta de verdad. */
  it('una variante sin precio propio enseña el coste de la ficha', async () => {
    await pinta([variante({ precio: undefined })]);

    expect((screen.getByLabelText(t('admin.catalog.col.price')) as HTMLInputElement).value).toBe('20');
  });

  it('al salir del campo se publica el precio nuevo y el que había', async () => {
    const cambios: { id: string; precio: number; anterior: number }[] = [];
    await pinta([variante()], cambios);

    const casilla = screen.getByLabelText(t('admin.catalog.col.price'));
    await userEvent.clear(casilla);
    await userEvent.type(casilla, '42');
    await userEvent.tab();

    expect(cambios).toEqual([{ id: 'v1', precio: 42, anterior: 30 }]);
  });

  /** Un precio en negativo no es un dato raro: es vender por debajo del coste. */
  it('un precio vacío no publica nada', async () => {
    const cambios: { id: string; precio: number; anterior: number }[] = [];
    await pinta([variante()], cambios);

    await userEvent.clear(screen.getByLabelText(t('admin.catalog.col.price')));
    await userEvent.tab();

    expect(cambios).toEqual([]);
  });
});

describe('EtiquetasDeVariacion', () => {
  async function pinta(renombrados: { id: string; etiqueta: string }[] = []) {
    return render(EtiquetasDeVariacion, {
      inputs: { ejes: [ejeDeColor] },
      on: { renombrado: (cambio: { id: string; etiqueta: string }) => renombrados.push(cambio) },
    });
  }

  it('cada valor trae su etiqueta guardada, y el hueco se queda vacío', async () => {
    await pinta();

    const campos = screen.getAllByLabelText(
      t('admin.catalog.detail.labels.title'),
    ) as HTMLInputElement[];
    expect(campos.map((campo) => campo.value)).toEqual(['Blanco', '']);
  });

  it('renombrar publica el valor nuevo al salir del campo', async () => {
    const renombrados: { id: string; etiqueta: string }[] = [];
    await pinta(renombrados);

    const campos = screen.getAllByLabelText(t('admin.catalog.detail.labels.title'));
    await userEvent.type(campos[1], 'Negro');
    await userEvent.tab();

    expect(renombrados).toEqual([{ id: 'v2', etiqueta: 'Negro' }]);
  });

  /** Salir del campo sin tocarlo no puede gastar una escritura contra el servidor. */
  it('salir sin cambiar nada no publica nada', async () => {
    const renombrados: { id: string; etiqueta: string }[] = [];
    await pinta(renombrados);

    await userEvent.click(screen.getAllByLabelText(t('admin.catalog.detail.labels.title'))[0]);
    await userEvent.tab();

    expect(renombrados).toEqual([]);
  });
});

describe('DialogoAltaDeProducto', () => {
  const creaProducto = { ejecuta: vi.fn() };
  const consultaIdiomas = { ejecuta: vi.fn() };
  const listaCategorias = { ejecuta: vi.fn() };

  beforeEach(() => {
    vi.clearAllMocks();
    creaProducto.ejecuta.mockResolvedValue(exito('p1'));
    consultaIdiomas.ejecuta.mockResolvedValue(
      exito([
        { codigo: 'es', etiqueta: 'Español' },
        { codigo: 'en', etiqueta: 'English' },
      ]),
    );
    listaCategorias.ejecuta.mockResolvedValue(
      exito([
        {
          id: 'c1',
          slug: 'ropa',
          nombreZh: '衣服',
          nombres: { es: 'Ropa' },
          posicion: 0,
          activa: true,
          padreId: null,
          numeroDeProductos: 0,
        },
      ]),
    );
  });

  async function pinta() {
    const vista = await render(DialogoAltaDeProducto, {
      providers: [
        provideRouter([]),
        { provide: CreaProducto, useValue: creaProducto },
        { provide: ConsultaIdiomas, useValue: consultaIdiomas },
        { provide: ListaTodasLasCategorias, useValue: listaCategorias },
      ],
    });
    await vista.fixture.whenStable();
    vista.fixture.detectChanges();
    return vista;
  }

  /**
   * Con trece secciones plegadas, un botón apagado sin más deja buscando a ciegas: el diálogo dice cuál
   * de los tres mínimos falta —categoría, título y precio— y solo deja crear cuando no falta ninguno.
   */
  it('no deja crear hasta que hay categoría, título y precio', async () => {
    await pinta();
    const crear = screen.getByRole('button', { name: t('admin.create_product.create') });

    expect(crear).toBeDisabled();
    expect(screen.getByText(t('admin.create_product.required'))).toBeInTheDocument();

    await userEvent.selectOptions(
      screen.getByLabelText(t('admin.create_product.category')),
      'ropa',
    );
    await userEvent.type(
      screen.getByLabelText(`${t('admin.create_product.title_field')} (Español)`),
      'Auricular',
    );
    // Sin clave en el diccionario todavía: el rótulo que se ve es el respaldo escrito en la definición.
    await userEvent.type(screen.getByLabelText('Precio (CNY)'), '29.9');

    expect(crear).toBeEnabled();
    expect(screen.queryByText(t('admin.create_product.required'))).toBeNull();
  });

  /** Las seis listas se editan con el mismo componente: si el enganche falla, falla en las seis. */
  it('añadir un tramo crea una fila editable de verdad', async () => {
    await pinta();

    await userEvent.click(screen.getByRole('button', { name: 'Añadir tramo' }));
    const desde = screen.getByLabelText('Desde');
    await userEvent.type(desde, '10');

    expect((desde as HTMLInputElement).value).toBe('10');
  });
});

describe('GestorDeVariantes', () => {
  const lista = { ejecuta: vi.fn() };
  const guarda = { ejecuta: vi.fn() };
  const guardaLote = { ejecuta: vi.fn() };
  const elimina = { ejecuta: vi.fn() };

  beforeEach(() => {
    vi.clearAllMocks();
    lista.ejecuta.mockResolvedValue(
      exito([variante(), variante({ id: 'v2', sku: 'SKU-2', precio: 45 })]),
    );
    guardaLote.ejecuta.mockResolvedValue(exito(1));
  });

  async function pinta() {
    const vista = await render(GestorDeVariantes, {
      providers: [
        { provide: ListaVariantes, useValue: lista },
        { provide: GuardaVariante, useValue: guarda },
        { provide: GuardaVariantesEnLote, useValue: guardaLote },
        { provide: EliminaVariante, useValue: elimina },
      ],
      inputs: { productoId: 'p1' },
    });
    await vista.fixture.whenStable();
    vista.fixture.detectChanges();
    return vista;
  }

  /**
   * La edición masiva monta un campo por variante a partir de un modelo indexado por identificador: si
   * la clave de una fila no está en el modelo, el campo no tiene a qué atarse y la tabla revienta.
   */
  it('la edición de todas a la vez trae una fila editable por variante', async () => {
    await pinta();

    await userEvent.click(screen.getByRole('button', { name: rx('admin.variants.edit_all') }));

    const skus = screen.getAllByLabelText(
      t('admin.catalog.detail.inv.sku'),
    ) as HTMLInputElement[];
    expect(skus.map((campo) => campo.value)).toEqual(['SKU-1', 'SKU-2']);
  });

  /** El alta de una variante exige SKU: es lo único que la identifica en el almacén. */
  it('sin SKU no se puede guardar la variante nueva', async () => {
    await pinta();

    await userEvent.click(screen.getByRole('button', { name: rx('admin.variants.add') }));
    const guardar = screen.getByLabelText(t('actions.save'));
    expect(guardar).toBeDisabled();

    await userEvent.type(screen.getByLabelText(t('admin.catalog.detail.inv.sku')), 'SKU-9');
    expect(guardar).toBeEnabled();
  });
});
