import { DeferBlockBehavior } from '@angular/core/testing';
import { render, screen } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { AvisosStore } from '@ds/component/avisos/avisos.store';
import { AppError, creaError } from '@shared/error/app-error';
import { Result, exito, fallo } from '@shared/result/result';
import { NuevoTicket, Ticket } from '../../domain/model/ticket';
import { MIS_TICKETS_PORT } from '../../domain/port/tickets.port';
import { MisTickets } from '../../application/use-case/mis-tickets.use-case';
import { ConversaEnElTicket } from '../../application/use-case/conversa-en-el-ticket.use-case';
import { MisTicketsPage } from './mis-tickets.page';

/**
 * Los tickets de quien compra.
 *
 * <p>Es la pantalla a la que se llega cuando algo YA ha ido mal, así que el rechazo al abrir un ticket
 * es el momento más delicado de todos: sin aviso, el formulario se quedaba abierto, sin ticket y sin una
 * palabra. Quien lo intentaba no sabía si se había mandado, y volvía a intentarlo o se iba.
 */
function ticket(parcial: Partial<Ticket> = {}): Ticket {
  return {
    id: 't1',
    clase: 'SUPPORT',
    asunto: 'Mi pedido no llega',
    cuerpo: 'Hace tres semanas',
    estado: 'OPEN',
    prioridad: 'NORMAL',
    creadoEl: '2026-09-01T10:00:00Z',
    ...parcial,
  };
}

interface Opciones {
  tickets?: readonly Ticket[];
  abrir?: 'falla';
}

async function monta(opciones: Opciones = {}) {
  const puerto = {
    mios: vi.fn(
      async (): Promise<Result<readonly Ticket[], AppError>> => exito(opciones.tickets ?? [ticket()]),
    ),
    abre: vi.fn(async (nuevo: NuevoTicket) =>
      opciones.abrir === 'falla'
        ? fallo(creaError('demasiadas-peticiones', 'Has abierto demasiados tickets hoy'))
        : exito(ticket({ id: 't2', asunto: nuevo.asunto })),
    ),
  };

  const vista = await render(MisTicketsPage, {
    deferBlockBehavior: DeferBlockBehavior.Playthrough,
    providers: [
      AvisosStore,
      MisTickets,
      { provide: MIS_TICKETS_PORT, useValue: puerto },
      {
        provide: ConversaEnElTicket,
        useValue: { mensajes: async () => exito([]), responde: async () => exito({ id: 'm1' }) },
      },
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

async function rellena(asunto: string) {
  await userEvent.type(document.querySelector('#ticket-asunto')!, asunto);
  await userEvent.type(document.querySelector('#ticket-cuerpo')!, 'Lo que ha pasado');
}

describe('MisTicketsPage', () => {
  beforeEach(() => {
    document.cookie = 'nx036-locale=es';
  });

  it('enseña los tickets propios al entrar', async () => {
    const { puerto } = await monta();

    expect(puerto.mios).toHaveBeenCalled();
    expect(screen.getByText('Mi pedido no llega')).toBeInTheDocument();
  });

  it('sin tickets lo dice', async () => {
    await monta({ tickets: [] });

    expect(screen.getByText('Aún no has abierto tickets')).toBeInTheDocument();
  });

  it('abrir uno nuevo manda el asunto recortado y recarga la lista', async () => {
    const { puerto, asienta } = await monta();

    await userEvent.click(screen.getByRole('button', { name: /Nuevo ticket/ }));
    await asienta();
    await rellena('  El paquete llegó roto  ');
    /* «Nuevo ticket» rotula tanto el botón que abre el formulario como el que lo envía: el de enviar es
     * el último, ya dentro del diálogo. */
    await userEvent.click(screen.getAllByRole('button', { name: /Nuevo ticket/ }).at(-1)!);
    await asienta();

    expect(puerto.abre).toHaveBeenCalledWith(
      expect.objectContaining({ asunto: 'El paquete llegó roto', clase: 'SUPPORT' }),
    );
    expect(puerto.mios).toHaveBeenCalledTimes(2);
  });

  /** Es la pantalla a la que se llega cuando algo ya ha ido mal: aquí callar es lo peor que se puede hacer. */
  it('si el servidor lo rechaza, se DICE y el formulario sigue abierto con lo escrito', async () => {
    const { avisos, asienta } = await monta({ abrir: 'falla' });

    await userEvent.click(screen.getByRole('button', { name: /Nuevo ticket/ }));
    await asienta();
    await rellena('El paquete llegó roto');
    await userEvent.click(screen.getAllByRole('button', { name: /Nuevo ticket/ }).at(-1)!);
    await asienta();

    expect(avisos.avisos().at(-1)).toMatchObject({
      tipo: 'error',
      mensaje: 'Has abierto demasiados tickets hoy',
    });
    expect(document.querySelector<HTMLInputElement>('#ticket-asunto')!.value).toBe(
      'El paquete llegó roto',
    );
  });

  it('un ticket sin asunto no se puede abrir', async () => {
    const { puerto, asienta } = await monta();

    await userEvent.click(screen.getByRole('button', { name: /Nuevo ticket/ }));
    await asienta();

    expect(screen.getAllByRole('button', { name: /Nuevo ticket/ }).at(-1)).toBeDisabled();
    expect(puerto.abre).not.toHaveBeenCalled();
  });

  it('un fallo al cargar la lista se cuenta', async () => {
    const puerto = { mios: vi.fn(), abre: vi.fn() };
    puerto.mios.mockResolvedValue(fallo(creaError('sin-conexion', 'No hay red')));

    const vista = await render(MisTicketsPage, {
      deferBlockBehavior: DeferBlockBehavior.Playthrough,
      providers: [
        AvisosStore,
        MisTickets,
        { provide: MIS_TICKETS_PORT, useValue: puerto },
        {
          provide: ConversaEnElTicket,
          useValue: { mensajes: async () => exito([]), responde: async () => exito({ id: 'm1' }) },
        },
      ],
    });
    await vista.fixture.whenStable();
    vista.fixture.detectChanges();

    const avisos = vista.fixture.debugElement.injector.get(AvisosStore);
    expect(avisos.avisos().at(-1)).toMatchObject({ tipo: 'error', mensaje: 'No hay red' });
  });
});
