import { TestBed } from '@angular/core/testing';
import { ALMACEN_LOCAL } from '@core/storage/almacen.port';
import { AlmacenMemoriaAdapter } from '@core/storage/almacen-memoria.adapter';
import { PaisDelUsuario } from '@core/http/pais-del-usuario';
import { SesionActual } from '@core/auth/sesion-actual';
import { TokenStore } from '@core/auth/token-store';
import { Mock } from 'vitest';
import { AppError, creaError } from '@shared/error/app-error';
import { Result, exito, fallo } from '@shared/result/result';
import { ALTA_DE_CUENTA_PORT, AUTENTICACION_PORT } from '../../domain/port/autenticacion.port';
import { RESTABLECE_CONTRASENA_PORT } from '../../domain/port/restablece-contrasena.port';
import { SesionStore } from '../state/sesion.store';
import { ActivaCuenta } from './activa-cuenta.use-case';
import { CierraSesion } from './cierra-sesion.use-case';
import { RestableceContrasena } from './restablece-contrasena.use-case';

/**
 * Los casos de uso de auth que caben en unas pocas líneas. Son finos a propósito —el trabajo está en el
 * adaptador— pero no son transparentes, y lo que hacen de más es justo lo que hay que fijar:
 *
 * <ul>
 *   <li>Recortan la dirección de correo. Los espacios de sobra vienen de pegarla desde otro sitio, y sin
 *       recortarlos el backend no encuentra la cuenta y contesta que no existe.
 *   <li>Cerrar sesión borra lo local AUNQUE el servidor no conteste. Si dependiera de la respuesta,
 *       quien pulsa «salir» sin cobertura se quedaría dentro, con los tokens puestos.
 * </ul>
 */
describe('casos de uso cortos de auth', () => {
  describe('ActivaCuenta', () => {
    function monta() {
      const alta = {
        activa: vi.fn(async (_codigo: string) => exito(undefined)),
        reenviaActivacion: vi.fn(async (_email: string) => exito(undefined)),
        crea: vi.fn(),
      };
      TestBed.configureTestingModule({
        providers: [ActivaCuenta, { provide: ALTA_DE_CUENTA_PORT, useValue: alta }],
      });
      return { caso: TestBed.inject(ActivaCuenta), alta };
    }

    it('activa con el código tal cual llega del enlace', async () => {
      const { caso, alta } = monta();

      await caso.ejecuta('c-123');

      expect(alta.activa).toHaveBeenCalledWith('c-123');
    });

    it('al reenviar recorta la dirección, que casi siempre viene pegada', async () => {
      const { caso, alta } = monta();

      await caso.reenviaElCorreo('  ana@nx036.com \n');

      expect(alta.reenviaActivacion).toHaveBeenCalledWith('ana@nx036.com');
    });
  });

  describe('RestableceContrasena', () => {
    function monta() {
      const puerto = {
        solicita: vi.fn(async (_email: string) => exito(undefined)),
        confirma: vi.fn(async (_testigo: string, _nueva: string) => exito(undefined)),
      };
      TestBed.configureTestingModule({
        providers: [
          RestableceContrasena,
          { provide: RESTABLECE_CONTRASENA_PORT, useValue: puerto },
        ],
      });
      return { caso: TestBed.inject(RestableceContrasena), puerto };
    }

    it('recorta la dirección al pedir el enlace', async () => {
      const { caso, puerto } = monta();

      await caso.solicitaElEnlace(' ana@nx036.com ');

      expect(puerto.solicita).toHaveBeenCalledWith('ana@nx036.com');
    });

    it('la contraseña nueva NO se toca: los espacios pueden ser parte de ella', async () => {
      const { caso, puerto } = monta();

      await caso.fijaLaNueva('t-1', ' Contrasena-1 ');

      expect(puerto.confirma).toHaveBeenCalledWith('t-1', ' Contrasena-1 ');
    });
  });

  describe('CierraSesion', () => {
    type Salida = () => Promise<Result<void, AppError>>;

    function monta(sal: Mock<Salida> = vi.fn<Salida>(async () => exito(undefined))) {
      const almacen = new AlmacenMemoriaAdapter();
      almacen.guarda('nx-access-token', 'acceso');
      almacen.guarda('nx-refresh-token', 'refresco');
      almacen.guarda('nx036-country', 'ES');
      TestBed.configureTestingModule({
        providers: [
          CierraSesion,
          SesionStore,
          TokenStore,
          PaisDelUsuario,
          SesionActual,
          { provide: ALMACEN_LOCAL, useValue: almacen },
          { provide: AUTENTICACION_PORT, useValue: { entra: vi.fn(), sal } },
        ],
      });
      return {
        caso: TestBed.inject(CierraSesion),
        tokens: TestBed.inject(TokenStore),
        sesion: TestBed.inject(SesionStore),
        pais: TestBed.inject(PaisDelUsuario),
      };
    }

    it('borra los tokens, la sesión y el país', async () => {
      const { caso, tokens, sesion, pais } = monta();

      await caso.ejecuta();

      expect(tokens.acceso()).toBeNull();
      expect(sesion.haySesion()).toBe(false);
      expect(pais.codigo()).toBe('');
    });

    /**
     * Si el servidor no puede invalidar la sesión —sin cobertura, o ya caducada—, aquí se sale IGUAL.
     * Condicionar el borrado a que el servidor conteste dejaría dentro a quien acaba de pulsar «salir»,
     * con los tokens puestos, en un ordenador que a lo mejor no es suyo.
     */
    it('aunque el servidor no pueda invalidarla, aquí se sale igual', async () => {
      const { caso, tokens, sesion } = monta(
        vi.fn(async () => fallo(creaError('sin-conexion'))),
      );

      await caso.ejecuta();

      expect(tokens.acceso()).toBeNull();
      expect(sesion.haySesion()).toBe(false);
    });

    /** El aviso al servidor va PRIMERO: después ya no queda token con el que identificar la sesión. */
    it('avisa al servidor antes de borrar la credencial', async () => {
      const sal = vi.fn<Salida>(async () => exito(undefined));
      const { caso, tokens } = monta(sal);
      let habiaToken: string | null = null;
      sal.mockImplementation(async () => {
        habiaToken = tokens.acceso();
        return exito(undefined);
      });

      await caso.ejecuta();

      expect(habiaToken).toBe('acceso');
    });
  });
});
