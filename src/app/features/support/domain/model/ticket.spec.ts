import { describe, expect, it } from 'vitest';
import { MensajeDelHilo, Ticket, esMio, estaResuelto } from './ticket';

function mensaje(deSoporte: boolean): MensajeDelHilo {
  return { id: 'm-1', deSoporte, cuerpo: 'hola', creadoEl: '2026-09-01T10:00:00Z' };
}

function ticket(estado: string): Ticket {
  return {
    id: 't-1',
    clase: 'SUPPORT',
    asunto: 'No me llega',
    estado,
    prioridad: 'normal',
    creadoEl: '2026-09-01T10:00:00Z',
  };
}

describe('esMio', () => {
  /** El mismo hilo se pinta al revés según el lado: tenerlo escrito una vez evita que discrepen. */
  it('para el personal de la casa, «mío» es lo que escribió soporte', () => {
    expect(esMio(mensaje(true), true)).toBe(true);
    expect(esMio(mensaje(false), true)).toBe(false);
  });

  it('para quien abrió el ticket es justo al revés', () => {
    expect(esMio(mensaje(false), false)).toBe(true);
    expect(esMio(mensaje(true), false)).toBe(false);
  });
});

describe('estaResuelto', () => {
  it('reconoce el estado venga como venga escrito', () => {
    // El backend manda unas veces mayúsculas y otras minúsculas.
    expect(estaResuelto(ticket('RESOLVED'))).toBe(true);
    expect(estaResuelto(ticket('resolved'))).toBe(true);
  });

  it('cualquier otro estado sigue abierto', () => {
    expect(estaResuelto(ticket('OPEN'))).toBe(false);
    expect(estaResuelto(ticket('CLOSED'))).toBe(false);
  });
});
