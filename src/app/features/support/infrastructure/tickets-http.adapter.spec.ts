import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { TicketsHttpAdapter } from './tickets-http.adapter';

const TICKET_DTO = {
  id: 't-1',
  kind: 'DISPUTE',
  subject: 'No me llega',
  body: 'Van tres semanas',
  status: 'OPEN',
  priority: 'high',
  createdAt: '2026-09-01T10:00:00Z',
};

describe('TicketsHttpAdapter', () => {
  let adaptador: TicketsHttpAdapter;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), TicketsHttpAdapter],
    });
    adaptador = TestBed.inject(TicketsHttpAdapter);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('traduce el ticket al vocabulario del dominio', async () => {
    const promesa = adaptador.mios();
    http.expectOne('/api/me/tickets').flush([TICKET_DTO]);

    const resultado = await promesa;
    expect(resultado.ok).toBe(true);
    if (resultado.ok) {
      expect(resultado.valor[0]).toEqual({
        id: 't-1',
        clase: 'DISPUTE',
        asunto: 'No me llega',
        cuerpo: 'Van tres semanas',
        idPedido: undefined,
        estado: 'OPEN',
        prioridad: 'high',
        resolucion: undefined,
        creadoEl: '2026-09-01T10:00:00Z',
      });
    }
  });

  it('una respuesta vacía no rompe la lista', async () => {
    const promesa = adaptador.lista();
    http.expectOne((p) => p.url === '/api/admin/tickets').flush(null);

    expect(await promesa).toEqual({ ok: true, valor: [] });
  });

  it('abre el ticket con el vocabulario del backend', async () => {
    const promesa = adaptador.abre({ clase: 'SUPPORT', asunto: 'Hola', cuerpo: 'qué tal' });

    const peticion = http.expectOne('/api/me/tickets');
    expect(peticion.request.body).toEqual({
      kind: 'SUPPORT',
      subject: 'Hola',
      body: 'qué tal',
      orderId: undefined,
      priority: undefined,
    });
    peticion.flush(TICKET_DTO);

    expect((await promesa).ok).toBe(true);
  });

  /** Cada lado tiene su ruta: el permiso lo comprueba el backend, aquí solo se elige la puerta. */
  it('el hilo del cliente y el del panel van por rutas distintas', async () => {
    const delCliente = adaptador.mensajes('t-1', false);
    http.expectOne('/api/me/tickets/t-1/replies').flush([]);
    expect((await delCliente).ok).toBe(true);

    const deLaCasa = adaptador.mensajes('t-1', true);
    http.expectOne('/api/admin/tickets/t-1/replies').flush([]);
    expect((await deLaCasa).ok).toBe(true);
  });

  it('responder desde el panel escribe en la ruta del panel', async () => {
    const promesa = adaptador.responde('t-1', 'ya está', true);

    const peticion = http.expectOne('/api/admin/tickets/t-1/replies');
    expect(peticion.request.body).toEqual({ body: 'ya está' });
    peticion.flush({ id: 'm-1', fromSupport: true, body: 'ya está', createdAt: '2026-09-01T11:00:00Z' });

    const resultado = await promesa;
    expect(resultado.ok && resultado.valor.deSoporte).toBe(true);
  });

  it('convierte el rechazo en un error del dominio, sin lanzar', async () => {
    const promesa = adaptador.resuelve('t-1', 'devuelto');
    http.expectOne('/api/admin/tickets/t-1/resolve').flush(
      { message: 'Ya estaba resuelto.' },
      { status: 409, statusText: 'Conflict' },
    );

    const resultado = await promesa;
    expect(resultado.ok).toBe(false);
    if (!resultado.ok) {
      expect(resultado.error.tipo).toBe('conflicto');
    }
  });
});
