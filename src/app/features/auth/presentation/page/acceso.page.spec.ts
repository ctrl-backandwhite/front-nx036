import { Component } from '@angular/core';
import { Router, provideRouter } from '@angular/router';
import { render, screen } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { APP_CONFIG } from '@core/config/app-config';
import { creaError } from '@shared/error/app-error';
import { exito, fallo } from '@shared/result/result';
import { Credenciales, Usuario } from '../../domain/model/usuario';
import { IniciaSesion } from '../../application/use-case/inicia-sesion.use-case';
import { RESUMEN_DE_ALMACENES_PORT } from '../../domain/port/resumen-de-almacenes.port';
import { AccesoPage } from './acceso.page';

/**
 * La puerta por la que entra todo el mundo, y no tenía ni una prueba.
 *
 * <p>Es la pantalla con más caminos de toda la aplicación —segundo factor, acceso social, vinculación de
 * cuentas, destino pretendido— y cada uno de ellos falla de una forma distinta: dejando a alguien fuera
 * con una contraseña correcta, o dentro pero en la pantalla equivocada. Lo que se certifica aquí:
 *
 * <ul>
 *   <li>que un formulario incompleto NO llega al backend;
 *   <li>que el destino después de entrar depende del papel, y que un `volverA` de fuera no se obedece;
 *   <li>que el segundo factor es un paso más y no un error, y que se puede volver atrás de él;
 *   <li>que un dato decorativo que no carga no rompe el acceso.
 * </ul>
 */
@Component({ selector: 'nx-vacia', template: '' })
class Vacia {}

const ANA: Usuario = {
  id: 'u1',
  email: 'ana@nx036.com',
  rol: 'USER',
  activo: true,
  creadoEl: '2026-01-01T00:00:00Z',
  permisos: [],
};

interface Opciones {
  /** Lo que devuelve el caso de uso, en orden: una respuesta por llamada. */
  respuestas?: Awaited<ReturnType<IniciaSesion['ejecuta']>>[];
  /** La parte de consulta de la dirección con la que se llega a la pantalla. */
  busqueda?: string;
  resumen?: { cuantos: number; paises: readonly string[] } | 'falla';
}

/** Sustituye `location` para poder leer su consulta y ATRAPAR el salto al proveedor externo. */
function fingeLaDireccion(busqueda: string) {
  const original = Object.getOwnPropertyDescriptor(window, 'location')!;
  const saltos: string[] = [];
  Object.defineProperty(window, 'location', {
    configurable: true,
    value: {
      ...window.location,
      search: busqueda,
      get href() {
        return `http://localhost/login${busqueda}`;
      },
      set href(destino: string) {
        saltos.push(destino);
      },
    },
  });
  return { saltos, restaura: () => Object.defineProperty(window, 'location', original) };
}

