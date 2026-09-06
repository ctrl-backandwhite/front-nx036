import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { AtribucionHttpAdapter } from './atribucion-http.adapter';

describe('AtribucionHttpAdapter', () => {
  let adaptador: AtribucionHttpAdapter;
  let red: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), AtribucionHttpAdapter],
    });
    adaptador = TestBed.inject(AtribucionHttpAdapter);
    red = TestBed.inject(HttpTestingController);
  });

  afterEach(() => red.verify());

  /** Manda el testigo del servidor: es lo que mantiene la atribución si el del equipo se perdió. */
  it('se queda con el testigo que devuelve el servidor', async () => {
    const promesa = adaptador.registra('ANA', 'mio');
    const peticion = red.expectOne('/api/affiliate/track');
    expect(peticion.request.body).toEqual({ ref: 'ANA', visitorToken: 'mio' });
    peticion.flush({ visitorToken: 'del-servidor', attributed: true });

    const resultado = await promesa;
    expect(resultado.ok && resultado.valor).toBe('del-servidor');
  });

  it('si el servidor no devuelve testigo, se conserva el que se mandó', async () => {
    const promesa = adaptador.registra('ANA', 'mio');
    red.expectOne('/api/affiliate/track').flush({});

    const resultado = await promesa;
    expect(resultado.ok && resultado.valor).toBe('mio');
  });

  it('ata el testigo a la cuenta', async () => {
    const promesa = adaptador.vincula('mio');
    const peticion = red.expectOne('/api/me/affiliate/bind');
    expect(peticion.request.body).toEqual({ visitorToken: 'mio' });
    peticion.flush({});

    expect((await promesa).ok).toBe(true);
  });

  it('un fallo de red llega como error, no como silencio', async () => {
    const promesa = adaptador.registra('ANA', 'mio');
    red.expectOne('/api/affiliate/track').error(new ProgressEvent('error'), { status: 0 });

    expect((await promesa).ok).toBe(false);
  });
});
