import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { APP_CONFIG } from '../config/app-config';
import { CaptchaService } from './captcha.service';

/**
 * El CAPTCHA por prueba de trabajo (protocolo ALTCHA).
 *
 * <p>Se prueba con retos DE VERDAD —el resumen se calcula aquí mismo con la misma función que usa el
 * servicio— y no con un doble: lo único que hay que demostrar es que el número que encuentra reproduce
 * el reto, y con un doble eso no se demuestra, se supone.
 *
 * <p>El número se busca por lotes de 500 a propósito. Que el reto de estas pruebas caiga en el segundo
 * lote no es casualidad: es el caso que un bucle mal escrito se salta.
 */
describe('CaptchaService', () => {
  function monta() {
    TestBed.configureTestingModule({
      providers: [
        CaptchaService,
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: APP_CONFIG,
          useValue: { apiBase: 'http://backend', produccion: false, urlPublica: '', entorno: 'prueba' },
        },
      ],
    });
    return { captcha: TestBed.inject(CaptchaService), red: TestBed.inject(HttpTestingController) };
  }

  /** El mismo SHA-256 que calcula el servicio, para poder plantear un reto legítimo. */
  async function resumen(entrada: string): Promise<string> {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(entrada));
    return Array.from(new Uint8Array(buf))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  }

  async function reto(numero: number, maxnumber = 2000) {
    return {
      algorithm: 'SHA-256',
      challenge: await resumen(`sal-${numero}`),
      maxnumber,
      salt: 'sal-',
      signature: 'firma-del-servidor',
    };
  }

  it('encuentra el número y devuelve el comprobante que espera el backend', async () => {
    const { captcha, red } = monta();

    const enCurso = captcha.resuelve();
    red.expectOne('http://backend/api/captcha/challenge').flush(await reto(7));

    const comprobante = JSON.parse(atob(await enCurso));
    expect(comprobante.number).toBe(7);
    /* La firma viaja de vuelta tal cual: es lo que permite al servidor comprobar que el reto lo planteó
     * él y no cualquiera. */
    expect(comprobante.signature).toBe('firma-del-servidor');
    expect(comprobante.algorithm).toBe('SHA-256');
  });

  it('encuentra también los que caen más allá del primer lote', async () => {
    const { captcha, red } = monta();

    const enCurso = captcha.resuelve();
    red.expectOne('http://backend/api/captcha/challenge').flush(await reto(1234));

    expect(JSON.parse(atob(await enCurso)).number).toBe(1234);
  });

  it('el cero también cuenta: la búsqueda empieza en él, no en el uno', async () => {
    const { captcha, red } = monta();

    const enCurso = captcha.resuelve();
    red.expectOne('http://backend/api/captcha/challenge').flush(await reto(0));

    expect(JSON.parse(atob(await enCurso)).number).toBe(0);
  });

  it('el último número del margen entra: el tope es inclusivo', async () => {
    const { captcha, red } = monta();

    const enCurso = captcha.resuelve();
    /* Un `<` en vez de un `<=` dejaría fuera exactamente un número de cada reto. Fallaría una vez cada
     * `maxnumber` intentos, o sea casi nunca, que es la peor frecuencia posible para un fallo. */
    red.expectOne('http://backend/api/captcha/challenge').flush(await reto(500, 500));

    expect(JSON.parse(atob(await enCurso)).number).toBe(500);
  });

  it('un reto sin solución dentro del margen se dice, no se cuelga', async () => {
    const { captcha, red } = monta();

    const enCurso = captcha.resuelve();
    red.expectOne('http://backend/api/captcha/challenge').flush({
      algorithm: 'SHA-256',
      challenge: 'no-lo-reproduce-ningun-numero',
      maxnumber: 100,
      salt: 'sal-',
      signature: 'firma',
    });

    await expect(enCurso).rejects.toThrow('captcha sin resolver');
  });

  it('si el servidor no da reto, la promesa falla y el interceptor lo recoge', async () => {
    const { captcha, red } = monta();

    const enCurso = captcha.resuelve();
    red
      .expectOne('http://backend/api/captcha/challenge')
      .flush('no', { status: 503, statusText: 'x' });

    await expect(enCurso).rejects.toBeDefined();
  });
});
