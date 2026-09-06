import { TestBed } from '@angular/core/testing';
import { render, screen } from '@testing-library/angular';
import { beforeEach, describe, expect, it } from 'vitest';
import { TraduccionService } from '@core/i18n/traduccion.service';
import { CintaDePaises } from './cinta-de-paises';

describe('CintaDePaises', () => {
  beforeEach(() => {
    document.cookie = 'nx036-locale=es';
  });

  it('sin países no pinta nada, en vez de un hueco vacío', async () => {
    const vista = await render(CintaDePaises, { inputs: { paises: [] } });

    expect(vista.container.querySelector('section')).toBeNull();
  });

  it('enseña el titular y cuántos países hay', async () => {
    await render(CintaDePaises, {
      inputs: {
        paises: [
          { codigo: 'ES', nombre: 'España' },
          { codigo: 'FR', nombre: 'Francia' },
        ],
      },
    });
    const t = TestBed.inject(TraduccionService).t;

    expect(screen.getByText(t('home.shipping_banner.title'))).toBeInTheDocument();
    expect(screen.getByText(t('home.shipping_banner.subtitle'))).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  /** La lista va DUPLICADA a propósito: es lo que hace que el bucle se cierre sin salto. */
  it('duplica la lista y le pone bandera a cada país', async () => {
    await render(CintaDePaises, { inputs: { paises: [{ codigo: 'ES', nombre: 'España' }] } });

    expect(screen.getAllByText('España')).toHaveLength(2);
    expect(screen.getAllByText('🇪🇸')).toHaveLength(2);
  });

  it('un código con forma rara no rompe la bandera', async () => {
    await render(CintaDePaises, { inputs: { paises: [{ codigo: 'XXX', nombre: 'Ninguno' }] } });

    expect(screen.getAllByText('🏳️')).toHaveLength(2);
  });

  /**
   * Sin la animación no hay cinta, y sin la pausa al pasar el ratón no se puede leer un país concreto.
   * Las dos son clases: la regla y su versión quieta para quien pide menos movimiento están en
   * styles.css, y si la clase deja de escribirse aquí, aquello se queda huérfano sin avisar.
   */
  it('la pista se anima y se para al pasar el ratón', async () => {
    const vista = await render(CintaDePaises, {
      inputs: { paises: [{ codigo: 'ES', nombre: 'España' }] },
    });

    const pista = vista.container.querySelector('.animate-\\[nx-marquee_90s_linear_infinite\\]');
    expect(pista).not.toBeNull();
    expect(pista?.className).toContain('group-hover:[animation-play-state:paused]');
  });
});
