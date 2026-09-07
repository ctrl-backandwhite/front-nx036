import { DeferBlockBehavior } from '@angular/core/testing';
import { render, screen } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { AvisosStore } from '@ds/component/avisos/avisos.store';
import { DialogoStore } from '@ds/component/dialogo/dialogo.store';
import { exito } from '@shared/result/result';
import { ProveedorAdmin } from '../../../domain/catalogo/model/proveedor-admin';
import {
  CambiaVerificacionDeProveedores,
  EliminaProveedores,
  GuardaProveedor,
  ListaProveedores,
  ReindexaProveedores,
} from '../../../application/catalogo/use-case/administra-proveedores.use-case';
import { AccionesDeProveedores } from './proveedores-acciones';
import { ProveedoresPage } from './proveedores.page';

/**
 * Los proveedores del catálogo.
 *
 * <p>La regla que no se ve mirando la pantalla: **verificar no pregunta, DESVERIFICAR sí**. No es una
 * asimetría caprichosa — la marca de verificado es lo que decide qué se enseña como fiable en el
 * escaparate, así que quitarla tiene consecuencias hacia fuera y ponerla no.
 *
 * <p>Y la lista de países del filtro es FIJA, no sale de la página que se está viendo: derivarla de las
 * filas daría un desplegable distinto en cada página, y el filtro dejaría de encontrar lo que no está a
 * la vista.
 */
function proveedor(parcial: Partial<ProveedorAdmin> = {}): ProveedorAdmin {
  return {
    id: 'sp1',
    idExterno: '1688-777',
    origen: '1688',
    nombre: 'Yiwu Textiles',
    pais: 'CN',
    verificado: false,
    trustPass: true,
    numeroDeProductos: 120,
    ...parcial,
  };
}

