import { DeferBlockBehavior } from '@angular/core/testing';
import { render, screen, waitFor, within } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { exito, fallo } from '@shared/result/result';
import { creaError } from '@shared/error/app-error';
import { DialogoStore } from '@ds/component/dialogo/dialogo.store';
import { SOPORTE_PORT } from '../../../domain/gestion/port/soporte.port';
import { Ticket } from '../../../domain/gestion/model/soporte';
import {
  ConsultaElHilo, ConsultaTickets, RespondeAlTicket, ResuelveElTicket,
} from '../../../application/gestion/use-case/soporte.use-case';
import { SoportePage } from './soporte.page';
import { instalaObservadorDeVisibilidad } from '../pruebas/visibilidad';

/**
 * El DOM simulado de las pruebas NO trae `IntersectionObserver`, que es lo que usa `@defer (on
 * viewport)` para saber cuándo se llega a un bloque. Sin el doble, montar la pantalla revienta con
 * «IntersectionObserver is not defined» y el fallo parece del componente cuando es del entorno.
 */
instalaObservadorDeVisibilidad();

const ticket = (parcial: Partial<Ticket>): Ticket => ({
  id: 't1',
  clase: 'SUPPORT',
  estado: 'OPEN',
  prioridad: 'NORMAL',
  asunto: 'No me llega el pedido',
  cuerpo: 'Lo pedí hace un mes',
  creadoEl: '2026-09-01T10:00:00Z',
  ...parcial,
});

function enEspanol(): void {
  document.cookie = 'nx036-locale=es';
}

/**
 * El corredor de pruebas es compartido y va con mucha carga: montar una pantalla entera cuesta
 * segundos, y el plazo de cinco que trae Vitest por defecto se agota sin que falle ninguna
 * comprobación. Se amplía el plazo del bloque, no las comprobaciones.
 */
const PLAZO_MS = 30_000;

describe('SoportePage', { timeout: PLAZO_MS }, () => {
  const puerto = { tickets: vi.fn(), mensajes: vi.fn(), responde: vi.fn(), resuelve: vi.fn() };
  const dialogo = { confirma: vi.fn(), alerta: vi.fn() };

  const monta = () =>
    render(SoportePage, {
      // `Playthrough` pinta los bloques `@defer` como si ya se hubiera llegado a ellos: en las
      // pruebas nadie se desplaza por la página.
      deferBlockBehavior: DeferBlockBehavior.Playthrough,
      providers: [
        { provide: SOPORTE_PORT, useValue: puerto },
        { provide: DialogoStore, useValue: dialogo },
        ConsultaTickets, ConsultaElHilo, RespondeAlTicket, ResuelveElTicket,
      ],
    });

  /** Sin retardo entre pulsaciones: el valor por defecto añade un turno del bucle por tecla. */
  let usuario: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    usuario = userEvent.setup({ delay: null });
    enEspanol();
    vi.resetAllMocks();
    puerto.tickets.mockResolvedValue(exito([]));
    puerto.mensajes.mockResolvedValue(exito([]));
    puerto.resuelve.mockResolvedValue(exito(undefined));
    dialogo.alerta.mockResolvedValue(true);
  });

  it('sin casos, la bandeja lo dice en vez de quedarse en blanco', async () => {
    await monta();

    expect(await screen.findByText('No hay tickets.')).toBeInTheDocument();
  });

  it('enseña cada caso con su asunto y su estado', async () => {
    puerto.tickets.mockResolvedValue(exito([ticket({})]));

    await monta();

    // El estado se busca DENTRO de la tarjeta: «OPEN» también es una opción del filtro de arriba.
    const tarjeta = await screen.findByRole('button', { name: /No me llega el pedido/ });
    expect(within(tarjeta).getByText('OPEN')).toBeInTheDocument();
  });

  it('filtrar por estado vuelve a preguntar solo por ese estado', async () => {
    puerto.tickets.mockResolvedValue(exito([ticket({})]));

    await monta();
    await usuario.selectOptions(await screen.findByLabelText('Estado'), 'RESOLVED');

    await waitFor(() => expect(puerto.tickets).toHaveBeenLastCalledWith('RESOLVED'));
  });

  it('al abrir un caso se ve la conversación y el cierre', async () => {
    puerto.tickets.mockResolvedValue(exito([ticket({})]));

    await monta();
    await usuario.click(await screen.findByText('No me llega el pedido'));

    expect(await screen.findByLabelText('Resolución (opcional)')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Resolver' })).toBeInTheDocument();
  });

  /** Un caso ya resuelto no vuelve a ofrecer el cierre: no hay nada que volver a decidir. */
  it('un caso resuelto no ofrece el formulario de cierre', async () => {
    puerto.tickets.mockResolvedValue(exito([ticket({ estado: 'RESOLVED', resolucion: 'Reenviado' })]));

    await monta();
    await usuario.click(await screen.findByText('No me llega el pedido'));

    expect(screen.queryByRole('button', { name: 'Resolver' })).not.toBeInTheDocument();
  });

  it('cerrar el caso manda la resolución y vuelve a leer la bandeja', async () => {
    puerto.tickets.mockResolvedValue(exito([ticket({})]));

    await monta();
    await usuario.click(await screen.findByText('No me llega el pedido'));
    await usuario.type(await screen.findByLabelText('Resolución (opcional)'), 'Reembolsado');
    await usuario.click(screen.getByRole('button', { name: 'Resolver' }));

    await waitFor(() => expect(puerto.resuelve).toHaveBeenCalledWith('t1', 'Reembolsado'));
    await waitFor(() => expect(puerto.tickets).toHaveBeenCalledTimes(2));
  });

  /**
   * Sin enseñar el rechazo, la ventana se quedaba abierta y quieta: quien atendía la cerraba dando el
   * caso por resuelto y el cliente seguía esperando con el ticket abierto.
   */
  it('un rechazo del backend se enseña, no se traga', async () => {
    puerto.tickets.mockResolvedValue(exito([ticket({})]));
    puerto.resuelve.mockResolvedValue(fallo(creaError('conflicto', 'Ya lo cerró otra persona')));

    await monta();
    await usuario.click(await screen.findByText('No me llega el pedido'));
    await usuario.type(await screen.findByLabelText('Resolución (opcional)'), 'Reembolsado');
    await usuario.click(screen.getByRole('button', { name: 'Resolver' }));

    await waitFor(() =>
      expect(dialogo.alerta).toHaveBeenCalledWith('Ya lo cerró otra persona', undefined, 'error'),
    );
  });

  /** Cerrar sin explicación deja al cliente sin saber qué pasó con su reclamación. */
  it('cerrar sin texto de resolución no llega al backend y se avisa', async () => {
    puerto.tickets.mockResolvedValue(exito([ticket({})]));

    await monta();
    await usuario.click(await screen.findByText('No me llega el pedido'));
    await usuario.click(await screen.findByRole('button', { name: 'Resolver' }));

    await waitFor(() => expect(dialogo.alerta).toHaveBeenCalled());
    expect(puerto.resuelve).not.toHaveBeenCalled();
  });
});
