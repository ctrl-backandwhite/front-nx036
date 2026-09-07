import { TestBed } from '@angular/core/testing';
import { AvisosStore } from '@ds/component/avisos/avisos.store';
import { creaError } from '@shared/error/app-error';
import { exito, fallo } from '@shared/result/result';
import { AplicaRecargo } from '../../../application/catalogo/use-case/aplica-recargo.use-case';
import { AplicaSubvencion } from '../../../application/catalogo/use-case/aplica-subvencion.use-case';
import { CambiaEstadoDeProductos } from '../../../application/catalogo/use-case/cambia-estado-de-productos.use-case';
import { DuplicaProducto } from '../../../application/catalogo/use-case/duplica-producto.use-case';
import { EliminaProductos } from '../../../application/catalogo/use-case/elimina-productos.use-case';
import { MarcaProductoVerificado } from '../../../application/catalogo/use-case/marca-producto-verificado.use-case';
import { AccionesDelCatalogo } from './catalogo-acciones';

/**
 * Las nueve acciones del listado del catálogo.
 *
 * <p>TODAS avisan del fallo, también las de lote, y ese es el punto. Una petición que ni siquiera llega
 * —red caída, sesión perdida— no ha aplicado nada; sin aviso, la pantalla se queda exactamente igual que
 * antes y se dan por activados productos que siguen en borrador.
 *
 * <p>Y un lote a medias no es un acierto: «7 de 9» tiene que verse distinto de «9 de 9», con los motivos
 * de los dos que fallaron, o nadie sabe cuáles hay que repasar.
 */
