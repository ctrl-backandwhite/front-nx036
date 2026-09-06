import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { exito, fallo } from '@shared/result/result';
import { creaError } from '@shared/error/app-error';
import { ALMACEN_LOCAL } from '@core/storage/almacen.port';
import { AlmacenMemoriaAdapter } from '@core/storage/almacen-memoria.adapter';
import { TokenStore } from '@core/auth/token-store';
import { USUARIO_ACTUAL_PORT } from '@features/auth/domain/port/autenticacion.port';
import { ATRIBUCION_DE_REFERIDO_PORT } from '../../domain/port/referido.port';
import { CapturaReferido } from './captura-referido.use-case';

const usuario = (rol: string) => ({
  id: 'u1',
  email: 'a@b.c',
  rol,
  activo: true,
  creadoEl: '2026-01-01',
  permisos: [],
});

describe('CapturaReferido', () => {
  const atribucion = { registra: vi.fn(), vincula: vi.fn() };
  const usuarioActual = { consulta: vi.fn(), actualiza: vi.fn() };
  let captura: CapturaReferido;
  let almacen: AlmacenMemoriaAdapter;

  beforeEach(() => {
    vi.resetAllMocks();
    TestBed.configureTestingModule({
      providers: [
        { provide: ALMACEN_LOCAL, useClass: AlmacenMemoriaAdapter },
        { provide: ATRIBUCION_DE_REFERIDO_PORT, useValue: atribucion },
        { provide: USUARIO_ACTUAL_PORT, useValue: usuarioActual },
      ],
    });
    captura = TestBed.inject(CapturaReferido);
    almacen = TestBed.inject(ALMACEN_LOCAL) as AlmacenMemoriaAdapter;
  });

  describe('apunta', () => {
    it('sin parámetro de referido no hace nada', async () => {
      expect(await captura.apunta('/catalog?orden=precio')).toBeNull();
      expect(atribucion.registra).not.toHaveBeenCalled();
    });

    it('apunta el clic y devuelve la dirección ya limpia', async () => {
      atribucion.registra.mockResolvedValue(exito('testigo-servidor'));

      const limpia = await captura.apunta('/catalog?ref=ANA&orden=precio#lista');

      expect(limpia).toBe('/catalog?orden=precio#lista');
      expect(atribucion.registra).toHaveBeenCalledWith('ANA', expect.any(String));
      expect(almacen.lee('nx036-aff-visitor')).toBe('testigo-servidor');
    });

    /** Perder la atribución por un corte de red sería quitarle una venta a quien la trajo. */
    it('si el registro falla, el código queda guardado para volver a intentarlo', async () => {
      atribucion.registra.mockResolvedValue(fallo(creaError('sin-conexion')));

      await captura.apunta('/?ref=ANA');

      expect(almacen.lee('nx036-aff-ref')).toBe('ANA');
    });

    it('reutiliza el testigo ya guardado en vez de crear uno nuevo', async () => {
      almacen.guarda('nx036-aff-visitor', 'el-de-siempre');
      atribucion.registra.mockResolvedValue(exito('el-de-siempre'));

      await captura.apunta('/?ref=ANA');

      expect(atribucion.registra).toHaveBeenCalledWith('ANA', 'el-de-siempre');
    });
  });

  describe('vincula', () => {
    /** No se pregunta por el usuario en cada arranque de un visitante anónimo, que son la mayoría. */
    it('sin credencial no pregunta por el usuario', async () => {
      almacen.guarda('nx036-aff-ref', 'ANA');

      await captura.vincula();

      expect(usuarioActual.consulta).not.toHaveBeenCalled();
    });

    it('sin referido pendiente tampoco', async () => {
      TestBed.inject(TokenStore).guarda('token');

      await captura.vincula();

      expect(usuarioActual.consulta).not.toHaveBeenCalled();
    });

    it('con credencial y referido pendiente ata el testigo a la cuenta', async () => {
      TestBed.inject(TokenStore).guarda('token');
      almacen.guarda('nx036-aff-ref', 'ANA');
      almacen.guarda('nx036-aff-visitor', 'testigo');
      usuarioActual.consulta.mockResolvedValue(exito(usuario('USER')));
      atribucion.vincula.mockResolvedValue(exito(undefined));

      await captura.vincula();

      expect(atribucion.vincula).toHaveBeenCalledWith('testigo');
    });

    /** El personal de la casa no puede traerse a sí mismo por un enlace de referido. */
    it('no ata nada si quien entra es del personal', async () => {
      TestBed.inject(TokenStore).guarda('token');
      almacen.guarda('nx036-aff-ref', 'ANA');
      usuarioActual.consulta.mockResolvedValue(exito(usuario('ADMIN')));

      await captura.vincula();

      expect(atribucion.vincula).not.toHaveBeenCalled();
    });

    it('si no se puede saber quién entra, no se ata nada', async () => {
      TestBed.inject(TokenStore).guarda('token');
      almacen.guarda('nx036-aff-ref', 'ANA');
      usuarioActual.consulta.mockResolvedValue(fallo(creaError('no-autenticado')));

      await captura.vincula();

      expect(atribucion.vincula).not.toHaveBeenCalled();
    });
  });
});
