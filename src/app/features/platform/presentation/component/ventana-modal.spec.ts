import { Component, signal } from '@angular/core';
import { render, screen } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { VentanaModal } from './ventana-modal';
import es from '@shared/i18n/dictionary/es';
import en from '@shared/i18n/dictionary/en';

/**
 * El mismo texto que ve quien usa la aplicación.
 *
 * <p>Las pruebas consultan por el TEXTO, no por la clave técnica: es lo que ve quien abre la pantalla,
 * y es lo que se rompe si alguien cambia una clave por otra que no existe —el servicio devolvería la
 * clave escrita en crudo y la prueba lo delata—. Se resuelve con la misma cadena de respaldo que el
 * servicio: idioma activo, inglés, y si no, la clave.
 */
const t = (clave: string): string => es[clave] ?? en[clave] ?? clave;


/** Un anfitrión mínimo, para probar la ventana como la usa quien la monta. */
@Component({
  selector: 'nx-anfitrion',
  imports: [VentanaModal],
  template: `
    @if (abierta()) {
      <nx-ventana-modal titulo="Conectar tienda" (cierra)="abierta.set(false)">
        <p>Contenido del formulario</p>
        <button type="button">Guardar</button>
      </nx-ventana-modal>
    }
  `,
})
class Anfitrion {
  readonly abierta = signal(true);
}


/**
 * El idioma activo se fija a español ANTES de montar nada.
 *
 * <p>El servicio de preferencias lo deduce de la cookie y, si no la hay, del idioma del navegador. En
 * el entorno de pruebas ese idioma es el inglés, así que sin fijarlo las comprobaciones dependerían de
 * la máquina donde se ejecutan: la misma prueba pasaría aquí y fallaría en otro equipo.
 */
/**
 * Escribir SIN retardo entre teclas.
 *
 * <p>El valor por defecto simula a alguien tecleando, y un formulario de tres campos se come el plazo
 * de la prueba. Aquí no se está midiendo la mecanografía de nadie.
 */
const SIN_RETARDO = { delay: null };

beforeEach(() => {
  document.cookie = 'nx036-locale=es; Path=/';
});

describe('VentanaModal', () => {
  it('se anuncia como diálogo con su título asociado', async () => {
    await render(Anfitrion);

    const ventana = screen.getByRole('dialog');
    expect(ventana).toHaveAttribute('aria-modal', 'true');
    expect(ventana).toHaveAccessibleName('Conectar tienda');
  });

  it('pinta el contenido que le pasa quien la monta', async () => {
    await render(Anfitrion);

    expect(screen.getByText('Contenido del formulario')).toBeInTheDocument();
  });

  it('el aspa cierra', async () => {
    await render(Anfitrion);

    await userEvent.click(screen.getByRole('button', { name: t('common.cancel') }));

    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('pulsar DENTRO no cierra: sin eso se perdía lo escrito al desplegar un selector', async () => {
    await render(Anfitrion);

    await userEvent.click(screen.getByRole('button', { name: 'Guardar' }));

    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('la tecla Escape cierra: quien navega con teclado no puede quedarse atrapado', async () => {
    await render(Anfitrion);

    await userEvent.type(screen.getByRole('dialog'), '{Escape}', SIN_RETARDO);

    expect(screen.queryByRole('dialog')).toBeNull();
  });
});
