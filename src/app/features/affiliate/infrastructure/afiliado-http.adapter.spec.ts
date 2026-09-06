import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { TraduccionService } from '@core/i18n/traduccion.service';
import { AfiliadoHttpAdapter } from './afiliado-http.adapter';

const PANEL = {
  status: 'ACTIVE',
  commissionPercent: 10,
  joined: true,
  canRequestPayout: false,
  minPayoutCents: 5000,
  payoutRequested: false,
  codes: [{ id: 'k1', code: 'ANA', clicks: 12, url: '/?ref=ANA' }],
  stats: {
    clicks: 12,
    conversions: 2,
    pendingCents: 1250,
    approvedCents: 500,
    paidCents: 0,
    currency: 'EUR',
  },
  recentCommissions: [
    {
      id: 'c1',
      amountCents: 1000,
      percentage: 10,
      status: 'PENDING',
      createdAt: '2026-09-01T00:00:00Z',
      baseAmountCents: 10000,
    },
  ],
};

describe('AfiliadoHttpAdapter', () => {
  let adaptador: AfiliadoHttpAdapter;
  let red: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: TraduccionService, useValue: { idioma: () => 'es' } },
        AfiliadoHttpAdapter,
      ],
    });
    adaptador = TestBed.inject(AfiliadoHttpAdapter);
    red = TestBed.inject(HttpTestingController);
  });

  afterEach(() => red.verify());

  it('traduce el panel al vocabulario del dominio', async () => {
    const promesa = adaptador.consulta();
    red.expectOne('/api/me/affiliate').flush(PANEL);

    const resultado = await promesa;
    expect(resultado.ok).toBe(true);
    if (resultado.ok) {
      expect(resultado.valor.inscrito).toBe(true);
      expect(resultado.valor.codigos[0]).toEqual({
        id: 'k1',
        codigo: 'ANA',
        clics: 12,
        camino: '/?ref=ANA',
      });
      expect(resultado.valor.comisiones[0].porcentaje).toBe(10);
    }
  });

  /**
   * Este endpoint es la excepción: manda céntimos, no cadenas formateadas. Aquí se les da FORMA en la
   * misma divisa que declara el servidor —sin ningún tipo de cambio—, para que ninguna pantalla divida.
   */
  it('da forma a los céntimos en la divisa que declara el servidor', async () => {
    const promesa = adaptador.consulta();
    red.expectOne('/api/me/affiliate').flush(PANEL);

    const resultado = await promesa;
    expect(resultado.ok).toBe(true);
    if (resultado.ok) {
      expect(resultado.valor.estadisticas.pendienteFormateado).toContain('12,50');
      expect(resultado.valor.minimoDeCobroFormateado).toContain('50,00');
      expect(resultado.valor.comisiones[0].baseFormateada).toContain('100,00');
    }
  });

  it('un panel sin listas no revienta', async () => {
    const promesa = adaptador.consulta();
    red.expectOne('/api/me/affiliate').flush({
      status: 'PENDING',
      commissionPercent: 10,
      joined: true,
      canRequestPayout: false,
      minPayoutCents: 0,
      payoutRequested: false,
    });

    const resultado = await promesa;
    expect(resultado.ok).toBe(true);
    if (resultado.ok) {
      expect(resultado.valor.codigos).toEqual([]);
      expect(resultado.valor.comisiones).toEqual([]);
      expect(resultado.valor.estadisticas.clics).toBe(0);
    }
  });

  it('el alta devuelve el panel ya inscrito', async () => {
    const promesa = adaptador.inscribe();
    const peticion = red.expectOne('/api/me/affiliate/join');
    expect(peticion.request.method).toBe('POST');
    peticion.flush(PANEL);

    expect((await promesa).ok).toBe(true);
  });

  it('crea un enlace con su etiqueta', async () => {
    const promesa = adaptador.creaCodigo('Link');
    const peticion = red.expectOne('/api/me/affiliate/codes');
    expect(peticion.request.body).toEqual({ label: 'Link' });
    peticion.flush({ id: 'k2', code: 'ANA2', clicks: 0, url: '/?ref=ANA2' });

    const resultado = await promesa;
    expect(resultado.ok && resultado.valor.codigo).toBe('ANA2');
  });

  it('traduce el rechazo del servidor a un error de la aplicación', async () => {
    const promesa = adaptador.consulta();
    red.expectOne('/api/me/affiliate').flush(null, { status: 403, statusText: 'Forbidden' });

    const resultado = await promesa;
    expect(!resultado.ok && resultado.error.tipo).toBe('sin-permiso');
  });
});
