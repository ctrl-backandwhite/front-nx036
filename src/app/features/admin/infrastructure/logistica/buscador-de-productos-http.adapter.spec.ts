import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ApiService } from '@core/http/api.service';
import { APP_CONFIG } from '@core/config/app-config';
import { BuscadorDeProductosHttpAdapter } from './buscador-de-productos-http.adapter';

/**
 * Buscar productos para montar la línea de un pedido nuevo.
 *
 * <p>Llama al mismo endpoint del escaparate que el catálogo, pero devuelve DOS campos. Eso es lo que
 * permite que el panel de pedidos no dependa del puerto grande del contexto de catálogo: el día que
 * aquel cambie su modelo de producto, aquí no se entera nadie. Si esta traducción se ampliara «por
 * comodidad», esa independencia se pierde sin que nada avise.
 */
describe('BuscadorDeProductosHttpAdapter', () => {
  function monta() {
    TestBed.configureTestingModule({
      providers: [
        BuscadorDeProductosHttpAdapter,
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
      adaptador: TestBed.inject(BuscadorDeProductosHttpAdapter),
      red: TestBed.inject(HttpTestingController),
    };
  }

  it('pide un puñado de sugerencias en el idioma que se está usando', async () => {
    const { adaptador, red } = monta();

    const enCurso = adaptador.busca('gorro', 'fr');
    const peticion = red.expectOne((p) => p.url === '/api/catalog/products');

    expect(peticion.request.params.get('q')).toBe('gorro');
    expect(peticion.request.params.get('lang')).toBe('fr');
    /* Veinte: las justas para elegir sin convertir el desplegable en un listado paginado. */
    expect(peticion.request.params.get('size')).toBe('20');
    peticion.flush({ items: [] });
    await enCurso;
  });

  it('devuelve solo identificador y título', async () => {
    const { adaptador, red } = monta();

    const enCurso = adaptador.busca('gorro', 'es');
    red.expectOne((p) => p.url === '/api/catalog/products').flush({
      items: [{ id: 'p1', title: 'Gorro de lana', price: 9.9, images: [] }],
    });

    const resultado = await enCurso;
    expect(resultado.ok && resultado.valor).toEqual([{ id: 'p1', titulo: 'Gorro de lana' }]);
  });

  it('un producto sin título traducido sale con el título vacío, no con «undefined»', async () => {
    const { adaptador, red } = monta();

    const enCurso = adaptador.busca('x', 'zh');
    red.expectOne((p) => p.url === '/api/catalog/products').flush({ items: [{ id: 'p1' }] });

    const resultado = await enCurso;
    expect(resultado.ok && resultado.valor[0].titulo).toBe('');
  });

  it('sin resultados devuelve una lista vacía', async () => {
    const { adaptador, red } = monta();

    const enCurso = adaptador.busca('nada', 'es');
    red.expectOne((p) => p.url === '/api/catalog/products').flush({});

    const resultado = await enCurso;
    expect(resultado.ok && resultado.valor).toEqual([]);
  });
});
