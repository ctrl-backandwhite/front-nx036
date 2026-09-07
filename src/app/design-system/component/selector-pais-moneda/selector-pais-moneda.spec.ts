import { TestBed } from '@angular/core/testing';
import { render, screen } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { PreferenciasService } from '@core/preferences/preferencias';
import { SelectorPaisMoneda } from './selector-pais-moneda';

/**
 * Estas pruebas montan el marco entero —con el selector de treinta regiones dentro— y con la
 * instrumentación de cobertura encima cinco segundos se quedan cortos. El plazo largo evita que
 * caduquen por lentitud y se confunda con un fallo.
 */
const ESPERA_LARGA = 20000;

describe('SelectorPaisMoneda', () => {
  it('no enseña la lista hasta que se abre', async () => {
    await render(SelectorPaisMoneda);

    expect(screen.queryByRole('listbox')).toBeNull();
  });

  /**
   * Estaban separados y era una fuente constante de incoherencias: la página en un idioma y los precios
   * en la moneda de otro, porque nadie cambia dos desplegables seguidos.
   */
  it('elegir una región fija a la vez el idioma y la moneda', async () => {
    const usuario = userEvent.setup({ delay: null });
    const { fixture } = await render(SelectorPaisMoneda);
    const preferencias = TestBed.inject(PreferenciasService);
    // Se parte de una región distinta a la que se va a elegir, para que el cambio se note de verdad.
    preferencias.cambiaIdioma('es');
    preferencias.cambiaMoneda('EUR');
    fixture.detectChanges();

    await usuario.click(screen.getAllByRole('button')[0]);
    await usuario.click(screen.getByRole('button', { name: /United Kingdom/ }));

    // El cambio se publica en las preferencias y NADA MÁS: no hay salida que el marco de página tenga
    // que acordarse de atar. Quien pinta precios declara que depende de `moneda()` y se vuelve a pedir
    // solo; era la salida sin atar lo que dejaba los importes en la divisa anterior hasta recargar.
    expect(preferencias.idioma()).toBe('en');
    expect(preferencias.moneda()).toBe('GBP');
  }, ESPERA_LARGA);

  it('el buscador acota la lista', async () => {
    const usuario = userEvent.setup({ delay: null });
    await render(SelectorPaisMoneda);

    await usuario.click(screen.getAllByRole('button')[0]);
    await usuario.type(screen.getByRole('textbox'), 'Brasil');

    expect(screen.getByRole('button', { name: /Brasil/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /France/ })).toBeNull();
  }, ESPERA_LARGA);
});
