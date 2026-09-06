import { ErrorHandler } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { render, screen } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { ManejadorErrores, proveeManejadorDeErrores } from './manejador-errores';
import { PantallaError } from './pantalla-error';
import { ContenidoNoDisponible } from './contenido-no-disponible';

/** `location.reload` no existe en el entorno de pruebas: se sustituye para poder comprobarlo. */
function espiaRecarga(): { recargas: number; deshaz: () => void } {
  const original = Object.getOwnPropertyDescriptor(window, 'location');
  const testigo = { recargas: 0 };
  Object.defineProperty(window, 'location', {
    configurable: true,
    value: { ...window.location, reload: () => testigo.recargas++ },
  });
  return {
    get recargas() {
      return testigo.recargas;
    },
    deshaz: () => {
      if (original) {
        Object.defineProperty(window, 'location', original);
      }
    },
  };
}

describe('ManejadorErrores', () => {
  it('guarda el mensaje y la pila, también en producción', () => {
    const consola = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const manejador = TestBed.inject(ManejadorErrores);

    manejador.handleError(new Error('la API no responde'));

    expect(manejador.fallo()?.mensaje).toBe('la API no responde');
    expect(manejador.fallo()?.pila).toContain('Error');
    consola.mockRestore();
  });

  it('acepta lo que se le lance aunque no sea un error', () => {
    const consola = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const manejador = TestBed.inject(ManejadorErrores);

    manejador.handleError('se rompió');

    expect(manejador.fallo()?.mensaje).toBe('se rompió');
    consola.mockRestore();
  });

  it('se registra en lugar del manejador de Angular', () => {
    TestBed.configureTestingModule({ providers: [proveeManejadorDeErrores()] });

    expect(TestBed.inject(ErrorHandler)).toBe(TestBed.inject(ManejadorErrores));
  });
});

describe('PantallaError', () => {
  it('mientras no hay fallo no se ve', async () => {
    await render(PantallaError);

    expect(screen.queryByRole('heading')).toBeNull();
  });

  /** Sin esto, un fallo al pintar deja la página EN BLANCO: ni marca, ni salida, ni pista. */
  it('con un fallo ofrece salida y los detalles técnicos', async () => {
    const consola = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const { fixture } = await render(PantallaError);
    TestBed.inject(ManejadorErrores).handleError(new Error('la API no responde'));
    fixture.detectChanges();

    expect(screen.getByRole('heading')).toBeInTheDocument();
    expect(screen.getByText(/la API no responde/)).toBeInTheDocument();
    expect(screen.getByRole('link')).toHaveAttribute('href', '/');
    consola.mockRestore();
  });

  it('al reintentar olvida el fallo antes de recargar', async () => {
    const consola = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const usuario = userEvent.setup({ delay: null });
    const espia = espiaRecarga();
    try {
      const { fixture } = await render(PantallaError);
      const manejador = TestBed.inject(ManejadorErrores);
      manejador.handleError(new Error('la API no responde'));
      fixture.detectChanges();

      await usuario.click(screen.getAllByRole('button')[0]);

      expect(manejador.fallo()).toBeNull();
      expect(espia.recargas).toBe(1);
    } finally {
      espia.deshaz();
      consola.mockRestore();
    }
  });
});

describe('ContenidoNoDisponible', () => {
  it('mantiene el marco del sitio y ofrece volver a intentarlo', async () => {
    const usuario = userEvent.setup({ delay: null });
    const espia = espiaRecarga();
    let reintentos = 0;
    try {
      await render(ContenidoNoDisponible, { on: { reintentado: () => reintentos++ } });

      await usuario.click(screen.getByRole('button'));

      expect(reintentos).toBe(1);
    } finally {
      espia.deshaz();
    }
  });
});
