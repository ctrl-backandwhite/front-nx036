import { TestBed } from '@angular/core/testing';
import { render, screen } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { TraduccionService } from '@core/i18n/traduccion.service';
import { AltaBoletin } from './alta-boletin';

describe('AltaBoletin', () => {
  beforeEach(() => {
    document.cookie = 'nx036-locale=es';
  });

  async function monta(inputs: Record<string, unknown> = {}) {
    const correos: string[] = [];
    const vista = await render(AltaBoletin, {
      inputs,
      on: { suscribe: (c: string) => correos.push(c) },
    });
    return { vista, correos, t: TestBed.inject(TraduccionService).t };
  }

  it('entrega el correo ya recortado a quien monta la pieza', async () => {
    const usuario = userEvent.setup({ delay: null });
    const { correos, t } = await monta();

    await usuario.type(screen.getByRole('textbox'), '  alguien@nx036.test  ');
    await usuario.click(screen.getByRole('button', { name: t('newsletter.footer.subscribe') }));

    expect(correos).toEqual(['alguien@nx036.test']);
  });

  /**
   * La razón de que esto sea Signal Forms y no un campo cableado a mano: antes solo lo miraba el
   * `required` del navegador, así que «pepe» salía hacia el backend y el rechazo volvía sin explicación.
   */
  it('un correo mal escrito no se manda y dice por qué', async () => {
    const usuario = userEvent.setup({ delay: null });
    const { correos, t } = await monta();

    await usuario.type(screen.getByRole('textbox'), 'pepe');
    await usuario.click(screen.getByRole('button', { name: t('newsletter.footer.subscribe') }));

    expect(correos).toEqual([]);
    expect(await screen.findByRole('alert')).toHaveTextContent(t('dialog.field.email'));
  });

  it('el correo en blanco se reclama con su mensaje', async () => {
    const usuario = userEvent.setup({ delay: null });
    const { correos, t } = await monta();

    await usuario.click(screen.getByRole('button', { name: t('newsletter.footer.subscribe') }));

    expect(correos).toEqual([]);
    expect(await screen.findByRole('alert')).toHaveTextContent(t('dialog.field.required'));
  });

  /** Un campo recién vaciado que se queda en rojo pidiendo lo que acabas de darle es un aviso falso. */
  it('tras un alta correcta el campo se vacía y no queda ningún aviso', async () => {
    const usuario = userEvent.setup({ delay: null });
    const { t } = await monta();

    await usuario.type(screen.getByRole('textbox'), 'alguien@nx036.test');
    await usuario.click(screen.getByRole('button', { name: t('newsletter.footer.subscribe') }));

    expect(screen.getByRole('textbox')).toHaveValue('');
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('una vez enviada, la confirmación sustituye al formulario', async () => {
    const { t } = await monta({ enviado: true });

    expect(screen.queryByRole('textbox')).toBeNull();
    expect(screen.getByText(t('newsletter.footer.done'))).toBeInTheDocument();
  });

  /** Si alguien ya estaba apuntado hay que decírselo, o parece que el alta no ha servido de nada. */
  it('a quien ya estaba apuntado se le dice, no se le dan las gracias', async () => {
    const { t } = await monta({ enviado: true, yaSuscrito: true });

    expect(screen.getByText(t('newsletter.footer.already'))).toBeInTheDocument();
    expect(screen.queryByText(t('newsletter.footer.done'))).toBeNull();
  });

  /**
   * La variante del pie no tiene sitio para el rótulo del botón, pero seguir anunciándolo es lo que
   * permite encontrarlo con lector de pantalla — y lo que hace que estas mismas pruebas sirvan.
   */
  it('en compacto el botón pierde el texto pero conserva su nombre accesible', async () => {
    const { vista, t } = await monta({ compacto: true });

    const boton = screen.getByRole('button', { name: t('newsletter.footer.subscribe') });
    expect(boton.textContent?.trim()).toBe('');
    expect(vista.container.querySelector('.join')).not.toBeNull();
  });
});
