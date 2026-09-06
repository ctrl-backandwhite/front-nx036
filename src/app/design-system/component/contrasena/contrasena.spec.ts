import { render, screen } from '@testing-library/angular';
import { RequisitosContrasena } from './requisitos-contrasena';
import { comprobacionesContrasena, contrasenaValida } from '@shared/validation/politica-contrasena';

describe('Política de contraseñas', () => {
  it('exige las cinco reglas del backend', () => {
    const claves = comprobacionesContrasena('').map((c) => c.clave);
    expect(claves).toEqual(['length', 'upper', 'lower', 'digit', 'symbol']);
  });

  it('solo da por buena la que cumple todas', () => {
    expect(contrasenaValida('Abcdef1!')).toBe(true);
    // Le falta el símbolo: el backend la rechazaría, así que aquí tampoco vale.
    expect(contrasenaValida('Abcdef12')).toBe(false);
    expect(contrasenaValida('abc')).toBe(false);
  });
});

describe('RequisitosContrasena', () => {
  it('enumera los requisitos para poder verlos antes de fallar', async () => {
    await render(RequisitosContrasena, { inputs: { contrasena: '' } });

    expect(screen.getAllByRole('listitem')).toHaveLength(5);
  });

  it('marca en verde los que ya se cumplen', async () => {
    const { container } = await render(RequisitosContrasena, { inputs: { contrasena: 'Abcdef1!' } });

    expect(container.querySelectorAll('li.text-emerald-700')).toHaveLength(5);
    expect(container.querySelectorAll('li.text-ink-400')).toHaveLength(0);
  });
});
