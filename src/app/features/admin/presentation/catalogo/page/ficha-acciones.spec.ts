import { TestBed } from '@angular/core/testing';
import { DialogoStore } from '@ds/component/dialogo/dialogo.store';
import { AccionesDeFicha } from './ficha-acciones';
import { EliminaTramoDePrecio } from '../../../application/catalogo/use-case/elimina-tramo-de-precio.use-case';
import { EliminaImagenes } from '../../../application/catalogo/use-case/elimina-imagenes.use-case';
import { ActualizaFicha } from '../../../application/catalogo/use-case/actualiza-ficha.use-case';
import { ActualizaPrecioDeVariante } from '../../../application/catalogo/use-case/actualiza-precio-de-variante.use-case';
import { AnadeImagenes } from '../../../application/catalogo/use-case/anade-imagenes.use-case';
import {
  EliminaValoresDeVariacion,
  FijaImagenDeValor,
  RenombraValorDeVariacion,
} from '../../../application/catalogo/use-case/edita-valores-de-variacion.use-case';
import { ReordenaImagenes } from '../../../application/catalogo/use-case/reordena-imagenes.use-case';
import { creaError } from '@shared/error/app-error';
import { AvisosStore } from '@ds/component/avisos/avisos.store';
import { exito, fallo } from '@shared/result/result';

/**
 * Lo que se certifica aquí es que **antes de borrar se pregunta**.
 *
 * <p>Hacía falta porque no se preguntaba y ninguna prueba lo notó: las que había comprobaban que la
 * acción llega al caso de uso, no que haya un paso previo. Se descubrió usando la aplicación, pulsando
 * la papelera de una foto y viendo que desaparecía sin más.
 *
 * <p>Y duele especialmente en estas dos: un tramo de precio es una regla de venta que hay que volver a
 * teclear de memoria, y las fotos vienen del proveedor, así que recuperarlas obliga a ir a buscarlas a
 * la ficha de origen. Las traducciones de las tres preguntas llevaban tiempo escritas en los ocho
 * diccionarios; lo que faltaba era hacer la pregunta.
 */
