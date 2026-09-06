import { render, screen } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import {
  BORRADOR_DE_CATEGORIA_VACIO,
  BorradorDeCategoria,
} from '../../../domain/catalogo/model/categoria-admin';
import { BORRADOR_DE_PROVEEDOR_VACIO } from '../../../domain/catalogo/model/proveedor-admin';
import { PeticionDeRecargo, PeticionDeSubvencion } from '../../../domain/catalogo/port/productos-admin.port';
import { DialogoCategoria } from './dialogo-categoria';
import { DialogoProveedor } from './dialogo-proveedor';
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
    expect(
      screen.getByLabelText(t('admin.catalog.subsidy.scope_category_disabled')),
    ).toBeDisabled();
  });
});

describe('DialogoCategoria', () => {
  async function pinta(guardados: BorradorDeCategoria[] = []) {
    return render(DialogoCategoria, {
      inputs: { inicial: BORRADOR_DE_CATEGORIA_VACIO, editandoId: null, todas: [] },
      on: { guarda: (borrador: BorradorDeCategoria) => guardados.push(borrador) },
    });
  }

  /** El slug es parte de la dirección pública: se corrige al teclear, no se rechaza al guardar. */
  it('el slug se sanea mientras se escribe', async () => {
    await pinta();

    const slug = screen.getByLabelText(t('admin.categories.col.slug')) as HTMLInputElement;
    await userEvent.type(slug, 'Ropa Mujer');

    expect(slug.value).toBe('ropa-mujer');
  });

  /** El español y el inglés son los idiomas con los que se opera: sin ellos la categoría sale vacía. */
  it('no deja crear hasta que hay slug y nombre en español e inglés', async () => {
    await pinta();
    const crear = screen.getByRole('button', { name: t('admin.categories.create') });

    await userEvent.type(screen.getByLabelText(t('admin.categories.col.slug')), 'ropa');
    expect(crear).toBeDisabled();

    await userEvent.type(screen.getByLabelText(t('admin.categories.col.es')), 'Ropa');
    expect(crear).toBeDisabled();

    await userEvent.type(screen.getByLabelText(t('admin.categories.col.en')), 'Clothing');
    expect(crear).toBeEnabled();
  });

  /** Un guion delante no lo arregla el saneado, así que el aviso tiene que decir qué pasa. */
  it('un slug con formato inválido se avisa en el propio campo', async () => {
    await pinta();

    await userEvent.type(screen.getByLabelText(t('admin.categories.col.slug')), '-ropa');
    await userEvent.tab();

    expect(
      await screen.findByText(t('admin.categories.error.slug_format')),
    ).toBeInTheDocument();
  });
});

describe('DialogoProveedor', () => {
  async function pinta() {
    return render(DialogoProveedor, {
      inputs: { inicial: BORRADOR_DE_PROVEEDOR_VACIO, editando: false },
    });
  }

  it('sin nombre no se puede guardar', async () => {
    await pinta();
    expect(screen.getByRole('button', { name: t('admin.suppliers.save') })).toBeDisabled();
  });

  /** La valoración va de 0 a 5: antes el tope vivía en un atributo que solo limitaba las flechas. */
  it('una valoración por encima de cinco bloquea el guardado', async () => {
    await pinta();
    const guardar = screen.getByRole('button', { name: t('admin.suppliers.save') });

    await userEvent.type(screen.getByLabelText(rx('admin.suppliers.col.name')), 'Acme');
    expect(guardar).toBeEnabled();

    await userEvent.type(screen.getByLabelText(t('admin.suppliers.col.rating')), '9');
    expect(guardar).toBeDisabled();
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
