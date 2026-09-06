import { Component } from '@angular/core';
import { provideRouter } from '@angular/router';
import { render, screen, waitFor } from '@testing-library/angular';
import { EnfocaAlAparecer } from './enfoca-al-aparecer.directive';
import { EsqueletoFilaTabla } from './esqueleto-fila-tabla.directive';
import { SombraAlDesplazar } from './sombra-al-desplazar.directive';
import { TransicionPagina } from './transicion-pagina.directive';

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

describe('EnfocaAlAparecer', () => {
  it('lleva el foco al campo que acaba de aparecer', async () => {
    await render('<input nxEnfocaAlAparecer aria-label="Buscar" />', {
      imports: [EnfocaAlAparecer],
    });

    await waitFor(() =>
      expect(document.activeElement).toBe(screen.getByRole('textbox', { name: 'Buscar' })),
    );
  });

  /** En un formulario con varios campos solo el PRIMERO se lleva el foco. */
  it('se puede desactivar por elemento', async () => {
    await render(
      `<input aria-label="Primero" [nxEnfocaAlAparecer]="false" />
       <input aria-label="Segundo" [nxEnfocaAlAparecer]="true" />`,
      { imports: [EnfocaAlAparecer] },
    );

    await waitFor(() =>
      expect(document.activeElement).toBe(screen.getByRole('textbox', { name: 'Segundo' })),
    );
  });
});

describe('EsqueletoFilaTabla', () => {
  it('rellena la fila con tantas celdas como columnas', async () => {
    const { container } = await render(
      '<table><tbody><tr [nxEsqueletoFilaTabla]="5"></tr></tbody></table>',
      { imports: [EsqueletoFilaTabla] },
    );

    await waitFor(() => expect(container.querySelectorAll('td')).toHaveLength(5));
    // Es decoración: quien escucha la página no debe oír cinco bloques grises.
    expect(container.querySelectorAll('td div[aria-hidden="true"]')).toHaveLength(5);
  });
});

describe('SombraAlDesplazar', () => {
  it('marca la barra en cuanto la página se mueve', async () => {
    const { container, fixture } = await render('<header nxSombraAlDesplazar></header>', {
      imports: [SombraAlDesplazar],
    });
    const barra = container.querySelector('header');
    expect(barra).toHaveAttribute('data-scrolled', 'false');

    Object.defineProperty(window, 'scrollY', { value: 40, configurable: true });
    window.dispatchEvent(new Event('scroll'));
    fixture.detectChanges();

    expect(barra).toHaveAttribute('data-scrolled', 'true');
    Object.defineProperty(window, 'scrollY', { value: 0, configurable: true });
  });
});

@Component({ selector: 'nx-vacia', template: '' })
class Vacia {}

describe('TransicionPagina', () => {
  /** Con movimiento reducido no se anima nada: para mucha gente esto no es un adorno sino un mareo. */
  it('no anima cuando el sistema pide movimiento reducido', async () => {
    const deshaz = fingeMovimiento(true);
    try {
      await render('<div nxTransicionPagina>Contenido</div>', {
        imports: [TransicionPagina],
        providers: [provideRouter([{ path: '**', component: Vacia }])],
      });
      expect(HTMLElement.prototype.animate).not.toHaveBeenCalled();
    } finally {
      deshaz();
    }
  });

  it('anima la entrada cuando no hay restricción de movimiento', async () => {
    const deshaz = fingeMovimiento(false);
    try {
      await render('<div nxTransicionPagina>Contenido</div>', {
        imports: [TransicionPagina],
        providers: [provideRouter([{ path: '**', component: Vacia }])],
      });
      expect(HTMLElement.prototype.animate).toHaveBeenCalled();
    } finally {
      deshaz();
    }
  });
});
