import { render, screen } from '@testing-library/angular';
import { AsistenciaFlotante } from './asistencia-flotante';

/**
 * El asistente y el chat flotan pegados al borde derecho, que es donde el checkout alinea el precio de
 * cada opción de envío: en un móvil tapaban sus últimas cifras.
 */
describe('AsistenciaFlotante', () => {
  it('en el pago se esconden en pantalla estrecha y vuelven desde md', async () => {
    await render(AsistenciaFlotante, { inputs: { enElPago: true } });

    const caja = screen.getByTestId('asistencia-flotante');
    expect(caja).toHaveClass('hidden');
    expect(caja).toHaveClass('md:contents');
  });

  it('fuera del pago no se esconden en ninguna anchura', async () => {
    await render(AsistenciaFlotante, { inputs: { enElPago: false } });

    const caja = screen.getByTestId('asistencia-flotante');
    expect(caja).not.toHaveClass('hidden');
    expect(caja).toHaveClass('contents');
  });
});
