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
});

describe('Telefono', () => {
  it('publica el valor en E.164, que es lo único que acepta el transportista', async () => {
    const usuario = userEvent.setup({ delay: null });
    const { fixture } = await render(Telefono);

    await usuario.type(screen.getByRole('textbox', { name: 'Teléfono' }), '600123456');

    expect(fixture.componentInstance.valor()).toBe('+34600123456');
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
