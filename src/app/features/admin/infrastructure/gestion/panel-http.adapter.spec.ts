import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { PanelHttpAdapter } from './panel-http.adapter';
import { TiposDeCambioHttpAdapter } from './tipos-de-cambio-http.adapter';

describe('PanelHttpAdapter', () => {
  let adaptador: PanelHttpAdapter;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), PanelHttpAdapter],
    });
    adaptador = TestBed.inject(PanelHttpAdapter);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('traduce las métricas y rellena con cero lo que no venga', async () => {
    const promesa = adaptador.metricas();

    http.expectOne('/api/admin/dashboard/metrics')
      .flush({ activeProducts: 10, totalProducts: 40, totalOrders: 5 });

    const resultado = await promesa;
    if (resultado.ok) {
      expect(resultado.valor.productosActivos).toBe(10);
      expect(resultado.valor.pedidos).toBe(5);
      expect(resultado.valor.usuarios).toBe(0);
    }
  });

  /** El importe llega como texto desde un decimal: `Number(undefined)` daría NaN y se pintaría «NaN €». */
  it('acepta la facturación en texto y nunca deja pasar un NaN', async () => {
    const promesa = adaptador.metricas();

    http.expectOne('/api/admin/dashboard/metrics').flush({ gmvUsd: '1234.56', mrrUsd: 'no es un número' });

    const resultado = await promesa;
    if (resultado.ok) {
      expect(resultado.valor.gmvUsd).toBe(1234.56);
      expect(resultado.valor.mrrUsd).toBe(0);
    }
  });

  it('traduce los pedidos recientes y tolera la lista vacía', async () => {
    const conPedidos = adaptador.pedidosRecientes();
    http.expectOne('/api/admin/dashboard/recent-orders').flush([
      { id: 'o1', orderNumber: 'NX-1', status: 'PAID', totalCents: 1999, currency: 'USD' },
    ]);
    const resultado = await conPedidos;

    if (resultado.ok) {
      expect(resultado.valor[0].numero).toBe('NX-1');
      expect(resultado.valor[0].realizadoEl).toBeUndefined();
    }
  });

  it('las series ausentes se leen como diccionarios vacíos, no como indefinido', async () => {
    const promesa = adaptador.series();

    http.expectOne('/api/admin/dashboard/series').flush({});

    const resultado = await promesa;
    if (resultado.ok) {
      expect(resultado.valor.pedidosPorDia).toEqual({});
      expect(resultado.valor.gmvCentimosPorDia).toEqual({});
    }
  });

  it('sin red devuelve un AppError de tipo sin-conexión', async () => {
    const promesa = adaptador.metricas();

    http.expectOne('/api/admin/dashboard/metrics').error(new ProgressEvent('error'));

    const resultado = await promesa;
    expect(resultado.ok).toBe(false);
    if (!resultado.ok) {
      expect(resultado.error.tipo).toBe('sin-conexion');
    }
  });
});

describe('TiposDeCambioHttpAdapter', () => {
  /**
   * Va al endpoint PÚBLICO de tasas, el mismo que consulta la tienda: si usara el de administración
   * podría formatear con una tasa que ningún comprador llega a ver.
   */
  it('lee las tasas vigentes del endpoint público', async () => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), TiposDeCambioHttpAdapter],
    });
    const adaptador = TestBed.inject(TiposDeCambioHttpAdapter);
    const http = TestBed.inject(HttpTestingController);

    const promesa = adaptador.vigentes();
    http.expectOne('/api/currency/rates')
      .flush([{ code: 'EUR', name: 'Euro', symbol: '€', rateVsUsd: 0.92, active: true, locale: 'es-ES' }]);

    const resultado = await promesa;
    if (resultado.ok) {
      expect(resultado.valor[0]).toEqual({
        codigo: 'EUR', nombre: 'Euro', simbolo: '€', tasaVsUsd: 0.92, activa: true, locale: 'es-ES',
      });
    }
    http.verify();
  });
});
