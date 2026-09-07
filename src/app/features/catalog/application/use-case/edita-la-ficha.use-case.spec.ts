import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { exito } from '@shared/result/result';
import { EDICION_DE_FICHA_PORT } from '../../domain/port/edicion-de-ficha.port';
import { EditaLaFicha } from './edita-la-ficha.use-case';
import { APLICACION_DEL_CATALOGO } from '../../catalog.providers';
import { ANADIR_AL_CARRITO_PORT } from '@features/cart/domain/port/carrito-compartido.port';

/**
 * La cesta es de OTRO contexto: aquí solo se conoce su puerto público, que es por donde el catálogo mete
 * lo que se añade. Antes escribía por su cuenta contra el backend y la cesta de la aplicación —la que
 * cuenta la insignia y pinta el carrito— no se enteraba; el doble mantiene esa frontera visible.
 */
const CESTA_DE_OTRO_CONTEXTO = {
  provide: ANADIR_AL_CARRITO_PORT,
  useValue: {
    unidades: () => 0,
    anade: async () => ({ estado: 'anadido', sugiereAhorroDeEnvio: false }),
    abreElCajon: () => undefined,
  },
};

/**
 * El editor reenvía al puerto, pero es la ÚNICA puerta por la que se escribe una ficha: si mañana hay
 * que registrar quién tocó qué, o invalidar una caché, se añade aquí y ninguna pantalla cambia. Que
 * cada gesto llegue a su método es lo que se comprueba.
 */
describe('EditaLaFicha', () => {
  const puerto = {
    marcaVerificado: vi.fn().mockResolvedValue(exito(undefined)),
    guardaUrlDeOrigen: vi.fn().mockResolvedValue(exito(undefined)),
    guardaImporteEnYuanes: vi.fn().mockResolvedValue(exito(undefined)),
    borraImagen: vi.fn().mockResolvedValue(exito(undefined)),
    anadeImagen: vi.fn().mockResolvedValue(exito(undefined)),
    reordenaImagenes: vi.fn().mockResolvedValue(exito(undefined)),
    borraValorDeVariante: vi.fn().mockResolvedValue(exito(undefined)),
    borraVideo: vi.fn().mockResolvedValue(exito(undefined)),
    borraProducto: vi.fn().mockResolvedValue(exito(undefined)),
  };

  let editor: EditaLaFicha;

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [...APLICACION_DEL_CATALOGO,
        CESTA_DE_OTRO_CONTEXTO, { provide: EDICION_DE_FICHA_PORT, useValue: puerto }],
    });
    editor = TestBed.inject(EditaLaFicha);
  });

  it('cada gesto llega a su método del puerto', async () => {
    await editor.marcaVerificado('p1', true);
    await editor.guardaUrlDeOrigen('p1', 'https://detail.1688.com/offer/1.html');
    await editor.guardaImporteEnYuanes('p1', 'shippingUserCny', 4);
    await editor.borraImagen('i1');
    await editor.anadeImagen('p1', 'foto.jpg');
    await editor.reordenaImagenes('p1', ['b', 'a']);
    await editor.borraValorDeVariante('vv1');
    await editor.borraVideo('p1');
    await editor.borraProducto('p1');

    expect(puerto.marcaVerificado).toHaveBeenCalledWith('p1', true);
    expect(puerto.guardaUrlDeOrigen).toHaveBeenCalledWith(
      'p1',
      'https://detail.1688.com/offer/1.html',
    );
    expect(puerto.guardaImporteEnYuanes).toHaveBeenCalledWith('p1', 'shippingUserCny', 4);
    expect(puerto.borraImagen).toHaveBeenCalledWith('i1');
    expect(puerto.anadeImagen).toHaveBeenCalledWith('p1', 'foto.jpg');
    expect(puerto.reordenaImagenes).toHaveBeenCalledWith('p1', ['b', 'a']);
    expect(puerto.borraValorDeVariante).toHaveBeenCalledWith('vv1');
    expect(puerto.borraVideo).toHaveBeenCalledWith('p1');
    expect(puerto.borraProducto).toHaveBeenCalledWith('p1');
  });
});
