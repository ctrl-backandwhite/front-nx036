import { TestBed } from '@angular/core/testing';
import { fireEvent, render, screen } from '@testing-library/angular';
import { TraduccionService } from '@core/i18n/traduccion.service';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { exito, fallo } from '@shared/result/result';
import { creaError } from '@shared/error/app-error';
import { HILO_DE_TICKET_PORT, HiloDeTicketPort } from '../../domain/port/tickets.port';
import { HiloDeSoporte } from './hilo-de-soporte';

const DEL_CLIENTE = {
  id: 'm-1',
  fromSupport: false,
  cuerpo: 'No me llega el pedido',
  creadoEl: '2026-09-01T10:00:00Z',
  deSoporte: false,
};
const DE_LA_CASA = {
  id: 'm-2',
  cuerpo: 'Lo estamos mirando',
  creadoEl: '2026-09-01T11:00:00Z',
  deSoporte: true,
};

describe('HiloDeSoporte', () => {
  let puerto: HiloDeTicketPort;

  beforeEach(() => {
    puerto = {
      mensajes: vi.fn().mockResolvedValue(exito([DEL_CLIENTE, DE_LA_CASA])),
      responde: vi.fn().mockResolvedValue(exito(DE_LA_CASA)),
    };
  });

  async function monta(comoSoporte = false) {
    return render(HiloDeSoporte, {
      inputs: { idTicket: 't-1', comoSoporte },
      providers: [{ provide: HILO_DE_TICKET_PORT, useValue: puerto }],
    });
  }

  it('enseña la conversación entera', async () => {
    await monta();

    expect(await screen.findByText('No me llega el pedido')).toBeInTheDocument();
    expect(screen.getByText('Lo estamos mirando')).toBeInTheDocument();
  });

  it('el cliente lee por su ruta y el personal de la casa por la suya', async () => {
    await monta(true);

    expect(puerto.mensajes).toHaveBeenCalledWith('t-1', true);
  });

  it('manda lo escrito y vacía el campo', async () => {
    const vista = await monta();
    await screen.findByText('No me llega el pedido');

    const campo = vista.container.querySelector('input') as HTMLInputElement;
    fireEvent.input(campo, { target: { value: 'Gracias' } });
    fireEvent.click(screen.getByRole('button'));
    await vista.fixture.whenStable();
    vista.fixture.detectChanges();

    expect(puerto.responde).toHaveBeenCalledWith('t-1', 'Gracias', false);
    expect(campo.value).toBe('');
  });

  /** Si falla, lo escrito sigue ahí: obligar a teclearlo otra vez es la peor manera de perder un caso. */
  it('conserva lo escrito cuando el envío falla', async () => {
    vi.mocked(puerto.responde).mockResolvedValue(fallo(creaError('error-del-servidor')));
    const vista = await monta();
    await screen.findByText('No me llega el pedido');

    const campo = vista.container.querySelector('input') as HTMLInputElement;
    fireEvent.input(campo, { target: { value: 'Gracias' } });
    fireEvent.click(screen.getByRole('button'));
    await vista.fixture.whenStable();
    vista.fixture.detectChanges();

    expect(campo.value).toBe('Gracias');
  });

  it('no manda mensajes en blanco: el botón está apagado', async () => {
    await monta();
    await screen.findByText('No me llega el pedido');

    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('un hilo vacío lo dice, en vez de dejar un hueco', async () => {
    vi.mocked(puerto.mensajes).mockResolvedValue(exito([]));
    await monta();

    // El texto se pide al servicio de traducción y no se escribe a mano: el idioma con el que arranca
    // la aplicación en las pruebas no tiene por qué ser el mismo siempre.
    const vacio = TestBed.inject(TraduccionService).t('support.thread.empty');
    expect(await screen.findByText(vacio)).toBeInTheDocument();
  });

  /** Un aviso cada cinco segundos sería insufrible: el sondeo falla en silencio. */
  it('un fallo del sondeo no borra lo que ya se estaba leyendo', async () => {
    vi.mocked(puerto.mensajes).mockResolvedValueOnce(exito([DEL_CLIENTE]));
    await monta();
    await screen.findByText('No me llega el pedido');

    vi.mocked(puerto.mensajes).mockResolvedValue(fallo(creaError('sin-conexion')));
    expect(screen.getByText('No me llega el pedido')).toBeInTheDocument();
  });
});
