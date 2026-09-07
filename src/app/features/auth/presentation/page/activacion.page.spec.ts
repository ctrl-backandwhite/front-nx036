import { Component } from '@angular/core';
import { Router, provideRouter } from '@angular/router';
import { render, screen } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { creaError } from '@shared/error/app-error';
import { exito, fallo } from '@shared/result/result';
import { ActivaCuenta } from '../../application/use-case/activa-cuenta.use-case';
import { ActivacionPage } from './activacion.page';

/**
 * La activación de la cuenta.
 *
 * <p>Dos cosas que solo se ven cuando fallan, y que por eso hay que fijar aquí:
 *
 * <ul>
 *   <li>El reenvío contesta SIEMPRE lo mismo, exista la cuenta o no. Si distinguiera, este formulario
 *       sería una forma cómoda de averiguar qué direcciones están registradas — sin sesión y sin límite.
 *   <li>El salto al acceso es diferido, y el temporizador se cancela al salir. Vivo, arrastraba a quien
 *       ya se había ido a otra pantalla.
 * </ul>
 */
@Component({ selector: 'nx-vacia', template: '' })
class Vacia {}

interface Opciones {
  code?: string;
  email?: string;
  activacion?: Awaited<ReturnType<ActivaCuenta['ejecuta']>>;
  reenvio?: Awaited<ReturnType<ActivaCuenta['reenviaElCorreo']>>;
}

async function monta(opciones: Opciones = {}) {
  const activaCuenta = {
    ejecuta: vi.fn(async (_codigo: string) => opciones.activacion ?? exito(undefined)),
    reenviaElCorreo: vi.fn(async (_email: string) => opciones.reenvio ?? exito(undefined)),
  };

  const vista = await render(ActivacionPage, {
    inputs: { code: opciones.code ?? '', email: opciones.email ?? '' },
    providers: [
      provideRouter([{ path: '**', component: Vacia }]),
      { provide: ActivaCuenta, useValue: activaCuenta },
    ],
  });
  await vista.fixture.whenStable();
  vista.fixture.detectChanges();

  return { vista, activaCuenta, router: vista.fixture.debugElement.injector.get(Router) };
}

describe('ActivacionPage', () => {
  beforeEach(() => {
    document.cookie = 'nx036-locale=es';
  });

  it('sin código en la dirección no se activa nada: se explica qué hacer', async () => {
    const { activaCuenta } = await monta();

    expect(activaCuenta.ejecuta).not.toHaveBeenCalled();
    expect(screen.getByText(/Abre el mensaje y pulsa el botón/)).toBeInTheDocument();
  });

  it('con código en la dirección se activa sola: quien pulsa el enlace no teclea nada', async () => {
    const { activaCuenta } = await monta({ code: 'c-123' });

    expect(activaCuenta.ejecuta).toHaveBeenCalledWith('c-123');
    expect(screen.getByText(/Cuenta activada/)).toBeInTheDocument();
  });

  it('un enlace caducado se dice, y no se salta a ninguna parte', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    try {
      const { router } = await monta({
        code: 'c-vieja',
        activacion: fallo(creaError('peticion-invalida', 'Enlace inválido o caducado.')),
      });
      const navega = vi.spyOn(router, 'navigateByUrl');

      expect(screen.getByText('Enlace inválido o caducado.')).toBeInTheDocument();

      await vi.advanceTimersByTimeAsync(5000);
      expect(navega).not.toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });

  it('tras activar se pasa al acceso, pero con tiempo para leerlo', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    try {
      const { router } = await monta({ code: 'c-123' });
      const navega = vi.spyOn(router, 'navigateByUrl');

      expect(navega).not.toHaveBeenCalled();
      await vi.advanceTimersByTimeAsync(1800);
      expect(navega).toHaveBeenCalledWith('/login');
    } finally {
      vi.useRealTimers();
    }
  });

  it('si se abandona la pantalla, el salto pendiente no arrastra a nadie', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    try {
      const { vista, router } = await monta({ code: 'c-123' });
      const navega = vi.spyOn(router, 'navigateByUrl');

      vista.fixture.destroy();
      await vi.advanceTimersByTimeAsync(5000);

      expect(navega).not.toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });

  describe('reenviar el correo', () => {
    it('el correo de la dirección viene ya puesto: no hay que volver a teclearlo', async () => {
      await monta({ email: 'ana@nx036.com' });

      expect(document.querySelector<HTMLInputElement>('#activacion-email')!.value).toBe(
        'ana@nx036.com',
      );
    });

    /**
     * La respuesta es la misma exista la cuenta o no, y el texto lo dice: «SI esa cuenta existe…».
     * Cualquier otra cosa —un «no encontramos esa dirección»— convierte esta pantalla en un buscador de
     * cuentas registradas.
     */
    it('contesta lo mismo aunque el envío falle: no se puede saber si la cuenta existe', async () => {
      await monta({
        email: 'ana@nx036.com',
        reenvio: fallo(creaError('no-encontrado', 'no existe esa cuenta')),
      });

      await userEvent.click(screen.getByRole('button', { name: /Reenviar/ }));

      expect(screen.getByText(/Si esa cuenta existe y está pendiente/)).toBeInTheDocument();
      expect(screen.queryByText(/no existe esa cuenta/)).toBeNull();
    });

    it('después de reenviar hay que esperar antes de repetir', async () => {
      vi.useFakeTimers({ shouldAdvanceTime: true });
      try {
        const { activaCuenta, vista } = await monta({ email: 'ana@nx036.com' });
        const raton = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

        await raton.click(screen.getByRole('button', { name: /Reenviar/ }));
        expect(activaCuenta.reenviaElCorreo).toHaveBeenCalledTimes(1);

        /* Sin la espera, mantener pulsado el botón manda una ráfaga de correos a una dirección que
         * puede no ser de quien está delante. */
        await raton.click(screen.getByRole('button', { name: /Reenviar/ }));
        expect(activaCuenta.reenviaElCorreo).toHaveBeenCalledTimes(1);

        await vi.advanceTimersByTimeAsync(31_000);
        vista.fixture.detectChanges();

        await raton.click(screen.getByRole('button', { name: /Reenviar/ }));
        expect(activaCuenta.reenviaElCorreo).toHaveBeenCalledTimes(2);
      } finally {
        vi.useRealTimers();
      }
    });

    it('sin dirección escrita no se manda nada', async () => {
      const { activaCuenta } = await monta();

      await userEvent.click(screen.getByRole('button', { name: /Reenviar/ }));

      expect(activaCuenta.reenviaElCorreo).not.toHaveBeenCalled();
    });
  });
});
