import { TestBed } from '@angular/core/testing';
import { render, screen } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { exito, fallo } from '@shared/result/result';
import { creaError } from '@shared/error/app-error';
import { TraduccionService } from '@core/i18n/traduccion.service';
import { PAISES_DE_ENVIO_PORT } from '../../domain/port/paises-de-envio.port';
import { ALTA_EN_EL_BOLETIN_PORT } from '../../domain/port/alta-en-el-boletin.port';
import { BandaDePaises } from './banda-de-paises';
import { SeccionBoletin } from './seccion-boletin';

/**
 * Las dos secciones que cierran la portada. Faltaban ENTERAS en el porte —lo destapó la certificación,
 * midiendo el alto de la página contra el front anterior— y por eso se prueban por lo que se ve: que el
 * titular aparece, no que un signal cambie.
 */
describe('BandaDePaises', () => {
  beforeEach(() => {
    document.cookie = 'nx036-locale=es';
  });

  async function monta(lista: () => Promise<unknown>) {
    const vista = await render(BandaDePaises, {
      providers: [{ provide: PAISES_DE_ENVIO_PORT, useValue: { lista } }],
    });
    await vista.fixture.whenStable();
    return vista;
  }

  it('pinta la banda con los países que devuelve el puerto', async () => {
    await monta(async () =>
      exito([
        { codigo: 'ES', nombre: 'España' },
        { codigo: 'DE', nombre: 'Alemania' },
      ]),
    );
    const t = TestBed.inject(TraduccionService).t;

    expect(screen.getByText(t('home.shipping_banner.title'))).toBeInTheDocument();
    expect(screen.getAllByText('España')).toHaveLength(2);
  });

  it('sin cobertura la sección no existe, en vez de dejar un hueco al final', async () => {
    const vista = await monta(async () => exito([]));

    expect(vista.container.querySelector('section')).toBeNull();
  });

  /** Un adorno que falla no puede romper el cierre de la portada ni pintar un aviso de error. */
  it('si la consulta falla, la portada se cierra sin banda y sin ruido', async () => {
    const vista = await monta(async () => fallo(creaError('sin-conexion', 'no hay red')));

    expect(vista.container.querySelector('section')).toBeNull();
  });
});

describe('SeccionBoletin', () => {
  beforeEach(() => {
    document.cookie = 'nx036-locale=es';
  });

  async function monta(suscribe: (correo: string) => Promise<unknown>) {
    const vista = await render(SeccionBoletin, {
      providers: [{ provide: ALTA_EN_EL_BOLETIN_PORT, useValue: { suscribe } }],
    });
    return { vista, t: TestBed.inject(TraduccionService).t };
  }

  it('enseña el titular del boletín y su formulario', async () => {
    const { t } = await monta(async () => exito({ yaEstaba: false }));

    expect(screen.getByRole('heading', { name: t('newsletter.footer.title') })).toBeInTheDocument();
    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });

  it('manda el correo al puerto y da las gracias', async () => {
    const usuario = userEvent.setup({ delay: null });
    const recibidos: string[] = [];
    const { vista, t } = await monta(async (correo: string) => {
      recibidos.push(correo);
      return exito({ yaEstaba: false });
    });

    await usuario.type(screen.getByRole('textbox'), 'alguien@nx036.test');
    await usuario.click(screen.getByRole('button', { name: t('newsletter.footer.subscribe') }));
    await vista.fixture.whenStable();

    expect(recibidos).toEqual(['alguien@nx036.test']);
    expect(screen.getByText(t('newsletter.footer.done'))).toBeInTheDocument();
  });

  it('a quien ya estaba apuntado se lo dice', async () => {
    const usuario = userEvent.setup({ delay: null });
    const { vista, t } = await monta(async () => exito({ yaEstaba: true }));

    await usuario.type(screen.getByRole('textbox'), 'alguien@nx036.test');
    await usuario.click(screen.getByRole('button', { name: t('newsletter.footer.subscribe') }));
    await vista.fixture.whenStable();

    expect(screen.getByText(t('newsletter.footer.already'))).toBeInTheDocument();
  });

  /**
   * Se dan las gracias también cuando el servidor falla, y es DELIBERADO: quien acaba de dejar su
   * correo no puede arreglar una caída del backend, y contárselo convierte un gesto amable en una
   * pantalla rota. Se hereda del front anterior.
   */
  it('si el backend falla, igualmente se agradece en vez de enseñar un error', async () => {
    const usuario = userEvent.setup({ delay: null });
    const { vista, t } = await monta(async () => fallo(creaError('sin-conexion', 'no hay red')));

    await usuario.type(screen.getByRole('textbox'), 'alguien@nx036.test');
    await usuario.click(screen.getByRole('button', { name: t('newsletter.footer.subscribe') }));
    await vista.fixture.whenStable();

    expect(screen.getByText(t('newsletter.footer.done'))).toBeInTheDocument();
    expect(screen.queryByRole('textbox')).toBeNull();
  });
});
