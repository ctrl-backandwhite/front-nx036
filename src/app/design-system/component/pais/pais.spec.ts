import { render, screen } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { SelectorPais } from './selector-pais';
import { banderaDePais, nombreDePais } from './paises';

describe('Ayudas de país', () => {
  it('convierte el código de dos letras en su bandera', () => {
    expect(banderaDePais('ES')).toBe('🇪🇸');
    expect(banderaDePais('es')).toBe('🇪🇸');
  });

  it('sin código válido no inventa bandera', () => {
    expect(banderaDePais('')).toBe('');
    expect(banderaDePais('ESP')).toBe('');
    expect(banderaDePais(undefined)).toBe('');
  });

  it('devuelve el propio código cuando el país no está en el catálogo', () => {
    expect(nombreDePais('ES')).toContain('España');
    expect(nombreDePais('XX')).toBe('XX');
    expect(nombreDePais(undefined)).toBe('');
  });
});

describe('SelectorPais', () => {
  /** Sin rótulo es un desplegable anónimo: quien usa lector de pantalla no sabe de qué es. */
  it('se anuncia con su rótulo', async () => {
    await render(SelectorPais, { inputs: { etiqueta: 'País de envío' } });

    expect(screen.getByRole('combobox', { name: 'País de envío' })).toBeInTheDocument();
  });

  it('publica el código elegido', async () => {
    const usuario = userEvent.setup({ delay: null });
    const { fixture } = await render(SelectorPais);

    await usuario.selectOptions(screen.getByRole('combobox'), 'ES');

    expect(fixture.componentInstance.valor()).toBe('ES');
  });

  /** El país lo detecta la dirección de red y solo un administrador lo cambia. */
  it('en solo lectura enseña bandera y nombre sin desplegable', async () => {
    await render(SelectorPais, { inputs: { soloLectura: true, valor: 'ES' } });

    expect(screen.queryByRole('combobox')).toBeNull();
    expect(screen.getByText(/España/)).toBeInTheDocument();
  });
});
