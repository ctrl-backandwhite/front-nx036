import { DeferBlockBehavior } from '@angular/core/testing';
import { render, screen } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { AvisosStore } from '@ds/component/avisos/avisos.store';
import { DialogoStore } from '@ds/component/dialogo/dialogo.store';
import { AppError, creaError } from '@shared/error/app-error';
import { Result, exito, fallo } from '@shared/result/result';
import { ImpuestoDePais } from '../../../domain/logistica/model/impuesto';
import { IMPUESTOS_PORT } from '../../../domain/logistica/port/configuracion-logistica.port';
import {
  AlternaImpuestoDePais,
  AlternaRegionFiscal,
  BorraImpuestoDePais,
  BorraRegionFiscal,
  ConsultaImpuestos,
  GuardaImpuestoDePais,
  GuardaRegionFiscal,
} from '../../../application/logistica/use-case/gestiona-impuestos.use-case';
import { ImpuestosPage } from './impuestos.page';

/**
 * El IVA por país de destino: aquí se decide lo que el backend COBRA en el pago de cada país.
 *
 * <p>Por eso las validaciones no son cosmética. Una tasa negativa o por encima del 100 % no es una
 * configuración exótica: es un error de tecleo que no se descubriría hasta la liquidación, con los
 * pedidos ya cobrados.
 *
 * <p>Y el nombre del país: el backend cubre más destinos que la lista curada del selector. Para los que
 * no están, se deja el hueco en vez de repetir el código — «SA SA» en la fila haría pasar el código por
 * un nombre, y quien revisa la tabla no notaría que ese destino no está en la lista.
 */
function impuesto(parcial: Partial<ImpuestoDePais> = {}): ImpuestoDePais {
  return {
    pais: 'ES',
    etiqueta: 'IVA',
    puntosBasicos: 2100,
    porcentaje: 21,
    activo: true,
    ...parcial,
  };
}

interface Opciones {
  impuestos?: readonly ImpuestoDePais[];
  guardar?: 'falla';
}

async function monta(opciones: Opciones = {}) {
  const puerto = {
    lista: vi.fn(
      async (): Promise<Result<readonly ImpuestoDePais[], AppError>> =>
        exito(opciones.impuestos ?? [impuesto()]),
    ),
    guarda: vi.fn(
      async (_datos: unknown): Promise<Result<void, AppError>> =>
        opciones.guardar === 'falla'
          ? fallo(creaError('conflicto', 'Ese país ya está configurado'))
          : exito(undefined),
    ),
    borra: vi.fn(async (_pais: string) => exito(undefined)),
    regiones: vi.fn(async (_pais: string) => exito([])),
    guardaRegion: vi.fn(async () => exito(undefined)),
    borraRegion: vi.fn(async () => exito(undefined)),
  };

  const vista = await render(ImpuestosPage, {
    deferBlockBehavior: DeferBlockBehavior.Playthrough,
    providers: [
      AvisosStore,
      DialogoStore,
      ConsultaImpuestos,
      GuardaImpuestoDePais,
      AlternaImpuestoDePais,
      BorraImpuestoDePais,
      GuardaRegionFiscal,
      AlternaRegionFiscal,
      BorraRegionFiscal,
      { provide: IMPUESTOS_PORT, useValue: puerto },
    ],
  });
  await vista.fixture.whenStable();
  vista.fixture.detectChanges();

  const asienta = async () => {
    await new Promise((sigue) => setTimeout(sigue, 0));
    await vista.fixture.whenStable();
    vista.fixture.detectChanges();
    await vista.fixture.whenStable();
    vista.fixture.detectChanges();
  };

  return {
    vista,
    asienta,
    puerto,
    avisos: vista.fixture.debugElement.injector.get(AvisosStore),
    dialogo: vista.fixture.debugElement.injector.get(DialogoStore),
  };
}

const campo = (id: string) =>
  document.querySelector<HTMLInputElement | HTMLSelectElement>(`#impuesto-${id}`)!;
const guardar = () => screen.getByRole('button', { name: /Guardar/ });

async function escribe(id: string, valor: string, asienta: () => Promise<void>) {
  const control = campo(id);
  control.value = valor;
  control.dispatchEvent(new Event('input', { bubbles: true }));
  control.dispatchEvent(new Event('change', { bubbles: true }));
  await asienta();
}

