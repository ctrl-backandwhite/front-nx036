import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ApiService } from '@core/http/api.service';
import { APP_CONFIG } from '@core/config/app-config';
import { Plan } from '../../domain/gestion/model/facturacion';
import { FacturacionHttpAdapter } from './facturacion-http.adapter';

/**
 * Los planes de suscripción y quién los tiene contratados.
 *
 * <p>Un plan es una tarifa: de sus dos importes sale lo que se cobra cada mes. Por eso los respaldos van
 * a cero y no a «indefinido» —un importe ausente que llegara sin valor rompería la comparación que
 * decide qué plan es más caro— y por eso un plan sin marca de actividad se toma como APAGADO: darlo por
 * activo lo pondría a la venta sin que nadie lo hubiera publicado.
 */
describe('FacturacionHttpAdapter', () => {
  function monta() {
    TestBed.configureTestingModule({
      providers: [
        FacturacionHttpAdapter,
        ApiService,
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: APP_CONFIG,
          useValue: { apiBase: '', produccion: false, urlPublica: '', entorno: 'prueba' },
        },
      ],
    });
    return {
      adaptador: TestBed.inject(FacturacionHttpAdapter),
      red: TestBed.inject(HttpTestingController),
    };
  }

  it('traduce el plan al vocabulario del dominio', async () => {
    const { adaptador, red } = monta();

    const enCurso = adaptador.planes();
    red.expectOne('/api/admin/billing/plans').flush([
      {
        id: 'pl1',
        code: 'PRO',
        name: 'Profesional',
        description: 'Para tiendas con volumen',
        priceMonthlyCents: 4900,
        priceYearlyCents: 49000,
        currency: 'EUR',
        active: true,
        position: 2,
      },
    ]);

    const resultado = await enCurso;
    expect(resultado.ok && resultado.valor[0]).toEqual({
      id: 'pl1',
      codigo: 'PRO',
      nombre: 'Profesional',
      descripcion: 'Para tiendas con volumen',
      mensualCentimos: 4900,
      anualCentimos: 49000,
      divisa: 'EUR',
      activo: true,
      posicion: 2,
    });
  });

  /** Darlo por activo pondría a la venta un plan que nadie ha publicado. */
  it('un plan sin marca de actividad está APAGADO, y sus importes valen cero', async () => {
    const { adaptador, red } = monta();

    const enCurso = adaptador.planes();
    red.expectOne('/api/admin/billing/plans').flush([{ id: 'pl1', code: 'FREE', name: 'Gratis' }]);

    const resultado = await enCurso;
    expect(resultado.ok && resultado.valor[0]).toMatchObject({
      activo: false,
      mensualCentimos: 0,
      anualCentimos: 0,
      divisa: 'USD',
      posicion: 0,
    });
    /* Sin descripción no se mete una cadena vacía: la pantalla distingue «no tiene» de «está en blanco». */
    expect(resultado.ok && 'descripcion' in resultado.valor[0]).toBe(false);
  });

  it('una respuesta vacía es una lista vacía', async () => {
    const { adaptador, red } = monta();

    const enCurso = adaptador.planes();
    red.expectOne('/api/admin/billing/plans').flush(null);

    const resultado = await enCurso;
    expect(resultado.ok && resultado.valor).toEqual([]);
  });

  it('guardar un plan manda los nombres del servidor, con la descripción vacía si no hay', async () => {
    const { adaptador, red } = monta();
    const plan: Plan = {
      id: 'pl1',
      codigo: 'PRO',
      nombre: 'Profesional',
      mensualCentimos: 4900,
      anualCentimos: 49000,
      divisa: 'EUR',
      activo: true,
      posicion: 2,
    };

    const enCurso = adaptador.actualizaPlan('PRO', plan);
    const peticion = red.expectOne('/api/admin/billing/plans/PRO');

    expect(peticion.request.method).toBe('PUT');
    expect(peticion.request.body).toEqual({
      code: 'PRO',
      name: 'Profesional',
      description: '',
      priceMonthlyCents: 4900,
      priceYearlyCents: 49000,
      currency: 'EUR',
      active: true,
      position: 2,
    });
    peticion.flush({});
    expect((await enCurso).ok).toBe(true);
  });

  describe('suscripciones', () => {
    const enLista = () => (p: { url: string }) => p.url === '/api/admin/billing/subscriptions';

    it('traduce la suscripción y sus fechas de periodo', async () => {
      const { adaptador, red } = monta();

      const enCurso = adaptador.suscripciones('ACTIVE');
      const peticion = red.expectOne(enLista());
      expect(peticion.request.params.get('status')).toBe('ACTIVE');
      peticion.flush([
        {
          id: 's1',
          userId: 'u1',
          userEmail: 'ana@nx036.com',
          plan: 'PRO',
          status: 'ACTIVE',
          billingPeriod: 'MONTHLY',
          currentPeriodStart: '2026-09-01',
          currentPeriodEnd: '2026-10-01',
        },
      ]);

      const resultado = await enCurso;
      expect(resultado.ok && resultado.valor[0]).toEqual({
        id: 's1',
        idUsuario: 'u1',
        emailUsuario: 'ana@nx036.com',
        plan: 'PRO',
        estado: 'ACTIVE',
        periodo: 'MONTHLY',
        inicioDelPeriodo: '2026-09-01',
        finDelPeriodo: '2026-10-01',
      });
    });

    /** Una fecha ausente no se inventa: sin ella la pantalla enseña un guion, no un «1970». */
    it('sin fechas de periodo, esos campos no viajan', async () => {
      const { adaptador, red } = monta();

      const enCurso = adaptador.suscripciones();
      red
        .expectOne(enLista())
        .flush([{ id: 's1', userId: 'u1', userEmail: 'a@b.c', plan: 'FREE', status: 'TRIAL' }]);

      const resultado = await enCurso;
      const fila = resultado.ok ? resultado.valor[0] : null;
      expect(fila?.periodo).toBe('');
      expect(fila && 'inicioDelPeriodo' in fila).toBe(false);
      expect(fila && 'finDelPeriodo' in fila).toBe(false);
    });

    it('un fallo vuelve como error, no como excepción', async () => {
      const { adaptador, red } = monta();

      const enCurso = adaptador.suscripciones();
      red.expectOne(enLista()).error(new ProgressEvent('error'));

      expect((await enCurso).ok).toBe(false);
    });
  });
});
