import { TestBed } from '@angular/core/testing';
import { render, screen } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { Avisos } from './avisos';
import { AvisosStore } from './avisos.store';

describe('AvisosStore', () => {
  it('se retira solo pasado su tiempo', () => {
    vi.useFakeTimers();
    try {
      const cola = TestBed.inject(AvisosStore);
      cola.exito('Producto añadido');
      expect(cola.avisos()).toHaveLength(1);

      vi.advanceTimersByTime(5000);
      expect(cola.avisos()).toHaveLength(0);
    } finally {
      vi.useRealTimers();
    }
  });

  it('apila varios sin pisarse', () => {
    const cola = TestBed.inject(AvisosStore);
    const primero = cola.exito('Uno');
    cola.error('Dos');

    expect(cola.avisos()).toHaveLength(2);
    cola.descarta(primero);
    expect(cola.avisos().map((a) => a.mensaje)).toEqual(['Dos']);
  });
});

describe('Avisos', () => {
  it('sin nada que decir no ocupa sitio', async () => {
    await render(Avisos);

    expect(screen.queryByRole('region')).toBeNull();
  });

  /** `aria-live="polite"` es lo que hace que se anuncie sin interrumpir lo que se estuviera leyendo. */
  it('anuncia el aviso sin robar la atención', async () => {
    const { fixture } = await render(Avisos);
    TestBed.inject(AvisosStore).exito('Producto añadido');
    fixture.detectChanges();

    const region = screen.getByRole('region');
    expect(region).toHaveAttribute('aria-live', 'polite');
    expect(screen.getByText('Producto añadido')).toBeInTheDocument();
  });

  it('la acción se ejecuta y cierra su propio aviso', async () => {
    const usuario = userEvent.setup({ delay: null });
    let deshecho = 0;
    const { fixture } = await render(Avisos);
    const cola = TestBed.inject(AvisosStore);
    cola.muestra({
      tipo: 'info',
      mensaje: 'Producto quitado',
      accion: { etiqueta: 'Deshacer', ejecuta: () => deshecho++ },
    });
    fixture.detectChanges();

    await usuario.click(screen.getByRole('button', { name: 'Deshacer' }));

    expect(deshecho).toBe(1);
    expect(cola.avisos()).toHaveLength(0);
  });
});