describe('AccionesDelCatalogo', () => {
  const NADA = { ejecuta: vi.fn(async () => exito(undefined)) };

  interface Dobles {
    estado?: unknown;
    elimina?: unknown;
    marca?: unknown;
    duplica?: unknown;
    recargo?: unknown;
    subvencion?: unknown;
  }

  function monta(dobles: Dobles = {}) {
    TestBed.configureTestingModule({
      providers: [
        AccionesDelCatalogo,
        AvisosStore,
        { provide: CambiaEstadoDeProductos, useValue: dobles.estado ?? NADA },
        { provide: EliminaProductos, useValue: dobles.elimina ?? NADA },
        { provide: MarcaProductoVerificado, useValue: dobles.marca ?? NADA },
        { provide: DuplicaProducto, useValue: dobles.duplica ?? NADA },
        { provide: AplicaRecargo, useValue: dobles.recargo ?? NADA },
        { provide: AplicaSubvencion, useValue: dobles.subvencion ?? NADA },
      ],
    });
    return {
      acciones: TestBed.inject(AccionesDelCatalogo),
      avisos: TestBed.inject(AvisosStore),
    };
  }

  const ultimo = (avisos: AvisosStore) => avisos.avisos().at(-1);

  describe('cambios en lote', () => {
    it('cuando salen todos, el aviso es de acierto', async () => {
      const { acciones, avisos } = monta({
        estado: { ejecuta: async () => exito({ correctos: 9, fallidos: 0, errores: [] }) },
      });

      expect(await acciones.cambiaEstado(['p1'], 'ACTIVE')).toBe(true);
      expect(ultimo(avisos)?.tipo).toBe('success');
    });

    it('a medias avisa en ámbar y lleva los motivos', async () => {
      const { acciones, avisos } = monta({
        estado: {
          ejecuta: async () =>
            exito({ correctos: 7, fallidos: 2, errores: ['p8: sin precio', 'p9: sin imagen'] }),
        },
      });

      await acciones.cambiaEstado(['p1'], 'ACTIVE');

      expect(ultimo(avisos)?.tipo).toBe('warning');
      expect(ultimo(avisos)?.mensaje).toContain('p8: sin precio');
    });

    /**
     * El caso que se olvida: la petición no llegó. Sin aviso, la pantalla queda igual que antes y se
     * dan por activados productos que siguen en borrador.
     */
    it('un fallo de red se avisa y devuelve falso', async () => {
      const { acciones, avisos } = monta({
        estado: { ejecuta: async () => fallo(creaError('sin-conexion', 'No hay red')) },
      });

      expect(await acciones.cambiaEstado(['p1'], 'ACTIVE')).toBe(false);
      expect(ultimo(avisos)).toMatchObject({ tipo: 'error', mensaje: 'No hay red' });
    });

    it('borrar en lote sigue el mismo patrón', async () => {
      const ejecuta = vi.fn(async (_ids: readonly string[]) =>
        exito({ correctos: 2, fallidos: 0, errores: [] }),
      );
      const { acciones, avisos } = monta({ elimina: { ejecuta } });

      expect(await acciones.elimina(['p1', 'p2'])).toBe(true);
      expect(ejecuta).toHaveBeenCalledWith(['p1', 'p2']);
      expect(ultimo(avisos)?.tipo).toBe('success');
    });
  });

  describe('acciones sobre un producto', () => {
    it('marcar verificado solo avisa cuando falla', async () => {
      const { acciones, avisos } = monta({
        marca: { ejecuta: async () => exito(undefined) },
      });

      expect(await acciones.marcaVerificado('p1', true)).toBe(true);
      expect(avisos.avisos()).toEqual([]);
    });

    it('y si falla, lo dice', async () => {
      const { acciones, avisos } = monta({
        marca: { ejecuta: async () => fallo(creaError('sin-permiso', 'No puedes')) },
      });

      expect(await acciones.marcaVerificado('p1', true)).toBe(false);
      expect(ultimo(avisos)).toMatchObject({ tipo: 'error', mensaje: 'No puedes' });
    });

    it('duplicar SÍ avisa del acierto: se ha creado algo que no estaba', async () => {
      const { acciones, avisos } = monta({ duplica: { ejecuta: async () => exito('p2') } });

      expect(await acciones.duplica('p1')).toBe(true);
      expect(ultimo(avisos)?.tipo).toBe('success');
    });
  });

  describe('recargo y subvención', () => {
    it('el aviso lleva a CUÁNTOS productos se aplicó', async () => {
      const { acciones, avisos } = monta({ recargo: { ejecuta: async () => exito(128) } });

      expect(await acciones.recargo({ ids: ['p1'], cny: 3 } as never)).toBe(true);
      /* El recuento no es adorno: es la única forma de notar que el filtro cogió más —o menos— de lo
       * que se pretendía antes de que llegue al escaparate. */
      expect(ultimo(avisos)?.mensaje).toContain('128');
    });

    it('la subvención sigue el mismo patrón', async () => {
      const { acciones, avisos } = monta({ subvencion: { ejecuta: async () => exito(4) } });

      expect(await acciones.subvencion({ ids: ['p1'] } as never)).toBe(true);
      expect(ultimo(avisos)?.mensaje).toContain('4');
    });

    it('un fallo devuelve falso y se avisa', async () => {
      const { acciones, avisos } = monta({
        recargo: { ejecuta: async () => fallo(creaError('peticion-invalida', 'Importe no válido')) },
      });

      expect(await acciones.recargo({ ids: [], cny: 0 } as never)).toBe(false);
      expect(ultimo(avisos)).toMatchObject({ tipo: 'error', mensaje: 'Importe no válido' });
    });
  });

  it('el «ocupado» se suelta también cuando falla', async () => {
    const { acciones } = monta({
      elimina: { ejecuta: async () => fallo(creaError('error-del-servidor')) },
    });

    const enCurso = acciones.elimina(['p1']);
    expect(acciones.ocupado()).toBe(true);

    await enCurso;
    /* Si no se soltara, la pantalla se quedaría con todos los botones apagados y la única salida sería
     * recargar, perdiendo la selección. */
    expect(acciones.ocupado()).toBe(false);
  });
});
