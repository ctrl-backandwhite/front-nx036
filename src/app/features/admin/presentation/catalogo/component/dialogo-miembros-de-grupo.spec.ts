import { render, screen } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { AvisosStore } from '@ds/component/avisos/avisos.store';
import { AppError, creaError } from '@shared/error/app-error';
import { Result, exito, fallo } from '@shared/result/result';
import { GrupoDeProductos, MiembroDeGrupo } from '../../../domain/catalogo/model/grupo-de-productos';
import {
  BuscaProductosParaGrupo,
  CambiaMiembrosDelGrupo,
  ListaMiembrosDelGrupo,
} from '../../../application/catalogo/use-case/administra-grupos-de-productos.use-case';
import { DialogoMiembrosDeGrupo } from './dialogo-miembros-de-grupo';

/**
 * Qué productos pertenecen a un grupo.
 *
 * <p>De la pertenencia a un grupo depende con qué MARGEN se vende cada producto —los grupos son el
 * ámbito `PRODUCT_GROUP` de las reglas de precio—, así que meter uno de más no es un detalle de
 * organización: cambia lo que se cobra.
 *
 * <p>Lo que se fija aquí es la regla del buscador: los candidatos son los encontrados que TODAVÍA NO
 * son miembros. Ofrecer uno que ya está dentro invita a añadirlo dos veces, y quien administra no tiene
 * forma de saber si funcionó.
 */
const GRUPO: GrupoDeProductos = {
  id: 'g1',
  nombre: 'Textil ligero',
  activo: true,
  numeroDeMiembros: 1,
};

function miembro(parcial: Partial<MiembroDeGrupo> = {}): MiembroDeGrupo {
  return { id: 'p1', titulo: 'Gorro de lana', ...parcial } as MiembroDeGrupo;
}

interface Opciones {
  miembros?: readonly MiembroDeGrupo[];
  encontrados?: readonly MiembroDeGrupo[];
  cambiar?: 'falla';
}

async function monta(opciones: Opciones = {}) {
  const lista = vi.fn(
    async (_id: string): Promise<Result<readonly MiembroDeGrupo[], AppError>> =>
      exito(opciones.miembros ?? [miembro()]),
  );
  const busca = vi.fn(
    async (_texto: string): Promise<Result<readonly MiembroDeGrupo[], AppError>> =>
      exito(opciones.encontrados ?? []),
  );
  const cambia = vi.fn(
    async (_grupo: string, _producto: string, _dentro: boolean): Promise<Result<void, AppError>> =>
      opciones.cambiar === 'falla'
        ? fallo(creaError('conflicto', 'Una regla de margen lo bloquea'))
        : exito(undefined),
  );
  const cerrado = vi.fn();

  const vista = await render(DialogoMiembrosDeGrupo, {
    inputs: { grupo: GRUPO },
    on: { cierra: cerrado },
    providers: [
      AvisosStore,
      { provide: ListaMiembrosDelGrupo, useValue: { ejecuta: lista } },
      { provide: BuscaProductosParaGrupo, useValue: { ejecuta: busca } },
      { provide: CambiaMiembrosDelGrupo, useValue: { ejecuta: cambia } },
    ],
  });
  await vista.fixture.whenStable();
  vista.fixture.detectChanges();

  /** El campo de búsqueda espera 280 ms antes de publicar lo tecleado. */
  const asienta = async () => {
    await new Promise((sigue) => setTimeout(sigue, 320));
    await vista.fixture.whenStable();
    vista.fixture.detectChanges();
    await vista.fixture.whenStable();
    vista.fixture.detectChanges();
  };

  return {
    vista,
    asienta,
    lista,
    busca,
    cambia,
    cerrado,
    avisos: vista.fixture.debugElement.injector.get(AvisosStore),
  };
}

describe('DialogoMiembrosDeGrupo', () => {
  beforeEach(() => {
    document.cookie = 'nx036-locale=es';
  });

  it('enseña los miembros del grupo con su recuento', async () => {
    const { lista } = await monta();

    expect(lista).toHaveBeenCalledWith('g1');
    expect(screen.getByText('Gorro de lana')).toBeInTheDocument();
    expect(screen.getByText(/Textil ligero/)).toBeInTheDocument();
  });

  it('un grupo vacío lo dice, en vez de dejar la lista muda', async () => {
    await monta({ miembros: [] });

    expect(screen.getByText('Aún no hay productos en este grupo.')).toBeInTheDocument();
  });

  it('sin texto no se busca nada', async () => {
    const { busca } = await monta();

    expect(busca).not.toHaveBeenCalled();
  });

  it('al escribir se buscan candidatos', async () => {
    const { busca, asienta } = await monta({ encontrados: [miembro({ id: 'p9', titulo: 'Bufanda' })] });

    await userEvent.type(screen.getByRole('searchbox'), 'bufanda');
    await asienta();

    expect(busca).toHaveBeenCalledWith('bufanda');
    expect(screen.getByRole('button', { name: /Bufanda/ })).toBeInTheDocument();
  });

  /** Ofrecer uno que ya está dentro invita a añadirlo dos veces sin forma de saber si funcionó. */
  it('los que YA son miembros no se ofrecen como candidatos', async () => {
    const { asienta } = await monta({
      miembros: [miembro({ id: 'p1', titulo: 'Gorro de lana' })],
      encontrados: [miembro({ id: 'p1', titulo: 'Gorro de lana' })],
    });

    await userEvent.type(screen.getByRole('searchbox'), 'gorro');
    await asienta();

    expect(screen.queryByRole('button', { name: /Gorro de lana/ })).toBeNull();
  });

  it('añadir un candidato lo mete en el grupo y recarga la lista', async () => {
    const { cambia, lista, asienta } = await monta({
      encontrados: [miembro({ id: 'p9', titulo: 'Bufanda' })],
    });
    await userEvent.type(screen.getByRole('searchbox'), 'bufanda');
    await asienta();
    lista.mockClear();

    await userEvent.click(screen.getByRole('button', { name: /Bufanda/ }));
    await asienta();

    expect(cambia).toHaveBeenCalledWith('g1', 'p9', true);
    /* Se recarga en vez de tocar la lista a mano: lo que se ve es lo que hay en el servidor. */
    expect(lista).toHaveBeenCalled();
  });

  it('quitar un miembro lo saca del grupo', async () => {
    const { cambia, asienta } = await monta();

    await userEvent.click(screen.getByRole('button', { name: 'Eliminar' }));
    await asienta();

    expect(cambia).toHaveBeenCalledWith('g1', 'p1', false);
  });

  /** El backend puede negarse: sin aviso, la fila no desaparece y parece que el botón no funciona. */
  it('si el servidor se niega, se enseña SU motivo', async () => {
    const { avisos, asienta } = await monta({ cambiar: 'falla' });

    await userEvent.click(screen.getByRole('button', { name: 'Eliminar' }));
    await asienta();

    expect(avisos.avisos().at(-1)).toMatchObject({
      tipo: 'error',
      mensaje: 'Una regla de margen lo bloquea',
    });
  });

  it('cerrar avisa a quien lo abrió, que es quien recarga la tabla de detrás', async () => {
    const { cerrado } = await monta();

    await userEvent.click(screen.getByRole('button', { name: 'Cancelar' }));

    expect(cerrado).toHaveBeenCalled();
  });
});
