import { TestBed } from '@angular/core/testing';
import { AvisosStore } from '@ds/component/avisos/avisos.store';
import { creaError } from '@shared/error/app-error';
import { exito, fallo } from '@shared/result/result';
import {
  ActivaCategoriasEnLote,
  AlternaCategoria,
  EliminaCategorias,
  GuardaCategoria,
  ListaCategorias,
  ListaTodasLasCategorias,
  ReindexaCategorias,
} from '../../../application/catalogo/use-case/administra-categorias.use-case';
import { ExportaCategorias } from '../../../application/catalogo/use-case/exporta-categorias.use-case';
import { AccionesDeCategorias } from './categorias-acciones';

/**
 * Las acciones de la pantalla de categorías.
 *
 * <p>Lo que hacen de más —y lo único que hay que certificar— es CONTAR lo que ha pasado. Todas devuelven
 * un booleano y avisan por su cuenta, así que un fallo tratado como acierto no se ve: la pantalla se
 * recarga tan contenta y quien mira cree que se guardó.
 *
 * <p>Y en el borrado en lote, el caso que de verdad duele: cuando unas se borran y otras no. Decir «6
 * borradas» y callar las 2 que fallaron deja a quien administra creyendo que terminó.
 */
describe('AccionesDeCategorias', () => {
  const NADA = { ejecuta: vi.fn(async () => exito(undefined)) };

  interface Dobles {
    lista?: unknown;
    guarda?: unknown;
    elimina?: unknown;
    alterna?: unknown;
    activa?: unknown;
    reindexa?: unknown;
    exporta?: unknown;
    todas?: unknown;
  }

  function monta(dobles: Dobles = {}) {
    TestBed.configureTestingModule({
      providers: [
        AccionesDeCategorias,
        AvisosStore,
        { provide: ListaCategorias, useValue: dobles.lista ?? NADA },
        { provide: ListaTodasLasCategorias, useValue: dobles.todas ?? NADA },
        { provide: GuardaCategoria, useValue: dobles.guarda ?? NADA },
        { provide: EliminaCategorias, useValue: dobles.elimina ?? NADA },
        { provide: AlternaCategoria, useValue: dobles.alterna ?? NADA },
        { provide: ActivaCategoriasEnLote, useValue: dobles.activa ?? NADA },
        { provide: ReindexaCategorias, useValue: dobles.reindexa ?? NADA },
        { provide: ExportaCategorias, useValue: dobles.exporta ?? NADA },
      ],
    });
    return {
      acciones: TestBed.inject(AccionesDeCategorias),
      avisos: TestBed.inject(AvisosStore),
    };
  }

  const ultimoAviso = (avisos: AvisosStore) => avisos.avisos()[avisos.avisos().length - 1];

  describe('listar', () => {
    it('devuelve la página tal cual cuando sale bien', async () => {
      const pagina = { categorias: [], total: 0, paginas: 1 };
      const { acciones, avisos } = monta({ lista: { ejecuta: async () => exito(pagina) } });

      expect(await acciones.lista({ pagina: 0, tamano: 50 })).toBe(pagina);
      expect(avisos.avisos()).toEqual([]);
    });

    it('un fallo se avisa y se devuelve nulo, no una página vacía disfrazada', async () => {
      const { acciones, avisos } = monta({
        lista: { ejecuta: async () => fallo(creaError('sin-conexion', 'No hay red')) },
      });

      expect(await acciones.lista({ pagina: 0, tamano: 50 })).toBeNull();
      expect(ultimoAviso(avisos)).toMatchObject({ tipo: 'error', mensaje: 'No hay red' });
    });
  });

  describe('guardar', () => {
    const BORRADOR = { slug: 'moda', nombreZh: '', nombreEn: '', nombreEs: '', nombrePt: '', padreId: '' };

    it('al crear dice «creada»; al editar dice «actualizada»', async () => {
      const { acciones, avisos } = monta({ guarda: { ejecuta: async () => exito(undefined) } });

      await acciones.guarda(BORRADOR, null);
      const alCrear = ultimoAviso(avisos).mensaje;

      await acciones.guarda(BORRADOR, 'c1');
      const alEditar = ultimoAviso(avisos).mensaje;

      expect(alCrear).not.toBe(alEditar);
    });

    it('un fallo devuelve falso: la pantalla no puede cerrar el formulario y perder lo escrito', async () => {
      const { acciones, avisos } = monta({
        guarda: { ejecuta: async () => fallo(creaError('conflicto', 'Ese slug ya existe')) },
      });

      expect(await acciones.guarda(BORRADOR, null)).toBe(false);
      expect(ultimoAviso(avisos)).toMatchObject({ tipo: 'error', mensaje: 'Ese slug ya existe' });
    });

    it('mientras guarda queda marcado como ocupado, y se suelta pase lo que pase', async () => {
      const { acciones } = monta({
        guarda: { ejecuta: async () => fallo(creaError('error-del-servidor')) },
      });

      const enCurso = acciones.guarda(BORRADOR, null);
      expect(acciones.ocupado()).toBe(true);

      await enCurso;
      /* Si no se soltara al fallar, la pantalla se quedaría con todos los botones apagados y la única
       * salida sería recargar. */
      expect(acciones.ocupado()).toBe(false);
    });
  });

  describe('borrar en lote', () => {
    it('cuando se borran todas, se dice y punto', async () => {
      const { acciones, avisos } = monta({
        elimina: { ejecuta: async () => exito({ borradas: 3, fallos: [] }) },
      });

      expect(await acciones.borra(['a', 'b', 'c'])).toBe(true);
      expect(ultimoAviso(avisos).tipo).toBe('success');
    });

    /**
     * El caso que se pierde: 6 borradas y 2 que no. Contarlo como éxito deja a quien administra
     * creyendo que terminó, y las dos que quedaron siguen ahí sin que nadie lo sepa.
     */
    it('si alguna no se pudo borrar, el aviso es de AVISO y dice cuáles', async () => {
      const { acciones, avisos } = monta({
        elimina: {
          ejecuta: async () =>
            exito({ borradas: 1, fallos: ['moda-mujer: tiene productos', 'moda-nino: tiene hijas'] }),
        },
      });

      await acciones.borra(['a', 'b', 'c']);
      const aviso = ultimoAviso(avisos);

      expect(aviso.tipo).toBe('warning');
      expect(aviso.mensaje).toContain('moda-mujer: tiene productos');
      expect(aviso.mensaje).toContain('moda-nino: tiene hijas');
    });

    it('la lista de motivos se recorta: ochenta líneas en un aviso no las lee nadie', async () => {
      const fallos = Array.from({ length: 40 }, (_, i) => `slug-${i}: no se puede`);
      const { acciones, avisos } = monta({
        elimina: { ejecuta: async () => exito({ borradas: 0, fallos }) },
      });

      await acciones.borra(['a']);

      expect(ultimoAviso(avisos).mensaje).not.toContain('slug-8:');
    });
  });

  describe('el resto', () => {
    it('alternar la visibilidad avisa solo cuando falla', async () => {
      const { acciones, avisos } = monta({
        alterna: { ejecuta: async () => fallo(creaError('sin-permiso', 'No puedes')) },
      });

      expect(await acciones.alterna('c1')).toBe(false);
      expect(ultimoAviso(avisos)).toMatchObject({ tipo: 'error', mensaje: 'No puedes' });
    });

    it('activar en lote cuenta cuántas se cambiaron', async () => {
      const { acciones, avisos } = monta({ activa: { ejecuta: async () => exito(12) } });

      expect(await acciones.activaEnLote(['a', 'b'], true)).toBe(true);
      expect(ultimoAviso(avisos).mensaje).toContain('12');
    });

    it('reindexar cuenta cuántas se indexaron', async () => {
      const { acciones, avisos } = monta({ reindexa: { ejecuta: async () => exito(340) } });

      expect(await acciones.reindexa()).toBe(true);
      expect(ultimoAviso(avisos).mensaje).toContain('340');
    });

    it('exportar devuelve el recuento de lo exportado', async () => {
      const { acciones } = monta({ exporta: { ejecuta: async () => exito(87) } });

      expect(await acciones.exporta()).toBe(87);
    });

    it('y nulo si no se pudo leer el árbol, para que la pantalla lo diga', async () => {
      const { acciones } = monta({
        exporta: { ejecuta: async () => fallo(creaError('sin-conexion')) },
      });

      expect(await acciones.exporta()).toBeNull();
    });

    it('el árbol completo devuelve nulo si falla: el formulario no puede inventarse los padres', async () => {
      const { acciones } = monta({ todas: { ejecuta: async () => fallo(creaError('sin-conexion')) } });

      expect(await acciones.todas()).toBeNull();
    });
  });
});
