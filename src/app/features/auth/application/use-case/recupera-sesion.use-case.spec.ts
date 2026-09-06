import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { exito, fallo } from '@shared/result/result';
import { creaError } from '@shared/error/app-error';
import { TokenStore } from '@core/auth/token-store';
import { SesionActual } from '@core/auth/sesion-actual';
import { RECUPERADOR_DE_SESION } from '@core/auth/recuperador-de-sesion.port';
import { ALMACEN_LOCAL } from '@core/storage/almacen.port';
import { AlmacenMemoriaAdapter } from '@core/storage/almacen-memoria.adapter';
import { USUARIO_ACTUAL_PORT, UsuarioActualPort } from '../../domain/port/autenticacion.port';
import { Usuario } from '../../domain/model/usuario';
import { SesionStore } from '../state/sesion.store';
import { RecuperaSesion } from './recupera-sesion.use-case';

const ANA: Usuario = {
  id: 'u-1',
  email: 'ana@ejemplo.com',
  rol: 'OPERATOR',
  activo: true,
  nombreVisible: 'Ana',
  pais: 'ES',
  creadoEl: '2026-01-01T00:00:00Z',
  permisos: [],
};

describe('RecuperaSesion como recuperador del núcleo', () => {
  let usuarioActual: UsuarioActualPort;

  beforeEach(() => {
    usuarioActual = { consulta: vi.fn().mockResolvedValue(exito(ANA)), actualiza: vi.fn() };
    TestBed.configureTestingModule({
      providers: [
        AlmacenMemoriaAdapter,
        { provide: ALMACEN_LOCAL, useExisting: AlmacenMemoriaAdapter },
        { provide: USUARIO_ACTUAL_PORT, useValue: usuarioActual },
        { provide: RECUPERADOR_DE_SESION, useExisting: RecuperaSesion },
      ],
    });
  });

  /**
   * Sin credencial guardada no se pregunta: hacerlo provocaba un rechazo por sesión caducada —y con él
   * una renovación inútil— en cada arranque en frío de cualquier visitante anónimo, que son la mayoría.
   */
  it('sin credencial no pregunta al backend, pero deja la sesión RESUELTA', async () => {
    await TestBed.inject(RecuperaSesion).asegura();

    expect(usuarioActual.consulta).not.toHaveBeenCalled();
    expect(TestBed.inject(SesionActual).resuelta()).toBe(true);
    expect(TestBed.inject(SesionActual).haySesion()).toBe(false);
  });

  it('publica en el núcleo lo mínimo para decidir qué se enseña', async () => {
    TestBed.inject(TokenStore).guarda('credencial');

    await TestBed.inject(RecuperaSesion).asegura();

    const nucleo = TestBed.inject(SesionActual);
    expect(nucleo.datos()).toEqual({
      id: 'u-1',
      rol: 'OPERATOR',
      nombreVisible: 'Ana',
      pais: 'ES',
    });
    expect(nucleo.esPersonalInterno()).toBe(true);
    // La cuenta entera se queda en «auth»; el núcleo solo publica el hecho.
    expect(TestBed.inject(SesionStore).usuario()?.email).toBe('ana@ejemplo.com');
  });

  /** Navegar entre dos rutas protegidas no puede disparar una consulta del perfil por cada salto. */
  it('si la sesión ya está resuelta, no vuelve a preguntar', async () => {
    TestBed.inject(TokenStore).guarda('credencial');
    const caso = TestBed.inject(RecuperaSesion);

    await caso.asegura();
    await caso.asegura();

    expect(usuarioActual.consulta).toHaveBeenCalledTimes(1);
  });

  it('un fallo deja la sesión resuelta y sin nadie dentro, sin lanzar', async () => {
    TestBed.inject(TokenStore).guarda('credencial');
    vi.mocked(usuarioActual.consulta).mockResolvedValue(fallo(creaError('no-autenticado')));

    await TestBed.inject(RecuperaSesion).asegura();

    expect(TestBed.inject(SesionActual).resuelta()).toBe(true);
    expect(TestBed.inject(SesionActual).haySesion()).toBe(false);
  });

  it('al limpiar la sesión, el núcleo se entera', async () => {
    TestBed.inject(TokenStore).guarda('credencial');
    await TestBed.inject(RecuperaSesion).asegura();

    TestBed.inject(SesionStore).limpia();

    expect(TestBed.inject(SesionActual).datos()).toBeNull();
    expect(TestBed.inject(SesionActual).resuelta()).toBe(true);
  });
});
