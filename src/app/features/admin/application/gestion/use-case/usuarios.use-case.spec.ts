import { TestBed } from '@angular/core/testing';
import { exito, fallo } from '@shared/result/result';
import { creaError } from '@shared/error/app-error';
import { paginaVacia } from '../../../domain/gestion/model/pagina';
import {
  USUARIOS_EN_LOTE_PORT, USUARIOS_PORT, UsuariosEnLotePort, UsuariosPort,
} from '../../../domain/gestion/port/usuarios.port';
import {
  ActuaSobreUsuarios, BloqueaUsuario, BuscaUsuarios, CambiaElRol, CambiaElRolEnLote,
  DaDeBajaUsuario, InvitaUsuario,
} from './usuarios.use-case';

/** Un doble del puerto que apunta lo que le piden. Es todo lo que hace falta: no hay red ni Angular. */
function dobleDeUsuarios(): UsuariosPort & { llamadas: string[] } {
  const llamadas: string[] = [];
  return {
    llamadas,
    busca: async (filtro) => {
      llamadas.push(`busca:${filtro.rol ?? ''}:${filtro.pagina}`);
      return exito(paginaVacia());
    },
    cambiaRol: async (id, rol) => (llamadas.push(`rol:${id}:${rol}`), exito(undefined)),
    bloquea: async (id, minutos) => (llamadas.push(`bloquea:${id}:${minutos}`), exito(undefined)),
    desbloquea: async (id) => (llamadas.push(`desbloquea:${id}`), exito(undefined)),
    activa: async (id) => (llamadas.push(`activa:${id}`), exito(undefined)),
    edita: async (id) => (llamadas.push(`edita:${id}`), exito(undefined)),
    reiniciaContrasena: async (id) => (llamadas.push(`reinicia:${id}`), exito(undefined)),
    borra: async (id) => (llamadas.push(`borra:${id}`), exito(undefined)),
    invita: async (email, rol) => (llamadas.push(`invita:${email}:${rol ?? ''}`), exito(undefined)),
  };
}

function dobleDeLote(): UsuariosEnLotePort & { llamadas: string[] } {
  const llamadas: string[] = [];
  const hecho = { correctos: 2, fallidos: 0, errores: [] };
  return {
    llamadas,
    activa: async (ids) => (llamadas.push(`activa:${ids.length}`), exito(hecho)),
    bloquea: async (ids) => (llamadas.push(`bloquea:${ids.length}`), exito(hecho)),
    desbloquea: async (ids) => (llamadas.push(`desbloquea:${ids.length}`), exito(hecho)),
    cambiaRol: async (ids, rol) => (llamadas.push(`rol:${ids.length}:${rol}`), exito(hecho)),
    borra: async (ids) => (llamadas.push(`borra:${ids.length}`), exito(hecho)),
  };
}

describe('casos de uso de usuarios', () => {
  let puerto: ReturnType<typeof dobleDeUsuarios>;
  let lote: ReturnType<typeof dobleDeLote>;

  beforeEach(() => {
    puerto = dobleDeUsuarios();
    lote = dobleDeLote();
    TestBed.configureTestingModule({
      providers: [
        { provide: USUARIOS_PORT, useValue: puerto },
        { provide: USUARIOS_EN_LOTE_PORT, useValue: lote },
        BuscaUsuarios, CambiaElRol, BloqueaUsuario, DaDeBajaUsuario, InvitaUsuario,
        ActuaSobreUsuarios, CambiaElRolEnLote,
      ],
    });
  });

  it('BuscaUsuarios pasa el filtro tal cual al puerto', async () => {
    await TestBed.inject(BuscaUsuarios).ejecuta({ rol: 'ADMIN', pagina: 2, tamano: 25 });

    expect(puerto.llamadas).toEqual(['busca:ADMIN:2']);
  });

  /** Una hora: el bloqueo del panel es una medida de contención, no una expulsión. */
  it('BloqueaUsuario decide la duración, para que no la elija cada pantalla', async () => {
    await TestBed.inject(BloqueaUsuario).ejecuta('u1');

    expect(puerto.llamadas).toEqual(['bloquea:u1:60']);
  });

  /**
   * «Dar de baja» NO borra: el backend anonimiza y pone marca de fecha. El nombre del caso de uso lo
   * dice, y esta prueba deja constancia de a qué operación del puerto corresponde.
   */
  it('DaDeBajaUsuario llama al borrado del puerto, que en realidad anonimiza', async () => {
    await TestBed.inject(DaDeBajaUsuario).ejecuta('u9');

    expect(puerto.llamadas).toEqual(['borra:u9']);
  });

  it('InvitaUsuario admite invitar sin papel, que el backend resuelve por defecto', async () => {
    await TestBed.inject(InvitaUsuario).ejecuta('alice@brand.com');

    expect(puerto.llamadas).toEqual(['invita:alice@brand.com:']);
  });

  it('ActuaSobreUsuarios encamina cada acción a su método del puerto', async () => {
    const caso = TestBed.inject(ActuaSobreUsuarios);

    await caso.ejecuta('activa', ['a', 'b']);
    await caso.ejecuta('bloquea', ['a', 'b']);
    await caso.ejecuta('desbloquea', ['a', 'b']);
    await caso.ejecuta('borra', ['a', 'b']);

    expect(lote.llamadas).toEqual(['activa:2', 'bloquea:2', 'desbloquea:2', 'borra:2']);
  });

  it('CambiaElRolEnLote lleva el papel elegido', async () => {
    await TestBed.inject(CambiaElRolEnLote).ejecuta(['a'], 'OPERATOR');

    expect(lote.llamadas).toEqual(['rol:1:OPERATOR']);
  });

  /** El camino de error: el fallo del puerto llega intacto a quien llamó, sin excepciones por medio. */
  it('devuelve el fallo del puerto sin transformarlo', async () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        {
          provide: USUARIOS_PORT,
          useValue: { ...dobleDeUsuarios(), cambiaRol: async () => fallo(creaError('sin-permiso', 'No puedes')) },
        },
        CambiaElRol,
      ],
    });

    const resultado = await TestBed.inject(CambiaElRol).ejecuta('u1', 'ADMIN');

    expect(resultado.ok).toBe(false);
    if (!resultado.ok) {
      expect(resultado.error.tipo).toBe('sin-permiso');
      expect(resultado.error.mensaje).toBe('No puedes');
    }
  });
});
