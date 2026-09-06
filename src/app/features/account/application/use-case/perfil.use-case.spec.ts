import { TestBed } from '@angular/core/testing';
import { USUARIO_ACTUAL_PORT } from '@features/auth/domain/port/autenticacion.port';
import { TokenStore } from '@core/auth/token-store';
import { ALMACEN_LOCAL } from '@core/storage/almacen.port';
import { AlmacenMemoriaAdapter } from '@core/storage/almacen-memoria.adapter';
import { creaError } from '@shared/error/app-error';
import { exito, fallo } from '@shared/result/result';
import {
  BAJA_DE_CUENTA_PORT,
  FIN_DE_SESION_PORT,
  PERFIL_PORT,
  PORTABILIDAD_PORT,
} from '../../domain/port/perfil.port';
import { DESCARGA_PORT, FicheroDescargable } from '../../domain/port/descarga.port';
import { CuentaStore } from '../state/cuenta.store';
import { RecuperaCuenta } from './recupera-cuenta.use-case';
import { GuardaPerfil } from './guarda-perfil.use-case';
import {
  CONTRASENAS_DISTINTAS,
  CONTRASENA_DEBIL,
  CambiaContrasena,
} from './cambia-contrasena.use-case';
import { DescargaMisDatos } from './descarga-mis-datos.use-case';
import { ConfirmaBajaDeCuenta, SolicitaBajaDeCuenta } from './baja-de-cuenta.use-case';
import { APLICACION_DE_ACCOUNT } from '../../account.providers';

const TITULAR = {
  id: 'u-1',
  email: 'ana@nx036.test',
  rol: 'USER' as const,
  activo: true,
  creadoEl: '2026-01-01T00:00:00Z',
  permisos: [],
};

const DATOS = {
  nombre: 'Ana',
  primerApellido: 'Pérez',
  segundoApellido: '',
  empresa: '',
  pais: 'ES',
  idioma: 'es',
  telefono: '+34600123456',
};

describe('RecuperaCuenta', () => {
  const consulta = vi.fn();

  beforeEach(() => {
    consulta.mockReset();
    TestBed.configureTestingModule({
      providers: [
        ...APLICACION_DE_ACCOUNT,
        { provide: ALMACEN_LOCAL, useClass: AlmacenMemoriaAdapter },
        { provide: USUARIO_ACTUAL_PORT, useValue: { consulta, actualiza: vi.fn() } },
      ],
    });
  });

  /**
   * Sin credencial guardada no se pregunta: preguntarlo provocaba un rechazo por sesión caducada y un
   * intento de renovación inútil en cada arranque en frío de un visitante anónimo.
   */
  it('sin credencial guardada NO pregunta al backend', async () => {
    await TestBed.inject(RecuperaCuenta).ejecuta();

    expect(consulta).not.toHaveBeenCalled();
    expect(TestBed.inject(CuentaStore).resuelta()).toBe(true);
    expect(TestBed.inject(CuentaStore).hayTitular()).toBe(false);
  });

  it('con credencial pregunta y publica el titular', async () => {
    TestBed.inject(TokenStore).guarda('testigo');
    consulta.mockResolvedValue(exito(TITULAR));

    await TestBed.inject(RecuperaCuenta).ejecuta();

    expect(TestBed.inject(CuentaStore).titular()).toEqual(TITULAR);
  });

  it('si la consulta falla, se queda sin titular pero RESUELTA', async () => {
    TestBed.inject(TokenStore).guarda('testigo');
    consulta.mockResolvedValue(fallo(creaError('no-autenticado')));

    await TestBed.inject(RecuperaCuenta).ejecuta();

    expect(TestBed.inject(CuentaStore).hayTitular()).toBe(false);
    expect(TestBed.inject(CuentaStore).resuelta()).toBe(true);
  });
});

describe('GuardaPerfil', () => {
  const actualiza = vi.fn();
  const consulta = vi.fn();

  beforeEach(() => {
    actualiza.mockReset();
    consulta.mockReset().mockResolvedValue(exito(TITULAR));
    TestBed.configureTestingModule({
      providers: [
        ...APLICACION_DE_ACCOUNT,
        { provide: ALMACEN_LOCAL, useClass: AlmacenMemoriaAdapter },
        { provide: PERFIL_PORT, useValue: { actualiza, cambiaContrasena: vi.fn() } },
        { provide: USUARIO_ACTUAL_PORT, useValue: { consulta, actualiza: vi.fn() } },
      ],
    });
  });

  /**
   * Releer después de guardar no es un adorno: el servidor normaliza el teléfono y puede recortar el
   * nombre, y sin releer el siguiente guardado escribiría encima lo viejo.
   */
  it('tras guardar vuelve a leer el titular', async () => {
    actualiza.mockResolvedValue(exito(undefined));
    TestBed.inject(TokenStore).guarda('testigo');

    const resultado = await TestBed.inject(GuardaPerfil).ejecuta(DATOS);

    expect(resultado.ok).toBe(true);
    expect(actualiza).toHaveBeenCalledWith(DATOS);
    expect(consulta).toHaveBeenCalled();
  });

  it('si el servidor rechaza, NO relee y devuelve el fallo tal cual', async () => {
    actualiza.mockResolvedValue(fallo(creaError('peticion-invalida', 'Teléfono no válido')));

    const resultado = await TestBed.inject(GuardaPerfil).ejecuta(DATOS);

    expect(resultado.ok).toBe(false);
    expect(consulta).not.toHaveBeenCalled();
  });
});