async function monta(opciones: Opciones = {}) {
  const direccion = fingeLaDireccion(opciones.busqueda ?? '');
  const respuestas = [...(opciones.respuestas ?? [exito(ANA)])];
  const iniciaSesion = {
    ejecuta: vi.fn(async (_credenciales: Credenciales) => respuestas.shift() ?? exito(ANA)),
  };

  const vista = await render(AccesoPage, {
    providers: [
      provideRouter([{ path: '**', component: Vacia }]),
      { provide: IniciaSesion, useValue: iniciaSesion },
      {
        provide: RESUMEN_DE_ALMACENES_PORT,
        useValue: {
          consulta: async () =>
            opciones.resumen === 'falla' || opciones.resumen === undefined
              ? fallo(creaError('sin-conexion'))
              : exito(opciones.resumen),
        },
      },
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

  return {
    vista,
    iniciaSesion,
    direccion,
    router: vista.fixture.debugElement.injector.get(Router),
  };
}

/** Rellena correo y contraseña y pulsa «Entrar». */
async function entra(email = 'ana@nx036.com', clave = 'secreta') {
  await userEvent.type(document.querySelector('#acceso-email')!, email);
  await userEvent.type(document.querySelector('#acceso-clave')!, clave);
  await userEvent.click(screen.getByRole('button', { name: /Entrar/ }));
}

describe('AccesoPage', () => {
  beforeEach(() => {
    document.cookie = 'nx036-locale=es';
  });

  it('un formulario incompleto no llega al backend', async () => {
    const { iniciaSesion, direccion } = await monta();

    await userEvent.type(document.querySelector('#acceso-email')!, 'no-es-un-correo');
    await userEvent.click(screen.getByRole('button', { name: /Entrar/ }));

    /* Sin esta comprobación, cada intento a medio escribir sería un viaje al servidor y, sobre todo,
     * un intento fallido más contra el contador de bloqueo de la cuenta. */
    expect(iniciaSesion.ejecuta).not.toHaveBeenCalled();
    direccion.restaura();
  });

  it('quien entra como cliente acaba en el catálogo', async () => {
    const { router, direccion } = await monta();
    const navega = vi.spyOn(router, 'navigateByUrl');

    await entra();

    expect(navega).toHaveBeenCalledWith('/catalog', { replaceUrl: true });
    direccion.restaura();
  });

  it('quien entra como personal acaba en el panel, no en la tienda', async () => {
    const { router, direccion } = await monta({ respuestas: [exito({ ...ANA, rol: 'ADMIN' })] });
    const navega = vi.spyOn(router, 'navigateByUrl');

    await entra();

    expect(navega).toHaveBeenCalledWith('/admin', { replaceUrl: true });
    direccion.restaura();
  });

  it('respeta el destino del que a alguien desviaron hasta aquí', async () => {
    const { router, direccion } = await monta({ busqueda: '?volverA=/account/orders' });
    const navega = vi.spyOn(router, 'navigateByUrl');

    await entra();

    expect(navega).toHaveBeenCalledWith('/account/orders', { replaceUrl: true });
    direccion.restaura();
  });

  /**
   * El destino llega por la dirección, o sea que lo escribe quien quiera. Sin la comprobación, un enlace
   * con `volverA=//otro-sitio.com` manda a quien acaba de teclear su contraseña a una web ajena, y con la
   * sesión recién abierta: es una redirección abierta de manual.
   */
  it('un destino de FUERA se ignora y se va al catálogo', async () => {
    const { router, direccion } = await monta({ busqueda: '?volverA=//sitio-ajeno.example' });
    const navega = vi.spyOn(router, 'navigateByUrl');

    await entra();

    expect(navega).toHaveBeenCalledWith('/catalog', { replaceUrl: true });
    direccion.restaura();
  });

  describe('segundo factor', () => {
    it('pedirlo no es un error: aparece el campo y no hay aviso rojo', async () => {
      const { direccion } = await monta({
        respuestas: [fallo(creaError('no-autenticado', 'da igual', { codigo: 'MFA_REQUIRED' }))],
      });

      await entra();

      expect(document.querySelector('#acceso-codigo')).not.toBeNull();
      expect(document.querySelector('.alert-error')).toBeNull();
      direccion.restaura();
    });

    it('un código equivocado deja el campo puesto y dice por qué', async () => {
      const { direccion } = await monta({
        respuestas: [fallo(creaError('no-autenticado', '', { codigo: 'MFA_INVALID' }))],
      });

      await entra();

      expect(document.querySelector('#acceso-codigo')).not.toBeNull();
      expect(screen.getByText(/Código incorrecto o caducado/)).toBeInTheDocument();
      direccion.restaura();
    });

    /**
     * El caso que se olvida: se está en el paso del código y falla la CREDENCIAL, no el código —por
     * ejemplo porque la sesión provisional caducó—. Si la pantalla se quedara en el paso dos, quien
     * mira tendría delante un campo de código que ya no sirve de nada y ninguna forma de volver.
     */
    it('si falla la credencial estando en el código, se vuelve al paso de la contraseña', async () => {
      const { direccion } = await monta({
        respuestas: [
          fallo(creaError('no-autenticado', '', { codigo: 'MFA_REQUIRED' })),
          fallo(creaError('no-autenticado', 'Credenciales incorrectas')),
        ],
      });

      await entra();
      await userEvent.type(document.querySelector('#acceso-codigo')!, '123456');
      await userEvent.click(screen.getByRole('button', { name: /Entrar/ }));

      expect(document.querySelector('#acceso-codigo')).toBeNull();
      expect(screen.getByText('Credenciales incorrectas')).toBeInTheDocument();
      direccion.restaura();
    });

    it('el código solo se manda cuando se ha pedido', async () => {
      const { iniciaSesion, direccion } = await monta();

      await entra();

      expect(iniciaSesion.ejecuta.mock.calls[0]?.[0].codigoDeUnSoloUso).toBeUndefined();
      direccion.restaura();
    });
  });

  describe('acceso social', () => {
    it('salta al proveedor con la dirección del backend, no con una del navegador', async () => {
      const { direccion } = await monta();

      await userEvent.click(screen.getByRole('button', { name: 'Google' }));

      expect(direccion.saltos).toEqual([
        'https://api.nx036.com/oauth2/authorization/google',
      ]);
      direccion.restaura();
    });

    it('deja escrito el destino antes de salir del navegador', async () => {
      const { direccion } = await monta({ busqueda: '?volverA=/account/orders' });
      sessionStorage.removeItem('nx-login-from');

      await userEvent.click(screen.getByRole('button', { name: 'GitHub' }));

      /* El salto sale de la aplicación y vuelve por otra pantalla: lo que esté en memoria se pierde por
       * el camino, así que el destino tiene que quedar escrito antes de saltar. */
      expect(sessionStorage.getItem('nx-login-from')).toBe('/account/orders');
      direccion.restaura();
    });

    it('cuando el proveedor no da correo, se explica en vez de callar', async () => {
      const { direccion } = await monta({ busqueda: '?error=google_no_email' });

      expect(screen.getByText(/Google no compartió un correo/)).toBeInTheDocument();
      direccion.restaura();
    });

    it('vincular una cuenta existente se avisa en ámbar, no en rojo', async () => {
      const { direccion } = await monta({ busqueda: '?link=required' });

      expect(screen.getByText(/vincular tu cuenta de Google/)).toBeInTheDocument();
      /* No es un fallo de nadie: es un paso que hay que dar. Pintarlo de error asusta sin motivo. */
      expect(document.querySelector('.alert-warning')).not.toBeNull();
      direccion.restaura();
    });

    it('al vincular, el backend tiene que enterarse de que es una vinculación', async () => {
      const { iniciaSesion, direccion } = await monta({ busqueda: '?link=required' });

      await entra();

      expect(iniciaSesion.ejecuta.mock.calls[0]?.[0].vinculaAccesoSocial).toBe(true);
      direccion.restaura();
    });
  });

  describe('el rótulo de almacenes del panel de marca', () => {
    it('con cifras cuando se pueden consultar', async () => {
      const { direccion } = await monta({ resumen: { cuantos: 4, paises: ['ES', 'CN'] } });

      expect(screen.getByText('4 almacenes en ES, CN')).toBeInTheDocument();
      direccion.restaura();
    });

    /** Un dato decorativo que no carga NO puede impedir entrar: se cae al rótulo sin números. */
    it('genérico cuando la consulta falla, y la pantalla sigue en pie', async () => {
      const { direccion } = await monta({ resumen: 'falla' });

      expect(screen.getByText('Almacenes globales en varias regiones')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Entrar/ })).toBeInTheDocument();
      direccion.restaura();
    });
  });

  it('la contraseña se puede enseñar y volver a tapar', async () => {
    const { direccion } = await monta();
    const campo = document.querySelector<HTMLInputElement>('#acceso-clave')!;

    expect(campo.type).toBe('password');
    await userEvent.click(screen.getByRole('button', { name: 'Mostrar contraseña' }));
    expect(campo.type).toBe('text');
    await userEvent.click(screen.getByRole('button', { name: 'Ocultar contraseña' }));
    expect(campo.type).toBe('password');
    direccion.restaura();
  });
});
