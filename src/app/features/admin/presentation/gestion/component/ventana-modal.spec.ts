import { Component } from '@angular/core';
import { render, screen } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { VentanaModal } from './ventana-modal';

/**
 * Las pruebas que MONTAN un componente tardan más de lo que Vitest espera por defecto (5 s) cuando hay
 * varios equipos compilando a la vez: el arranque de Angular compite por la máquina. El plazo se sube
 * aquí para que un fallo signifique lo que tiene que significar —que la lógica está mal— y no que el
 * ordenador iba cargado.
 */
vi.setConfig({ testTimeout: 30_000 });

/**
 * El idioma se fija AQUÍ, y hacía falta.
 *
 * <p>El aspa de la ventana se rotula con `common.close`, que está traducida en los ocho diccionarios.
 * La comprobación busca «cerrar», o sea el texto ESPAÑOL, y este fichero no fijaba idioma ninguno: sin
 * cookie, el navegador de pruebas pide inglés y el aspa se llama «Close». Pasaba de casualidad, porque
 * otro fichero del mismo hilo había dejado la cookie puesta antes — y por eso en solitario fallaba y en
 * conjunto dependía del orden en que el corredor repartiera los ficheros.
 */
beforeEach(() => {
  document.cookie = 'nx036-locale=es; Path=/';
});


@Component({
  selector: 'nx-anfitriona',
  imports: [VentanaModal],
  template: `
    <nx-ventana-modal titulo="Editar el plan" (cierra)="cerrada = cerrada + 1">
      <label for="precio">Precio</label>
      <input id="precio" />
    </nx-ventana-modal>
  `,
})
class Anfitriona {
  cerrada = 0;
}

describe('VentanaModal', () => {
  it('se anuncia como diálogo con su título, para que el lector de pantalla sepa dónde está', async () => {
    await render(Anfitriona);

    expect(screen.getByRole('dialog', { name: 'Editar el plan' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Editar el plan' })).toBeInTheDocument();
  });

  it('pinta lo que se le mete dentro', async () => {
    await render(Anfitriona);

    expect(screen.getByLabelText('Precio')).toBeInTheDocument();
  });

  /** El fondo es un botón de verdad: se puede cerrar también con el teclado, no solo con el ratón. */
  it('el fondo es un botón accesible que cierra', async () => {
    const { fixture } = await render(Anfitriona);

    const cerrar = screen.getAllByRole('button', { name: /common.close|cerrar/i });
    await userEvent.click(cerrar[0]);

    expect(fixture.componentInstance.cerrada).toBe(1);
  });

  /**
   * La trampa clásica de este patrón: pulsar un campo de dentro NO puede cerrar la ventana. Aquí no
   * puede pasar porque el fondo es un elemento hermano, no un envoltorio.
   */
  it('pulsar dentro no la cierra', async () => {
    const { fixture } = await render(Anfitriona);

    await userEvent.click(screen.getByLabelText('Precio'));

    expect(fixture.componentInstance.cerrada).toBe(0);
  });

  it('Escape la cierra', async () => {
    const { fixture } = await render(Anfitriona);

    await userEvent.keyboard('{Escape}');

    expect(fixture.componentInstance.cerrada).toBe(1);
  });
});
