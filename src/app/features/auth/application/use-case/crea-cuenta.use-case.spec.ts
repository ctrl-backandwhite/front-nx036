import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { exito, fallo } from '@shared/result/result';
import { creaError } from '@shared/error/app-error';
import { ALTA_DE_CUENTA_PORT, AltaDeCuentaPort } from '../../domain/port/autenticacion.port';
import { BorradorDeAlta } from '../../domain/model/alta';
import { CreaCuenta } from './crea-cuenta.use-case';

/** Un doble del puerto: el caso de uso se prueba sin red y sin backend. */
function dobleDelPuerto(): AltaDeCuentaPort {
  return {
    registra: vi.fn().mockResolvedValue(exito({ idUsuario: 'u-1', mensaje: 'creada' })),
    activa: vi.fn().mockResolvedValue(exito(undefined)),
    reenviaActivacion: vi.fn().mockResolvedValue(exito(undefined)),
  };
}

const borrador: BorradorDeAlta = {
  email: 'alguien@ejemplo.com',
  contrasena: 'Segura123!',
  repiteContrasena: 'Segura123!',
  idioma: 'es',
  aceptaCondiciones: true,
  versionDeCondiciones: '2026-08-15',
  aceptaComunicaciones: false,
};

describe('CreaCuenta', () => {
  let puerto: AltaDeCuentaPort;

  beforeEach(() => {
    puerto = dobleDelPuerto();
    TestBed.configureTestingModule({
      providers: [{ provide: ALTA_DE_CUENTA_PORT, useValue: puerto }],
    });
  });

  it('registra cuando el borrador está completo', async () => {
    const resultado = await TestBed.inject(CreaCuenta).ejecuta(borrador, true, 'testigo');

    expect(resultado.ok).toBe(true);
    expect(puerto.registra).toHaveBeenCalledWith(
      expect.objectContaining({ email: 'alguien@ejemplo.com', aceptaCondiciones: true }),
      'testigo',
    );
  });

  it('NO llama al backend si falta algo: gastaría un intento del límite por IP', async () => {
    const resultado = await TestBed.inject(CreaCuenta).ejecuta(borrador, true, null);

    expect(resultado.ok).toBe(false);
    expect(puerto.registra).not.toHaveBeenCalled();
    if (!resultado.ok) {
      expect(resultado.error.codigo).toBe('captcha-pendiente');
    }
  });

  it('devuelve el motivo local para que la pantalla elija el texto', async () => {
    const resultado = await TestBed.inject(CreaCuenta).ejecuta(
      { ...borrador, repiteContrasena: 'otra' },
      true,
      'testigo',
    );

    expect(resultado.ok).toBe(false);
    if (!resultado.ok) {
      expect(resultado.error.codigo).toBe('contrasenas-no-coinciden');
      expect(resultado.error.tipo).toBe('peticion-invalida');
    }
  });

  it('deja pasar el fallo del backend tal cual: el mensaje lo escribe él', async () => {
    vi.mocked(puerto.registra).mockResolvedValue(
      fallo(creaError('conflicto', 'Ya existe una cuenta con ese correo.', { estado: 409 })),
    );

    const resultado = await TestBed.inject(CreaCuenta).ejecuta(borrador, true, 'testigo');

    expect(resultado.ok).toBe(false);
    if (!resultado.ok) {
      expect(resultado.error.mensaje).toBe('Ya existe una cuenta con ese correo.');
    }
  });
});
