import { DeferBlockBehavior } from '@angular/core/testing';
import { render, screen } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { AvisosStore } from '@ds/component/avisos/avisos.store';
import { AppError, creaError } from '@shared/error/app-error';
import { Result, exito, fallo } from '@shared/result/result';
import { Ticket } from '../../domain/model/ticket';
import { TICKETS_DE_SOPORTE_PORT } from '../../domain/port/tickets.port';
import { AtiendeTickets } from '../../application/use-case/atiende-tickets.use-case';
import { ConversaEnElTicket } from '../../application/use-case/conversa-en-el-ticket.use-case';
import { TicketsDeSoportePage } from './tickets-de-soporte.page';

/**
 * La bandeja de soporte del panel.
 *
 * <p>El comportamiento que cuesta caro perder está en el cierre: **si el backend rechaza la resolución,
 * se DICE**. Sin eso, el diálogo se quedaba abierto y quieto, quien atiende lo cerraba dando el caso por
 * atendido, y el cliente seguía esperando una respuesta que nunca se guardó.
 *
 * <p>Y al abrir un ticket ya resuelto se precarga su resolución: corregir un texto no debería obligar a
 * reescribirlo entero.
 */
function ticket(parcial: Partial<Ticket> = {}): Ticket {
  return {
    id: 't1',
    clase: 'SUPPORT',
    asunto: 'No ha llegado mi pedido',
    cuerpo: 'Pedí hace tres semanas',
    estado: 'OPEN',
    prioridad: 'HIGH',
    creadoEl: '2026-09-01T10:00:00Z',
    ...parcial,
  };
}

interface Opciones {
  tickets?: readonly Ticket[];
  resolver?: 'falla';
}

async function monta(opciones: Opciones = {}) {
  const puerto = {
    lista: vi.fn(
      async (_estado?: string): Promise<Result<readonly Ticket[], AppError>> =>
        exito(opciones.tickets ?? [ticket()]),
    ),
    resuelve: vi.fn(async (_id: string, resolucion: string) =>
      opciones.resolver === 'falla'
        ? fallo(creaError('conflicto', 'Ese ticket ya lo cerró otra persona'))
        : exito(ticket({ estado: 'RESOLVED', resolucion })),
    ),
  };
  const hilo = {
    mensajes: vi.fn(async () => exito([])),
    responde: vi.fn(async () => exito({ id: 'm1' })),
  };

  const vista = await render(TicketsDeSoportePage, {
    deferBlockBehavior: DeferBlockBehavior.Playthrough,
    providers: [
      AvisosStore,
      AtiendeTickets,
      { provide: TICKETS_DE_SOPORTE_PORT, useValue: puerto },
      { provide: ConversaEnElTicket, useValue: hilo },
    ],
  });
  await vista.fixture.whenStable();
  vista.fixture.detectChanges();

  const asienta = async () => {
    await vista.fixture.whenStable();
    vista.fixture.detectChanges();
    await vista.fixture.whenStable();
    vista.fixture.detectChanges();
  };

  return {
    vista,
    asienta,
    puerto,
    avisos: vista.fixture.debugElement.injector.get(AvisosStore),
  };
}

const resolucion = () => document.querySelector<HTMLTextAreaElement>('#ticket-resolucion')!;

describe('TicketsDeSoportePage', () => {
  beforeEach(() => {
    document.cookie = 'nx036-locale=es';
  });

  it('carga la bandeja entera al entrar, sin filtro', async () => {
    const { puerto } = await monta();

    expect(puerto.lista).toHaveBeenCalledWith(undefined);
    expect(screen.getByText('No ha llegado mi pedido')).toBeInTheDocument();
  });

  it('sin tickets lo dice, en vez de dejar la lista muda', async () => {
    await monta({ tickets: [] });

    expect(screen.getByText('No hay tickets.')).toBeInTheDocument();
  });

  it('un fallo al cargar se cuenta', async () => {
    const { puerto, avisos, asienta } = await monta();
    puerto.lista.mockResolvedValueOnce(fallo(creaError('sin-conexion', 'No hay red')));

    await userEvent.selectOptions(screen.getByRole('combobox'), 'OPEN');
    await asienta();

    expect(avisos.avisos().at(-1)).toMatchObject({ tipo: 'error', mensaje: 'No hay red' });
  });

  it('filtrar por estado vuelve a pedir la bandeja con ese estado', async () => {
    const { puerto, asienta } = await monta();
    puerto.lista.mockClear();

    await userEvent.selectOptions(screen.getByRole('combobox'), 'OPEN');
    await asienta();

    expect(puerto.lista).toHaveBeenCalledWith('OPEN');
  });

  describe('cerrar un caso', () => {
    it('se abre el ticket y se escribe la resolución', async () => {
      const { puerto, asienta } = await monta();

      await userEvent.click(screen.getByText('No ha llegado mi pedido'));
      await asienta();
      await userEvent.type(resolucion(), '  Reenviado por urgente  ');
      await userEvent.click(screen.getByRole('button', { name: /Resolver/ }));
      await asienta();

      /* Los espacios de sobra se recortan: la resolución se archiva y se lee después. */
      expect(puerto.resuelve).toHaveBeenCalledWith('t1', 'Reenviado por urgente');
    });

    /**
     * El fallo que esto impide: el diálogo se queda abierto y quieto, quien atiende lo cierra dando el
     * caso por atendido, y el cliente sigue esperando.
     */
    it('si el servidor lo rechaza, se DICE y el diálogo no se cierra', async () => {
      const { avisos, asienta } = await monta({ resolver: 'falla' });

      await userEvent.click(screen.getByText('No ha llegado mi pedido'));
      await asienta();
      await userEvent.type(resolucion(), 'Reenviado');
      await userEvent.click(screen.getByRole('button', { name: /Resolver/ }));
      await asienta();

      expect(avisos.avisos().at(-1)).toMatchObject({
        tipo: 'error',
        mensaje: 'Ese ticket ya lo cerró otra persona',
      });
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('al resolverlo se cierra el diálogo y se recarga la bandeja', async () => {
      const { puerto, asienta } = await monta();

      await userEvent.click(screen.getByText('No ha llegado mi pedido'));
      await asienta();
      puerto.lista.mockClear();
      await userEvent.type(resolucion(), 'Reenviado');
      await userEvent.click(screen.getByRole('button', { name: /Resolver/ }));
      await asienta();

      expect(screen.queryByRole('dialog')).toBeNull();
      expect(puerto.lista).toHaveBeenCalled();
    });

    /**
     * Un caso reabierto conserva lo que se escribió la vez anterior. Corregir esa resolución no debería
     * obligar a reescribirla entera, y por eso el campo llega precargado en vez de en blanco.
     */
    it('un ticket con resolución previa llega con ella escrita', async () => {
      const { asienta } = await monta({
        tickets: [ticket({ estado: 'OPEN', resolucion: 'Se reenvió el 3 de septiembre' })],
      });

      await userEvent.click(screen.getByText('No ha llegado mi pedido'));
      await asienta();

      expect(resolucion().value).toBe('Se reenvió el 3 de septiembre');
    });

    /** Un caso ya cerrado no se vuelve a cerrar: el formulario ni siquiera se ofrece. */
    it('un ticket ya resuelto no ofrece el formulario de cierre', async () => {
      const { asienta } = await monta({
        tickets: [ticket({ estado: 'RESOLVED', resolucion: 'Reenviado' })],
      });

      await userEvent.click(screen.getByText('No ha llegado mi pedido'));
      await asienta();

      expect(document.querySelector('#ticket-resolucion')).toBeNull();
    });
  });
});