describe('CambiaContrasena', () => {
  const cambiaContrasena = vi.fn();

  beforeEach(() => {
    cambiaContrasena.mockReset().mockResolvedValue(exito(undefined));
    TestBed.configureTestingModule({
      providers: [
        ...APLICACION_DE_ACCOUNT,
        { provide: PERFIL_PORT, useValue: { actualiza: vi.fn(), cambiaContrasena } },
      ],
    });
  });

  it('manda al backend la contraseña que cumple y coincide', async () => {
    const resultado = await TestBed.inject(CambiaContrasena).ejecuta(
      'vieja',
      'Abcdef1!',
      'Abcdef1!',
    );

    expect(resultado.ok).toBe(true);
    expect(cambiaContrasena).toHaveBeenCalledWith({ actual: 'vieja', nueva: 'Abcdef1!' });
  });

  /** Un viaje condenado a fallar se evita aquí; el que manda de verdad sigue siendo el backend. */
  it('no llega a salir si la nueva no cumple la política', async () => {
    const resultado = await TestBed.inject(CambiaContrasena).ejecuta('vieja', 'corta', 'corta');

    expect(resultado.ok).toBe(false);
    expect(resultado.ok ? null : resultado.error.codigo).toBe(CONTRASENA_DEBIL);
    expect(cambiaContrasena).not.toHaveBeenCalled();
  });

  it('no llega a salir si la repetición no coincide', async () => {
    const resultado = await TestBed.inject(CambiaContrasena).ejecuta(
      'vieja',
      'Abcdef1!',
      'Abcdef2!',
    );

    expect(resultado.ok).toBe(false);
    expect(resultado.ok ? null : resultado.error.codigo).toBe(CONTRASENAS_DISTINTAS);
    expect(cambiaContrasena).not.toHaveBeenCalled();
  });
});

describe('DescargaMisDatos', () => {
  const exporta = vi.fn();
  const entrega = vi.fn();

  const fichero: FicheroDescargable = { nombre: 'mis-datos.json', contenido: new Blob(['{}']) };

  beforeEach(() => {
    exporta.mockReset();
    entrega.mockReset();
    TestBed.configureTestingModule({
      providers: [
        ...APLICACION_DE_ACCOUNT,
        { provide: PORTABILIDAD_PORT, useValue: { exporta } },
        { provide: DESCARGA_PORT, useValue: { entrega } },
      ],
    });
  });

  it('pide la copia y se la entrega a quien mira', async () => {
    exporta.mockResolvedValue(exito(fichero));

    const resultado = await TestBed.inject(DescargaMisDatos).ejecuta();

    expect(resultado.ok).toBe(true);
    expect(entrega).toHaveBeenCalledWith(fichero);
  });

  it('si el servidor falla, no se entrega nada', async () => {
    exporta.mockResolvedValue(fallo(creaError('error-del-servidor')));

    const resultado = await TestBed.inject(DescargaMisDatos).ejecuta();

    expect(resultado.ok).toBe(false);
    expect(entrega).not.toHaveBeenCalled();
  });
});

describe('baja de cuenta', () => {
  const solicita = vi.fn();
  const confirma = vi.fn();
  const termina = vi.fn();

  beforeEach(() => {
    solicita.mockReset();
    confirma.mockReset();
    termina.mockReset().mockResolvedValue(undefined);
    TestBed.configureTestingModule({
      providers: [
        ...APLICACION_DE_ACCOUNT,
        { provide: BAJA_DE_CUENTA_PORT, useValue: { solicita, confirma } },
        { provide: FIN_DE_SESION_PORT, useValue: { termina } },
      ],
    });
  });

  it('el primer paso pide el código', async () => {
    solicita.mockResolvedValue(exito(undefined));

    expect((await TestBed.inject(SolicitaBajaDeCuenta).ejecuta()).ok).toBe(true);
    expect(solicita).toHaveBeenCalled();
  });

  /**
   * Salir es parte de la operación: la cuenta que acaba de desactivarse no puede quedarse con la sesión
   * abierta. Y «baja» no es «borrado»: el servidor anonimiza y apunta la fecha.
   */
  it('al confirmar, cierra la sesión y olvida al titular', async () => {
    confirma.mockResolvedValue(exito(undefined));
    const cuenta = TestBed.inject(CuentaStore);
    cuenta.fija(TITULAR);

    const resultado = await TestBed.inject(ConfirmaBajaDeCuenta).ejecuta(' 123456 ');

    expect(resultado.ok).toBe(true);
    expect(confirma).toHaveBeenCalledWith('123456');
    expect(termina).toHaveBeenCalled();
    expect(cuenta.hayTitular()).toBe(false);
  });

  it('con un código erróneo NO cierra la sesión', async () => {
    confirma.mockResolvedValue(fallo(creaError('peticion-invalida', 'Código no válido')));

    const resultado = await TestBed.inject(ConfirmaBajaDeCuenta).ejecuta('000000');

    expect(resultado.ok).toBe(false);
    expect(termina).not.toHaveBeenCalled();
  });
});
