import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { render, screen, waitFor } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { TraduccionService } from '@core/i18n/traduccion.service';
import { DialogoStore } from '@ds/component/dialogo/dialogo.store';
import { creaError } from '@shared/error/app-error';
import { exito, fallo } from '@shared/result/result';
import { Plan } from '../../domain/model/plan';
import { FACTURAS_PORT, PLANES_PORT } from '../../domain/port/planes.port';
import { METODOS_DE_PAGO_PORT, PASARELA_DE_TARJETA_PORT } from '../../domain/port/cobros.port';
import { DESCARGA_PORT } from '../../domain/port/descarga.port';
import { CobrosStore } from '../../application/state/cobros.store';
import { PlanesStore } from '../../application/state/planes.store';
import { SelectorDePlan } from './selector-de-plan';
import { MiSuscripcion } from './mi-suscripcion';
import { APLICACION_DE_ACCOUNT } from '../../account.providers';

const GRATIS: Plan = {
  id: 'plan-free',
  codigo: 'FREE',
  nombre: 'Gratis',
  centimosMensuales: 0,
  centimosAnuales: 0,
  posicion: 1,
  limites: {},
};

const PRO: Plan = {
  id: 'plan-pro',
  codigo: 'PRO',
  nombre: 'Pro',
  centimosMensuales: 2900,
  centimosAnuales: 29000,
  precioMensualFormateado: '29,00 €',
  precioAnualFormateado: '290,00 €',
  posicion: 3,
  limites: {},
};

const EMPRESA: Plan = {
  ...PRO,
  id: 'plan-ent',
  codigo: 'ENTERPRISE',
  nombre: 'A medida',
  posicion: 4,
};

