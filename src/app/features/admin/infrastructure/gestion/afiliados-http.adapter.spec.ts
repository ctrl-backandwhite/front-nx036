import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ApiService } from '@core/http/api.service';
import { APP_CONFIG } from '@core/config/app-config';
import { AfiliadosHttpAdapter, PagosDeAfiliadosHttpAdapter } from './afiliados-http.adapter';

/**
 * El programa de afiliados contra el backend.
 *
 * <p>Aquí se mueve DINERO que sale de la casa, así que los respaldos de la traducción no son cosmética:
 * una cifra ausente que se convirtiera en `undefined` acabaría en pantalla como «NaN €» o, peor, en una
 * comparación que decide si un pago llega al mínimo para transferirse.
 *
 * <p>Y el IMPORTE FORMATEADO viene del servidor: se enseña ese y no uno recompuesto aquí, para que lo
 * que se lee antes de aprobar sea exactamente lo que se va a transferir.
 */
describe('adaptadores de afiliados', () => {
  function monta() {
    TestBed.configureTestingModule({
      providers: [
        AfiliadosHttpAdapter,
        PagosDeAfiliadosHttpAdapter,
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
      afiliados: TestBed.inject(AfiliadosHttpAdapter),
      pagos: TestBed.inject(PagosDeAfiliadosHttpAdapter),
      red: TestBed.inject(HttpTestingController),
    };
  }

  describe('AfiliadosHttpAdapter', () => {
    it('traduce la página de afiliados al vocabulario del dominio', async () => {
      const { afiliados, red } = monta();

      const enCurso = afiliados.busca('ACTIVE', 0, 20);
      const peticion = red.expectOne((p) => p.url === '/api/admin/affiliates');
      expect(peticion.request.params.get('status')).toBe('ACTIVE');
      peticion.flush({
        items: [
          {
            id: 'a1',
            status: 'ACTIVE',
            name: 'Ana Ruiz',
            email: 'ana@marca.com',
            codesCount: 2,
            clicks: 40,
            referralsCount: 3,
            pendingCents: 1000,
            approvedCents: 2000,
            paidCents: 500,
          },
        ],
        totalElements: 1,
        totalPages: 1,
        page: 0,
      });

      const resultado = await enCurso;
      expect(resultado.ok && resultado.valor.elementos[0]).toMatchObject({
        id: 'a1',
        estado: 'ACTIVE',
        nombre: 'Ana Ruiz',
        clics: 40,
        aprobadoCentimos: 2000,
      });
    });

    /** Una cifra ausente convertida en `undefined` acabaría como «NaN» en una columna de dinero. */
    it('las cifras que no llegan valen CERO, no «indefinido»', async () => {
      const { afiliados, red } = monta();

      const enCurso = afiliados.busca(undefined, 0, 20);
      red.expectOne((p) => p.url === '/api/admin/affiliates').flush({
        items: [{ id: 'a1', status: 'ACTIVE' }],
        totalElements: 1,
        totalPages: 1,
        page: 0,
      });

      const resultado = await enCurso;
      expect(resultado.ok && resultado.valor.elementos[0]).toMatchObject({
        clics: 0,
        pendienteCentimos: 0,
        pagadoCentimos: 0,
      });
    });

    it('un afiliado sin nombre ni correo no trae esos campos vacíos', async () => {
      const { afiliados, red } = monta();

      const enCurso = afiliados.busca(undefined, 0, 20);
      red.expectOne((p) => p.url === '/api/admin/affiliates').flush({
        items: [{ id: 'a1', status: 'ACTIVE' }],
        totalElements: 1,
        totalPages: 1,
        page: 0,
      });

      const resultado = await enCurso;
      const fila = resultado.ok ? resultado.valor.elementos[0] : null;
      /* Ausente y «cadena vacía» son cosas distintas: la pantalla decide si enseña un guion o el dato. */
      expect(fila && 'nombre' in fila).toBe(false);
    });

    it('el detalle trae códigos y comisiones', async () => {
      const { afiliados, red } = monta();

      const enCurso = afiliados.detalle('a1');
      red.expectOne('/api/admin/affiliates/a1').flush({
        row: { id: 'a1', status: 'ACTIVE' },
        codes: [{ id: 'c1', code: 'ANA10', clicks: 4 }],
        commissions: [{ id: 'm1', amountCents: 500, percentage: 10, status: 'APPROVED' }],
      });

      const resultado = await enCurso;
      expect(resultado.ok && resultado.valor.codigos[0]).toEqual({
        id: 'c1',
        codigo: 'ANA10',
        clics: 4,
        activo: true,
      });
      expect(resultado.ok && resultado.valor.comisiones[0]).toMatchObject({
        importeCentimos: 500,
        estado: 'APPROVED',
      });
    });

    it('un detalle vacío no revienta al recorrerlo', async () => {
      const { afiliados, red } = monta();

      const enCurso = afiliados.detalle('a1');
      red.expectOne('/api/admin/affiliates/a1').flush({});

      const resultado = await enCurso;
      expect(resultado.ok && resultado.valor.codigos).toEqual([]);
      expect(resultado.ok && resultado.valor.comisiones).toEqual([]);
    });

    it('cambiar el estado va por POST a la ruta del afiliado', async () => {
      const { afiliados, red } = monta();

      const enCurso = afiliados.cambiaEstado('a1', 'SUSPENDED');
      const peticion = red.expectOne('/api/admin/affiliates/a1/status');

      expect(peticion.request.method).toBe('POST');
      expect(peticion.request.body).toEqual({ status: 'SUSPENDED' });
      peticion.flush({});
      expect((await enCurso).ok).toBe(true);
    });

    it('reindexar devuelve cuántos se indexaron, y cero si no lo dice', async () => {
      const { afiliados, red } = monta();

      const enCurso = afiliados.reindexa();
      red.expectOne('/api/admin/affiliates/reindex').flush({ indexed: 58 });
      const conCifra = await enCurso;
      expect(conCifra.ok && conCifra.valor).toBe(58);

      const otra = afiliados.reindexa();
      red.expectOne('/api/admin/affiliates/reindex').flush({});
      const sinCifra = await otra;
      expect(sinCifra.ok && sinCifra.valor).toBe(0);
    });

    /** La divisa del programa NO es la del panel: es en la que se transfiere al afiliado. */
    it('la configuración cae al euro cuando el servidor no manda divisa', async () => {
      const { afiliados, red } = monta();

      const enCurso = afiliados.configuracion();
      red.expectOne('/api/admin/affiliates/config').flush({ defaultPercent: 10 });

      const resultado = await enCurso;
      expect(resultado.ok && resultado.valor).toMatchObject({
        porcentajePorDefecto: 10,
        divisa: 'EUR',
        ventanaDeAtribucionDias: 0,
      });
    });

    it('guardar la configuración manda los nombres del servidor', async () => {
      const { afiliados, red } = monta();

      const enCurso = afiliados.guardaConfiguracion({
        porcentajePorDefecto: 12,
        ventanaDeAtribucionDias: 30,
        periodoDeDevolucionDias: 14,
        minimoDePagoCentimos: 5000,
        divisa: 'USD',
        maximoPorPeriodoCentimos: 100000,
      });
      const peticion = red.expectOne('/api/admin/affiliates/config');

      expect(peticion.request.method).toBe('PUT');
      expect(peticion.request.body).toEqual({
        defaultPercent: 12,
        attributionWindowDays: 30,
        returnPeriodDays: 14,
        minPayoutCents: 5000,
        currency: 'USD',
        maxCommissionPeriodCents: 100000,
      });
      peticion.flush({});
      await enCurso;
    });
  });

  describe('PagosDeAfiliadosHttpAdapter', () => {
    it('los pagos pendientes traen el importe YA formateado por el servidor', async () => {
      const { pagos, red } = monta();

      const enCurso = pagos.pendientes();
      red.expectOne('/api/admin/affiliates/payouts/pending').flush([
        {
          id: 'p1',
          affiliateId: 'a1',
          amountCents: 12300,
          amountFormatted: '123,00 €',
          currency: 'EUR',
          method: 'BANK',
          commissionCount: 3,
          affiliateName: 'Ana Ruiz',
          destIban: 'ES91...',
        },
      ]);

      const resultado = await enCurso;
      /* Se enseña el del servidor y no uno recompuesto aquí: lo que se lee antes de aprobar tiene que
       * ser exactamente lo que se va a transferir. */
      expect(resultado.ok && resultado.valor[0].importeFormateado).toBe('123,00 €');
      expect(resultado.ok && resultado.valor[0].comisiones).toBe(3);
    });

    it('sin importe formateado se deja vacío, no se inventa uno', async () => {
      const { pagos, red } = monta();

      const enCurso = pagos.pendientes();
      red
        .expectOne('/api/admin/affiliates/payouts/pending')
        .flush([{ id: 'p1', affiliateId: 'a1', amountCents: 100, method: 'PAYPAL' }]);

      const resultado = await enCurso;
      expect(resultado.ok && resultado.valor[0].importeFormateado).toBe('');
      expect(resultado.ok && resultado.valor[0].divisa).toBe('EUR');
    });

    it('sin pagos pendientes devuelve una lista vacía', async () => {
      const { pagos, red } = monta();

      const enCurso = pagos.pendientes();
      red.expectOne('/api/admin/affiliates/payouts/pending').flush(null);

      const resultado = await enCurso;
      expect(resultado.ok && resultado.valor).toEqual([]);
    });

    it('aprobar lleva la referencia de la transferencia', async () => {
      const { pagos, red } = monta();

      const enCurso = pagos.aprueba('p1', 'TRF-2026-09');
      const peticion = red.expectOne('/api/admin/affiliates/payouts/p1/approve');

      expect(peticion.request.body).toEqual({ reference: 'TRF-2026-09' });
      peticion.flush({});
      await enCurso;
    });

    it('rechazar lleva el motivo', async () => {
      const { pagos, red } = monta();

      const enCurso = pagos.rechaza('p1', 'IBAN incorrecto');
      const peticion = red.expectOne('/api/admin/affiliates/payouts/p1/reject');

      expect(peticion.request.body).toEqual({ reason: 'IBAN incorrecto' });
      peticion.flush({});
      await enCurso;
    });

    it('pagar devuelve cuánto se pagó', async () => {
      const { pagos, red } = monta();

      const enCurso = pagos.paga('a1');
      red.expectOne('/api/admin/affiliates/a1/payout').flush({ paidCents: 12300 });

      const resultado = await enCurso;
      expect(resultado.ok && resultado.valor).toBe(12300);
    });

    it('aprobar las vencidas devuelve cuántas', async () => {
      const { pagos, red } = monta();

      const enCurso = pagos.apruebaVencidas();
      red.expectOne('/api/admin/affiliates/approve-due').flush({ approved: 7 });

      const resultado = await enCurso;
      expect(resultado.ok && resultado.valor).toBe(7);
    });

    it('revisar una comisión lleva la decisión en la dirección', async () => {
      const { pagos, red } = monta();

      const enCurso = pagos.revisaComision('m1', false);
      red.expectOne('/api/admin/affiliates/commissions/m1/review?approve=false').flush({});

      expect((await enCurso).ok).toBe(true);
    });

    it('un fallo vuelve como error, no como excepción', async () => {
      const { pagos, red } = monta();

      const enCurso = pagos.pendientes();
      red.expectOne('/api/admin/affiliates/payouts/pending').error(new ProgressEvent('error'));

      expect((await enCurso).ok).toBe(false);
    });
  });
});
