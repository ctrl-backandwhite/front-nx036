import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { exito, fallo } from '@shared/result/result';
import { creaError } from '@shared/error/app-error';
import { TokenStore } from '@core/auth/token-store';
import { ALMACEN_LOCAL } from '@core/storage/almacen.port';
import { AlmacenMemoriaAdapter } from '@core/storage/almacen-memoria.adapter';
import { USUARIO_ACTUAL_PORT, UsuarioActualPort } from '../../domain/port/autenticacion.port';
import {
  DESTINO_TRAS_ACCESO_PORT,
  DestinoTrasAccesoPort,
} from '../../domain/port/destino-tras-acceso.port';
import { Usuario } from '../../domain/model/usuario';
import { SesionStore } from '../state/sesion.store';
import { CompletaAccesoSocial } from './completa-acceso-social.use-case';

const CREDENCIAL = 'cabecera.contenido.firma';
const REFRESCO = 'otra.credencial.firma';

const cliente: Usuario = {
  id: 'u-1',
  email: 'alguien@ejemplo.com',
  rol: 'USER',
  activo: true,
  creadoEl: '2026-01-01T00:00:00Z',
  permisos: [],
};

describe('CompletaAccesoSocial', () => {
  let usuarioActual: UsuarioActualPort;
  let destino: DestinoTrasAccesoPort & { guardado: string | null };

  beforeEach(() => {
    usuarioActual = {
      consulta: vi.fn().mockResolvedValue(exito(cliente)),
      actualiza: vi.fn(),
    };
    destino = {
      guardado: null,
      recuerda(valor: string) {
        this.guardado = valor;
      },
      recoge() {
        const valor = this.guardado;
        this.guardado = null;
        return valor;
      },
    };
    TestBed.configureTestingModule({
      providers: [
        AlmacenMemoriaAdapter,
        { provide: ALMACEN_LOCAL, useExisting: AlmacenMemoriaAdapter },
        { provide: USUARIO_ACTUAL_PORT, useValue: usuarioActual },
        { provide: DESTINO_TRAS_ACCESO_PORT, useValue: destino },
      ],
    });
  });

  it('guarda el par de credenciales y publica quién ha entrado', async () => {
    const caso = TestBed.inject(CompletaAccesoSocial);

    const ruta = await caso.ejecuta(`token=${CREDENCIAL}&refresh=${REFRESCO}`);

    expect(TestBed.inject(TokenStore).acceso()).toBe(CREDENCIAL);
    expect(TestBed.inject(SesionStore).usuario()?.email).toBe('alguien@ejemplo.com');
    expect(ruta).toBe('/');
  });

  it('rechaza un fragmento sembrado a mano sin tocar la sesión', async () => {
    const caso = TestBed.inject(CompletaAccesoSocial);

    const ruta = await caso.ejecuta('token=basura');

    expect(ruta).toBeNull();
    expect(TestBed.inject(TokenStore).acceso()).toBeNull();
    expect(usuarioActual.consulta).not.toHaveBeenCalled();
  });

  it('vuelve al destino que se apuntó antes de saltar al proveedor, y lo consume', async () => {
    destino.recuerda('/checkout');
    const caso = TestBed.inject(CompletaAccesoSocial);

    expect(await caso.ejecuta(`token=${CREDENCIAL}`)).toBe('/checkout');
    expect(destino.recoge()).toBeNull();
  });

  it('descarta un destino que apunte fuera del sitio', async () => {
    destino.recuerda('//otra-web.com');
    const caso = TestBed.inject(CompletaAccesoSocial);

    expect(await caso.ejecuta(`token=${CREDENCIAL}`)).toBe('/');
  });

  it('lleva al panel a quien es del personal de la casa', async () => {
    vi.mocked(usuarioActual.consulta).mockResolvedValue(exito({ ...cliente, rol: 'ADMIN' }));
    const caso = TestBed.inject(CompletaAccesoSocial);

    expect(await caso.ejecuta(`token=${CREDENCIAL}`)).toBe('/admin');
  });

  it('si el perfil no responde sigue adelante: la sesión ya está guardada', async () => {
    vi.mocked(usuarioActual.consulta).mockResolvedValue(fallo(creaError('sin-conexion')));
    const caso = TestBed.inject(CompletaAccesoSocial);

    expect(await caso.ejecuta(`token=${CREDENCIAL}`)).toBe('/');
    expect(TestBed.inject(TokenStore).acceso()).toBe(CREDENCIAL);
  });

  it('ignora un testigo de refresco con mala forma pero conserva el de acceso', async () => {
    const caso = TestBed.inject(CompletaAccesoSocial);

    await caso.ejecuta(`token=${CREDENCIAL}&refresh=basura`);

    expect(TestBed.inject(TokenStore).acceso()).toBe(CREDENCIAL);
    expect(TestBed.inject(TokenStore).refresco()).toBeNull();
  });
});
