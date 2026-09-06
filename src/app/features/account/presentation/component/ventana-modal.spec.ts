import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { render, screen } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { TraduccionService } from '@core/i18n/traduccion.service';
import { VentanaModal } from './ventana-modal';

@Component({
  selector: 'nx-anfitriona',
  imports: [VentanaModal],
  template: `
    <nx-ventana-modal titulo="Editar dirección" (cierra)="cerrada = cerrada + 1">
      <p>Contenido de la ventana</p>
    </nx-ventana-modal>
  `,
})
class Anfitriona {
  cerrada = 0;
}

describe('VentanaModal', () => {
  it('se anuncia como diálogo con su título y enseña lo que le metan dentro', async () => {
    await render(Anfitriona);

    expect(screen.getByRole('dialog', { name: 'Editar dirección' })).toBeInTheDocument();
    expect(screen.getByText('Contenido de la ventana')).toBeInTheDocument();
  });

  it('el botón de cerrar avisa a quien la abrió', async () => {
    const usuario = userEvent.setup({ delay: null });
    const vista = await render(Anfitriona);
    const t = TestBed.inject(TraduccionService).t;

    // Hay DOS salidas con el mismo nombre: el fondo y el botón del encabezado. Esta es la segunda.
    const cierres = screen.getAllByRole('button', { name: t('common.close') });
    await usuario.click(cierres[cierres.length - 1]);

    expect(vista.fixture.componentInstance.cerrada).toBe(1);
  });

  /**
   * El fondo es un BOTÓN de verdad y no un contenedor con un gesto encima: así también existe para
   * quien navega con el teclado.
   */
  it('el fondo cierra y es alcanzable con el teclado', async () => {
    const usuario = userEvent.setup({ delay: null });
    const vista = await render(Anfitriona);
    const t = TestBed.inject(TraduccionService).t;

    const cierres = screen.getAllByRole('button', { name: t('common.close') });
    expect(cierres.length).toBe(2);

    await usuario.click(cierres[0]);
    expect(vista.fixture.componentInstance.cerrada).toBe(1);
  });

  /**
   * Se mueve al final del documento porque dentro de un ancestro con «transform» un elemento fijo deja
   * de posicionarse respecto a la ventana y acaba tapado por el pie.
   */
  it('se saca del sitio donde se declaró y se retira al destruirla', async () => {
    const vista = await render(Anfitriona);

    expect(vista.container.querySelector('[role="dialog"]')).toBeNull();
    expect(document.body.querySelector('[role="dialog"]')).not.toBeNull();

    vista.fixture.destroy();
    expect(document.body.querySelector('[role="dialog"]')).toBeNull();
  });
});
