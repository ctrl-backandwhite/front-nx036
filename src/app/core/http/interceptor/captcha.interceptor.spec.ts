import { TestBed } from '@angular/core/testing';
import { HttpClient, HttpHeaders, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { firstValueFrom } from 'rxjs';
import { CaptchaService } from '../../security/captcha.service';
import { captchaInterceptor } from './captcha.interceptor';

/**
 * La prueba de trabajo de los formularios públicos.
 *
 * <p>Lo que hay que fijar es la LISTA: son los formularios que un robot puede disparar en masa sin
 * sesión —alta, recuperación, reenvío de activación, boletín y contacto—. Añadir uno público y olvidarse
 * de esta lista no rompe nada visible; simplemente ese formulario queda abierto.
 *
 * <p>Y al revés: que el resto de la aplicación NO gaste un segundo de cálculo por petición.
 */
describe('captchaInterceptor', () => {
  function monta(resuelve: () => Promise<string> = async () => 'testigo') {
    const captcha = { resuelve: vi.fn(resuelve) };
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([captchaInterceptor])),
        provideHttpClientTesting(),
        { provide: CaptchaService, useValue: captcha },
      ],
    });
    return {
      http: TestBed.inject(HttpClient),
      red: TestBed.inject(HttpTestingController),
      captcha,
    };
  }

  /**
   * Resolver el reto es asíncrono, así que la petición NO sale en el mismo tick que la llamada. Sin esta
   * espera, el banco de pruebas mira la red antes de que haya nada y dice que no encuentra la petición.
   */
  const cuandoSalga = () => new Promise((sigue) => setTimeout(sigue, 0));

  it.each([
    '/auth/register',
    '/auth/password-reset/request',
    '/auth/activate/resend',
    '/newsletter/subscribe',
    '/contact',
  ])('%s va con la solución adjunta', async (ruta) => {
    const { http, red } = monta();

    const enCurso = firstValueFrom(http.post(`/api${ruta}`, {}));
    await cuandoSalga();
    const peticion = red.expectOne(`/api${ruta}`);

    expect(peticion.request.headers.get('X-Altcha')).toBe('testigo');
    peticion.flush({});
    await enCurso;
  });

  it('el resto de la aplicación no paga el cálculo', async () => {
    const { http, red, captcha } = monta();

    const enCurso = firstValueFrom(http.post('/api/orders', {}));
    const peticion = red.expectOne('/api/orders');

    expect(captcha.resuelve).not.toHaveBeenCalled();
    expect(peticion.request.headers.has('X-Altcha')).toBe(false);
    peticion.flush({});
    await enCurso;
  });

  it('leer un formulario no es enviarlo: solo el POST lleva reto', async () => {
    const { http, red, captcha } = monta();

    const enCurso = firstValueFrom(http.get('/api/contact'));
    red.expectOne('/api/contact').flush({});

    await enCurso;
    expect(captcha.resuelve).not.toHaveBeenCalled();
  });

  /** El alta usa un widget visible que ya lo ha calculado: repetirlo sería un segundo tirado. */
  it('si la petición ya trae solución, no se vuelve a resolver', async () => {
    const { http, red, captcha } = monta();

    const enCurso = firstValueFrom(
      http.post('/api/auth/register', {}, { headers: new HttpHeaders({ 'X-Altcha': 'del-widget' }) }),
    );
    const peticion = red.expectOne('/api/auth/register');

    expect(captcha.resuelve).not.toHaveBeenCalled();
    expect(peticion.request.headers.get('X-Altcha')).toBe('del-widget');
    peticion.flush({});
    await enCurso;
  });

  /**
   * Si el reto no se puede resolver, la petición SALE IGUAL y sin cabecera: el backend la rechaza con su
   * mensaje, que el formulario ya sabe pintar. Fallar aquí en silencio dejaría el botón sin hacer nada.
   */
  it('un reto que no se resuelve no bloquea el envío', async () => {
    const { http, red } = monta(async () => {
      throw new Error('sin red');
    });

    const enCurso = firstValueFrom(http.post('/api/contact', {}));
    await cuandoSalga();
    const peticion = red.expectOne('/api/contact');

    expect(peticion.request.headers.has('X-Altcha')).toBe(false);
    peticion.flush({});
    await enCurso;
  });

  it('la consulta de la dirección no despista al comparar la ruta', async () => {
    const { http, red } = monta();

    const enCurso = firstValueFrom(http.post('/api/contact?origen=pie', {}));
    await cuandoSalga();
    const peticion = red.expectOne('/api/contact?origen=pie');

    expect(peticion.request.headers.get('X-Altcha')).toBe('testigo');
    peticion.flush({});
    await enCurso;
  });
});
