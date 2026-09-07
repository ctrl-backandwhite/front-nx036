import { DeferBlockBehavior } from '@angular/core/testing';
import { render, screen } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { AvisosStore } from '@ds/component/avisos/avisos.store';
import { DialogoStore } from '@ds/component/dialogo/dialogo.store';
import { exito } from '@shared/result/result';
import { CategoriaAdmin } from '../../../domain/catalogo/model/categoria-admin';
import {
  ActivaCategoriasEnLote,
  AlternaCategoria,
  EliminaCategorias,
  GuardaCategoria,
  ListaCategorias,
  ListaTodasLasCategorias,
  ReindexaCategorias,
} from '../../../application/catalogo/use-case/administra-categorias.use-case';
import { ExportaCategorias } from '../../../application/catalogo/use-case/exporta-categorias.use-case';
import { ReindexaCatalogo } from '../../../application/catalogo/use-case/reindexa-catalogo.use-case';
import { AccionesDeCategorias } from './categorias-acciones';
import { CategoriasPage } from './categorias.page';

/**
 * Las categorías del catálogo.
 *
 * <p>El listado va PAGINADO EN SERVIDOR: son casi dos mil, y traerlas todas para pintar cincuenta filas
 * costaba varios segundos en cada visita. Eso convierte el criterio en el corazón de la pantalla, y es
 * lo que se certifica aquí: que buscar VUELVE A LA PRIMERA PÁGINA —si no, se busca desde la página seis
 * y parece que no hay resultados— y que el árbol completo, que es el caro, solo se pide cuando el
 * formulario lo necesita para elegir el padre.
 *
 * <p>Y lo otro: borrar PREGUNTA antes. Una categoría borrada no se recupera, y los productos pierden su
 * clasificación.
 */
const CATEGORIA: CategoriaAdmin = {
  id: 'c1',
  slug: 'moda-mujer',
  nombres: { es: 'Moda mujer', en: 'Women' },
  nombreZh: '女装',
  padreId: null,
  activa: true,
  posicion: 1,
  numeroDeProductos: 42,
};

interface Opciones {
  filas?: readonly CategoriaAdmin[];
  total?: number;
}

async function monta(opciones: Opciones = {}) {
  const filas = opciones.filas ?? [CATEGORIA];
  const lista = vi.fn(async (_criterio: unknown) =>
    exito({ categorias: filas, total: opciones.total ?? filas.length, paginas: 3 }),
  );
  const todas = vi.fn(async () => exito([CATEGORIA]));
  const guarda = vi.fn(async (_b: unknown, _id: string | null) => exito(undefined));
  const elimina = vi.fn(async (_ids: readonly string[]) => exito({ borradas: 1, fallos: [] }));
  const alterna = vi.fn(async (_id: string) => exito(undefined));
  const activa = vi.fn(async (_ids: readonly string[], _a: boolean) => exito(2));
  const reindexa = vi.fn(async () => exito(340));
  const exporta = vi.fn(async () => exito(87));

  const vista = await render(CategoriasPage, {
    deferBlockBehavior: DeferBlockBehavior.Playthrough,
    providers: [
      AccionesDeCategorias,
      AvisosStore,
      DialogoStore,
      { provide: ListaCategorias, useValue: { ejecuta: lista } },
      { provide: ListaTodasLasCategorias, useValue: { ejecuta: todas } },
      { provide: GuardaCategoria, useValue: { ejecuta: guarda } },
      { provide: EliminaCategorias, useValue: { ejecuta: elimina } },
      { provide: AlternaCategoria, useValue: { ejecuta: alterna } },
      { provide: ActivaCategoriasEnLote, useValue: { ejecuta: activa } },
      { provide: ReindexaCategorias, useValue: { ejecuta: reindexa } },
      { provide: ExportaCategorias, useValue: { ejecuta: exporta } },
      { provide: ReindexaCatalogo, useValue: { ejecuta: vi.fn(async () => exito(0)) } },
    ],
  });
  await vista.fixture.whenStable();
  vista.fixture.detectChanges();

  /**
   * Dos vueltas y una pausa. La pausa es por el campo de búsqueda, que espera 280 ms antes de publicar
   * lo tecleado: sin ella el criterio nuevo no ha salido todavía y la comprobación mira el anterior.
   */
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
    todas,
    guarda,
    elimina,
    alterna,
    activa,
    reindexa,
    exporta,
    dialogo: vista.fixture.debugElement.injector.get(DialogoStore),
  };
}