describe('SelectorDePlan', () => {
  const contrata = vi.fn();

  async function monta(
    opciones: { pruebaGastada?: boolean; suscripcion?: unknown; activo?: boolean } = {},
  ) {
    contrata.mockReset().mockResolvedValue(exito('active'));
    const vista = await render(SelectorDePlan, {
      providers: [
        ...APLICACION_DE_ACCOUNT,
        provideRouter([]),
        {
          provide: PLANES_PORT,
          // Contratar RELEE la suscripción: sin esto el doble devolvería «indefinido» y el caso de uso
          // se rompería donde en producción hay una respuesta.
          useValue: {
            lista: vi.fn().mockResolvedValue(exito([])),
            suscripcionActual: vi.fn().mockResolvedValue(exito(null)),
            contrata,
            cancela: vi.fn(),
          },
        },
        {
          provide: FACTURAS_PORT,
          useValue: { lista: vi.fn().mockResolvedValue(exito([])), descarga: vi.fn() },
        },
        {
          provide: METODOS_DE_PAGO_PORT,
          useValue: {
            configuracion: vi
              .fn()
              .mockResolvedValue(
                exito({ clavePublicable: 'pk_test', activo: true, pruebaGratisGastada: false }),
              ),
            lista: vi.fn().mockResolvedValue(exito([])),
            abreAltaDeTarjeta: vi.fn().mockResolvedValue(exito('seti_1')),
          },
        },
        // La ventana de alta de tarjeta monta el campo de la pasarela nada más abrirse: el doble tiene
        // que devolver un manejador o la ventana se rompería al aparecer.
        {
          provide: PASARELA_DE_TARJETA_PORT,
          useValue: {
            monta: vi
              .fn()
              .mockResolvedValue(
                exito({ confirmaAlta: vi.fn(), limpia: vi.fn(), destruye: vi.fn() }),
              ),
          },
        },
      ],
    });
    TestBed.inject(CobrosStore).fijaConfiguracion({
      clavePublicable: 'pk_test',
      activo: opciones.activo ?? true,
      pruebaGratisGastada: opciones.pruebaGastada ?? false,
    });
    const planes = TestBed.inject(PlanesStore);
    planes.fijaPlanes([GRATIS, PRO, EMPRESA]);
    planes.fijaSuscripcion((opciones.suscripcion as never) ?? null);
    vista.fixture.detectChanges();
    return vista;
  }

  it('sin pasarela activa no se pinta la contratación', async () => {
    const vista = await monta({ activo: false });

    expect(vista.container.textContent?.trim()).toBe('');
  });

  it('pinta el importe que da el backend, sin recalcularlo', async () => {
    await monta();

    expect(screen.getByText('29,00 €')).toBeInTheDocument();
  });

  it('al pasar a anual enseña el precio anual', async () => {
    const usuario = userEvent.setup({ delay: null });
    await monta();
    const t = TestBed.inject(TraduccionService).t;

    await usuario.click(screen.getByRole('button', { name: t('plans.period.yearly') }));

    expect(screen.getByText('290,00 €')).toBeInTheDocument();
  });

  it('el plan contratado se marca y no se puede volver a elegir', async () => {
    await monta({
      suscripcion: { idPlan: 'plan-pro', estado: 'ACTIVE', periodoDeFacturacion: 'MONTHLY' },
    });
    const t = TestBed.inject(TraduccionService).t;

    expect(screen.getByRole('button', { name: t('plans.current') })).toBeDisabled();
  });

  /** La prueba gratis es de un solo uso por cuenta: gastada, el plan gratis ya no se puede reactivar. */
  it('con la prueba gastada, el plan gratis queda bloqueado', async () => {
    await monta({ pruebaGastada: true });
    const t = TestBed.inject(TraduccionService).t;

    expect(screen.getByRole('button', { name: t('plans.trial_used') })).toBeDisabled();
  });

  it('el plan a medida lleva a hablar con alguien, no a contratar', async () => {
    await monta();
    const t = TestBed.inject(TraduccionService).t;

    expect(screen.getByRole('link', { name: t('plans.contact_sales') })).toHaveAttribute(
      'href',
      '/connect',
    );
  });

  it('contratar avisa de que salió bien', async () => {
    const usuario = userEvent.setup({ delay: null });
    await monta();
    const t = TestBed.inject(TraduccionService).t;

    await usuario.click(screen.getAllByRole('button', { name: t('plans.choose') })[0]);

    await waitFor(() => expect(contrata).toHaveBeenCalledWith('FREE', 'MENSUAL'));
    await waitFor(() =>
      expect(TestBed.inject(DialogoStore).actual()?.mensaje).toBe(t('plans.subscribed_ok')),
    );
  });

  /** Bajar de plan no cobra ahora: decir «contratado» haría creer que el plan grande se pierde hoy. */
  it('una bajada programada se cuenta como tal', async () => {
    const usuario = userEvent.setup({ delay: null });
    await monta();
    contrata.mockResolvedValue(exito('scheduled'));
    const t = TestBed.inject(TraduccionService).t;

    await usuario.click(screen.getAllByRole('button', { name: t('plans.choose') })[0]);

    await waitFor(() =>
      expect(TestBed.inject(DialogoStore).actual()?.mensaje).toBe(t('plans.downgrade_scheduled')),
    );
  });

  /**
   * SOLO cuando el backend pide tarjeta se ofrece añadirla: pasar al plan gratis no debe pedírsela a
   * nadie, y ofrecerla ahí ahuyenta justo a quien venía a probar.
   */
  it('el resto de fallos se enseñan tal cual, sin ofrecer tarjeta', async () => {
    const usuario = userEvent.setup({ delay: null });
    const vista = await monta();
    contrata.mockResolvedValue(fallo(creaError('peticion-invalida', 'Falta el país')));
    const t = TestBed.inject(TraduccionService).t;

    await usuario.click(screen.getAllByRole('button', { name: t('plans.choose') })[0]);

    await waitFor(() =>
      expect(TestBed.inject(DialogoStore).actual()?.mensaje).toBe('Falta el país'),
    );
    vista.fixture.detectChanges();
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('cuando el backend pide tarjeta, ofrece añadirla y abre la ventana al aceptar', async () => {
    const usuario = userEvent.setup({ delay: null });
    const vista = await monta();
    contrata.mockResolvedValue(
      fallo(creaError('peticion-invalida', 'Hace falta tarjeta', { codigo: 'PLAN_CARD_REQUIRED' })),
    );
    const t = TestBed.inject(TraduccionService).t;

    await usuario.click(screen.getAllByRole('button', { name: t('plans.choose') })[0]);
    await waitFor(() => expect(TestBed.inject(DialogoStore).actual()).not.toBeNull());

    TestBed.inject(DialogoStore).cierra(true);
    await waitFor(() => {
      vista.fixture.detectChanges();
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });
  });
});

describe('MiSuscripcion', () => {
  const cancela = vi.fn();
  const descarga = vi.fn();
  const entrega = vi.fn();

  async function monta(
    opciones: { suscripcion?: unknown; facturas?: unknown[]; planes?: Plan[] } = {},
  ) {
    cancela.mockReset().mockResolvedValue(exito(undefined));
    descarga.mockReset().mockResolvedValue(exito({ nombre: 'f.pdf', contenido: new Blob([]) }));
    entrega.mockReset();
    const listaFacturas = vi.fn().mockResolvedValue(exito(opciones.facturas ?? []));
    const vista = await render(MiSuscripcion, {
      providers: [
        ...APLICACION_DE_ACCOUNT,
        {
          provide: PLANES_PORT,
          useValue: {
            lista: vi.fn(),
            suscripcionActual: vi.fn().mockResolvedValue(exito(opciones.suscripcion ?? null)),
            contrata: vi.fn(),
            cancela,
          },
        },
        { provide: FACTURAS_PORT, useValue: { lista: listaFacturas, descarga } },
        { provide: DESCARGA_PORT, useValue: { entrega } },
      ],
    });
    await waitFor(() => expect(listaFacturas).toHaveBeenCalled());
    TestBed.inject(CobrosStore).fijaConfiguracion({
      clavePublicable: 'pk',
      activo: true,
      pruebaGratisGastada: false,
    });
    const planes = TestBed.inject(PlanesStore);
    planes.fijaPlanes(opciones.planes ?? [PRO, GRATIS]);
    planes.fijaSuscripcion((opciones.suscripcion as never) ?? null);
    vista.fixture.detectChanges();
    return vista;
  }

  it('sin suscripción ni facturas no se pinta nada', async () => {
    const vista = await monta();

    expect(vista.container.textContent?.trim()).toBe('');
  });

  it('con suscripción de pago dice cuándo se renueva', async () => {
    await monta({
      suscripcion: {
        idPlan: 'plan-pro',
        estado: 'ACTIVE',
        periodoDeFacturacion: 'MONTHLY',
        finDelPeriodo: '2026-10-01',
      },
    });
    const t = TestBed.inject(TraduccionService).t;

    expect(screen.getByText('Pro')).toBeInTheDocument();
    expect(screen.getByText(new RegExp(t('profile.subscription.renews_on')))).toBeInTheDocument();
  });

  /** La prueba no se renueva: vence. Decir «se renueva el…» sería una promesa que nadie va a cumplir. */
  it('la prueba se cuenta como prueba, no como plan mensual', async () => {
    await monta({
      suscripcion: {
        idPlan: 'plan-free',
        estado: 'ACTIVE',
        periodoDeFacturacion: 'MONTHLY',
        finDelPeriodo: '2026-10-01',
      },
    });
    const t = TestBed.inject(TraduccionService).t;

    expect(screen.getByText(new RegExp(t('profile.subscription.trial_badge')))).toBeInTheDocument();
    expect(screen.getByText(new RegExp(t('profile.subscription.no_renew')))).toBeInTheDocument();
  });

  it('una bajada programada se avisa con el plan y la fecha', async () => {
    await monta({
      suscripcion: {
        idPlan: 'plan-pro',
        estado: 'ACTIVE',
        periodoDeFacturacion: 'MONTHLY',
        planPendiente: 'FREE',
        planPendienteEl: '2026-10-01',
      },
    });
    const t = TestBed.inject(TraduccionService).t;

    expect(
      screen.getByText(new RegExp(t('profile.subscription.downgrade_pending').split('{')[0])),
    ).toBeInTheDocument();
  });

  it('cancelar pide confirmación antes de tocar nada', async () => {
    const usuario = userEvent.setup({ delay: null });
    await monta({
      suscripcion: { idPlan: 'plan-pro', estado: 'ACTIVE', periodoDeFacturacion: 'MONTHLY' },
    });
    const t = TestBed.inject(TraduccionService).t;

    await usuario.click(screen.getByRole('button', { name: t('plans.cancel') }));
    expect(cancela).not.toHaveBeenCalled();

    TestBed.inject(DialogoStore).cierra(true);
    await waitFor(() => expect(cancela).toHaveBeenCalled());
  });

  /**
   * El importe llega HECHO del backend. Recomponerlo con el total en crudo enseñaría las facturas en
   * yenes —divisa sin céntimos— cien veces más baratas de lo que se cobró.
   */
  it('pinta el importe formateado por el backend, no el total en crudo', async () => {
    await monta({
      facturas: [
        { numero: 'F-1', totalFormateado: '29,00 €', estado: 'paid', creadaEl: 1767225600 },
      ],
    });

    expect(screen.getByText('29,00 €')).toBeInTheDocument();
  });

  it('descargar la factura la entrega al navegador', async () => {
    const usuario = userEvent.setup({ delay: null });
    await monta({ facturas: [{ numero: 'F-1', totalFormateado: '29,00 €' }] });

    await usuario.click(screen.getByRole('button', { name: 'PDF' }));

    await waitFor(() => expect(entrega).toHaveBeenCalled());
  });

  it('si la factura no se puede bajar, se avisa', async () => {
    const usuario = userEvent.setup({ delay: null });
    await monta({ facturas: [{ numero: 'F-1', totalFormateado: '29,00 €' }] });
    descarga.mockResolvedValue(fallo(creaError('no-encontrado', 'No existe')));

    await usuario.click(screen.getByRole('button', { name: 'PDF' }));

    await waitFor(() => expect(TestBed.inject(DialogoStore).actual()?.mensaje).toBe('No existe'));
    expect(entrega).not.toHaveBeenCalled();
  });
});
