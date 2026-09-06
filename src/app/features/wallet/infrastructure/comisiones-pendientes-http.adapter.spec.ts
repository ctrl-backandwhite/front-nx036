import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { TraduccionService } from '@core/i18n/traduccion.service';
import { ComisionesPendientesHttpAdapter } from './comisiones-pendientes-http.adapter';

describe('ComisionesPendientesHttpAdapter', () => {
  let adaptador: ComisionesPendientesHttpAdapter;
  let red: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: TraduccionService, useValue: { idioma: () => 'es' } },
        ComisionesPendientesHttpAdapter,
      ],
    });
    adaptador = TestBed.inject(ComisionesPendientesHttpAdapter);
    red = TestBed.inject(HttpTestingController);
  });

  afterEach(() => red.verify());

  /** Solo las PENDIENTES: las aprobadas y las pagadas ya están contadas en el saldo. */
  it('se queda con las comisiones pendientes y les da forma en su propia divisa', async () => {
    const promesa = adaptador.consulta();
    red.expectOne('/api/me/affiliate').flush({
      joined: true,
      stats: { pendingCents: 1250, currency: 'EUR' },
      recentCommissions: [
        { id: 'c1', amountCents: 1000, status: 'PENDING', approvesAt: '2026-09-10T00:00:00Z' },
        { id: 'c2', amountCents: 500, status: 'PAID' },
      ],
    });

    const resultado = await promesa;
    expect(resultado.ok).toBe(true);
    if (resultado.ok) {
      expect(resultado.valor.esAfiliado).toBe(true);
      expect(resultado.valor.comisiones).toHaveLength(1);
      expect(resultado.valor.comisiones[0].importeFormateado).toContain('10');
      expect(resultado.valor.totalFormateado).toContain('12,50');
    }
  });

  it('quien no es afiliado no tiene sección que pintar', async () => {
    const promesa = adaptador.consulta();
    red
      .expectOne('/api/me/affiliate')
      .flush({ joined: false, stats: { pendingCents: 0, currency: 'EUR' }, recentCommissions: [] });

    const resultado = await promesa;
    expect(resultado.ok && resultado.valor.esAfiliado).toBe(false);
  });

  /** Un código de moneda desconocido hace que `Intl` lance; antes que quedarse sin importes, se escribe. */
  it('una divisa que Intl no conoce no deja la lista sin importes', async () => {
    const promesa = adaptador.consulta();
    red.expectOne('/api/me/affiliate').flush({
      joined: true,
      stats: { pendingCents: 100, currency: 'NO-ES-UNA-DIVISA' },
      recentCommissions: [],
    });

    const resultado = await promesa;
    expect(resultado.ok && resultado.valor.totalFormateado).toBe('1.00 NO-ES-UNA-DIVISA');
  });

  it('un rechazo del servidor llega como error, no como lista vacía', async () => {
    const promesa = adaptador.consulta();
    red.expectOne('/api/me/affiliate').flush(null, { status: 403, statusText: 'Forbidden' });

    const resultado = await promesa;
    expect(!resultado.ok && resultado.error.tipo).toBe('sin-permiso');
  });
});
