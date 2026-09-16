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
  let destino: DestinoTrasAccesoPort & { guardado: string | null; testigo: string | null };

  beforeEach(() => {
    usuarioActual = {
      consulta: vi.fn().mockResolvedValue(exito(cliente)),
      actualiza: vi.fn(),
    };
    destino = {
      guardado: null,
      testigo: null,
      recuerda(valor: string) {
        this.guardado = valor;
      },
      recoge() {
        const valor = this.guardado;
        this.guardado = null;
        return valor;
      },
      recuerdaTestigo(valor: string) {
        this.testigo = valor;
      },
      consumeTestigo() {
        const valor = this.testigo;
        this.testigo = null;
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
    destino.recuerdaTestigo('t-1');

    const ruta = await caso.ejecuta(`token=${CREDENCIAL}&refresh=${REFRESCO}&nonce=t-1`);

    expect(TestBed.inject(TokenStore).acceso()).toBe(CREDENCIAL);
    expect(TestBed.inject(SesionStore).usuario()?.email).toBe('alguien@ejemplo.com');
    expect(ruta).toBe('/');
  });

  /**
   * El ataque que esto cierra: FIJACIÓN DE SESIÓN por el retorno del acceso social.
   *
   * <p>La única comprobación que había era que los testigos TUVIERAN FORMA de JWT, y eso no distingue
   * basura de un JWT auténtico de OTRA cuenta. El atacante entra con la suya, copia sus dos credenciales
   * —las tiene a mano— y publica un enlace a `/auth/callback#token=…&refresh=…`. La víctima lo abre: la
   * pantalla limpia la barra de direcciones antes de nada, así que no queda rastro visible, y a partir
   * de ahí la víctima navega DENTRO de la cuenta del atacante. La dirección de envío que teclee, el
   * pedido que haga y la tarjeta que guarde quedan en esa cuenta, que el atacante lee cuando quiera. Y
   * como también se le planta el refresco, el secuestro sobrevive a la caducidad del acceso.
   *
   * <p>El testigo lo genera ESTA pestaña antes de saltar al proveedor. Quien fabrique el enlace no
   * puede acertar con uno que la víctima haya guardado.
   */
  it('rechaza unas credenciales auténticas que no vengan de un flujo abierto en esta pestaña', async () => {
    const caso = TestBed.inject(CompletaAccesoSocial);
    // Esta pestaña no ha arrancado ningún acceso social: no hay testigo anotado.

    const ruta = await caso.ejecuta(`token=${CREDENCIAL}&refresh=${REFRESCO}&nonce=el-del-atacante`);

    expect(ruta).toBeNull();
    expect(TestBed.inject(TokenStore).acceso()).toBeNull();
    expect(usuarioActual.consulta).not.toHaveBeenCalled();
  });

  it('rechaza el retorno si el testigo no es el que esta pestaña guardó', async () => {
    const caso = TestBed.inject(CompletaAccesoSocial);
    destino.recuerdaTestigo('el-mio');

    const ruta = await caso.ejecuta(`token=${CREDENCIAL}&refresh=${REFRESCO}&nonce=otro`);

    expect(ruta).toBeNull();
    expect(TestBed.inject(TokenStore).acceso()).toBeNull();
  });

  /** Un testigo vale UNA vez: reutilizar un destino de éxito ya consumido no entra. */
  it('el testigo se consume: el mismo retorno no vale dos veces', async () => {
    const caso = TestBed.inject(CompletaAccesoSocial);
    destino.recuerdaTestigo('t-1');
    const fragmento = `token=${CREDENCIAL}&refresh=${REFRESCO}&nonce=t-1`;

    expect(await caso.ejecuta(fragmento)).not.toBeNull();
    TestBed.inject(TokenStore).limpia();

    expect(await caso.ejecuta(fragmento)).toBeNull();
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

    destino.recuerdaTestigo('t-1');
    expect(await caso.ejecuta(`token=${CREDENCIAL}&nonce=t-1`)).toBe('/checkout');
    expect(destino.recoge()).toBeNull();
  });

  it('descarta un destino que apunte fuera del sitio', async () => {
    destino.recuerda('//otra-web.com');
    const caso = TestBed.inject(CompletaAccesoSocial);

    destino.recuerdaTestigo('t-1');
    expect(await caso.ejecuta(`token=${CREDENCIAL}&nonce=t-1`)).toBe('/');
  });

  it('lleva al panel a quien es del personal de la casa', async () => {
    vi.mocked(usuarioActual.consulta).mockResolvedValue(exito({ ...cliente, rol: 'ADMIN' }));
    const caso = TestBed.inject(CompletaAccesoSocial);

    destino.recuerdaTestigo('t-1');
    expect(await caso.ejecuta(`token=${CREDENCIAL}&nonce=t-1`)).toBe('/admin');
  });

  it('si el perfil no responde sigue adelante: la sesión ya está guardada', async () => {
    vi.mocked(usuarioActual.consulta).mockResolvedValue(fallo(creaError('sin-conexion')));
    const caso = TestBed.inject(CompletaAccesoSocial);

    destino.recuerdaTestigo('t-1');
    expect(await caso.ejecuta(`token=${CREDENCIAL}&nonce=t-1`)).toBe('/');
    expect(TestBed.inject(TokenStore).acceso()).toBe(CREDENCIAL);
  });

  it('ignora un testigo de refresco con mala forma pero conserva el de acceso', async () => {
    const caso = TestBed.inject(CompletaAccesoSocial);

    destino.recuerdaTestigo('t-1');
    await caso.ejecuta(`token=${CREDENCIAL}&refresh=basura&nonce=t-1`);

    expect(TestBed.inject(TokenStore).acceso()).toBe(CREDENCIAL);
    expect(TestBed.inject(TokenStore).refresco()).toBeNull();
  });
});
