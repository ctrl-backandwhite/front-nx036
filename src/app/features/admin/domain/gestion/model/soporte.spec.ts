import { Ticket, admiteResolucion } from './soporte';

function ticket(estado: string): Ticket {
  return {
    id: 't1', clase: 'SUPPORT', estado, prioridad: 'NORMAL', asunto: 'No llega el pedido',
    creadoEl: '2026-03-05T10:00:00Z',
  };
}

describe('admiteResolucion', () => {
  it('un caso abierto se puede cerrar', () => {
    expect(admiteResolucion(ticket('OPEN'))).toBe(true);
  });

  /** Ofrecer el formulario de cierre sobre un caso ya resuelto invita a resolverlo dos veces. */
  it('uno ya resuelto no ofrece el formulario de cierre', () => {
    expect(admiteResolucion(ticket('RESOLVED'))).toBe(false);
  });

  it('uno cerrado sí puede recibir resolución, que es como se documenta a posteriori', () => {
    expect(admiteResolucion(ticket('CLOSED'))).toBe(true);
  });
});
