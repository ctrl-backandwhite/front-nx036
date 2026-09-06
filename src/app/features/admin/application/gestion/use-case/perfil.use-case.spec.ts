import { TestBed } from '@angular/core/testing';
import { exito, fallo } from '@shared/result/result';
import { creaError } from '@shared/error/app-error';
import { Usuario } from '@features/auth/domain/model/usuario';
import { SesionActual } from '@core/auth/sesion-actual';
import {
  PERFIL_PORT, PerfilPort, SEGUNDO_FACTOR_PORT, SegundoFactorPort,
} from '../../../domain/gestion/port/perfil.port';
import {
  CambiaLaContrasena, ConsultaElPerfil, ConsultaElSegundoFactor, DesactivaElSegundoFactor,
  GuardaElPerfil,
} from './perfil.use-case';

const USUARIO: Usuario = {
  id: 'u1', email: 'ana@nx036.local', rol: 'ADMIN', activo: true, creadoEl: '2026-01-01',
  permisos: [], nombreVisible: 'Ana nueva',
};

describe('GuardaElPerfil', () => {
  /**
   * Tras guardar hay que PUBLICAR el usuario nuevo en la sesión: la cabecera, el saludo y el avatar
   * leen de ahí, y sin esto seguirían enseñando el nombre viejo hasta recargar la página.
   */
  it('publica el usuario actualizado en el almacén de sesión', async () => {
    const puerto: PerfilPort = {
      lee: async () => exito(USUARIO),
      actualiza: async () => exito(USUARIO),
      cambiaContrasena: async () => exito(undefined),
    };
    TestBed.configureTestingModule({
      providers: [{ provide: PERFIL_PORT, useValue: puerto }, GuardaElPerfil],
    });

    const resultado = await TestBed.inject(GuardaElPerfil).ejecuta({ nombreVisible: 'Ana nueva' });

    expect(resultado.ok).toBe(true);
    expect(TestBed.inject(SesionActual).datos()?.nombreVisible).toBe('Ana nueva');
  });

  it('con fallo no toca la sesión', async () => {
    const puerto: PerfilPort = {
      lee: async () => exito(USUARIO),
      actualiza: async () => fallo(creaError('peticion-invalida')),
      cambiaContrasena: async () => exito(undefined),
    };
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [{ provide: PERFIL_PORT, useValue: puerto }, GuardaElPerfil],
    });

    const resultado = await TestBed.inject(GuardaElPerfil).ejecuta({ nombreVisible: 'X' });

    expect(resultado.ok).toBe(false);
    expect(TestBed.inject(SesionActual).datos()).toBeNull();
  });
});

describe('CambiaLaContrasena', () => {
  let enviadas: string[];

  beforeEach(() => {
    enviadas = [];
    const puerto: PerfilPort = {
      lee: async () => exito(USUARIO),
      actualiza: async () => exito(USUARIO),
      cambiaContrasena: async (actual, nueva) => (enviadas.push(`${actual}>${nueva}`), exito(undefined)),
    };
    TestBed.configureTestingModule({
      providers: [{ provide: PERFIL_PORT, useValue: puerto }, CambiaLaContrasena],
    });
  });

  it('cambia cuando las dos nuevas coinciden y llegan al largo mínimo', async () => {
    const resultado = await TestBed.inject(CambiaLaContrasena)
      .ejecuta('vieja', 'contrasena-nueva', 'contrasena-nueva');

    expect(resultado.ok).toBe(true);
    expect(enviadas).toEqual(['vieja>contrasena-nueva']);
  });

  /** El backend solo recibe una: que coincidan es una comprobación que solo puede hacerse aquí. */
  it('no manda nada si no coinciden o si es demasiado corta', async () => {
    const caso = TestBed.inject(CambiaLaContrasena);

    expect((await caso.ejecuta('v', 'contrasena-nueva', 'otra-cosa')).ok).toBe(false);
    expect((await caso.ejecuta('v', 'corta', 'corta')).ok).toBe(false);
    expect(enviadas).toEqual([]);
  });
});

describe('segundo factor', () => {
  function doble(sobrescribe: Partial<SegundoFactorPort> = {}): SegundoFactorPort {
    return {
      estado: async () => exito(true),
      inicia: async () => exito({ secreto: 'ABC', urlOtpauth: 'otpauth://x' }),
      verifica: async () => exito(['1111']),
      desactiva: async () => exito(undefined),
      ...sobrescribe,
    };
  }

  it('el estado se lee como sí o no', async () => {
    TestBed.configureTestingModule({
      providers: [{ provide: SEGUNDO_FACTOR_PORT, useValue: doble() }, ConsultaElSegundoFactor],
    });

    expect(await TestBed.inject(ConsultaElSegundoFactor).ejecuta()).toBe(true);
  });

  /** Una cuenta sin el endpoint no tiene segundo factor: el interruptor se pinta apagado, sin error. */
  it('un fallo al consultar el estado se lee como «apagado», no como avería', async () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        { provide: SEGUNDO_FACTOR_PORT, useValue: doble({ estado: async () => fallo(creaError('no-encontrado')) }) },
        ConsultaElSegundoFactor,
      ],
    });

    expect(await TestBed.inject(ConsultaElSegundoFactor).ejecuta()).toBe(false);
  });

  /** Sin la contraseña bastaría una sesión robada para desarmar el segundo factor. */
  it('no se puede desactivar sin contraseña', async () => {
    let llamado = false;
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        {
          provide: SEGUNDO_FACTOR_PORT,
          useValue: doble({ desactiva: async () => ((llamado = true), exito(undefined)) }),
        },
        DesactivaElSegundoFactor,
      ],
    });

    const resultado = await TestBed.inject(DesactivaElSegundoFactor).ejecuta('');

    expect(resultado.ok).toBe(false);
    expect(llamado).toBe(false);
  });
});

describe('ConsultaElPerfil', () => {
  /**
   * La ficha enseña MÁS de lo que publica la sesión —correo, empresa, idioma y fecha de alta—, y por eso
   * se pide al backend. Ampliar lo que publica la sesión para que quepan cuatro campos de una sola
   * pantalla convertiría el núcleo en un almacén de perfiles.
   */
  it('trae la cuenta completa del backend', async () => {
    const puerto: PerfilPort = {
      lee: async () => exito({ ...USUARIO, empresa: 'Acme', idioma: 'es' }),
      actualiza: async () => exito(USUARIO),
      cambiaContrasena: async () => exito(undefined),
    };
    TestBed.configureTestingModule({
      providers: [{ provide: PERFIL_PORT, useValue: puerto }, ConsultaElPerfil],
    });

    const resultado = await TestBed.inject(ConsultaElPerfil).ejecuta();

    expect(resultado.ok).toBe(true);
    if (resultado.ok) {
      expect(resultado.valor.empresa).toBe('Acme');
    }
  });

  /** Si no se puede leer, el fallo llega tal cual: la pantalla decide qué enseña con lo que ya sabe. */
  it('propaga el fallo sin inventar una cuenta vacía', async () => {
    const puerto: PerfilPort = {
      lee: async () => fallo(creaError('sin-conexion')),
      actualiza: async () => exito(USUARIO),
      cambiaContrasena: async () => exito(undefined),
    };
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [{ provide: PERFIL_PORT, useValue: puerto }, ConsultaElPerfil],
    });

    expect((await TestBed.inject(ConsultaElPerfil).ejecuta()).ok).toBe(false);
  });
});
