import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ApiService } from '@core/http/api.service';
import { APP_CONFIG } from '@core/config/app-config';
import { CatalogoComunHttpAdapter } from './catalogo-comun-http.adapter';

/**
 * Los dos datos de apoyo que el catálogo pide en casi todas sus pantallas: qué idiomas hay y a cuánto
 * está cada moneda.
 *
 * <p>Los dos respaldos que se fijan aquí son los que deciden qué se ve cuando el backend no manda un
 * campo, y los dos están elegidos por el mismo criterio: que el fallo se note en vez de propagarse.
 *
 * <ul>
 *   <li>Un idioma sin rótulo se enseña por su CÓDIGO en mayúsculas: una opción sin texto es imposible
 *       de elegir a propósito en un desplegable.
 *   <li>Una divisa sin tasa vale UNO, no cero: multiplicar por cero convierte todos los precios en
 *       gratis, y eso es peor que enseñarlos sin convertir.
 * </ul>
 */
describe('CatalogoComunHttpAdapter', () => {
  function monta() {
    TestBed.configureTestingModule({
      providers: [
        CatalogoComunHttpAdapter,
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
      adaptador: TestBed.inject(CatalogoComunHttpAdapter),
      red: TestBed.inject(HttpTestingController),
    };
  }

  describe('idiomas', () => {
    it('traduce el idioma al vocabulario del dominio', async () => {
      const { adaptador, red } = monta();

      const enCurso = adaptador.lista();
      red
        .expectOne('/api/admin/languages')
        .flush([{ id: 'l1', code: 'es', label: 'Español', active: true, isDefault: true }]);

      const resultado = await enCurso;
      expect(resultado.ok && resultado.valor[0]).toEqual({
        codigo: 'es',
        etiqueta: 'Español',
        activo: true,
        porDefecto: true,
      });
    });

    /** Una opción sin texto es imposible de elegir a propósito en un desplegable. */
    it('un idioma sin rótulo se enseña por su código en mayúsculas', async () => {
      const { adaptador, red } = monta();

      const enCurso = adaptador.lista();
      red.expectOne('/api/admin/languages').flush([{ id: 'l1', code: 'pt' }]);

      const resultado = await enCurso;
      expect(resultado.ok && resultado.valor[0].etiqueta).toBe('PT');
    });

    /**
     * Ausente se toma como ACTIVO. Al revés, un idioma sin la marca desaparecería del selector y la
     * ficha no se podría traducir a él — sin que nada dijera por qué.
     */
    it('un idioma sin marca de actividad cuenta como activo', async () => {
      const { adaptador, red } = monta();

      const enCurso = adaptador.lista();
      red.expectOne('/api/admin/languages').flush([{ id: 'l1', code: 'pt' }]);

      const resultado = await enCurso;
      expect(resultado.ok && resultado.valor[0].activo).toBe(true);
      expect(resultado.ok && resultado.valor[0].porDefecto).toBe(false);
    });

    it('y uno apagado a propósito se respeta', async () => {
      const { adaptador, red } = monta();

      const enCurso = adaptador.lista();
      red.expectOne('/api/admin/languages').flush([{ id: 'l1', code: 'pt', active: false }]);

      const resultado = await enCurso;
      expect(resultado.ok && resultado.valor[0].activo).toBe(false);
    });

    it('una respuesta vacía es una lista vacía', async () => {
      const { adaptador, red } = monta();

      const enCurso = adaptador.lista();
      red.expectOne('/api/admin/languages').flush(null);

      const resultado = await enCurso;
      expect(resultado.ok && resultado.valor).toEqual([]);
    });
  });

  describe('divisas', () => {
    it('traduce la divisa con su tasa contra el dólar', async () => {
      const { adaptador, red } = monta();

      const enCurso = adaptador.listaDivisas();
      red.expectOne('/api/admin/currency/all').flush([{ code: 'EUR', rateVsUsd: 0.92 }]);

      const resultado = await enCurso;
      expect(resultado.ok && resultado.valor[0]).toEqual({ codigo: 'EUR', porDolar: 0.92 });
    });

    /** Multiplicar por cero convierte todos los precios en gratis: mejor sin convertir que a cero. */
    it('una divisa sin tasa vale UNO, no cero', async () => {
      const { adaptador, red } = monta();

      const enCurso = adaptador.listaDivisas();
      red.expectOne('/api/admin/currency/all').flush([{ code: 'XPF' }]);

      const resultado = await enCurso;
      expect(resultado.ok && resultado.valor[0].porDolar).toBe(1);
    });

    it('una tasa que llega como texto se convierte a número', async () => {
      const { adaptador, red } = monta();

      const enCurso = adaptador.listaDivisas();
      red.expectOne('/api/admin/currency/all').flush([{ code: 'EUR', rateVsUsd: '0.92' }]);

      const resultado = await enCurso;
      expect(resultado.ok && resultado.valor[0].porDolar).toBe(0.92);
    });

    it('un fallo vuelve como error, no como excepción', async () => {
      const { adaptador, red } = monta();

      const enCurso = adaptador.listaDivisas();
      red.expectOne('/api/admin/currency/all').error(new ProgressEvent('error'));

      expect((await enCurso).ok).toBe(false);
    });
  });
});
