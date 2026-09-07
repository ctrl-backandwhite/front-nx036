import { Component } from '@angular/core';
import { Router, provideRouter } from '@angular/router';
import { render, screen } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { APP_CONFIG } from '@core/config/app-config';
import { CaptchaService } from '@core/security/captcha.service';
import { LEGAL_UPDATED } from '@shared/content/legal-pages';
import { creaError } from '@shared/error/app-error';
import { exito, fallo } from '@shared/result/result';
import { BorradorDeAlta } from '../../domain/model/alta';
import { CreaCuenta } from '../../application/use-case/crea-cuenta.use-case';
import { DESTINO_TRAS_ACCESO_PORT } from '../../domain/port/destino-tras-acceso.port';
import {
  DIVISAS_ACTIVAS_PORT,
  GEOLOCALIZACION_PORT,
  PAISES_DE_ENVIO_PORT,
  PaisDeEnvio,
} from '../../domain/port/datos-del-alta.port';
import { AltaPage } from './alta.page';

/**
 * El alta, que hasta ahora no tenía ninguna prueba.
 *
 * <p>Lo que se certifica no es que el formulario «funcione»: es que las tres decisiones legales que
 * viajaron del front anterior siguen en pie, porque son las que no se ven al mirar la pantalla y las que
 * cuesta caro perder en un refactor.
 *
 * <ul>
 *   <li>La aceptación es EXPLÍCITA y queda constancia de QUÉ VERSIÓN se aceptó. Sin la versión, la
 *       constancia no sirve para nada: no se puede acreditar qué texto tenía delante quien aceptó.
 *   <li>El consentimiento comercial es una casilla APARTE y NACE SIN MARCAR. Premarcarla no es
 *       consentimiento, y empaquetarla con el alta tampoco.
 *   <li>El alta social exige lo mismo que la de correo. Es el atajo por el que se cuela: los botones de
 *       Google y GitHub están siempre activos, así que sin la comprobación se saltaría al proveedor sin
 *       haber aceptado nada.
 * </ul>
 */
@Component({ selector: 'nx-vacia', template: '' })
class Vacia {}

const PAISES: readonly PaisDeEnvio[] = [
  { codigo: 'ES', nombre: 'España' },
  { codigo: 'FR', nombre: 'Francia' },
];

interface Opciones {
  paises?: readonly PaisDeEnvio[] | 'falla';
  geo?: string | null | 'falla';
  respuesta?: Awaited<ReturnType<CreaCuenta['ejecuta']>>;
}

/** Sustituye `location` para atrapar el salto al proveedor externo en vez de navegar de verdad. */
function fingeLaDireccion() {
  const original = Object.getOwnPropertyDescriptor(window, 'location')!;
  const saltos: string[] = [];
  Object.defineProperty(window, 'location', {
    configurable: true,
    value: {
      ...window.location,
      search: '',
      get href() {
        return 'http://localhost/register';
      },
      set href(destino: string) {
        saltos.push(destino);
      },
    },
  });
  return { saltos, restaura: () => Object.defineProperty(window, 'location', original) };
}

async function monta(opciones: Opciones = {}) {
  const direccion = fingeLaDireccion();
  const creaCuenta = {
    ejecuta: vi.fn(
      async (_borrador: BorradorDeAlta, _contrasenaSegura: boolean, _captcha: string | null) =>
        opciones.respuesta ?? exito({ mensaje: 'del servidor', idDeUsuario: 'u1' }),
    ),
  };
  const destino = { recuerda: vi.fn() };

  const vista = await render(AltaPage, {
    providers: [
      provideRouter([{ path: '**', component: Vacia }]),
      { provide: CreaCuenta, useValue: creaCuenta },
      { provide: DESTINO_TRAS_ACCESO_PORT, useValue: destino },
      {
        provide: PAISES_DE_ENVIO_PORT,
        useValue: {
          consulta: async () =>
            opciones.paises === 'falla'
              ? fallo(creaError('sin-conexion'))
              : exito(opciones.paises ?? PAISES),
        },
      },
      { provide: DIVISAS_ACTIVAS_PORT, useValue: { cuantas: async () => exito(7) } },
      {
        provide: GEOLOCALIZACION_PORT,
        useValue: {
          paisDelVisitante: async () =>
            opciones.geo === 'falla'
              ? fallo(creaError('sin-conexion'))
              : exito(opciones.geo ?? null),
        },
      },
      // El reto se da por resuelto: lo que se está probando es el formulario, no la prueba de trabajo,
      // que tiene su propia batería.
      { provide: CaptchaService, useValue: { resuelve: async () => 'testigo-resuelto' } },
      {
        provide: APP_CONFIG,
        useValue: {
          apiBase: 'https://api.nx036.com',
          produccion: false,
          urlPublica: 'https://nx036.com',
          entorno: 'prueba',
        },
      },
    ],
  });
  await vista.fixture.whenStable();
  vista.fixture.detectChanges();
  await vista.fixture.whenStable();
  vista.fixture.detectChanges();

  return {
    vista,
    creaCuenta,
    destino,
    direccion,
    router: vista.fixture.debugElement.injector.get(Router),
  };
}

