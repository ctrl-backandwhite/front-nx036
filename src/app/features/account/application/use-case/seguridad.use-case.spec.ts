import { TestBed } from '@angular/core/testing';
import { creaError } from '@shared/error/app-error';
import { exito, fallo } from '@shared/result/result';
import { SesionActiva } from '../../domain/model/seguridad';
import {
  CODIGO_QR_PORT,
  DOBLE_FACTOR_PORT,
  SESIONES_ACTIVAS_PORT,
} from '../../domain/port/seguridad.port';
import {
  ActivaDobleFactor,
  CargaSesionesActivas,
  ConfirmaDobleFactor,
  ConsultaDobleFactor,
  DesactivaDobleFactor,
  RevocaSesion,
} from './seguridad.use-case';

const ALTA = { secreto: 'ABC123', urlOtpauth: 'otpauth://totp/NX036?secret=ABC123' };

const SESION: SesionActiva = {
  id: 's-1',
  dispositivo: 'iPhone 15',
  creadaEl: '2026-01-01T00:00:00Z',
  ultimoUsoEl: '2026-01-02T00:00:00Z',
  actual: false,
};

describe('casos de uso de seguridad', () => {
  const estaActivo = vi.fn();
  const inicia = vi.fn();
  const verifica = vi.fn();
  const desactiva = vi.fn();
  const lista = vi.fn();
  const revoca = vi.fn();
  const dibuja = vi.fn();

  beforeEach(() => {
    estaActivo.mockReset().mockResolvedValue(exito(true));
    inicia.mockReset().mockResolvedValue(exito(ALTA));
    verifica.mockReset().mockResolvedValue(exito(['aaa', 'bbb']));
    desactiva.mockReset().mockResolvedValue(exito(undefined));
    lista.mockReset().mockResolvedValue(exito([SESION]));
    revoca.mockReset().mockResolvedValue(exito(undefined));
    dibuja.mockReset().mockResolvedValue('data:image/png;base64,xxx');
    TestBed.configureTestingModule({
      providers: [
        { provide: DOBLE_FACTOR_PORT, useValue: { estaActivo, inicia, verifica, desactiva } },
        { provide: SESIONES_ACTIVAS_PORT, useValue: { lista, revoca } },
        { provide: CODIGO_QR_PORT, useValue: { dibuja } },
      ],
    });
  });

  it('dice si el segundo factor está puesto', async () => {
    expect(await TestBed.inject(ConsultaDobleFactor).ejecuta()).toBe(true);
  });

  /** Pintar el interruptor encendido sin saberlo haría creer que la cuenta está protegida. */
  it('si no se puede consultar, se asume que NO lo tiene', async () => {
    estaActivo.mockResolvedValue(fallo(creaError('sin-conexion')));

    expect(await TestBed.inject(ConsultaDobleFactor).ejecuta()).toBe(false);
  });

  /**
   * El dibujo se hace en el propio navegador: la dirección lleva dentro la semilla, y mandarla fuera
   * —como se hacía— regala el segundo factor de la cuenta.
   */
  it('al activar, dibuja el código QR con la dirección que trae el servidor', async () => {
    const resultado = await TestBed.inject(ActivaDobleFactor).ejecuta();

    expect(resultado.ok).toBe(true);
    expect(dibuja).toHaveBeenCalledWith(ALTA.urlOtpauth);
    expect(resultado.ok && resultado.valor.qr).toContain('data:image/png');
  });

  it('sin QR dibujado sigue habiendo secreto que teclear a mano', async () => {
    dibuja.mockResolvedValue(null);

    const resultado = await TestBed.inject(ActivaDobleFactor).ejecuta();

    expect(resultado.ok && resultado.valor.qr).toBeNull();
    expect(resultado.ok && resultado.valor.secreto).toBe('ABC123');
  });

  it('si el servidor no da la semilla, no se dibuja nada', async () => {
    inicia.mockResolvedValue(fallo(creaError('error-del-servidor')));

    expect((await TestBed.inject(ActivaDobleFactor).ejecuta()).ok).toBe(false);
    expect(dibuja).not.toHaveBeenCalled();
  });

  it('verificar devuelve los códigos de respaldo, que solo se ven una vez', async () => {
    const resultado = await TestBed.inject(ConfirmaDobleFactor).ejecuta(' 123456 ');

    expect(verifica).toHaveBeenCalledWith('123456');
    expect(resultado.ok && resultado.valor).toEqual(['aaa', 'bbb']);
  });

  it('desactivar exige la contraseña y devuelve el fallo del servidor si no cuadra', async () => {
    desactiva.mockResolvedValue(fallo(creaError('peticion-invalida', 'Contraseña incorrecta')));

    const resultado = await TestBed.inject(DesactivaDobleFactor).ejecuta('mala');

    expect(desactiva).toHaveBeenCalledWith('mala');
    expect(resultado.ok).toBe(false);
  });

  it('lista los dispositivos conectados', async () => {
    expect(await TestBed.inject(CargaSesionesActivas).ejecuta()).toEqual([SESION]);
  });

  /** Es información de apoyo: un fallo no puede romper la pantalla de seguridad entera. */
  it('si no se pueden leer las sesiones, la lista sale vacía', async () => {
    lista.mockResolvedValue(fallo(creaError('sin-conexion')));

    expect(await TestBed.inject(CargaSesionesActivas).ejecuta()).toEqual([]);
  });

  it('revocar devuelve la lista ya sin el dispositivo', async () => {
    lista.mockResolvedValue(exito([]));

    const resultado = await TestBed.inject(RevocaSesion).ejecuta('s-1');

    expect(revoca).toHaveBeenCalledWith('s-1');
    expect(resultado.ok && resultado.valor).toEqual([]);
  });

  it('si revocar falla, no se vuelve a listar', async () => {
    revoca.mockResolvedValue(fallo(creaError('sin-permiso')));

    expect((await TestBed.inject(RevocaSesion).ejecuta('s-1')).ok).toBe(false);
    expect(lista).not.toHaveBeenCalled();
  });
});