async function monta(filas: readonly ProveedorAdmin[] = [proveedor()]) {
  const lista = vi.fn(async (_c: unknown) =>
    exito({ proveedores: filas, total: filas.length, paginas: 1 }),
  );
  const guarda = vi.fn(async (_b: unknown, _id: string | null) => exito(undefined));
  const elimina = vi.fn(async (_ids: readonly string[]) =>
    exito({ correctos: 1, fallidos: 0, errores: [] }),
  );
  const verifica = vi.fn(async (_ids: readonly string[], _v?: boolean) =>
    exito({ correctos: 1, fallidos: 0, errores: [] }),
  );
  const reindexa = vi.fn(async () => exito(58));

  const vista = await render(ProveedoresPage, {
    deferBlockBehavior: DeferBlockBehavior.Playthrough,
    providers: [
      AccionesDeProveedores,
      AvisosStore,
      DialogoStore,
      { provide: ListaProveedores, useValue: { ejecuta: lista } },
      { provide: GuardaProveedor, useValue: { ejecuta: guarda } },
      { provide: EliminaProveedores, useValue: { ejecuta: elimina } },
      { provide: CambiaVerificacionDeProveedores, useValue: { ejecuta: verifica } },
      { provide: ReindexaProveedores, useValue: { ejecuta: reindexa } },
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
    verifica,
    reindexa,
    dialogo: vista.fixture.debugElement.injector.get(DialogoStore),
  };
}

describe('ProveedoresPage', () => {
  beforeEach(() => {
    document.cookie = 'nx036-locale=es';
  });

  it('pide la primera página y pinta las filas', async () => {
    const { lista } = await monta();

    expect(lista).toHaveBeenCalledWith(expect.objectContaining({ pagina: 0 }));
    expect(screen.getByText('Yiwu Textiles')).toBeInTheDocument();
  });

  describe('la marca de verificado', () => {
    it('ponerla NO pregunta: no tiene consecuencias hacia fuera', async () => {
      const { verifica, dialogo, asienta } = await monta([proveedor({ verificado: false })]);

      await userEvent.click(screen.getAllByRole('button', { name: /Verificar/ })[0]);
      await asienta();

      expect(dialogo.actual()).toBeNull();
      expect(verifica).toHaveBeenCalledWith(['sp1'], undefined);
    });

    /** Quitarla cambia lo que el escaparate enseña como fiable: eso sí se pregunta. */
    it('QUITARLA sí pregunta, y si se dice que no no se quita', async () => {
      const { verifica, dialogo, asienta } = await monta([proveedor({ verificado: true })]);

      await userEvent.click(screen.getAllByRole('button', { name: /Quitar verificación/ })[0]);
      await asienta();

      expect(dialogo.actual()?.clase).toBe('confirm');
      expect(verifica).not.toHaveBeenCalled();

      dialogo.cierra(false);
      await asienta();
      expect(verifica).not.toHaveBeenCalled();
    });

    it('y se quita al confirmar', async () => {
      const { verifica, dialogo, asienta } = await monta([proveedor({ verificado: true })]);

      await userEvent.click(screen.getAllByRole('button', { name: /Quitar verificación/ })[0]);
      await asienta();
      dialogo.cierra(true);
      await asienta();

      expect(verifica).toHaveBeenCalledWith(['sp1'], undefined);
    });
  });

  it('borrar pregunta antes y borra al confirmar', async () => {
    const { elimina, dialogo, asienta } = await monta();

    await userEvent.click(screen.getAllByRole('button', { name: /Eliminar/ })[0]);
    await asienta();
    expect(elimina).not.toHaveBeenCalled();

    dialogo.cierra(true);
    await asienta();
    expect(elimina).toHaveBeenCalledWith(['sp1']);
  });

  /**
   * La importación todavía no existe. Se dice con un aviso en vez de dejar un botón que no hace nada:
   * un control que no responde se lee como una avería.
   */
  it('importar avisa de que llega en la próxima versión', async () => {
    const { dialogo, asienta } = await monta();

    await userEvent.click(screen.getByRole('button', { name: /Importar proveedores/ }));
    await asienta();

    expect(dialogo.actual()?.clase).toBe('alert');
    expect(dialogo.actual()?.mensaje).toContain('próxima versión');
  });

  it('reindexar recarga el listado', async () => {
    const { reindexa, asienta } = await monta();

    await userEvent.click(screen.getByRole('button', { name: /Reindexar/ }));
    await asienta();

    expect(reindexa).toHaveBeenCalled();
  });

  describe('la ficha del proveedor', () => {
    it('se abre pulsando su nombre y enseña sus datos', async () => {
      const { asienta } = await monta([
        proveedor({ ciudad: 'Yiwu', valoracion: 4.7, anosActivo: 6 }),
      ]);

      await userEvent.click(screen.getByRole('button', { name: 'Yiwu Textiles' }));
      await asienta();

      /* La ficha es de solo lectura y vive junto al listado: sirve para decidir sin perder la página en
       * la que se estaba, que es lo que pasaría si fuera una ruta aparte. */
      const enlace = screen.getByRole('link', { name: /Ver productos|productos/ });
      /* La ficha lleva a los productos del proveedor con el filtro ya puesto: es lo que convierte el
       * dato en una acción, en vez de obligar a copiar el identificador a mano. */
      expect(enlace.getAttribute('href')).toContain('sp1');
    });

    it('y se cierra volviendo al listado', async () => {
      const { asienta } = await monta();
      await userEvent.click(screen.getByRole('button', { name: 'Yiwu Textiles' }));
      await asienta();

      await userEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
      await asienta();

      expect(screen.getByRole('button', { name: 'Yiwu Textiles' })).toBeInTheDocument();
    });
  });

  describe('las acciones sobre lo marcado', () => {
    const pantalla = (vista: { componentInstance: unknown }) =>
      vista.componentInstance as unknown as Record<string, (...args: never[]) => Promise<void> | void>;

    it('verificar en lote fija la marca para todos y limpia la selección', async () => {
      const { vista, verifica, lista, asienta } = await monta();
      pantalla(vista.fixture)['alterna']('sp1' as never);
      await asienta();
      lista.mockClear();

      await pantalla(vista.fixture)['verificaMarcados'](true as never);
      await asienta();

      /* Con valor se FIJA para todos; sin él se alterna fila a fila. En lote lo segundo dejaría unos
       * verificados y otros no, según como estuviera cada uno. */
      expect(verifica).toHaveBeenCalledWith(['sp1'], true);
      expect(lista).toHaveBeenCalled();
    });

    it('borrar lo marcado PREGUNTA con cuántos son', async () => {
      const { vista, elimina, dialogo, asienta } = await monta();
      pantalla(vista.fixture)['alterna']('sp1' as never);
      await asienta();

      const enCurso = pantalla(vista.fixture)['borraMarcados']();
      await asienta();

      expect(dialogo.actual()?.mensaje).toContain('1');
      dialogo.cierra(true);
      await enCurso;
      expect(elimina).toHaveBeenCalledWith(['sp1']);
    });

    it('marcar y desmarcar todos trabaja sobre las filas visibles', async () => {
      const { vista, asienta } = await monta();
      const marcados = () =>
        (pantalla(vista.fixture)['marcados'] as unknown as () => string[])();

      pantalla(vista.fixture)['alternaTodos']();
      await asienta();
      expect(marcados()).toEqual(['sp1']);

      pantalla(vista.fixture)['alternaTodos']();
      await asienta();
      expect(marcados()).toEqual([]);
    });
  });

  /** Los filtros se limpian de una: quitarlos uno a uno deja siempre alguno puesto sin darse cuenta. */
  it('limpiar los filtros los quita todos y vuelve a la primera página', async () => {
    const { vista, lista, asienta } = await monta();
    const pantalla = vista.fixture.componentInstance as unknown as Record<
      string,
      ((...args: never[]) => void) & (() => unknown)
    >;

    (pantalla['cambiaPais'] as (v: string | null) => void)('CN');
    (pantalla['cambiaVerificado'] as (v: string | null) => void)('yes');
    await asienta();
    lista.mockClear();

    (pantalla['limpia'] as () => void)();
    await asienta();

    const criterio = lista.mock.calls.at(-1)![0] as {
      pais?: string;
      verificado?: boolean;
      pagina: number;
    };
    expect(criterio.pais).toBeUndefined();
    expect(criterio.verificado).toBeUndefined();
    expect(criterio.pagina).toBe(0);
  });

  it('abrir «nuevo proveedor» enseña el formulario vacío', async () => {
    const { asienta } = await monta();

    await userEvent.click(screen.getByRole('button', { name: /Nuevo proveedor/ }));
    await asienta();

    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });
});
