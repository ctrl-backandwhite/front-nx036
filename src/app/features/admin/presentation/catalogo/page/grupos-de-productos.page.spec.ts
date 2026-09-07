import { DeferBlockBehavior } from '@angular/core/testing';
import { render, screen, within } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { AvisosStore } from '@ds/component/avisos/avisos.store';
import { DialogoStore } from '@ds/component/dialogo/dialogo.store';
import { creaError } from '@shared/error/app-error';
import { exito, fallo } from '@shared/result/result';
import { GrupoDeProductos } from '../../../domain/catalogo/model/grupo-de-productos';
import {
  BuscaProductosParaGrupo,
  CambiaMiembrosDelGrupo,
  EliminaGrupoDeProductos,
  GuardaGrupoDeProductos,
  ListaGruposDeProductos,
  ListaMiembrosDelGrupo,
} from '../../../application/catalogo/use-case/administra-grupos-de-productos.use-case';
import { GruposDeProductosPage } from './grupos-de-productos.page';

/**
 * Los grupos de productos.
 *
 * <p>No son una etiqueta cualquiera: son el ámbito `PRODUCT_GROUP` de las reglas de MARGEN, así que de a
 * qué grupo pertenece un producto depende con qué margen se vende. De ahí las dos cosas que se fijan
 * aquí: que borrar PREGUNTA —el backend además se niega si una regla lo usa, y ese motivo tiene que
 * llegar a la pantalla— y que al cerrar la gestión de miembros la tabla se RECARGA, porque el recuento
 * de miembros acaba de cambiar y dejarlo viejo hace dudar de si el cambio se guardó.
 */
const GRUPO: GrupoDeProductos = {
  id: 'g1',
  nombre: 'Textil ligero',
  descripcion: 'Prendas por debajo de 300 g',
  activo: true,
  numeroDeMiembros: 24,
};

interface Opciones {
  grupos?: readonly GrupoDeProductos[];
  borrar?: 'falla';
  guardar?: 'falla';
}

async function monta(opciones: Opciones = {}) {
  const lista = vi.fn(async () => exito(opciones.grupos ?? [GRUPO]));
  const guarda = vi.fn(async (_b: unknown) =>
    opciones.guardar === 'falla'
      ? fallo(creaError('conflicto', 'Ya existe un grupo con ese nombre'))
      : exito(undefined),
  );
  const elimina = vi.fn(async (_id: string) =>
    opciones.borrar === 'falla'
      ? fallo(creaError('conflicto', 'Una regla de margen lo está usando'))
      : exito(undefined),
  );

  const vista = await render(GruposDeProductosPage, {
    deferBlockBehavior: DeferBlockBehavior.Playthrough,
    providers: [
      AvisosStore,
      DialogoStore,
      { provide: ListaGruposDeProductos, useValue: { ejecuta: lista } },
      { provide: GuardaGrupoDeProductos, useValue: { ejecuta: guarda } },
      { provide: EliminaGrupoDeProductos, useValue: { ejecuta: elimina } },
      { provide: ListaMiembrosDelGrupo, useValue: { ejecuta: async () => exito([]) } },
      { provide: BuscaProductosParaGrupo, useValue: { ejecuta: async () => exito([]) } },
      { provide: CambiaMiembrosDelGrupo, useValue: { ejecuta: async () => exito(undefined) } },
    ],
  });
  await vista.fixture.whenStable();
  vista.fixture.detectChanges();

  const asienta = async () => {
    await vista.fixture.whenStable();
    vista.fixture.detectChanges();
    await vista.fixture.whenStable();
    vista.fixture.detectChanges();
  };

  return {
    vista,
    asienta,
    lista,
    guarda,
    elimina,
    avisos: vista.fixture.debugElement.injector.get(AvisosStore),
    dialogo: vista.fixture.debugElement.injector.get(DialogoStore),
  };
}

describe('GruposDeProductosPage', () => {
  beforeEach(() => {
    document.cookie = 'nx036-locale=es';
  });

  it('enseña los grupos con su recuento de miembros', async () => {
    await monta();

    expect(screen.getByText('Textil ligero')).toBeInTheDocument();
    expect(screen.getByText('24')).toBeInTheDocument();
  });

  it('sin grupos lo dice, en vez de dejar la tabla muda', async () => {
    await monta({ grupos: [] });

    expect(screen.getByText('Aún no hay grupos.')).toBeInTheDocument();
  });

  it('borrar PREGUNTA antes, y si se dice que no no se borra', async () => {
    const { elimina, dialogo, asienta } = await monta();

    await userEvent.click(screen.getByRole('button', { name: 'Eliminar' }));
    await asienta();

    expect(dialogo.actual()?.clase).toBe('confirm');
    dialogo.cierra(false);
    await asienta();

    expect(elimina).not.toHaveBeenCalled();
  });

  /**
   * El backend se niega a borrar un grupo que una regla de margen siga usando. Ese motivo TIENE que
   * llegar a la pantalla: sin él, la fila simplemente no desaparece y parece que el botón no funciona.
   */
  it('si el servidor se niega, se enseña SU motivo', async () => {
    const { dialogo, avisos, asienta } = await monta({ borrar: 'falla' });

    await userEvent.click(screen.getByRole('button', { name: 'Eliminar' }));
    await asienta();
    dialogo.cierra(true);
    await asienta();

    expect(avisos.avisos().at(-1)).toMatchObject({
      tipo: 'error',
      mensaje: 'Una regla de margen lo está usando',
    });
  });

  it('crear abre el formulario vacío y al guardar recarga la tabla', async () => {
    const { guarda, lista, asienta } = await monta();
    lista.mockClear();

    await userEvent.click(screen.getByRole('button', { name: /Nuevo grupo/ }));
    await asienta();
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    await userEvent.type(screen.getByRole('textbox', { name: /nombre|Nombre/ }), 'Calzado');
    await userEvent.click(screen.getByRole('button', { name: 'Guardar' }));
    await asienta();

    expect(guarda).toHaveBeenCalled();
    expect(lista, 'la tabla se ha quedado sin el grupo nuevo').toHaveBeenCalled();
  });

  it('si el guardado falla, el formulario NO se cierra y se dice por qué', async () => {
    const { avisos, asienta } = await monta({ guardar: 'falla' });

    await userEvent.click(screen.getByRole('button', { name: /Nuevo grupo/ }));
    await asienta();
    await userEvent.type(screen.getByRole('textbox', { name: /nombre|Nombre/ }), 'Calzado');
    await userEvent.click(screen.getByRole('button', { name: 'Guardar' }));
    await asienta();

    /* Cerrar tras un fallo perdería lo escrito y daría por hecho un guardado que no ocurrió. */
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(avisos.avisos().at(-1)?.mensaje).toBe('Ya existe un grupo con ese nombre');
  });

  /** Al cerrar la gestión de miembros el recuento de la tabla ya no es el mismo. */
  it('al cerrar los miembros se recarga la tabla', async () => {
    const { lista, asienta } = await monta();

    await userEvent.click(screen.getByRole('button', { name: 'Gestionar miembros' }));
    await asienta();
    lista.mockClear();

    /* El diálogo de miembros se cierra por su propio botón, que convive con los de la tabla de detrás:
     * se busca DENTRO del diálogo para no pulsar el de otra fila. */
    const miembros = screen.getAllByRole('dialog').at(-1)!;
    await userEvent.click(within(miembros).getByRole('button', { name: 'Cancelar' }));
    await asienta();

    expect(lista).toHaveBeenCalled();
  });
});
