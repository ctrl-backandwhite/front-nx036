import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { ALMACEN_LOCAL, AlmacenPort } from '@core/storage/almacen.port';
import { AlmacenMemoriaAdapter } from '@core/storage/almacen-memoria.adapter';
import { POSICION_INICIAL } from '../../domain/model/asistente';
import { AvatarStore } from './avatar.store';

/** Un almacén que LANZA al tocarlo, como el del navegador en modo privado. */
class AlmacenQueLanza implements AlmacenPort {
  lee(): string | null {
    throw new Error('bloqueado');
  }
  guarda(): void {
    throw new Error('bloqueado');
  }
  borra(): void {
    throw new Error('bloqueado');
  }
}

describe('AvatarStore', () => {
  let almacen: AlmacenMemoriaAdapter;
  let avatar: AvatarStore;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [AlmacenMemoriaAdapter, { provide: ALMACEN_LOCAL, useExisting: AlmacenMemoriaAdapter }],
    });
    almacen = TestBed.inject(AlmacenMemoriaAdapter);
    avatar = TestBed.inject(AvatarStore);
  });

  it('arranca activo, en su sitio y CALLADO', () => {
    expect(avatar.estado()).toBe('activo');
    expect(avatar.posicion()).toEqual(POSICION_INICIAL);
    // Nadie quiere que una tienda le hable sin haberlo pedido.
    expect(avatar.voz()).toBe(false);
  });

  it('recupera lo guardado al hidratar', () => {
    almacen.guarda('nx036.avatar.state', JSON.stringify('mini'));
    almacen.guarda('nx036.avatar.pos', JSON.stringify({ derecha: 40, abajo: 90 }));
    almacen.guarda('nx036.avatar.voice', JSON.stringify(true));

    avatar.hidrata();

    expect(avatar.estado()).toBe('mini');
    expect(avatar.posicion()).toEqual({ derecha: 40, abajo: 90 });
    expect(avatar.voz()).toBe(true);
  });

  it('descarta un valor manipulado a mano en vez de romperse', () => {
    almacen.guarda('nx036.avatar.state', '"invisible"');
    almacen.guarda('nx036.avatar.pos', 'esto-no-es-json');

    avatar.hidrata();

    expect(avatar.estado()).toBe('activo');
    expect(avatar.posicion()).toEqual(POSICION_INICIAL);
  });

  it('saluda solo la primera vez: la marca queda escrita para la siguiente visita', () => {
    avatar.hidrata();
    expect(avatar.saludando()).toBe(true);
    expect(almacen.lee('nx036.avatar.greeted')).toBe('1');

    // Otra visita, con la marca ya puesta: el asistente no vuelve a presentarse.
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [{ provide: ALMACEN_LOCAL, useValue: almacen }],
    });
    const enLaSiguienteVisita = TestBed.inject(AvatarStore);
    enLaSiguienteVisita.hidrata();

    expect(enLaSiguienteVisita.saludando()).toBe(false);
  });

  it('ofrece la guía solo mientras no se haya visto', () => {
    avatar.hidrata();
    expect(avatar.guiaPendiente()).toBe(true);

    avatar.cierraLaGuia();
    expect(avatar.guiaPendiente()).toBe(false);
    expect(avatar.guiaAbierta()).toBe(false);
  });

  it('«ahora no» la retira sin marcarla como vista para siempre', () => {
    avatar.hidrata();
    avatar.descartaLaGuia();
    expect(avatar.guiaPendiente()).toBe(false);
  });

  it('mover NO guarda; soltar sí: guardar en cada píxel serían decenas de escrituras', () => {
    avatar.mueve({ derecha: 100, abajo: 100 });
    expect(almacen.lee('nx036.avatar.pos')).toBeNull();

    avatar.guardaLaPosicion();
    expect(almacen.lee('nx036.avatar.pos')).toBe(JSON.stringify({ derecha: 100, abajo: 100 }));
  });

  it('alternar la voz devuelve si queda encendida y lo recuerda', () => {
    expect(avatar.alternaLaVoz()).toBe(true);
    expect(almacen.lee('nx036.avatar.voice')).toBe('true');
    expect(avatar.alternaLaVoz()).toBe(false);
  });

  it('oculto deja de estar visible', () => {
    avatar.cambiaEstado('oculto');
    expect(avatar.visible()).toBe(false);
  });

  /** En navegación privada hasta LEER lanza; el puerto lo absorbe y el asistente sigue en pie. */
  it('sobrevive a un almacenamiento bloqueado', () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [{ provide: ALMACEN_LOCAL, useValue: new AlmacenQueLanza() }],
    });
    const conBloqueo = TestBed.inject(AvatarStore);

    expect(() => conBloqueo.hidrata()).toThrow();
  });
});
