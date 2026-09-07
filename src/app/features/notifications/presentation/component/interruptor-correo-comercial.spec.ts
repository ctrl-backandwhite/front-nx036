import { render, screen } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { AvisosStore } from '@ds/component/avisos/avisos.store';
import { AppError, creaError } from '@shared/error/app-error';
import { Result, exito, fallo } from '@shared/result/result';
import { PREFERENCIAS_DE_CORREO_PORT } from '../../domain/port/boletin.port';
import { PreferenciasDeCorreo } from '../../application/use-case/preferencias-de-correo.use-case';
import { InterruptorCorreoComercial } from './interruptor-correo-comercial';

/**
 * El consentimiento para recibir correo comercial.
 *
 * <p>Dos decisiones que parecen detalles y no lo son:
 *
 * <ul>
 *   <li>El interruptor se lee EN POSITIVO —«sí, mándame novedades»— aunque el backend guarde lo
 *       contrario (`sinPublicidad`). Un control de consentimiento que se lee al revés se marca al revés.
 *   <li>Mientras no se sepa el valor, NO se pinta. Enseñarlo apagado antes de saberlo es afirmar algo
 *       que no consta, y en un consentimiento eso importa.
 * </ul>
 */
async function monta(opciones: { sinPublicidad?: boolean | 'falla'; guardar?: 'falla' } = {}) {
  const puerto = {
    consulta: vi.fn(
      async (): Promise<Result<{ sinPublicidad: boolean }, AppError>> =>
        opciones.sinPublicidad === 'falla'
          ? fallo(creaError('sin-conexion'))
          : exito({ sinPublicidad: opciones.sinPublicidad ?? false }),
    ),
    actualiza: vi.fn(
      async (sinPublicidad: boolean): Promise<Result<{ sinPublicidad: boolean }, AppError>> =>
        opciones.guardar === 'falla'
          ? fallo(creaError('error-del-servidor', 'No se pudo guardar'))
          : exito({ sinPublicidad }),
    ),
  };

  const vista = await render(InterruptorCorreoComercial, {
    providers: [
      PreferenciasDeCorreo,
      AvisosStore,
      { provide: PREFERENCIAS_DE_CORREO_PORT, useValue: puerto },
    ],
  });
  await vista.fixture.whenStable();
  vista.fixture.detectChanges();

  return { vista, puerto, avisos: vista.fixture.debugElement.injector.get(AvisosStore) };
}

describe('InterruptorCorreoComercial', () => {
  beforeEach(() => {
    document.cookie = 'nx036-locale=es';
  });

  it('quien NO tiene marcado «sin publicidad» aparece como que sí quiere recibir', async () => {
    await monta({ sinPublicidad: false });

    expect(screen.getByRole('checkbox')).toBeChecked();
  });

  it('y quien lo tiene marcado aparece sin marcar', async () => {
    await monta({ sinPublicidad: true });

    expect(screen.getByRole('checkbox')).not.toBeChecked();
  });

  /** Enseñarlo apagado antes de saberlo es afirmar un consentimiento que no consta. */
  it('si no se puede saber, no se pinta el interruptor', async () => {
    await monta({ sinPublicidad: 'falla' });

    expect(screen.queryByRole('checkbox')).toBeNull();
  });

  it('al desmarcarlo se guarda «sin publicidad», que es como lo entiende el backend', async () => {
    const { puerto } = await monta({ sinPublicidad: false });

    await userEvent.click(screen.getByRole('checkbox'));

    expect(puerto.actualiza).toHaveBeenCalledWith(true);
  });

  /** Un interruptor que vuelve solo a su sitio sin explicar nada parece un fallo de la pantalla. */
  it('si el guardado falla, se dice', async () => {
    const { avisos } = await monta({ sinPublicidad: false, guardar: 'falla' });

    await userEvent.click(screen.getByRole('checkbox'));

    expect(avisos.avisos().at(-1)).toMatchObject({
      tipo: 'error',
      mensaje: 'No se pudo guardar',
    });
  });
});
