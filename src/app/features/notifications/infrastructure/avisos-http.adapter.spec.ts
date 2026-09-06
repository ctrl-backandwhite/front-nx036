import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { AvisosHttpAdapter, DifusionHttpAdapter } from './avisos-http.adapter';

const DTO = {
  id: 'n-1',
  eventType: 'CONTACT_RECEIVED',
  title: 'Nuevo contacto',
  body: 'Hola',
  channel: 'INAPP',
  payload: { email: 'quien@ejemplo.com' },
  readAt: null,
  status: 'NEW',
  createdAt: '2026-09-01T10:00:00Z',
};

describe('AvisosHttpAdapter', () => {
  let adaptador: AvisosHttpAdapter;
  let difusion: DifusionHttpAdapter;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        AvisosHttpAdapter,
        DifusionHttpAdapter,
      ],
    });
    adaptador = TestBed.inject(AvisosHttpAdapter);
    difusion = TestBed.inject(DifusionHttpAdapter);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('traduce el aviso al vocabulario del dominio', async () => {
    const promesa = adaptador.lista('inbox');

    const peticion = http.expectOne((p) => p.url === '/api/me/notifications');
    expect(peticion.request.params.get('folder')).toBe('inbox');
    peticion.flush([DTO]);

    const resultado = await promesa;
    expect(resultado.ok).toBe(true);
    if (resultado.ok) {
      expect(resultado.valor[0].tipoDeSuceso).toBe('CONTACT_RECEIVED');
      expect(resultado.valor[0].titulo).toBe('Nuevo contacto');
      expect(resultado.valor[0].datos).toEqual({ email: 'quien@ejemplo.com' });
    }
  });

  /**
   * La MISMA ruta que la campana. Cuando cada uno miraba una distinta, el resultado era un contador con
   * dos avisos sobre una pantalla que decía «sin notificaciones».
   */
  it('el contador sale de /me/notifications, igual que la lista', async () => {
    const promesa = adaptador.sinLeer();
    http.expectOne('/api/me/notifications/unread-count').flush({ count: 4 });

    expect(await promesa).toEqual({ ok: true, valor: 4 });
  });

  it('una respuesta sin contador se lee como cero', async () => {
    const promesa = adaptador.sinLeer();
    http.expectOne('/api/me/notifications/unread-count').flush({});

    expect(await promesa).toEqual({ ok: true, valor: 0 });
  });

  it('cada movimiento pega en su ruta', async () => {
    const acciones: [Promise<unknown>, string, string][] = [];
    acciones.push([adaptador.archiva('n-1'), '/api/me/notifications/n-1/archive', 'POST']);
    http.expectOne('/api/me/notifications/n-1/archive').flush(null);

    acciones.push([adaptador.aLaPapelera('n-1'), '/api/me/notifications/n-1', 'DELETE']);
    http.expectOne('/api/me/notifications/n-1').flush(null);

    acciones.push([
      adaptador.borraParaSiempre('n-1'),
      '/api/me/notifications/n-1/permanent',
      'DELETE',
    ]);
    http.expectOne('/api/me/notifications/n-1/permanent').flush(null);

    for (const [promesa] of acciones) {
      expect(await promesa).toEqual({ ok: true, valor: undefined });
    }
  });

  it('el estado viaja codificado como parámetro de consulta', async () => {
    const promesa = adaptador.cambiaEstado('n-1', 'IN_PROGRESS');
    http.expectOne('/api/me/notifications/n-1/status?value=IN_PROGRESS').flush(null);

    expect((await promesa).ok).toBe(true);
  });

  it('la difusión dice a cuánta gente llegó', async () => {
    const promesa = difusion.envia({ destino: 'all', titulo: 'Aviso', cuerpo: 'Hola' });

    const peticion = http.expectOne('/api/admin/notifications/send');
    expect(peticion.request.body).toEqual({ target: 'all', title: 'Aviso', body: 'Hola' });
    peticion.flush({ sent: 120 });

    expect(await promesa).toEqual({ ok: true, valor: 120 });
  });

  it('la respuesta por correo va a la ruta de contacto del panel', async () => {
    const promesa = difusion.responde({
      email: 'quien@ejemplo.com',
      asunto: 'Re: Hola',
      mensaje: 'Ya está',
    });

    const peticion = http.expectOne('/api/admin/contact/reply');
    expect(peticion.request.body).toEqual({
      email: 'quien@ejemplo.com',
      subject: 'Re: Hola',
      message: 'Ya está',
    });
    peticion.flush({ sent: true });

    expect((await promesa).ok).toBe(true);
  });

  it('un rechazo del servidor llega como error del dominio, sin lanzar', async () => {
    const promesa = adaptador.lista('trash');
    http.expectOne((p) => p.url === '/api/me/notifications').flush(
      { message: 'No autorizado' },
      { status: 403, statusText: 'Forbidden' },
    );

    const resultado = await promesa;
    expect(resultado.ok).toBe(false);
    if (!resultado.ok) {
      expect(resultado.error.tipo).toBe('sin-permiso');
    }
  });
});
