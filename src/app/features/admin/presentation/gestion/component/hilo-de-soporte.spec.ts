import { render, screen, waitFor } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { exito, fallo } from '@shared/result/result';
import { creaError } from '@shared/error/app-error';
import { SOPORTE_PORT } from '../../../domain/gestion/port/soporte.port';
import {
  ConsultaElHilo, RespondeAlTicket,
} from '../../../application/gestion/use-case/soporte.use-case';
import { HiloDeSoporte } from './hilo-de-soporte';

function enEspanol(): void {
  document.cookie = 'nx036-locale=es';
}

/**
 * El corredor de pruebas es compartido y va con mucha carga: montar una pantalla entera cuesta
 * segundos, y el plazo de cinco que trae Vitest por defecto se agota sin que falle ninguna
 * comprobación. Se amplía el plazo del bloque, no las comprobaciones.
 */
const PLAZO_MS = 30_000;

describe('HiloDeSoporte', { timeout: PLAZO_MS }, () => {
  const puerto = { tickets: vi.fn(), mensajes: vi.fn(), responde: vi.fn(), resuelve: vi.fn() };

  const monta = () =>
    render(HiloDeSoporte, {
      inputs: { idTicket: 't1' },
      providers: [
        { provide: SOPORTE_PORT, useValue: puerto },
        ConsultaElHilo, RespondeAlTicket,
      ],
    });

  /** Sin retardo entre pulsaciones: el valor por defecto añade un turno del bucle por tecla. */
  let usuario: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    usuario = userEvent.setup({ delay: null });
    enEspanol();
    vi.resetAllMocks();
    puerto.mensajes.mockResolvedValue(exito([]));
    puerto.responde.mockResolvedValue(exito(undefined));
  });

  it('sin mensajes invita a escribir el primero', async () => {
    await monta();

    expect(await screen.findByText('Aún no hay mensajes. Escribe el primero.')).toBeInTheDocument();
  });

  it('enseña la conversación de las dos partes', async () => {
    puerto.mensajes.mockResolvedValue(
      exito([
        { id: 'm1', deSoporte: false, cuerpo: 'No me llegó el pedido', creadoEl: '2026-09-01T10:00:00Z' },
        { id: 'm2', deSoporte: true, cuerpo: 'Lo revisamos hoy', creadoEl: '2026-09-01T11:00:00Z' },
      ]),
    );

    await monta();

    expect(await screen.findByText('No me llegó el pedido')).toBeInTheDocument();
    expect(screen.getByText('Lo revisamos hoy')).toBeInTheDocument();
  });

  it('al responder se manda el texto y el campo queda limpio para el siguiente', async () => {
    await monta();
    const campo = await screen.findByLabelText('Escribe un mensaje…');
    await usuario.type(campo, '  Ya está resuelto  ');
    await usuario.click(screen.getByRole('button', { name: 'Enviar' }));

    await waitFor(() => expect(puerto.responde).toHaveBeenCalledWith('t1', 'Ya está resuelto'));
    // El campo se vacía cuando el envío ya ha vuelto: hasta entonces sigue con lo escrito.
    await waitFor(() => expect(campo).toHaveValue(''));
  });

  /** Tragarse el rechazo deja creer que el cliente ya tiene la respuesta. */
  it('un rechazo del backend se enseña en el propio hilo', async () => {
    puerto.responde.mockResolvedValue(fallo(creaError('conflicto', 'El ticket está cerrado')));

    await monta();
    await usuario.type(await screen.findByLabelText('Escribe un mensaje…'), 'Hola');
    await usuario.click(screen.getByRole('button', { name: 'Enviar' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('El ticket está cerrado');
  });
});