describe('CategoriasPage', () => {
  beforeEach(() => {
    document.cookie = 'nx036-locale=es';
  });

  it('pide la primera página con el tamaño por defecto', async () => {
    const { lista } = await monta();

    expect(lista).toHaveBeenCalledWith(
      expect.objectContaining({ pagina: 0, tamano: 50, texto: undefined }),
    );
    expect(screen.getByText('moda-mujer')).toBeInTheDocument();
  });

  /**
   * Buscar desde la página seis y quedarse en la seis enseña un listado vacío: los resultados de la
   * búsqueda casi nunca llegan a seis páginas, así que parece que no hay ninguno.
   */
  it('al buscar se vuelve a la primera página', async () => {
    const { lista, asienta } = await monta();
    lista.mockClear();

    await userEvent.type(screen.getByRole('searchbox'), 'moda');
    await asienta();

    const criterio = lista.mock.calls.at(-1)![0] as { pagina: number; texto?: string };
    expect(criterio.texto).toBe('moda');
    expect(criterio.pagina).toBe(0);
  });

  /** El árbol completo es lo caro: solo hace falta para elegir el padre en el formulario. */
  it('el árbol completo NO se pide hasta abrir el formulario', async () => {
    const { todas, asienta } = await monta();

    expect(todas).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole('button', { name: /Crear categoría/ }));
    await asienta();

    expect(todas).toHaveBeenCalled();
  });

  it('borrar PREGUNTA antes, y si se dice que no no se borra', async () => {
    const { elimina, dialogo, asienta } = await monta();

    await userEvent.click(screen.getAllByRole('button', { name: /Eliminar|Borrar/ })[0]);
    await asienta();

    expect(dialogo.actual()?.clase).toBe('confirm');
    expect(elimina).not.toHaveBeenCalled();

    dialogo.cierra(false);
    await asienta();
    expect(elimina).not.toHaveBeenCalled();
  });

  it('y borra cuando se confirma, recargando el listado', async () => {
    const { elimina, dialogo, lista, asienta } = await monta();
    lista.mockClear();

    await userEvent.click(screen.getAllByRole('button', { name: /Eliminar|Borrar/ })[0]);
    await asienta();
    dialogo.cierra(true);
    await asienta();

    expect(elimina).toHaveBeenCalledWith(['c1']);
    /* Recargar y no tocar la lista a mano: lo que se ve es lo que hay en el servidor. */
    expect(lista).toHaveBeenCalled();
  });

  describe('las acciones sobre lo marcado', () => {
    /** La pantalla por dentro: las acciones en lote no tienen botón mientras no haya nada marcado. */
    const pantalla = (vista: { componentInstance: unknown }) =>
      vista.componentInstance as unknown as Record<string, (...args: never[]) => Promise<void> | void>;

    it('activar en lote limpia la selección y recarga', async () => {
      const { vista, activa, lista, asienta } = await monta();
      pantalla(vista.fixture)['alterna']('c1' as never);
      await asienta();
      lista.mockClear();

      await pantalla(vista.fixture)['activaMarcadas'](true as never);
      await asienta();

      expect(activa).toHaveBeenCalledWith(['c1'], true);
      /* Dejar marcado lo que ya se ha cambiado invita a repetir la acción sobre lo mismo. */
      expect(lista).toHaveBeenCalled();
    });

    it('borrar lo marcado PREGUNTA con cuántas son', async () => {
      const { vista, elimina, dialogo, asienta } = await monta();
      pantalla(vista.fixture)['alterna']('c1' as never);
      await asienta();

      const enCurso = pantalla(vista.fixture)['borraMarcadas']();
      await asienta();

      expect(dialogo.actual()?.mensaje).toContain('1');
      dialogo.cierra(true);
      await enCurso;
      expect(elimina).toHaveBeenCalledWith(['c1']);
    });

    it('marcar todas y desmarcar todas trabaja sobre las filas visibles', async () => {
      const { vista, asienta } = await monta();

      pantalla(vista.fixture)['alternaTodas']();
      await asienta();
      expect((pantalla(vista.fixture)['marcadas'] as unknown as () => string[])()).toEqual(['c1']);

      pantalla(vista.fixture)['alternaTodas']();
      await asienta();
      expect((pantalla(vista.fixture)['marcadas'] as unknown as () => string[])()).toEqual([]);
    });
  });

  it('alternar la visibilidad de una categoría recarga el listado', async () => {
    const { vista, alterna, lista, asienta } = await monta();
    lista.mockClear();

    await (vista.fixture.componentInstance as unknown as Record<
      string,
      (c: unknown) => Promise<void>
    >)['alternaActiva'](CATEGORIA);
    await asienta();

    expect(alterna).toHaveBeenCalledWith('c1');
    expect(lista).toHaveBeenCalled();
  });

  it('reindexar dice cuántas y recarga', async () => {
    const { reindexa, asienta } = await monta();

    await userEvent.click(screen.getByRole('button', { name: /Reindexar/ }));
    await asienta();

    expect(reindexa).toHaveBeenCalled();
  });

  it('exportar pide el árbol entero y no rompe la pantalla', async () => {
    const { exporta, asienta } = await monta();

    await userEvent.click(screen.getByRole('button', { name: /Exportar/ }));
    await asienta();

    expect(exporta).toHaveBeenCalled();
  });
});