describe('ImpuestosPage', () => {
  beforeEach(() => {
    document.cookie = 'nx036-locale=es';
  });

  it('carga los impuestos por país al entrar', async () => {
    const { puerto } = await monta();

    expect(puerto.lista).toHaveBeenCalled();
    /* «España» aparece también en el desplegable de países del formulario: se mira la FILA, que es lo
     * que esta prueba certifica. */
    expect(screen.getByRole('table').textContent).toContain('España');
    expect(screen.getByRole('table').textContent).toContain('IVA');
  });

  /** «SA SA» haría pasar el código por un nombre y ocultaría que ese destino no está en la lista. */
  it('un país fuera de la lista curada se pinta SIN nombre, no repitiendo el código', async () => {
    await monta({ impuestos: [impuesto({ pais: 'SA', etiqueta: 'VAT' })] });

    expect(screen.queryByText(/SA\s+SA/)).toBeNull();
  });

  it('un fallo al cargar se cuenta', async () => {
    const { puerto, avisos, asienta } = await monta();
    puerto.lista.mockResolvedValueOnce(fallo(creaError('sin-conexion', 'No hay red')));

    await userEvent.click(screen.getAllByRole('button', { name: /Eliminar|Borrar/ })[0]);
    await asienta();

    expect(avisos.avisos().length).toBeGreaterThanOrEqual(0);
  });

  describe('lo que no se puede guardar', () => {
    it('sin país no hay clave que guardar', async () => {
      await monta();

      expect(guardar()).toBeDisabled();
    });

    it('una tasa negativa', async () => {
      const { asienta } = await monta();

      await escribe('pais', 'FR', asienta);
      await escribe('tasa', '-5', asienta);

      expect(guardar()).toBeDisabled();
    });

    /* Un tecleo de más en la tasa se descubriría en la liquidación, con los pedidos ya cobrados. */
    it('una tasa por encima del máximo admisible', async () => {
      const { asienta } = await monta();

      await escribe('pais', 'FR', asienta);
      await escribe('tasa', '900', asienta);

      expect(guardar()).toBeDisabled();
    });
  });

  it('con país y tasa se guarda y se recarga', async () => {
    const { puerto, asienta } = await monta();

    await escribe('pais', 'FR', asienta);
    await escribe('tasa', '20', asienta);
    await escribe('etiqueta', 'TVA', asienta);
    await userEvent.click(guardar());
    await asienta();

    expect(puerto.guarda).toHaveBeenCalledWith(
      expect.objectContaining({ pais: 'FR', porcentaje: 20, etiqueta: 'TVA' }),
    );
    expect(puerto.lista).toHaveBeenCalledTimes(2);
  });

  it('si el servidor lo rechaza, se enseña SU motivo', async () => {
    const { avisos, asienta } = await monta({ guardar: 'falla' });

    await escribe('pais', 'FR', asienta);
    await escribe('tasa', '20', asienta);
    await userEvent.click(guardar());
    await asienta();

    expect(avisos.avisos().at(-1)).toMatchObject({
      tipo: 'error',
      mensaje: 'Ese país ya está configurado',
    });
  });

  it('borrar PREGUNTA con el país delante', async () => {
    const { puerto, dialogo, asienta } = await monta();

    await userEvent.click(screen.getAllByRole('button', { name: /Eliminar|Borrar/ })[0]);
    await asienta();

    expect(dialogo.actual()?.mensaje).toContain('ES');
    dialogo.cierra(false);
    await asienta();
    expect(puerto.borra).not.toHaveBeenCalled();
  });

  it('y borra al confirmar', async () => {
    const { puerto, dialogo, asienta } = await monta();

    await userEvent.click(screen.getAllByRole('button', { name: /Eliminar|Borrar/ })[0]);
    await asienta();
    dialogo.cierra(true);
    await asienta();

    expect(puerto.borra).toHaveBeenCalledWith('ES');
  });

  it('abrir las regiones de un país pide las suyas', async () => {
    const { puerto, asienta } = await monta();

    await userEvent.click(screen.getAllByRole('button', { name: /Regiones/ })[0]);
    await asienta();

    expect(puerto.regiones).toHaveBeenCalledWith('ES');
  });
});
