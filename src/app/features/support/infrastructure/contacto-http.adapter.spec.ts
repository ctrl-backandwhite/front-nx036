import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { TokenStore } from '@core/auth/token-store';
import { ALMACEN_LOCAL } from '@core/storage/almacen.port';
import { AlmacenMemoriaAdapter } from '@core/storage/almacen-memoria.adapter';
import { ContactoHttpAdapter } from './contacto-http.adapter';
import { QuienEscribeHttpAdapter } from './quien-escribe-http.adapter';

describe('ContactoHttpAdapter y QuienEscribeHttpAdapter', () => {
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        AlmacenMemoriaAdapter,
        { provide: ALMACEN_LOCAL, useExisting: AlmacenMemoriaAdapter },
        ContactoHttpAdapter,
        QuienEscribeHttpAdapter,
      ],
    });
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('manda el contacto con el vocabulario del backend', async () => {
    const promesa = TestBed.inject(ContactoHttpAdapter).envia({
      nombre: 'Ana',
      email: 'ana@ejemplo.com',
      asunto: 'Duda',
      mensaje: 'Hola',
    });

    const peticion = http.expectOne('/api/contact');
    expect(peticion.request.body).toEqual({
      name: 'Ana',
      email: 'ana@ejemplo.com',
      subject: 'Duda',
      message: 'Hola',
    });
    peticion.flush(null);

    expect((await promesa).ok).toBe(true);
  });

  /**
   * Preguntar sin credencial provocaba un rechazo por sesión caducada —y un intento de renovación
   * inútil— en cada visita anónima al formulario, que es donde más visitantes anónimos hay.
   */
  it('sin credencial guardada NO pregunta por el perfil', async () => {
    const resultado = await TestBed.inject(QuienEscribeHttpAdapter).consulta();

    expect(resultado).toEqual({ ok: true, valor: null });
    http.expectNone('/api/me');
  });

  it('con sesión devuelve solo el nombre y el correo', async () => {
    TestBed.inject(TokenStore).guarda('credencial');

    const promesa = TestBed.inject(QuienEscribeHttpAdapter).consulta();
    http.expectOne('/api/me').flush({
      email: 'ana@ejemplo.com',
      displayName: '  Ana  ',
      firstName: 'Anabel',
    });

    expect(await promesa).toEqual({ ok: true, valor: { nombre: 'Ana', email: 'ana@ejemplo.com' } });
  });

  it('sin nombre visible se conforma con el de pila', async () => {
    TestBed.inject(TokenStore).guarda('credencial');

    const promesa = TestBed.inject(QuienEscribeHttpAdapter).consulta();
    http.expectOne('/api/me').flush({ email: 'ana@ejemplo.com', firstName: 'Anabel' });

    expect(await promesa).toEqual({
      ok: true,
      valor: { nombre: 'Anabel', email: 'ana@ejemplo.com' },
    });
  });
});
