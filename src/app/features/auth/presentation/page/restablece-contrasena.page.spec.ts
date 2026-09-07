import { Component } from '@angular/core';
import { Router, provideRouter } from '@angular/router';
import { render, screen } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { creaError } from '@shared/error/app-error';
import { exito, fallo } from '@shared/result/result';
import { RestableceContrasena } from '../../application/use-case/restablece-contrasena.use-case';
import { RestableceContrasenaPage } from './restablece-contrasena.page';

/**
 * Recuperar la contraseña. La misma pantalla hace dos cosas según traiga testigo o no: pedir el enlace,
 * o fijar la contraseña nueva. Es donde se cuela el fallo de enseñar el formulario equivocado.
 *
 * <p>Y como en la activación, la respuesta al pedir el enlace es la MISMA exista la cuenta o no: si
 * distinguiera, valdría para averiguar qué direcciones están dadas de alta.
 */
@Component({ selector: 'nx-vacia', template: '' })
class Vacia {}

const VALIDA = 'Contrasena-1';

interface Opciones {
  token?: string;
  enlace?: Awaited<ReturnType<RestableceContrasena['solicitaElEnlace']>>;
  guardado?: Awaited<ReturnType<RestableceContrasena['fijaLaNueva']>>;
}

async function monta(opciones: Opciones = {}) {
  const restablece = {
    solicitaElEnlace: vi.fn(async (_email: string) => opciones.enlace ?? exito(undefined)),
    fijaLaNueva: vi.fn(
      async (_testigo: string, _nueva: string) => opciones.guardado ?? exito(undefined),
    ),
  };

  const vista = await render(RestableceContrasenaPage, {
    inputs: { token: opciones.token ?? '' },
    providers: [
      provideRouter([{ path: '**', component: Vacia }]),
      { provide: RestableceContrasena, useValue: restablece },
    ],
  });
  await vista.fixture.whenStable();
  vista.fixture.detectChanges();

  return { vista, restablece, router: vista.fixture.debugElement.injector.get(Router) };
}

