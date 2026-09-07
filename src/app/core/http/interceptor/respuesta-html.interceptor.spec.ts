import { TestBed } from '@angular/core/testing';
import { HttpClient, HttpErrorResponse, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { firstValueFrom } from 'rxjs';
import { respuestaHtmlInterceptor } from './respuesta-html.interceptor';

/**
 * El 200 que en realidad es un error.
 *
 * <p>Cuando el backend no está accesible, quien contesta es la pasarela: devuelve su página de error —o
 * el propio documento de la aplicación— con un 200 impecable. Quien esperaba un objeto recibe una cadena
 * que empieza por `<!doctype`, que en JavaScript es un valor perfectamente cierto: la comprobación de
 * «¿hay datos?» pasa, y la pantalla revienta al leer el primer campo, lejos de aquí.
 */
describe('respuestaHtmlInterceptor', () => {
  function monta() {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([respuestaHtmlInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    return { http: TestBed.inject(HttpClient), red: TestBed.inject(HttpTestingController) };
  }

  it.each([
    ['un documento completo', '<!doctype html><html><body>Bad gateway</body></html>'],
    ['sin el prólogo', '<html><head></head></html>'],
    ['con espacios delante', '\n  <!DOCTYPE html><html></html>'],
  ])('%s se convierte en error, no en dato', async (_caso, cuerpo) => {
    const { http, red } = monta();

    const enCurso = firstValueFrom(http.get('/api/me', { responseType: 'text' })).catch((e) => e);
    red.expectOne('/api/me').flush(cuerpo);

    const error = await enCurso;
    expect(error).toBeInstanceOf(HttpErrorResponse);
    /* 502 y no 200: así cada pantalla degrada a su estado vacío, que es lo que corresponde cuando no
     * hay datos, en vez de intentar leer campos de una página web. */
    expect(error.status).toBe(502);
  });

  it('un JSON normal pasa intacto', async () => {
    const { http, red } = monta();

    const enCurso = firstValueFrom(http.get('/api/me'));
    red.expectOne('/api/me').flush({ id: 'u1' });

    expect(await enCurso).toEqual({ id: 'u1' });
  });

  /** Una descripción de producto puede traer marcado: no se puede tirar por parecerse. */
  it('un texto que solo CONTIENE marcado no se descarta', async () => {
    const { http, red } = monta();

    const enCurso = firstValueFrom(http.get('/api/x', { responseType: 'text' }));
    red.expectOne('/api/x').flush('Material: algodón <b>100%</b>');

    expect(await enCurso).toBe('Material: algodón <b>100%</b>');
  });
});
