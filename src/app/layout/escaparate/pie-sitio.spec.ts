import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { render, screen } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { TraduccionService } from '@core/i18n/traduccion.service';
import { PieSitio } from './pie-sitio';

describe('PieSitio', () => {
  /**
   * Los avisos legales tienen que ser alcanzables desde CUALQUIER página, también desde el teléfono,
   * donde el pie grande no se pinta. Por eso se repiten en la franja compacta.
   */
  it('los avisos legales están al alcance en las dos anchuras', async () => {
    const { container } = await render(PieSitio, { providers: [provideRouter([])] });

    const privacidad = Array.from(container.querySelectorAll('a[href="/legal/privacy"]'));
    expect(privacidad.length).toBe(2);
    // La copia del móvil se esconde en escritorio, y la del escritorio vive en el pie grande.
    expect(container.querySelector('nav.md\\:hidden a[href="/legal/privacy"]')).not.toBeNull();
  });

  /**
   * Retirar el consentimiento tiene que ser tan fácil como darlo: sin este enlace la decisión quedaba
   * congelada para siempre, y la propia política de cookies promete lo contrario.
   */
  it('siempre ofrece volver a abrir las preferencias de cookies', async () => {
    const usuario = userEvent.setup({ delay: null });
    let aperturas = 0;
    await render(PieSitio, {
      providers: [provideRouter([])],
      on: { abreCookies: () => aperturas++ },
    });
    const t = TestBed.inject(TraduccionService).t;

    await usuario.click(screen.getByRole('button', { name: t('footer.link.cookie_prefs') }));

    expect(aperturas).toBe(1);
  });

  it('el alta en el boletín se entrega a quien monta el pie, ya limpia', async () => {
    const usuario = userEvent.setup({ delay: null });
    const correos: string[] = [];
    await render(PieSitio, {
      providers: [provideRouter([])],
      on: { suscribeAlBoletin: (c: string) => correos.push(c) },
    });
    const t = TestBed.inject(TraduccionService).t;

    await usuario.type(screen.getByRole('textbox'), '  alguien@nx036.test  ');
    await usuario.click(screen.getByRole('button', { name: t('newsletter.footer.subscribe') }));

    expect(correos).toEqual(['alguien@nx036.test']);
  });

  /**
   * El campo pasó a Signal Forms justo por esto: antes solo lo miraba el `required` del navegador, así
   * que «pepe» salía hacia el backend y el rechazo llegaba de vuelta sin explicación.
   */
  it('un correo mal escrito no se manda y dice por qué', async () => {
    const usuario = userEvent.setup({ delay: null });
    const correos: string[] = [];
    await render(PieSitio, {
      providers: [provideRouter([])],
      on: { suscribeAlBoletin: (c: string) => correos.push(c) },
    });
    const t = TestBed.inject(TraduccionService).t;

    await usuario.type(screen.getByRole('textbox'), 'pepe');
    await usuario.click(screen.getByRole('button', { name: t('newsletter.footer.subscribe') }));

    expect(correos).toEqual([]);
    expect(await screen.findByRole('alert')).toHaveTextContent(t('dialog.field.email'));
  });

  /** Sin correo no se manda nada, y el aviso dice que falta en vez de dejar el botón mudo. */
  it('el correo en blanco se reclama con su mensaje', async () => {
    const usuario = userEvent.setup({ delay: null });
    const correos: string[] = [];
    await render(PieSitio, {
      providers: [provideRouter([])],
      on: { suscribeAlBoletin: (c: string) => correos.push(c) },
    });
    const t = TestBed.inject(TraduccionService).t;

    await usuario.click(screen.getByRole('button', { name: t('newsletter.footer.subscribe') }));

    expect(correos).toEqual([]);
    expect(await screen.findByRole('alert')).toHaveTextContent(t('dialog.field.required'));
  });

  it('una vez enviada, la confirmación sustituye al formulario', async () => {
    await render(PieSitio, {
      providers: [provideRouter([])],
      inputs: { boletinEnviado: true },
    });

    expect(screen.queryByRole('textbox')).toBeNull();
  });
});
