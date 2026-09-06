import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { exito, fallo } from '@shared/result/result';
import { creaError } from '@shared/error/app-error';
import { Ticket } from '../../domain/model/ticket';
import {
  HILO_DE_TICKET_PORT,
  HiloDeTicketPort,
  MIS_TICKETS_PORT,
  MisTicketsPort,
  TICKETS_DE_SOPORTE_PORT,
  TicketsDeSoportePort,
} from '../../domain/port/tickets.port';
import { AtiendeTickets } from './atiende-tickets.use-case';
import { ConversaEnElTicket } from './conversa-en-el-ticket.use-case';
import { MisTickets } from './mis-tickets.use-case';
import { EscribeALaCasa } from './escribe-a-la-casa.use-case';
import { CONTACTO_PORT, ContactoPort } from '../../domain/port/contacto.port';

const TICKET: Ticket = {
  id: 't-1',
  clase: 'SUPPORT',
  asunto: 'Hola',
  estado: 'OPEN',
  prioridad: 'normal',
  creadoEl: '2026-09-01T10:00:00Z',
};

describe('Casos de uso de tickets y contacto', () => {
  let mios: MisTicketsPort;
  let soporte: TicketsDeSoportePort;
  let hilo: HiloDeTicketPort;
  let contacto: ContactoPort;

  beforeEach(() => {
    mios = {
      mios: vi.fn().mockResolvedValue(exito([TICKET])),
      abre: vi.fn().mockResolvedValue(exito(TICKET)),
    };
    soporte = {
      lista: vi.fn().mockResolvedValue(exito([TICKET])),
      resuelve: vi.fn().mockResolvedValue(exito(TICKET)),
    };
    hilo = {
      mensajes: vi.fn().mockResolvedValue(exito([])),
      responde: vi.fn().mockResolvedValue(
        exito({ id: 'm-1', deSoporte: false, cuerpo: 'hola', creadoEl: '2026-09-01T10:00:00Z' }),
      ),
    };
    contacto = { envia: vi.fn().mockResolvedValue(exito(undefined)) };

    TestBed.configureTestingModule({
      providers: [
        { provide: MIS_TICKETS_PORT, useValue: mios },
        { provide: TICKETS_DE_SOPORTE_PORT, useValue: soporte },
        { provide: HILO_DE_TICKET_PORT, useValue: hilo },
        { provide: CONTACTO_PORT, useValue: contacto },
      ],
    });
  });

  it('abre el ticket recortando lo escrito y convirtiendo lo vacío en ausencia', async () => {
    await TestBed.inject(MisTickets).abre({ clase: 'SUPPORT', asunto: '  Hola  ', cuerpo: '   ' });

    expect(mios.abre).toHaveBeenCalledWith({
      clase: 'SUPPORT',
      asunto: 'Hola',
      cuerpo: undefined,
    });
  });

  it('devuelve el fallo del alta en vez de tragárselo', async () => {
    vi.mocked(mios.abre).mockResolvedValue(fallo(creaError('peticion-invalida', 'Falta el asunto')));

    const resultado = await TestBed.inject(MisTickets).abre({ clase: 'SUPPORT', asunto: 'x' });

    expect(resultado.ok).toBe(false);
  });

  it('el filtro vacío no viaja como cadena vacía: es «sin filtro»', async () => {
    await TestBed.inject(AtiendeTickets).consulta('');

    expect(soporte.lista).toHaveBeenCalledWith(undefined);
  });

  it('resolver recorta el texto de la resolución', async () => {
    await TestBed.inject(AtiendeTickets).resuelve('t-1', '  devuelto  ');

    expect(soporte.resuelve).toHaveBeenCalledWith('t-1', 'devuelto');
  });

  it('el hilo elige la puerta del backend según el lado desde el que se mira', async () => {
    const conversa = TestBed.inject(ConversaEnElTicket);

    await conversa.mensajes('t-1', true);
    await conversa.responde('t-1', '  ya está  ', false);

    expect(hilo.mensajes).toHaveBeenCalledWith('t-1', true);
    expect(hilo.responde).toHaveBeenCalledWith('t-1', 'ya está', false);
  });

  it('el formulario de contacto recorta todo antes de mandarlo', async () => {
    await TestBed.inject(EscribeALaCasa).ejecuta({
      nombre: ' Ana ',
      email: ' ana@ejemplo.com ',
      asunto: '  Duda  ',
      mensaje: '  ¿Enviáis a Canarias?  ',
    });

    expect(contacto.envia).toHaveBeenCalledWith({
      nombre: 'Ana',
      email: 'ana@ejemplo.com',
      asunto: 'Duda',
      mensaje: '¿Enviáis a Canarias?',
    });
  });
});
