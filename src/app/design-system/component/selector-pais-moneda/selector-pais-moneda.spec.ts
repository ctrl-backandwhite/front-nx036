import { TestBed } from '@angular/core/testing';
import { render, screen } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { PreferenciasService } from '@core/preferences/preferencias';
import { Region } from '@shared/i18n/regions';
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
    const elegidas: Region[] = [];
    const { fixture } = await render(SelectorPaisMoneda, {
      on: { elegida: (r: Region) => elegidas.push(r) },
    });
    const preferencias = TestBed.inject(PreferenciasService);
    // Se parte de una región distinta a la que se va a elegir, para que el cambio se note de verdad.
    preferencias.cambiaIdioma('es');
    preferencias.cambiaMoneda('EUR');
    fixture.detectChanges();

    await usuario.click(screen.getAllByRole('button')[0]);
    await usuario.click(screen.getByRole('button', { name: /United Kingdom/ }));

    expect(preferencias.idioma()).toBe('en');
    expect(preferencias.moneda()).toBe('GBP');
    // Se anuncia siempre: quien lo monta es quien sabe si hay que volver a pedir los textos al backend.
    expect(elegidas).toHaveLength(1);
    expect(elegidas[0].countryCode).toBe('GB');
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
