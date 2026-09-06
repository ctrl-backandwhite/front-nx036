import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { BoletinHttpAdapter } from './boletin-http.adapter';

describe('BoletinHttpAdapter', () => {
  let adaptador: BoletinHttpAdapter;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), BoletinHttpAdapter],
    });
    adaptador = TestBed.inject(BoletinHttpAdapter);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('traduce «ya estaba suscrito» al vocabulario del dominio', async () => {
    const promesa = adaptador.suscribe('quien@ejemplo.com');

    const peticion = http.expectOne('/api/newsletter/subscribe');
    expect(peticion.request.body).toEqual({ email: 'quien@ejemplo.com' });
    peticion.flush({ status: 'OK', alreadySubscribed: true });

    const resultado = await promesa;
    expect(resultado.ok).toBe(true);
    if (resultado.ok) {
      expect(resultado.valor.yaEstaba).toBe(true);
    }
  });

  it('la baja viaja por testigo, nunca por correo', async () => {
    const promesa = adaptador.daDeBaja('t-123');

    const peticion = http.expectOne('/api/newsletter/unsubscribe');
    expect(peticion.request.body).toEqual({ token: 't-123' });
    peticion.flush({ unsubscribed: true });

    const resultado = await promesa;
    expect(resultado.ok && resultado.valor).toBe(true);
  });

  it('convierte el rechazo del servidor en un error del dominio, sin lanzar', async () => {
    const promesa = adaptador.daDeBaja('caducado');

    http.expectOne('/api/newsletter/unsubscribe').flush(
      { message: 'El enlace ha caducado.' },
      { status: 410, statusText: 'Gone' },
    );

    const resultado = await promesa;
    expect(resultado.ok).toBe(false);
    if (!resultado.ok) {
      expect(resultado.error.mensaje).toBe('El enlace ha caducado.');
    }
  });

  it('traduce las preferencias de correo en las dos direcciones', async () => {
    const consulta = adaptador.consulta();
    http.expectOne('/api/me/email-preferences').flush({ marketingOptOut: true });
    expect(await consulta).toEqual({ ok: true, valor: { sinPublicidad: true } });

    const guarda = adaptador.actualiza(false);
    const peticion = http.expectOne('/api/me/email-preferences');
    expect(peticion.request.body).toEqual({ marketingOptOut: false });
    peticion.flush({ marketingOptOut: false });
    expect(await guarda).toEqual({ ok: true, valor: { sinPublicidad: false } });
  });
});
