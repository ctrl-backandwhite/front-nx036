import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { render, screen } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { PreferenciasService } from '@core/preferences/preferencias';
import { CatalogoAdminStore } from '../../../application/catalogo/state/catalogo-admin.store';
import { ProductoDeListado } from '../../../domain/catalogo/model/producto-admin';
import { AccionSobreProducto, TablaDeProductos } from './tabla-de-productos';
import es from '@shared/i18n/dictionary/es';
import en from '@shared/i18n/dictionary/en';

/**
 * El mismo texto que ve quien usa la aplicación.
 *
 * <p>Las claves técnicas ya NO se ven en pantalla: los diccionarios las cubren, así que buscar
 * `filters.no_results` no encuentra nada. Se consulta por el TEXTO, resuelto con la misma cadena de
 * respaldo que el servicio —idioma activo, inglés, y si no, la clave—, de modo que la prueba sigue
 * delatando el día que alguien escriba en la plantilla una clave que no existe.
 */
const t = (clave: string): string => es[clave] ?? en[clave] ?? clave;

const producto = (extra: Partial<ProductoDeListado> = {}): ProductoDeListado => ({
  id: 'p1',
  slug: 'auricular',
  titulo: 'Auricular inalámbrico',
  coste: 72,
  divisa: 'CNY',
  ventasMensuales: 1200,
  tendencia: 0.73,
  estado: 'ACTIVE',
  verificado: false,
  ...extra,
});

async function pinta(productos: readonly ProductoDeListado[], acciones: AccionSobreProducto[] = []) {
  const vista = await render(TablaDeProductos, {
    providers: [provideRouter([]), CatalogoAdminStore],
    inputs: { productos, cargando: false },
    on: { acciona: (accion: AccionSobreProducto) => acciones.push(accion) },
  });
  TestBed.inject(PreferenciasService).cambiaMoneda('EUR');
  TestBed.inject(CatalogoAdminStore).divisas.set([
    { codigo: 'USD', porDolar: 1 },
    { codigo: 'EUR', porDolar: 0.92 },
    { codigo: 'CNY', porDolar: 7.2 },
  ]);
  vista.fixture.detectChanges();
  return vista;
}

describe('TablaDeProductos', () => {
  /**
   * Las pruebas corren en ESPAÑOL: el idioma decide los rótulos y, sobre todo, cómo se escribe un
   * importe («9,20 €» o «€9.20»). Sale de la cookie de preferencias y, sin ella, del navegador —que en
   * el banco de pruebas pide inglés—, así que sin fijarlo la misma prueba pasaría aquí y fallaría en
   * otra máquina.
   */
  beforeEach(() => {
    document.cookie = 'nx036-locale=es';
  });

  it('enseña el producto con su coste convertido, sus ventas y su tendencia', async () => {
    await pinta([producto()]);

    expect(screen.getByText('Auricular inalámbrico')).toBeInTheDocument();
    expect(screen.getByText('1200')).toBeInTheDocument();
    expect(screen.getByText('73/100')).toBeInTheDocument();
    // 72 CNY convertidos a euros con la tasa de la prueba.
    expect(screen.getByText(/9,20/)).toBeInTheDocument();
  });

  it('sin coste ni ventas se enseñan guiones, no ceros', async () => {
    await pinta([producto({ coste: undefined, ventasMensuales: 0, tendencia: undefined })]);

    expect(screen.getAllByText('—').length).toBeGreaterThanOrEqual(3);
  });

  it('sin productos se dice que no hay resultados', async () => {
    await pinta([]);
    expect(screen.getByText(t('filters.no_results'))).toBeInTheDocument();
  });

  /** El botón que se ofrece depende del estado: publicar lo pausado, pausar lo publicado. */
  /**
   * El segundo producto entra con `rerender` y no montando otra vez: `render` vuelve a configurar el
   * banco de pruebas, y dos montajes dentro de la MISMA prueba fallan con «el módulo ya está
   * instanciado».
   */
  it('un producto publicado ofrece pausar y uno en borrador, publicar', async () => {
    const { rerender } = await pinta([producto({ estado: 'ACTIVE' })]);
    expect(screen.getByLabelText(t('admin.catalog.actions.pause'))).toBeInTheDocument();

    await rerender({ inputs: { productos: [producto({ id: 'p2', estado: 'DRAFT' })], cargando: false } });

    expect(screen.getAllByLabelText(t('admin.catalog.actions.publish')).length).toBeGreaterThan(0);
  });

  it('un producto archivado ya no ofrece archivar', async () => {
    await pinta([producto({ estado: 'ARCHIVED' })]);
    expect(screen.queryByLabelText(t('admin.catalog.actions.archive'))).toBeNull();
  });

  it('pedir el borrado no borra: solo avisa a quien monta la tabla', async () => {
    const acciones: AccionSobreProducto[] = [];
    await pinta([producto()], acciones);

    await userEvent.click(screen.getByLabelText(t('admin.catalog.actions.delete')));

    expect(acciones).toEqual([{ producto: expect.objectContaining({ id: 'p1' }), clase: 'eliminar', estado: undefined }]);
  });

  it('la casilla de certificación avisa con el nuevo valor', async () => {
    const acciones: AccionSobreProducto[] = [];
    await pinta([producto({ verificado: false })], acciones);

    await userEvent.click(screen.getByLabelText(t('admin.catalog.col.verified')));

    expect(acciones[0]).toMatchObject({ clase: 'verificado', verificado: true });
  });
});
