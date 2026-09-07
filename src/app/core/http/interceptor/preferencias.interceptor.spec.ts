import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { firstValueFrom } from 'rxjs';
import { PreferenciasService } from '../../preferences/preferencias';
import { PaisDelUsuario } from '../pais-del-usuario';
import { preferenciasInterceptor } from './preferencias.interceptor';

/**
 * Las cabeceras con las que el backend decide qué contestar.
 *
 * <p>No son decorativas: de `X-Currency` salen los importes que ve quien compra, de `X-Lang` sale el
 * texto de los errores —se localizan en el SERVIDOR— y de `X-Country` sale el MARGEN que se aplica al
 * precio. Perder una no da error: da precios de otro país o mensajes en otro idioma.
 */
describe('preferenciasInterceptor', () => {
  function monta(pais = '') {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([preferenciasInterceptor])),
        provideHttpClientTesting(),
        {
          provide: PreferenciasService,
          useValue: { idioma: () => 'fr', moneda: () => 'EUR', tema: () => 'light' },
        },
        { provide: PaisDelUsuario, useValue: { codigo: () => pais } },
      ],
    });
    return { http: TestBed.inject(HttpClient), red: TestBed.inject(HttpTestingController) };
  }

  it('manda idioma y moneda en todas las peticiones', async () => {
    const { http, red } = monta();

    const enCurso = firstValueFrom(http.get('/api/catalog/products'));
    const peticion = red.expectOne('/api/catalog/products');

    expect(peticion.request.headers.get('X-Currency')).toBe('EUR');
    expect(peticion.request.headers.get('X-Lang')).toBe('fr');
    expect(peticion.request.headers.get('Accept-Language')).toBe('fr');
    peticion.flush({});
    await enCurso;
  });

  it('con sesión manda también el país de REGISTRO, que es el que fija el margen', async () => {
    const { http, red } = monta('ES');

    const enCurso = firstValueFrom(http.get('/api/catalog/products'));
    const peticion = red.expectOne('/api/catalog/products');

    expect(peticion.request.headers.get('X-Country')).toBe('ES');
    peticion.flush({});
    await enCurso;
  });

  /**
   * Sin sesión NO se manda: el backend lo deduce de la red o aplica la regla base. Mandar una cadena
   * vacía sería peor que no mandar nada, porque el servidor tendría que distinguir «no sé» de «vacío».
   */
  it('sin sesión no manda país', async () => {
    const { http, red } = monta('');

    const enCurso = firstValueFrom(http.get('/api/catalog/products'));
    const peticion = red.expectOne('/api/catalog/products');

    expect(peticion.request.headers.has('X-Country')).toBe(false);
    peticion.flush({});
    await enCurso;
  });
});
