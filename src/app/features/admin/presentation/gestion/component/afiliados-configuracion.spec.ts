import { render, screen } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { AvisosStore } from '@ds/component/avisos/avisos.store';
import { creaError } from '@shared/error/app-error';
import { exito, fallo } from '@shared/result/result';
import { ConfiguracionDeAfiliados } from '../../../domain/gestion/model/afiliados';
import { GuardaLaConfiguracionDeAfiliados } from '../../../application/gestion/use-case/afiliados.use-case';
import { AfiliadosConfiguracion } from './afiliados-configuracion';

/**
 * Las reglas del programa de afiliados: porcentaje, ventana de atribución, plazo de devolución y topes
 * de pago.
 *
 * <p>Es un formulario corto y con consecuencias largas: de estos seis números sale lo que se le paga a
 * cada afiliado. Por eso la validación no es cosmética —un porcentaje de 150 o un mínimo negativo no
 * pueden llegar al backend— y por eso la divisa se normaliza antes de guardar: «eur» y «EUR» son la
 * misma, pero el backend compara literal.
 */
const CONFIG: ConfiguracionDeAfiliados = {
  porcentajePorDefecto: 10,
  ventanaDeAtribucionDias: 30,
  periodoDeDevolucionDias: 14,
  minimoDePagoCentimos: 2000,
  divisa: 'EUR',
  maximoPorPeriodoCentimos: 500000,
};

async function monta(opciones: { guardar?: 'falla' } = {}) {
  const guarda = vi.fn(async (_datos: ConfiguracionDeAfiliados) =>
    opciones.guardar === 'falla'
      ? fallo(creaError('peticion-invalida', 'El porcentaje no vale'))
      : exito(undefined),
  );
  const guardada = vi.fn();
  const cerrada = vi.fn();

  const vista = await render(AfiliadosConfiguracion, {
    inputs: { config: CONFIG },
    on: { guardada, cierra: cerrada },
    providers: [
      AvisosStore,
      { provide: GuardaLaConfiguracionDeAfiliados, useValue: { ejecuta: guarda } },
    ],
  });
  await vista.fixture.whenStable();
  vista.fixture.detectChanges();

  return {
    vista,
    guarda,
    guardada,
    cerrada,
    avisos: vista.fixture.debugElement.injector.get(AvisosStore),
  };
}

const campo = (id: string) => document.querySelector<HTMLInputElement>(`#afiliados-cfg-${id}`)!;
const guardar = () => screen.getByRole('button', { name: 'Guardar' });

describe('AfiliadosConfiguracion', () => {
  beforeEach(() => {
    document.cookie = 'nx036-locale=es';
  });

  it('llega con los valores que ya están configurados', async () => {
    await monta();

    expect(campo('porcentaje').value).toBe('10');
    expect(campo('divisa').value).toBe('EUR');
    expect(campo('minimo').value).toBe('2000');
  });

  it('guarda los seis números tal cual están', async () => {
    const { guarda, guardada } = await monta();

    await userEvent.click(guardar());

    expect(guarda).toHaveBeenCalledWith(CONFIG);
    expect(guardada).toHaveBeenCalled();
  });

  /** «usd» y «USD» son la misma divisa, pero el backend compara literal. */
  it('la divisa se normaliza a mayúsculas antes de guardar', async () => {
    const { guarda } = await monta();

    await userEvent.clear(campo('divisa'));
    await userEvent.type(campo('divisa'), 'usd');
    await userEvent.click(guardar());

    expect(guarda.mock.calls[0]![0].divisa).toBe('USD');
  });

  describe('lo que no se puede guardar', () => {
    it('un porcentaje por encima de cien no sale de aquí', async () => {
      const { guarda } = await monta();

      await userEvent.clear(campo('porcentaje'));
      await userEvent.type(campo('porcentaje'), '150');
      await userEvent.click(guardar());

      /* Es la diferencia entre un formulario que corrige y uno que deja pasar: de este número sale lo
       * que se le paga a cada afiliado. */
      expect(guarda).not.toHaveBeenCalled();
    });

    it('un importe negativo tampoco', async () => {
      const { guarda } = await monta();

      await userEvent.clear(campo('minimo'));
      await userEvent.type(campo('minimo'), '-5');
      await userEvent.click(guardar());

      expect(guarda).not.toHaveBeenCalled();
    });

    it('un campo obligatorio en blanco tampoco', async () => {
      const { guarda } = await monta();

      await userEvent.clear(campo('ventana'));
      await userEvent.click(guardar());

      expect(guarda).not.toHaveBeenCalled();
    });

    /**
     * La divisa se valida por FORMA y no impidiendo teclear: con `maxLength` el campo se negaría a
     * recibir la cuarta letra, y un campo que no acepta lo que se escribe se lee como una avería.
     */
    it('una divisa con forma equivocada se rechaza al guardar, no al teclear', async () => {
      const { guarda } = await monta();

      await userEvent.clear(campo('divisa'));
      await userEvent.type(campo('divisa'), 'EURO');

      expect(campo('divisa').value, 'ha impedido teclear en vez de avisar').toBe('EURO');
      await userEvent.click(guardar());
      expect(guarda).not.toHaveBeenCalled();
    });
  });

  it('un rechazo del servidor se enseña con SU mensaje, y la ventana no se cierra', async () => {
    const { avisos, guardada } = await monta({ guardar: 'falla' });

    await userEvent.click(guardar());

    expect(avisos.avisos().at(-1)).toMatchObject({
      tipo: 'error',
      mensaje: 'El porcentaje no vale',
    });
    /* Cerrar tras un fallo perdería lo escrito y daría por hecho un guardado que no ocurrió. */
    expect(guardada).not.toHaveBeenCalled();
  });

  it('cancelar cierra sin guardar nada', async () => {
    const { cerrada, guarda } = await monta();

    await userEvent.click(screen.getByRole('button', { name: 'Cancelar' }));

    expect(cerrada).toHaveBeenCalled();
    expect(guarda).not.toHaveBeenCalled();
  });
});
