import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ApiService } from '@core/http/api.service';
import { APP_CONFIG } from '@core/config/app-config';
import { TiposDeCambioHttpAdapter, aDivisa } from './tipos-de-cambio-http.adapter';

/**
 * Las tasas de cambio con las que el panel formatea TODO importe que enseña.
 *
 * <p>Se piden al endpoint PÚBLICO a propósito, el mismo que consulta la tienda: si el panel usara el de
 * administración —que incluye las divisas apagadas— podría formatear un importe con una tasa que ningún
 * comprador llega a ver, y las dos pantallas dirían cifras distintas del mismo pedido.
 *
 * <p>La traducción tiene un respaldo que importa más de lo que parece: una tasa ausente vale CERO. No es
 * un valor plausible —nadie cambia a cero—, y ese es justo el punto: un cero se ve al instante en la
 * pantalla, mientras que un `NaN` propagado por una multiplicación aparece mucho más tarde y sin decir
 * de dónde viene.
 */
describe('TiposDeCambioHttpAdapter', () => {
  function monta() {
    TestBed.configureTestingModule({
      providers: [
        TiposDeCambioHttpAdapter,
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
      adaptador: TestBed.inject(TiposDeCambioHttpAdapter),
      red: TestBed.inject(HttpTestingController),
    };
  }

  describe('aDivisa', () => {
    it('traduce la divisa completa', () => {
      expect(
        aDivisa({
          code: 'EUR',
          name: 'Euro',
          symbol: '€',
          countryCode: 'ES',
          flagEmoji: '🇪🇸',
          locale: 'es-ES',
          rateVsUsd: 0.92,
          active: true,
          lastSyncedAt: '2026-09-01T00:00:00Z',
        }),
      ).toEqual({
        codigo: 'EUR',
        nombre: 'Euro',
        simbolo: '€',
        tasaVsUsd: 0.92,
        activa: true,
        locale: 'es-ES',
        banderaEmoji: '🇪🇸',
        paisCodigo: 'ES',
        sincronizadaEl: '2026-09-01T00:00:00Z',
      });
    });

    /** Sin nombre, el código es lo único con lo que se puede identificar la divisa en una lista. */
    it('sin nombre usa el código, y sin símbolo lo deja vacío', () => {
      const divisa = aDivisa({ code: 'XPF' });

      expect(divisa.nombre).toBe('XPF');
      expect(divisa.simbolo).toBe('');
    });

    /** Un cero se ve en pantalla; un `NaN` se propaga por las multiplicaciones y aparece mucho después. */
    it('una tasa ausente vale cero, nunca «NaN»', () => {
      expect(aDivisa({ code: 'XPF' }).tasaVsUsd).toBe(0);
    });

    it('una tasa que llega como texto se convierte a número', () => {
      expect(aDivisa({ code: 'EUR', rateVsUsd: '0.92' as unknown as number }).tasaVsUsd).toBe(0.92);
    });

    /** Ausente se toma como APAGADA: enseñarla activa la ofrecería para cobrar sin tasa fiable. */
    it('sin marca de actividad, la divisa está apagada', () => {
      expect(aDivisa({ code: 'XPF' }).activa).toBe(false);
    });

    it('los campos decorativos que faltan NO se inventan vacíos', () => {
      const divisa = aDivisa({ code: 'XPF' });

      /* La pantalla distingue «no tiene bandera» de «tiene una en blanco»: con la cadena vacía pintaría
       * un hueco donde debería no pintar nada. */
      expect('banderaEmoji' in divisa).toBe(false);
      expect('locale' in divisa).toBe(false);
      expect('paisCodigo' in divisa).toBe(false);
      expect('sincronizadaEl' in divisa).toBe(false);
    });
  });

  it('pide las tasas al endpoint PÚBLICO, el mismo que la tienda', async () => {
    const { adaptador, red } = monta();

    const enCurso = adaptador.vigentes();
    red.expectOne('/api/currency/rates').flush([{ code: 'EUR', rateVsUsd: 0.92, active: true }]);

    const resultado = await enCurso;
    expect(resultado.ok && resultado.valor[0].codigo).toBe('EUR');
  });

  it('una respuesta vacía es una lista vacía', async () => {
    const { adaptador, red } = monta();

    const enCurso = adaptador.vigentes();
    red.expectOne('/api/currency/rates').flush(null);

    const resultado = await enCurso;
    expect(resultado.ok && resultado.valor).toEqual([]);
  });

  /** Sin tasas, el panel formatea en dólares canónicos: peor sería no enseñar importe ninguno. */
  it('un fallo vuelve como error, no como excepción', async () => {
    const { adaptador, red } = monta();

    const enCurso = adaptador.vigentes();
    red.expectOne('/api/currency/rates').error(new ProgressEvent('error'));

    expect((await enCurso).ok).toBe(false);
  });
});
