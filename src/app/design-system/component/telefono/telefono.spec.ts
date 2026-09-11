import { render, screen } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { Telefono, partePrefijo } from './telefono';

describe('partePrefijo', () => {
  it('separa el prefijo del número nacional', () => {
    expect(partePrefijo('+34600123456')).toEqual({ codigo: 'ES', numero: '600123456' });
  });

  /** Varios países comparten el «+1»: se elige el prefijo más largo que encaje. */
  it('elige el prefijo más específico cuando varios encajan', () => {
    const { codigo, numero } = partePrefijo('+15551234567');
    expect(codigo).toBe('US');
    expect(numero).toBe('5551234567');
  });

  it('sin prefijo reconocible se queda con el país por defecto', () => {
    expect(partePrefijo('600123456')).toEqual({ codigo: 'ES', numero: '600123456' });
    expect(partePrefijo('')).toEqual({ codigo: 'ES', numero: '' });
  });

  /**
   * El país de reserva manda cuando no hay número.
   *
   * <p>Sin esto, a quien se daba de alta desde Bogotá el formulario le proponía «+34» delante de su
   * propio teléfono: un prefijo de otro continente, elegido porque era la única constante que había.
   */
  it('sin número parte del país que le pasen, no de España', () => {
    expect(partePrefijo('', 'CO')).toEqual({ codigo: 'CO', numero: '' });
    expect(partePrefijo('3001234567', 'CO')).toEqual({ codigo: 'CO', numero: '3001234567' });
  });

  /** Un número YA escrito manda sobre la reserva: dice su país mejor que cualquier detección. */
  it('el prefijo escrito gana al país de reserva', () => {
    expect(partePrefijo('+34600123456', 'CO')).toEqual({ codigo: 'ES', numero: '600123456' });
  });

  /**
   * Un país que no está en la tabla de prefijos no puede quedarse marcado: dejaría el desplegable sin
   * ninguna opción seleccionada y el navegador pintaría la primera de la lista, que no significa nada.
   */
  it('un país sin prefijo conocido cae en el de por defecto', () => {
    expect(partePrefijo('', 'ZZ')).toEqual({ codigo: 'ES', numero: '' });
    expect(partePrefijo('', '')).toEqual({ codigo: 'ES', numero: '' });
  });
});

describe('Telefono', () => {
  it('publica el valor en E.164, que es lo único que acepta el transportista', async () => {
    const usuario = userEvent.setup({ delay: null });
    const { fixture } = await render(Telefono);

    await usuario.type(screen.getByRole('textbox', { name: 'Teléfono' }), '600123456');

    expect(fixture.componentInstance.valor()).toBe('+34600123456');
  });

  it('el prefijo arranca en el país de la cuenta cuando no hay número', async () => {
    await render(Telefono, { inputs: { paisPorDefecto: 'CO' } });

    expect((screen.getByRole('combobox') as HTMLSelectElement).value).toBe('CO');
  });

  /** Un prefijo suelto no es un teléfono: publicarlo dejaría un valor imposible de llamar. */
  it('sin número no publica nada', async () => {
    const usuario = userEvent.setup({ delay: null });
    const { fixture } = await render(Telefono, { inputs: { valor: '+34600123456' } });

    await usuario.clear(screen.getByRole('textbox', { name: 'Teléfono' }));

    expect(fixture.componentInstance.valor()).toBe('');
  });

  it('los dos campos tienen nombre accesible propio', async () => {
    await render(Telefono, {
      inputs: { etiquetaPrefijo: 'Prefijo', etiquetaNumero: 'Teléfono' },
    });

    expect(screen.getByRole('combobox', { name: 'Prefijo' })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Teléfono' })).toBeInTheDocument();
  });
});
