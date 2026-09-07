import { Component } from '@angular/core';
import { provideRouter } from '@angular/router';
import { render, screen } from '@testing-library/angular';
import { Plataforma } from '@core/platform/plataforma';
import { AppError, creaError } from '@shared/error/app-error';
import { Result, exito, fallo } from '@shared/result/result';
import { BOLETIN_PORT } from '../../domain/port/boletin.port';
import { GestionaElBoletin } from '../../application/use-case/gestiona-el-boletin.use-case';
import { BajaDelBoletinPage } from './baja-del-boletin.page';

/**
 * La pantalla a la que lleva el enlace de «darse de baja» de un correo.
 *
 * <p>Es una pantalla sin botones: se da de baja SOLA al abrirla. Eso es a propósito —quien pulsa ese
 * enlace ya ha decidido— y es también lo que la hace delicada: si el testigo no llega, o el servidor lo
 * rechaza, tiene que DECIRLO. Una pantalla que se queda en «procesando» deja a alguien creyendo que se
 * dio de baja cuando sigue en la lista, y el siguiente correo se lee como que no se respetó su decisión.
 *
 * <p>Y no se intenta al PRERENDERIZAR: allí no hay nadie pulsando nada, y la baja se ejecutaría al
 * construir la web contra un testigo que no es de ningún visitante.
 */
@Component({ selector: 'nx-vacia', template: '' })
class Vacia {}

interface Opciones {
  token?: string;
  resultado?: Result<boolean, AppError>;
  enNavegador?: boolean;
}

async function monta(opciones: Opciones = {}) {
  const puerto = {
    suscribe: vi.fn(),
    daDeBaja: vi.fn(
      async (_testigo: string): Promise<Result<boolean, AppError>> =>
        opciones.resultado ?? exito(true),
    ),
  };

  const vista = await render(BajaDelBoletinPage, {
    inputs: { token: opciones.token ?? 't-123' },
    providers: [
      provideRouter([{ path: '**', component: Vacia }]),
      GestionaElBoletin,
      { provide: BOLETIN_PORT, useValue: puerto },
      {
        provide: Plataforma,
        useValue: {
          esNavegador: opciones.enNavegador ?? true,
          documentoSiLoHay: document,
          ventanaSiLaHay: window,
        },
      },
    ],
  });
  await vista.fixture.whenStable();
  vista.fixture.detectChanges();
  await vista.fixture.whenStable();
  vista.fixture.detectChanges();

  return { vista, puerto };
}

describe('BajaDelBoletinPage', () => {
  beforeEach(() => {
    document.cookie = 'nx036-locale=es';
  });

  it('con testigo se da de baja sola y lo confirma', async () => {
    const { puerto } = await monta();

    expect(puerto.daDeBaja).toHaveBeenCalledWith('t-123');
    expect(screen.getByText('Te has dado de baja')).toBeInTheDocument();
  });

  /** Sin testigo no hay a quién dar de baja: se dice, en vez de quedarse girando. */
  it('sin testigo se dice que el enlace no vale, sin llamar a nadie', async () => {
    const { puerto } = await monta({ token: '' });

    expect(puerto.daDeBaja).not.toHaveBeenCalled();
    expect(screen.getByText('Enlace no válido')).toBeInTheDocument();
  });

  it('un testigo que el servidor rechaza se cuenta como enlace no válido', async () => {
    await monta({ resultado: fallo(creaError('peticion-invalida')) });

    expect(screen.getByText('Enlace no válido')).toBeInTheDocument();
  });

  /**
   * El servidor puede responder bien y decir que NO se dio de baja —un testigo ya usado, por ejemplo—.
   * Contarlo como éxito dejaría a alguien creyendo que salió de la lista cuando sigue dentro.
   */
  it('una respuesta correcta que dice «no» también es un enlace no válido', async () => {
    await monta({ resultado: exito(false) });

    expect(screen.getByText('Enlace no válido')).toBeInTheDocument();
  });

  /** Al prerenderizar no hay nadie pulsando: la baja se ejecutaría al construir la web. */
  it('al prerenderizar no se da de baja a nadie', async () => {
    const { puerto } = await monta({ enNavegador: false });

    expect(puerto.daDeBaja).not.toHaveBeenCalled();
  });

  it('siempre ofrece volver a la tienda', async () => {
    await monta();

    expect(screen.getByRole('link')).toHaveAttribute('href', '/');
  });
});
