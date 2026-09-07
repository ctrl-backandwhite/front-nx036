import { TestBed } from '@angular/core/testing';
import { AvisosStore } from '@ds/component/avisos/avisos.store';
import { creaError } from '@shared/error/app-error';
import { exito, fallo } from '@shared/result/result';
import {
  CambiaVerificacionDeProveedores,
  EliminaProveedores,
  GuardaProveedor,
  ListaProveedores,
  ReindexaProveedores,
} from '../../../application/catalogo/use-case/administra-proveedores.use-case';
import { AccionesDeProveedores } from './proveedores-acciones';

/**
 * Las acciones de la pantalla de proveedores.
 *
 * <p>Comparten con las de categorías el punto delicado: una operación en LOTE puede salir a medias, y
 * contarla como éxito deja a quien administra creyendo que terminó. Aquí además el resultado parcial
 * viene con la lista de motivos, que es lo único que permite arreglar los que no salieron.
 */
describe('AccionesDeProveedores', () => {
  const NADA = { ejecuta: vi.fn(async () => exito(undefined)) };

  interface Dobles {
    lista?: unknown;
    guarda?: unknown;
    elimina?: unknown;
    verifica?: unknown;
    reindexa?: unknown;
  }

  function monta(dobles: Dobles = {}) {
    TestBed.configureTestingModule({
      providers: [
        AccionesDeProveedores,
        AvisosStore,
        { provide: ListaProveedores, useValue: dobles.lista ?? NADA },
        { provide: GuardaProveedor, useValue: dobles.guarda ?? NADA },
        { provide: EliminaProveedores, useValue: dobles.elimina ?? NADA },
        { provide: CambiaVerificacionDeProveedores, useValue: dobles.verifica ?? NADA },
        { provide: ReindexaProveedores, useValue: dobles.reindexa ?? NADA },
      ],
    });
    return {
      acciones: TestBed.inject(AccionesDeProveedores),
      avisos: TestBed.inject(AvisosStore),
    };
  }

  const ultimoAviso = (avisos: AvisosStore) => avisos.avisos()[avisos.avisos().length - 1];

  it('listar devuelve la página, y un fallo devuelve nulo avisando', async () => {
    const { acciones, avisos } = monta({
      lista: { ejecuta: async () => fallo(creaError('sin-conexion', 'No hay red')) },
    });

    expect(await acciones.lista({ pagina: 0, tamano: 50 })).toBeNull();
    expect(ultimoAviso(avisos)).toMatchObject({ tipo: 'error', mensaje: 'No hay red' });
  });

  it('guardar avisa del acierto y suelta el ocupado', async () => {
    const borrador = { nombre: 'Proveedor 1' } as never;
    const { acciones, avisos } = monta({ guarda: { ejecuta: async () => exito(undefined) } });

    expect(await acciones.guarda(borrador, null)).toBe(true);
    expect(ultimoAviso(avisos).tipo).toBe('success');
    expect(acciones.ocupado()).toBe(false);
  });

  it('guardar con conflicto devuelve falso para que el formulario no se cierre', async () => {
    const borrador = { nombre: 'Proveedor 1' } as never;
    const { acciones, avisos } = monta({
      guarda: { ejecuta: async () => fallo(creaError('conflicto', 'Ya existe')) },
    });

    expect(await acciones.guarda(borrador, null)).toBe(false);
    expect(ultimoAviso(avisos)).toMatchObject({ tipo: 'error', mensaje: 'Ya existe' });
  });

  describe('operaciones en lote', () => {
    it('cuando salen todas, el aviso es de acierto', async () => {
      const { acciones, avisos } = monta({
        elimina: { ejecuta: async () => exito({ correctos: 3, fallidos: 0, errores: [] }) },
      });

      expect(await acciones.elimina(['a', 'b', 'c'])).toBe(true);
      expect(ultimoAviso(avisos).tipo).toBe('success');
    });

    /** Lo que no puede pasar: que «3 de 5» se cuente y se pinte igual que «5 de 5». */
    it('a medias avisa en ámbar y lleva los motivos', async () => {
      const { acciones, avisos } = monta({
        elimina: {
          ejecuta: async () =>
            exito({
              correctos: 3,
              fallidos: 2,
              errores: ['sp-1: tiene productos', 'sp-2: tiene pedidos'],
            }),
        },
      });

      await acciones.elimina(['a', 'b', 'c', 'd', 'e']);
      const aviso = ultimoAviso(avisos);

      expect(aviso.tipo).toBe('warning');
      expect(aviso.mensaje).toContain('sp-1: tiene productos');
    });

    it('un fallo entero del servidor no se confunde con un lote a medias', async () => {
      const { acciones, avisos } = monta({
        elimina: { ejecuta: async () => fallo(creaError('sin-permiso', 'No puedes borrar')) },
      });

      expect(await acciones.elimina(['a'])).toBe(false);
      expect(ultimoAviso(avisos)).toMatchObject({ tipo: 'error', mensaje: 'No puedes borrar' });
    });

    it('verificar sin valor ALTERNA; con valor lo fija para todos', async () => {
      const ejecuta = vi.fn(async () => exito({ correctos: 2, fallidos: 0, errores: [] }));
      const { acciones } = monta({ verifica: { ejecuta } });

      await acciones.verifica(['a']);
      await acciones.verifica(['a', 'b'], true);

      expect(ejecuta).toHaveBeenNthCalledWith(1, ['a'], undefined);
      expect(ejecuta).toHaveBeenNthCalledWith(2, ['a', 'b'], true);
    });
  });

  it('reindexar dice cuántos se indexaron', async () => {
    const { acciones, avisos } = monta({ reindexa: { ejecuta: async () => exito(58) } });

    expect(await acciones.reindexa()).toBe(true);
    expect(ultimoAviso(avisos).mensaje).toContain('58');
  });

  it('si la reindexación falla, se dice y se suelta el ocupado', async () => {
    const { acciones, avisos } = monta({
      reindexa: { ejecuta: async () => fallo(creaError('error-del-servidor')) },
    });

    expect(await acciones.reindexa()).toBe(false);
    expect(ultimoAviso(avisos).tipo).toBe('error');
    expect(acciones.ocupado()).toBe(false);
  });
});
