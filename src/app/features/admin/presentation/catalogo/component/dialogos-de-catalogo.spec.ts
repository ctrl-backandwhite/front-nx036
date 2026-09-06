import { render, screen } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { PeticionDeRecargo, PeticionDeSubvencion } from '../../../domain/catalogo/port/productos-admin.port';
import { DialogoRecargo } from './dialogo-recargo';
import { DialogoSubvencion } from './dialogo-subvencion';
import { Paginacion } from './paginacion';
import es from '@shared/i18n/dictionary/es';
import en from '@shared/i18n/dictionary/en';

/**
 * El mismo texto que ve quien usa la aplicación.
 *
 * <p>Las claves técnicas ya NO se ven en pantalla: los diccionarios las cubren, así que buscar
 * `actions.save` no encuentra nada. Se consulta por el TEXTO, resuelto con la misma cadena de respaldo
 * que el servicio —idioma activo, inglés, y si no, la clave—, de modo que la prueba sigue delatando el
 * día que alguien escriba en la plantilla una clave que no existe.
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

describe('DialogoRecargo', () => {
  async function pinta(peticiones: PeticionDeRecargo[]) {
    return render(DialogoRecargo, {
      inputs: { seleccion: ['p1', 'p2'], categoriaId: 'c1', nombreDeCategoria: 'Ropa' },
      on: { confirma: (p: PeticionDeRecargo) => peticiones.push(p) },
    });
  }

  it('no deja guardar sin importe', async () => {
    await pinta([]);
    expect(screen.getByRole('button', { name: t('actions.save') })).toBeDisabled();
  });

  /** Por omisión se aplica a TODO el catálogo, que es la decisión que hay que tomar a conciencia. */
  it('por omisión el ámbito es el catálogo entero', async () => {
    const peticiones: PeticionDeRecargo[] = [];
    await pinta(peticiones);

    await userEvent.type(screen.getByLabelText(t('admin.catalog.fields.surchargeCny')), '3');
    await userEvent.click(screen.getByRole('button', { name: t('actions.save') }));

    expect(peticiones[0]).toEqual({
      recargoCny: 3,
      productoIds: undefined,
      categoriaId: undefined,
    });
  });

  it('con el ámbito en lo seleccionado, viajan los identificadores marcados', async () => {
    const peticiones: PeticionDeRecargo[] = [];
    await pinta(peticiones);

    await userEvent.type(screen.getByLabelText(t('admin.catalog.fields.surchargeCny')), '3');
    await userEvent.click(screen.getByText(rx('admin.catalog.surcharge.scope_selected')));
    await userEvent.click(screen.getByRole('button', { name: t('actions.save') }));

    expect(peticiones[0].productoIds).toEqual(['p1', 'p2']);
  });
});

describe('DialogoSubvencion', () => {
  async function pinta(peticiones: PeticionDeSubvencion[]) {
    return render(DialogoSubvencion, {
      inputs: { seleccion: ['p1'], categoriaId: null, nombreDeCategoria: null },
      on: { confirma: (p: PeticionDeSubvencion) => peticiones.push(p) },
    });
  }

  it('no deja guardar si no se fija ninguna de las dos bolsas', async () => {
    await pinta([]);
    expect(screen.getByRole('button', { name: t('actions.save') })).toBeDisabled();
  });

  /** Las bolsas son estancas: la que se deja vacía no se manda y se queda como estaba. */
  it('la bolsa que se deja vacía no viaja', async () => {
    const peticiones: PeticionDeSubvencion[] = [];
    await pinta(peticiones);

    await userEvent.type(screen.getByLabelText(t('admin.catalog.fields.shippingUserCny')), '2');
    await userEvent.click(screen.getByRole('button', { name: t('actions.save') }));

    expect(peticiones[0]).toMatchObject({ envioCny: 2, arancelCny: undefined });
  });

  /** Sin categoría en el filtro no hay a qué aplicarlo. */
  it('sin categoría en el filtro, ese ámbito queda apagado', async () => {
    await pinta([]);
    expect(screen.getByText(t('admin.catalog.subsidy.scope_category_disabled'))).toBeInTheDocument();
  });
});

describe('Paginacion', () => {
  it('con una sola página no se pinta nada', async () => {
    await render(Paginacion, { inputs: { pagina: 0, paginas: 1 } });
    expect(screen.queryByRole('navigation')).toBeNull();
  });

  /**
   * Se cambia de página con `rerender` y no montando otra vez: `render` vuelve a configurar el banco de
   * pruebas, y dos montajes dentro de la MISMA prueba fallan con «el módulo ya está instanciado».
   * Destruir el primero no basta, porque lo que hay que rehacer es el módulo, no el componente.
   */
  it('en la primera página no se puede ir atrás, y en la última no se puede avanzar', async () => {
    const { rerender } = await render(Paginacion, { inputs: { pagina: 0, paginas: 3 } });
    expect(screen.getByLabelText(t('pagination.previous'))).toBeDisabled();
    expect(screen.getByLabelText(t('pagination.next'))).toBeEnabled();

    await rerender({ inputs: { pagina: 2, paginas: 3 } });

    expect(screen.getByLabelText(t('pagination.next'))).toBeDisabled();
    expect(screen.getByLabelText(t('pagination.previous'))).toBeEnabled();
  });

  it('avanzar publica la página siguiente', async () => {
    const vista = await render(Paginacion, { inputs: { pagina: 0, paginas: 3 } });

    await userEvent.click(screen.getByLabelText(t('pagination.next')));

    // `pagina` es un `model`: lo que cambia se lee del propio signal, no de una salida aparte.
    expect(vista.fixture.componentInstance.pagina()).toBe(1);
  });
});