const condiciones = () => screen.getByRole('checkbox', { name: /Acepto|términos|Términos/ });
const comerciales = () => screen.getByRole('checkbox', { name: /ofertas y novedades/ });
const enviar = () => screen.getByRole('button', { name: /Crear cuenta/ });

/** Rellena lo obligatorio: correo y las dos contraseñas. */
async function rellena(clave = 'Contrasena-1') {
  await userEvent.type(document.querySelector('#alta-email')!, 'ana@nx036.com');
  await userEvent.type(document.querySelector('#alta-clave')!, clave);
  await userEvent.type(document.querySelector('#alta-repite')!, clave);
}

describe('AltaPage', () => {
  beforeEach(() => {
    document.cookie = 'nx036-locale=es';
  });

  describe('consentimiento', () => {
    it('sin aceptar las condiciones no se puede enviar, por muy lleno que esté el formulario', async () => {
      const { direccion } = await monta();
      await rellena();

      expect(enviar()).toBeDisabled();
      direccion.restaura();
    });

    it('la casilla de comunicaciones comerciales NACE SIN MARCAR', async () => {
      const { direccion } = await monta();

      expect(comerciales()).not.toBeChecked();
      direccion.restaura();
    });

    it('al crear la cuenta se manda QUÉ VERSIÓN de las condiciones se aceptó', async () => {
      const { creaCuenta, direccion } = await monta();
      await rellena();
      await userEvent.click(condiciones());
      await userEvent.click(enviar());

      const borrador = creaCuenta.ejecuta.mock.calls[0]![0];
      expect(borrador.aceptaCondiciones).toBe(true);
      /* Sin la versión, la constancia es inservible: no se puede acreditar qué texto se aceptó. */
      expect(borrador.versionDeCondiciones).toBe(LEGAL_UPDATED);
      expect(borrador.aceptaComunicaciones).toBe(false);
      direccion.restaura();
    });

    it('marcar lo comercial es una decisión aparte, y viaja aparte', async () => {
      const { creaCuenta, direccion } = await monta();
      await rellena();
      await userEvent.click(condiciones());
      await userEvent.click(comerciales());
      await userEvent.click(enviar());

      expect(creaCuenta.ejecuta.mock.calls[0]![0].aceptaComunicaciones).toBe(true);
      direccion.restaura();
    });
  });

  describe('alta con Google o GitHub', () => {
    it('sin condiciones aceptadas NO se salta al proveedor: se avisa', async () => {
      const { destino, direccion } = await monta();

      await userEvent.click(screen.getByRole('button', { name: 'Google' }));

      expect(direccion.saltos, 'ha saltado sin aceptar nada').toEqual([]);
      expect(destino.recuerda).not.toHaveBeenCalled();
      expect(screen.getByText(/Acepta los términos para registrarte/)).toBeInTheDocument();
      direccion.restaura();
    });

    it('con las condiciones aceptadas sí salta, y deja escrito el destino', async () => {
      const { destino, direccion } = await monta();
      await userEvent.click(condiciones());

      await userEvent.click(screen.getByRole('button', { name: 'GitHub' }));

      expect(destino.recuerda).toHaveBeenCalledWith('/');
      expect(direccion.saltos).toEqual(['https://api.nx036.com/oauth2/authorization/github']);
      direccion.restaura();
    });

    it('el aviso desaparece en cuanto se aceptan las condiciones', async () => {
      const { direccion } = await monta();
      await userEvent.click(screen.getByRole('button', { name: 'Google' }));

      await userEvent.click(condiciones());

      expect(screen.queryByText(/Acepta los términos para registrarte/)).toBeNull();
      direccion.restaura();
    });
  });

  it('dos contraseñas distintas se avisan mientras se escribe, no al enviar', async () => {
    const { direccion } = await monta();

    await userEvent.type(document.querySelector('#alta-clave')!, 'Contrasena-1');
    await userEvent.type(document.querySelector('#alta-repite')!, 'Contrasena-2');

    expect(screen.getByText('Las contraseñas no coinciden')).toBeInTheDocument();
    direccion.restaura();
  });

  it('un fallo con código propio se traduce; no se enseña el crudo del servidor', async () => {
    const { direccion } = await monta({
      respuesta: fallo(creaError('peticion-invalida', 'weak password', { codigo: 'contrasena-debil' })),
    });
    await rellena('abc');
    await userEvent.click(condiciones());
    await userEvent.click(enviar());

    expect(screen.getByText('La contraseña no es lo bastante segura')).toBeInTheDocument();
    direccion.restaura();
  });

  describe('el salto a la activación', () => {
    it('avisa de que la cuenta está creada y lleva a activarla', async () => {
      vi.useFakeTimers({ shouldAdvanceTime: true });
      try {
        const { router, direccion } = await monta();
        const navega = vi.spyOn(router, 'navigateByUrl');
        await rellena();
        await userEvent.click(condiciones());
        await userEvent.click(enviar());

        expect(screen.getByText(/Cuenta creada/)).toBeInTheDocument();
        expect(navega, 'no da tiempo ni a leer el aviso').not.toHaveBeenCalled();

        await vi.advanceTimersByTimeAsync(2500);

        expect(navega).toHaveBeenCalledWith('/activate');
        direccion.restaura();
      } finally {
        vi.useRealTimers();
      }
    });

    /**
     * Quien se registra y se va antes del salto tenía el temporizador todavía vivo: al cumplirse, la
     * arrastraba a la activación DESDE OTRA PANTALLA. Es el fallo que no se ve probando la pantalla
     * sola, porque solo aparece cuando ya no estás en ella.
     */
    it('si se abandona la pantalla, el salto pendiente no arrastra a nadie', async () => {
      vi.useFakeTimers({ shouldAdvanceTime: true });
      try {
        const { vista, router, direccion } = await monta();
        const navega = vi.spyOn(router, 'navigateByUrl');
        await rellena();
        await userEvent.click(condiciones());
        await userEvent.click(enviar());

        vista.fixture.destroy();
        await vi.advanceTimersByTimeAsync(5000);

        expect(navega).not.toHaveBeenCalled();
        direccion.restaura();
      } finally {
        vi.useRealTimers();
      }
    });
  });

  describe('el país de partida', () => {
    it('se propone el detectado cuando se despacha allí', async () => {
      const { direccion } = await monta({ geo: 'FR' });

      expect(document.querySelector<HTMLSelectElement>('#alta-pais')!.value).toContain('FR');
      direccion.restaura();
    });

    /** Proponer un destino al que no se envía es peor que no proponer ninguno. */
    it('NO se propone uno fuera de la cobertura de envío', async () => {
      const { direccion } = await monta({ geo: 'JP' });

      expect(document.querySelector<HTMLSelectElement>('#alta-pais')!.value).not.toContain('JP');
      direccion.restaura();
    });

    it('si no se pueden cargar los países, el alta sigue completable', async () => {
      const { creaCuenta, direccion } = await monta({ paises: 'falla', geo: 'falla' });
      await rellena();
      await userEvent.click(condiciones());
      await userEvent.click(enviar());

      expect(creaCuenta.ejecuta).toHaveBeenCalled();
      direccion.restaura();
    });
  });
});
