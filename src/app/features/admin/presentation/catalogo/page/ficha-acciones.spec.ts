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
import { exito } from '@shared/result/result';

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
  function monta() {
    const ejecutado = { tramo: 0, imagenes: [] as (readonly string[])[] };
    const nada = () => ({ ejecuta: () => Promise.resolve(exito(undefined)) });

    TestBed.configureTestingModule({
      providers: [
        AccionesDeFicha,
        DialogoStore,
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
        { provide: ActualizaFicha, useValue: nada() },
        { provide: ActualizaPrecioDeVariante, useValue: nada() },
        { provide: AnadeImagenes, useValue: nada() },
        { provide: EliminaValoresDeVariacion, useValue: nada() },
        { provide: FijaImagenDeValor, useValue: nada() },
        { provide: RenombraValorDeVariacion, useValue: nada() },
        { provide: ReordenaImagenes, useValue: nada() },
      ],
    });
    return {
      acciones: TestBed.inject(AccionesDeFicha),
      dialogo: TestBed.inject(DialogoStore),
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
});
