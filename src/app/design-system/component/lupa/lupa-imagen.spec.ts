import { TestBed } from '@angular/core/testing';
import { render, screen } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { TraduccionService } from '@core/i18n/traduccion.service';
import { LupaImagen } from './lupa-imagen';

describe('LupaImagen', () => {
  it('abre la foto a pantalla completa al pulsar la miniatura', async () => {
    const usuario = userEvent.setup({ delay: null });
    await render(LupaImagen, {
      inputs: { src: 'https://cdn.nx036.test/gorro.webp', alt: 'Gorro de lana' },
    });

    await usuario.click(screen.getByRole('button', { name: 'Gorro de lana' }));

    // La grande y la miniatura comparten nombre: si hay dos, es que se ha abierto.
    expect(screen.getAllByRole('img', { name: 'Gorro de lana' }).length).toBeGreaterThan(1);
  });

  it('se cierra con el aspa', async () => {
    const usuario = userEvent.setup({ delay: null });
    await render(LupaImagen, {
      inputs: { src: 'https://cdn.nx036.test/gorro.webp', alt: 'Gorro de lana' },
    });
    await usuario.click(screen.getByRole('button', { name: 'Gorro de lana' }));

    // El rótulo se pide al servicio de traducción: la prueba corre en el idioma que decida el entorno.
    const cerrar = TestBed.inject(TraduccionService).t('common.close');
    await usuario.click(screen.getByRole('button', { name: cerrar }));

    expect(screen.getAllByRole('img', { name: 'Gorro de lana' })).toHaveLength(1);
  });

  /** Un botón que no hace nada es peor que ningún botón. */
  it('sin foto no abre nada', async () => {
    const usuario = userEvent.setup({ delay: null });
    await render(LupaImagen, { inputs: { src: null, alt: 'Gorro de lana' } });

    await usuario.click(screen.getByRole('button', { name: 'Gorro de lana' }));

    expect(screen.getAllByRole('img', { name: 'Gorro de lana' })).toHaveLength(1);
  });
});
