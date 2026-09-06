import { Component, signal } from '@angular/core';
import { render, screen, waitFor } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { Revela } from './revela';
import { ContadorAnimado } from './contador-animado';
import { FundidoContenido } from './fundido-contenido';
import { ChipFiltro } from './chip-filtro';

/** Un observador de intersección de mentira: en jsdom no existe y nada asomaría nunca. */
function observadorQueSiempreVe(): void {
  vi.stubGlobal(
    'IntersectionObserver',
    class {
      constructor(private readonly avisa: (entradas: { isIntersecting: boolean }[]) => void) {}
      observe(): void {
        this.avisa([{ isIntersecting: true }]);
      }
      disconnect(): void {
        /* nada que soltar */
      }
    },
  );
}

/**
 * jsdom no trae `matchMedia` ni `Element.animate`: sin ellos no se puede distinguir «el sistema pide
 * movimiento reducido» de «el navegador no sabe» —y el componente, por prudencia, elige no animar—.
 */
function fingeMovimiento(reducido: boolean): () => void {
  const previoMedios = Object.getOwnPropertyDescriptor(window, 'matchMedia');
  const previaAnimacion = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'animate');
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    value: () => ({ matches: reducido }) as MediaQueryList,
  });
  Object.defineProperty(HTMLElement.prototype, 'animate', {
    configurable: true,
    writable: true,
    value: vi.fn(() => ({ finished: Promise.resolve() })),
  });
  return () => {
    if (previoMedios) {
      Object.defineProperty(window, 'matchMedia', previoMedios);
    } else {
      Reflect.deleteProperty(window, 'matchMedia');
    }
    if (previaAnimacion) {
      Object.defineProperty(HTMLElement.prototype, 'animate', previaAnimacion);
    } else {
      Reflect.deleteProperty(HTMLElement.prototype, 'animate');
    }
  };
}

describe('Revela', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('el contenido está siempre en la página: la animación no lo esconde de quien la lee', async () => {
    observadorQueSiempreVe();
    await render('<nx-revela>Gorro de lana</nx-revela>', { imports: [Revela] });

    expect(screen.getByText('Gorro de lana')).toBeInTheDocument();
  });

  it('se anima al asomar', async () => {
    observadorQueSiempreVe();
    const { container, fixture } = await render('<nx-revela>Gorro</nx-revela>', {
      imports: [Revela],
    });

    await waitFor(() => {
      fixture.detectChanges();
      expect(container.querySelector('nx-revela')).toHaveClass('animate-section-fade');
    });
  });
});

describe('ContadorAnimado', () => {
  /** Con movimiento reducido la cifra se pone directamente: para mucha gente esto marea. */
  it('con movimiento reducido enseña la cifra final sin contar', async () => {
    const deshaz = fingeMovimiento(true);
    try {
      await render(ContadorAnimado, { inputs: { valor: 1234 } });
      expect(screen.getByText('1234')).toBeInTheDocument();
    } finally {
      deshaz();
    }
  });

  it('respeta el formato que se le dé', async () => {
    const deshaz = fingeMovimiento(true);
    try {
      await render(ContadorAnimado, {
        inputs: { valor: 12, formato: (n: number) => `${Math.round(n)} €` },
      });
      expect(screen.getByText('12 €')).toBeInTheDocument();
    } finally {
      deshaz();
    }
  });
});

@Component({
  selector: 'nx-prueba-fundido',
  imports: [FundidoContenido],
  template: '<nx-fundido-contenido [muestra]="visible()">Contenido</nx-fundido-contenido>',
})
class PruebaFundido {
  readonly visible = signal(false);
}

describe('FundidoContenido', () => {
  it('no pinta nada hasta que hay algo que enseñar', async () => {
    const { fixture } = await render(PruebaFundido);

    expect(screen.queryByText('Contenido')).toBeNull();

    fixture.componentInstance.visible.set(true);
    fixture.detectChanges();
    expect(screen.getByText('Contenido')).toBeInTheDocument();
  });
});

describe('ChipFiltro', () => {
  it('avisa de que se quiere quitar el filtro', async () => {
    const usuario = userEvent.setup({ delay: null });
    let quitados = 0;
    await render('<nx-chip-filtro (quita)="alQuitar()">Gorros</nx-chip-filtro>', {
      imports: [ChipFiltro],
      componentProperties: { alQuitar: () => quitados++ },
    });

    await usuario.click(screen.getByRole('button'));

    expect(quitados).toBe(1);
  });
});
