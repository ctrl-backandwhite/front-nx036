import { provideRouter } from '@angular/router';
import { render, screen } from '@testing-library/angular';
import { BarraInferiorMovil } from './barra-inferior-movil';

describe('BarraInferiorMovil', () => {
  /** Cuatro destinos y no más: con cinco o seis cada uno queda tan estrecho que se falla el toque. */
  it('ofrece exactamente cuatro destinos', async () => {
    await render(BarraInferiorMovil, { providers: [provideRouter([])] });

    expect(screen.getAllByRole('link')).toHaveLength(4);
  });

  /** El catálogo es interno: sin sesión, el atajo lleva al acceso en vez de a una puerta cerrada. */
  it('sin sesión los destinos privados llevan al acceso', async () => {
    await render(BarraInferiorMovil, { providers: [provideRouter([])] });

    const destinos = screen.getAllByRole('link').map((a) => a.getAttribute('href'));
    expect(destinos).toEqual(['/', '/login', '/cart', '/login']);
  });

  it('con sesión llevan al catálogo y a la cuenta', async () => {
    await render(BarraInferiorMovil, {
      providers: [provideRouter([])],
      inputs: { autenticado: true },
    });

    const destinos = screen.getAllByRole('link').map((a) => a.getAttribute('href'));
    expect(destinos).toEqual(['/', '/catalog', '/cart', '/profile']);
  });

  it('enseña el contador de la cesta y lo acota a nueve y algo más', async () => {
    const { fixture } = await render(BarraInferiorMovil, {
      providers: [provideRouter([])],
      inputs: { lineasCesta: 3 },
    });
    expect(screen.getByText('3')).toBeInTheDocument();

    fixture.componentRef.setInput('lineasCesta', 42);
    fixture.detectChanges();
    expect(screen.getByText('9+')).toBeInTheDocument();
  });
});
