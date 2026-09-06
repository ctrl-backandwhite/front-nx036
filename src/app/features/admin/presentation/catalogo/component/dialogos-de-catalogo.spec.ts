import { render, screen } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { PeticionDeRecargo, PeticionDeSubvencion } from '../../../domain/catalogo/port/productos-admin.port';
import { DialogoRecargo } from './dialogo-recargo';
import { DialogoSubvencion } from './dialogo-subvencion';
import { Paginacion } from './paginacion';

describe('DialogoRecargo', () => {
  async function pinta(peticiones: PeticionDeRecargo[]) {
    return render(DialogoRecargo, {
      inputs: { seleccion: ['p1', 'p2'], categoriaId: 'c1', nombreDeCategoria: 'Ropa' },
      on: { confirma: (p: PeticionDeRecargo) => peticiones.push(p) },
    });
  }

  it('no deja guardar sin importe', async () => {
    await pinta([]);
    expect(screen.getByRole('button', { name: 'actions.save' })).toBeDisabled();
  });

  /** Por omisión se aplica a TODO el catálogo, que es la decisión que hay que tomar a conciencia. */
  it('por omisión el ámbito es el catálogo entero', async () => {
    const peticiones: PeticionDeRecargo[] = [];
    await pinta(peticiones);

    await userEvent.type(screen.getByLabelText('admin.catalog.fields.surchargeCny'), '3');
    await userEvent.click(screen.getByRole('button', { name: 'actions.save' }));

    expect(peticiones[0]).toEqual({
      recargoCny: 3,
      productoIds: undefined,
      categoriaId: undefined,
    });
  });

  it('con el ámbito en lo seleccionado, viajan los identificadores marcados', async () => {
    const peticiones: PeticionDeRecargo[] = [];
    await pinta(peticiones);

    await userEvent.type(screen.getByLabelText('admin.catalog.fields.surchargeCny'), '3');
    await userEvent.click(screen.getByText(/admin.catalog.surcharge.scope_selected/));
    await userEvent.click(screen.getByRole('button', { name: 'actions.save' }));

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
    expect(screen.getByRole('button', { name: 'actions.save' })).toBeDisabled();
  });

  /** Las bolsas son estancas: la que se deja vacía no se manda y se queda como estaba. */
  it('la bolsa que se deja vacía no viaja', async () => {
    const peticiones: PeticionDeSubvencion[] = [];
    await pinta(peticiones);

    await userEvent.type(screen.getByLabelText('admin.catalog.fields.shippingUserCny'), '2');
    await userEvent.click(screen.getByRole('button', { name: 'actions.save' }));

    expect(peticiones[0]).toMatchObject({ envioCny: 2, arancelCny: undefined });
  });

  /** Sin categoría en el filtro no hay a qué aplicarlo. */
  it('sin categoría en el filtro, ese ámbito queda apagado', async () => {
    await pinta([]);
    expect(screen.getByText('admin.catalog.subsidy.scope_category_disabled')).toBeInTheDocument();
  });
});

describe('Paginacion', () => {
  it('con una sola página no se pinta nada', async () => {
    await render(Paginacion, { inputs: { pagina: 0, paginas: 1 } });
    expect(screen.queryByRole('navigation')).toBeNull();
  });

  it('en la primera página no se puede ir atrás, y en la última no se puede avanzar', async () => {
    const primera = await render(Paginacion, { inputs: { pagina: 0, paginas: 3 } });
    expect(screen.getByLabelText('pagination.previous')).toBeDisabled();
    expect(screen.getByLabelText('pagination.next')).toBeEnabled();
    primera.fixture.destroy();

    await render(Paginacion, { inputs: { pagina: 2, paginas: 3 } });
    expect(screen.getByLabelText('pagination.next')).toBeDisabled();
  });

  it('avanzar publica la página siguiente', async () => {
    const vista = await render(Paginacion, { inputs: { pagina: 0, paginas: 3 } });

    await userEvent.click(screen.getByLabelText('pagination.next'));

    // `pagina` es un `model`: lo que cambia se lee del propio signal, no de una salida aparte.
    expect(vista.fixture.componentInstance.pagina()).toBe(1);
  });
});