describe('RestableceContrasenaPage', () => {
  beforeEach(() => {
    document.cookie = 'nx036-locale=es';
  });

  describe('sin testigo: pedir el enlace', () => {
    it('pide la dirección, no una contraseña nueva', async () => {
      await monta();

      expect(document.querySelector('#reset-email')).not.toBeNull();
      expect(document.querySelector('#reset-nueva')).toBeNull();
    });

    it('con la dirección puesta se pide el enlace', async () => {
      const { restablece } = await monta();

      await userEvent.type(document.querySelector('#reset-email')!, '  ana@nx036.com  ');
      await userEvent.click(screen.getByRole('button', { name: 'Enviar enlace' }));

      /* Los espacios de sobra vienen casi siempre de pegar la dirección desde otro sitio: recortarlos
       * aquí evita un «no existe esa cuenta» que no es verdad. */
      expect(restablece.solicitaElEnlace).toHaveBeenCalledWith('ana@nx036.com');
    });

    it('sin dirección no se manda nada', async () => {
      const { restablece } = await monta();

      await userEvent.click(screen.getByRole('button', { name: 'Enviar enlace' }));

      expect(restablece.solicitaElEnlace).not.toHaveBeenCalled();
    });

    /** Si la respuesta cambiara según exista la cuenta, esto sería un buscador de cuentas. */
    it('contesta lo mismo exista la cuenta o no', async () => {
      const { vista } = await monta();

      await userEvent.type(document.querySelector('#reset-email')!, 'ana@nx036.com');
      await userEvent.click(screen.getByRole('button', { name: 'Enviar enlace' }));
      await vista.fixture.whenStable();

      expect(screen.getByText(/Si esa dirección tiene cuenta/)).toBeInTheDocument();
    });
  });

  describe('con testigo: fijar la nueva', () => {
    it('pide la contraseña nueva, no la dirección', async () => {
      await monta({ token: 't-1' });

      expect(document.querySelector('#reset-nueva')).not.toBeNull();
      expect(document.querySelector('#reset-email')).toBeNull();
    });

    it('una contraseña que no cumple la política no se puede guardar', async () => {
      const { restablece } = await monta({ token: 't-1' });

      await userEvent.type(document.querySelector('#reset-nueva')!, 'corta');
      await userEvent.type(document.querySelector('#reset-repite')!, 'corta');
      await userEvent.click(screen.getByRole('button', { name: 'Cambiar contraseña' }));

      /* La política es la MISMA que aplica el backend. Dejarlo pasar aquí solo cambia dónde se entera
       * quien la escribe: después de enviarla, y con un error del servidor. */
      expect(restablece.fijaLaNueva).not.toHaveBeenCalled();
    });

    it('dos contraseñas distintas se avisan y no se guardan', async () => {
      const { restablece } = await monta({ token: 't-1' });

      await userEvent.type(document.querySelector('#reset-nueva')!, VALIDA);
      await userEvent.type(document.querySelector('#reset-repite')!, 'Contrasena-2');

      expect(screen.getByText('Las contraseñas no coinciden')).toBeInTheDocument();
      await userEvent.click(screen.getByRole('button', { name: 'Cambiar contraseña' }));
      expect(restablece.fijaLaNueva).not.toHaveBeenCalled();
    });

    it('con todo en regla se guarda CON EL TESTIGO del enlace', async () => {
      const { restablece } = await monta({ token: 't-1' });

      await userEvent.type(document.querySelector('#reset-nueva')!, VALIDA);
      await userEvent.type(document.querySelector('#reset-repite')!, VALIDA);
      await userEvent.click(screen.getByRole('button', { name: 'Cambiar contraseña' }));

      expect(restablece.fijaLaNueva).toHaveBeenCalledWith('t-1', VALIDA);
      expect(screen.getByText('Contraseña actualizada')).toBeInTheDocument();
    });

    it('un testigo caducado se dice y no se salta a ninguna parte', async () => {
      vi.useFakeTimers({ shouldAdvanceTime: true });
      try {
        const { router } = await monta({
          token: 't-vieja',
          guardado: fallo(creaError('peticion-invalida', 'El enlace ha caducado')),
        });
        const navega = vi.spyOn(router, 'navigateByUrl');

        await userEvent.type(document.querySelector('#reset-nueva')!, VALIDA);
        await userEvent.type(document.querySelector('#reset-repite')!, VALIDA);
        await userEvent.click(screen.getByRole('button', { name: 'Cambiar contraseña' }));

        expect(screen.getByText('El enlace ha caducado')).toBeInTheDocument();
        await vi.advanceTimersByTimeAsync(5000);
        expect(navega).not.toHaveBeenCalled();
      } finally {
        vi.useRealTimers();
      }
    });

    it('tras guardarla se pasa al acceso, con tiempo para leer el aviso', async () => {
      vi.useFakeTimers({ shouldAdvanceTime: true });
      try {
        const { router } = await monta({ token: 't-1' });
        const navega = vi.spyOn(router, 'navigateByUrl');
        const raton = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

        await raton.type(document.querySelector('#reset-nueva')!, VALIDA);
        await raton.type(document.querySelector('#reset-repite')!, VALIDA);
        await raton.click(screen.getByRole('button', { name: 'Cambiar contraseña' }));

        expect(navega).not.toHaveBeenCalled();
        await vi.advanceTimersByTimeAsync(2500);
        expect(navega).toHaveBeenCalledWith('/login');
      } finally {
        vi.useRealTimers();
      }
    });

    it('si se abandona la pantalla, el salto pendiente no arrastra a nadie', async () => {
      vi.useFakeTimers({ shouldAdvanceTime: true });
      try {
        const { vista, router } = await monta({ token: 't-1' });
        const navega = vi.spyOn(router, 'navigateByUrl');
        const raton = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

        await raton.type(document.querySelector('#reset-nueva')!, VALIDA);
        await raton.type(document.querySelector('#reset-repite')!, VALIDA);
        await raton.click(screen.getByRole('button', { name: 'Cambiar contraseña' }));

        vista.fixture.destroy();
        await vi.advanceTimersByTimeAsync(5000);

        expect(navega).not.toHaveBeenCalled();
      } finally {
        vi.useRealTimers();
      }
    });
  });
});
