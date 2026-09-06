import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { CobroHttpAdapter } from './cobro-http.adapter';

describe('CobroHttpAdapter', () => {
  let adaptador: CobroHttpAdapter;
  let red: HttpTestingController;

  const PERFIL = {
    payoutMethod: 'bank',
    bankHolder: 'Ana',
    bankIbanMasked: '****1332',
    bankBic: 'BIC',
    paypalEmail: 'a@b.c',
    hasBank: true,
    hasPaypal: true,
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), CobroHttpAdapter],
    });
    adaptador = TestBed.inject(CobroHttpAdapter);
    red = TestBed.inject(HttpTestingController);
  });

  afterEach(() => red.verify());

  it('normaliza el método preferido a mayúsculas', async () => {
    const promesa = adaptador.consultaPerfil();
    red.expectOne('/api/me/affiliate/payout-profile').flush(PERFIL);

    const resultado = await promesa;
    expect(resultado.ok && resultado.valor.metodoPreferido).toBe('BANK');
  });

  it('sin método guardado cae en la cartera', async () => {
    const promesa = adaptador.consultaPerfil();
    red
      .expectOne('/api/me/affiliate/payout-profile')
      .flush({ payoutMethod: '', hasBank: false, hasPaypal: false });

    const resultado = await promesa;
    expect(resultado.ok && resultado.valor.metodoPreferido).toBe('WALLET');
  });

  /** Enviar el IBAN vacío borraría el guardado: el navegador nunca tiene el real para reenviarlo. */
  it('no manda la clave del IBAN cuando no se ha tecleado uno nuevo', async () => {
    const promesa = adaptador.guardaPerfil({
      titular: 'Ana',
      bic: 'BIC',
      correoPaypal: 'a@b.c',
      metodoPreferido: 'BANK',
      contrasena: 'secreta',
    });

    const peticion = red.expectOne('/api/me/affiliate/payout-profile');
    expect(peticion.request.method).toBe('PUT');
    expect(peticion.request.body).not.toHaveProperty('iban');
    peticion.flush(PERFIL);

    expect((await promesa).ok).toBe(true);
  });

  it('lo manda cuando sí lo hay', async () => {
    const promesa = adaptador.guardaPerfil({
      titular: 'Ana',
      bic: 'BIC',
      correoPaypal: 'a@b.c',
      metodoPreferido: 'BANK',
      contrasena: 'secreta',
      iban: 'ES91',
    });

    const peticion = red.expectOne('/api/me/affiliate/payout-profile');
    expect(peticion.request.body.iban).toBe('ES91');
    peticion.flush(PERFIL);

    expect((await promesa).ok).toBe(true);
  });

  /** Solicitar NO paga: deja constancia para que un administrador lo apruebe y lo transfiera fuera. */
  it('la solicitud de cobro solo registra el método', async () => {
    const promesa = adaptador.solicita('WALLET');
    const peticion = red.expectOne('/api/me/affiliate/payout-request');
    expect(peticion.request.body).toEqual({ method: 'WALLET' });
    peticion.flush({ payoutId: 'x', status: 'REQUESTED', method: 'WALLET' });

    expect((await promesa).ok).toBe(true);
  });

  it('un rechazo por contraseña llega con su código para poder explicarlo', async () => {
    const promesa = adaptador.guardaPerfil({
      titular: '',
      bic: '',
      correoPaypal: '',
      metodoPreferido: 'WALLET',
      contrasena: 'mala',
    });
    red
      .expectOne('/api/me/affiliate/payout-profile')
      .flush({ code: 'INVALID_PASSWORD', message: 'no' }, { status: 400, statusText: 'Bad Request' });

    const resultado = await promesa;
    expect(!resultado.ok && resultado.error.codigo).toBe('INVALID_PASSWORD');
  });
});
