import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { RestableceContrasenaHttpAdapter } from './restablece-contrasena-http.adapter';

describe('RestableceContrasenaHttpAdapter', () => {
  let adaptador: RestableceContrasenaHttpAdapter;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), RestableceContrasenaHttpAdapter],
    });
    adaptador = TestBed.inject(RestableceContrasenaHttpAdapter);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('pide el enlace con el correo y nada más', async () => {
    const promesa = adaptador.solicita('alguien@ejemplo.com');

    const peticion = http.expectOne('/api/auth/password-reset/request');
    expect(peticion.request.body).toEqual({ email: 'alguien@ejemplo.com' });
    peticion.flush(null);

    expect((await promesa).ok).toBe(true);
  });

  it('confirma con el testigo del enlace y la contraseña nueva', async () => {
    const promesa = adaptador.confirma('t-123', 'Segura123!');

    const peticion = http.expectOne('/api/auth/password-reset/confirm');
    expect(peticion.request.body).toEqual({ token: 't-123', newPassword: 'Segura123!' });
    peticion.flush(null);

    expect((await promesa).ok).toBe(true);
  });

  it('un enlace caducado llega como error del dominio, sin lanzar', async () => {
    const promesa = adaptador.confirma('caducado', 'Segura123!');
    http.expectOne('/api/auth/password-reset/confirm').flush(
      { message: 'El enlace ha caducado.' },
      { status: 400, statusText: 'Bad Request' },
    );

    const resultado = await promesa;
    expect(resultado.ok).toBe(false);
    if (!resultado.ok) {
      expect(resultado.error.mensaje).toBe('El enlace ha caducado.');
    }
  });
});