describe('AccionesDeFicha · confirmaciones antes de borrar', () => {
  /** Lo que de verdad se mira: si el caso de uso llegó a ejecutarse o no. */
  function monta(sobrescribe: Record<string, unknown> = {}) {
    const ejecutado = { tramo: 0, imagenes: [] as (readonly string[])[] };
    const nada = () => ({ ejecuta: () => Promise.resolve(exito(undefined)) });

    TestBed.configureTestingModule({
      providers: [
        AccionesDeFicha,
        DialogoStore,
        AvisosStore,
        {
          provide: EliminaTramoDePrecio,
          useValue: {
            ejecuta: () => {
              ejecutado.tramo += 1;
              return Promise.resolve(exito(undefined));
            },
          },
        },
        {
          provide: EliminaImagenes,
          useValue: {
            ejecuta: (ids: readonly string[]) => {
              ejecutado.imagenes.push(ids);
              return Promise.resolve(exito({ borradas: ids.length, fallidas: 0 }));
            },
          },
        },
        { provide: ActualizaFicha, useValue: sobrescribe['actualiza'] ?? nada() },
        { provide: ActualizaPrecioDeVariante, useValue: sobrescribe['precio'] ?? nada() },
        { provide: AnadeImagenes, useValue: sobrescribe['anade'] ?? nada() },
        { provide: EliminaValoresDeVariacion, useValue: sobrescribe['valores'] ?? nada() },
        { provide: FijaImagenDeValor, useValue: sobrescribe['fijaFoto'] ?? nada() },
        { provide: RenombraValorDeVariacion, useValue: sobrescribe['renombra'] ?? nada() },
        { provide: ReordenaImagenes, useValue: sobrescribe['reordena'] ?? nada() },
      ],
    });
    return {
      acciones: TestBed.inject(AccionesDeFicha),
      dialogo: TestBed.inject(DialogoStore),
      avisos: TestBed.inject(AvisosStore),
      ejecutado,
    };
  }

  it('quitar un tramo pregunta antes, y si se dice que no NO se borra', async () => {
    const { acciones, dialogo, ejecutado } = monta();

    const enCurso = acciones.eliminaTramo('p1', 10);
    await Promise.resolve();

    expect(dialogo.actual()?.clase, 'no ha preguntado nada').toBe('confirm');
    expect(ejecutado.tramo, 'ha borrado ANTES de que nadie conteste').toBe(0);

    dialogo.cierra(false);
    expect(await enCurso).toBe(false);
    expect(ejecutado.tramo, 'se dijo que no y ha borrado igual').toBe(0);
  });

  it('quitar un tramo borra cuando se confirma', async () => {
    const { acciones, dialogo, ejecutado } = monta();

    const enCurso = acciones.eliminaTramo('p1', 10);
    await Promise.resolve();
    dialogo.cierra(true);

    expect(await enCurso).toBe(true);
    expect(ejecutado.tramo).toBe(1);
  });

  it('quitar una foto pregunta antes, y si se dice que no NO se borra', async () => {
    const { acciones, dialogo, ejecutado } = monta();

    const enCurso = acciones.eliminaImagenes(['i1']);
    await Promise.resolve();

    expect(dialogo.actual()?.clase, 'no ha preguntado nada').toBe('confirm');
    expect(ejecutado.imagenes.length, 'ha borrado ANTES de que nadie conteste').toBe(0);

    dialogo.cierra(false);
    expect(await enCurso).toBe(false);
    expect(ejecutado.imagenes.length, 'se dijo que no y ha borrado igual').toBe(0);
  });

  it('quitar varias fotos avisa de CUÁNTAS son', async () => {
    const { acciones, dialogo, ejecutado } = monta();

    const enCurso = acciones.eliminaImagenes(['i1', 'i2', 'i3']);
    await Promise.resolve();

    /* El recuento va en el mensaje a propósito: no es lo mismo perder una foto que tres, y quien
     * selecciona en lote no siempre sabe cuántas lleva marcadas. */
    expect(dialogo.actual()?.mensaje).toContain('3');

    dialogo.cierra(true);
    expect(await enCurso).toBe(true);
    expect(ejecutado.imagenes[0]).toEqual(['i1', 'i2', 'i3']);
  });

  /**
   * El resto de acciones de la ficha. Todas devuelven un booleano que la pantalla usa para decidir si
   * recarga, así que lo que hay que fijar es que un fallo devuelva FALSO y avise: si devolviera cierto,
   * la pantalla recargaría, enseñaría los datos de antes y el cambio parecería aplicado.
   */
  describe('el resto de acciones', () => {
    const ultimo = (avisos: AvisosStore) => avisos.avisos().at(-1);

    it('guardar la ficha avisa del acierto', async () => {
      const { acciones, avisos } = monta();

      expect(await acciones.guarda('p1', { titulo: 'x' }, 'es')).toBe(true);
      expect(ultimo(avisos)?.tipo).toBe('success');
    });

    it('y de un rechazo, con el mensaje del servidor', async () => {
      const { acciones, avisos } = monta({
        actualiza: {
          ejecuta: () => Promise.resolve(fallo(creaError('conflicto', 'Ese slug ya existe'))),
        },
      });

      expect(await acciones.guarda('p1', { titulo: 'x' }, 'es')).toBe(false);
      expect(ultimo(avisos)).toMatchObject({ tipo: 'error', mensaje: 'Ese slug ya existe' });
    });

    /**
     * Añadir imágenes puede salir A MEDIAS: unas direcciones válidas y otras que el proveedor ya no
     * sirve. Contarlo como acierto liso dejaría a quien administra creyendo que están todas.
     */
    it('al añadir imágenes a medias se dice cuántas fallaron', async () => {
      const { acciones, avisos } = monta({
        anade: {
          ejecuta: () => Promise.resolve(exito({ anadidas: 3, fallidas: ['u4', 'u5'] })),
        },
      });

      await acciones.anadeImagenes('p1', ['u1', 'u2', 'u3', 'u4', 'u5']);

      expect(ultimo(avisos)?.tipo).toBe('error');
      expect(ultimo(avisos)?.mensaje).toContain('3');
    });

    it('cuando entran todas, no se molesta con ningún aviso', async () => {
      const { acciones, avisos } = monta({
        anade: { ejecuta: () => Promise.resolve(exito({ anadidas: 2, fallidas: [] })) },
      });

      expect(await acciones.anadeImagenes('p1', ['u1', 'u2'])).toBe(true);
      expect(avisos.avisos()).toEqual([]);
    });

    it('reordenar avisa cuando el servidor lo rechaza', async () => {
      const { acciones, avisos } = monta({
        reordena: {
          ejecuta: () => Promise.resolve(fallo(creaError('conflicto', 'Ese orden no vale'))),
        },
      });

      expect(await acciones.reordenaImagenes('p1', ['i1', 'i2'])).toBe(false);
      expect(ultimo(avisos)).toMatchObject({ tipo: 'error', mensaje: 'Ese orden no vale' });
    });

    it('renombrar y fijar la foto de un valor devuelven si salió', async () => {
      const { acciones } = monta();

      expect(await acciones.renombraValor('v1', 'Azul marino')).toBe(true);
      expect(await acciones.fijaImagenDeValor('v1', 'https://cdn/x.jpg')).toBe(true);
    });

    it('borrar valores de variación avisa si falla', async () => {
      const { acciones, avisos } = monta({
        valores: {
          ejecuta: () => Promise.resolve(fallo(creaError('conflicto', 'Hay variantes usándolo'))),
        },
      });

      expect(await acciones.eliminaValores(['v1'])).toBe(false);
      expect(ultimo(avisos)?.mensaje).toBe('Hay variantes usándolo');
    });

    /**
     * El precio de una variante devuelve si hubo CAMBIO, no solo si la llamada salió: teclear el mismo
     * precio que ya tenía sale bien y no cambia nada, y recargar la ficha por eso sería trabajo tirado.
     */
    it('cambiar el precio de una variante devuelve si hubo cambio de verdad', async () => {
      const { acciones } = monta({
        precio: { ejecuta: () => Promise.resolve(exito(false)) },
      });

      expect(await acciones.cambiaPrecioDeVariante('v1', 6.5, 6.5)).toBe(false);
    });

    it('y avisa cuando el servidor lo rechaza', async () => {
      const { acciones, avisos } = monta({
        precio: {
          ejecuta: () => Promise.resolve(fallo(creaError('peticion-invalida', 'Precio no válido'))),
        },
      });

      expect(await acciones.cambiaPrecioDeVariante('v1', -1, 6.5)).toBe(false);
      expect(ultimo(avisos)?.mensaje).toBe('Precio no válido');
    });
  });
});
