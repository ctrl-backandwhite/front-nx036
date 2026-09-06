import { TestBed } from '@angular/core/testing';
import { exito, fallo } from '@shared/result/result';
import { creaError } from '@shared/error/app-error';
import { BorradorDePromocion, promocionEnBlanco } from '../../../domain/gestion/model/promociones';
import { PROMOCIONES_PORT, PromocionesPort } from '../../../domain/gestion/port/promociones.port';
import {
  AnunciaLaPromocion, ConsultaCategoriasDePromocion, GuardaLaPromocion,
} from './promociones.use-case';

function doble(sobrescribe: Partial<PromocionesPort> = {}): PromocionesPort & { enviados: BorradorDePromocion[] } {
  const enviados: BorradorDePromocion[] = [];
  return {
    enviados,
    lista: async () => exito([]),
    crea: async (b) => (enviados.push(b), exito(undefined)),
    actualiza: async (_id, b) => (enviados.push(b), exito(undefined)),
    alterna: async () => exito(undefined),
    anuncia: async () => exito(4321),
    borra: async () => exito(undefined),
    categorias: async () => exito([{ id: 'c1', nombre: 'Moda' }]),
    ...sobrescribe,
  };
}

describe('GuardaLaPromocion', () => {
  let puerto: ReturnType<typeof doble>;

  beforeEach(() => {
    puerto = doble();
    TestBed.configureTestingModule({
      providers: [{ provide: PROMOCIONES_PORT, useValue: puerto }, GuardaLaPromocion],
    });
  });

  /**
   * Las fechas se convierten aquí, en un solo sitio: en la pantalla estarían repetidas en el alta y en
   * la edición, y basta con que una se olvide para que una rebaja empiece a otra hora.
   */
  it('convierte las fechas locales del formulario al instante con zona', async () => {
    await TestBed.inject(GuardaLaPromocion).ejecuta({
      ...promocionEnBlanco(), nombre: 'Rebajas', empiezaEl: '2026-03-05T10:30',
    });

    expect(puerto.enviados[0].empiezaEl).toBe(new Date('2026-03-05T10:30').toISOString());
    // Sin fecha de fin no se inventa ninguna: la promoción no caduca.
    expect(puerto.enviados[0].terminaEl).toBeUndefined();
  });

  it('actualiza cuando se le pasa un identificador', async () => {
    let actualizado = '';
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        {
          provide: PROMOCIONES_PORT,
          useValue: doble({ actualiza: async (id) => ((actualizado = id), exito(undefined)) }),
        },
        GuardaLaPromocion,
      ],
    });

    await TestBed.inject(GuardaLaPromocion).ejecuta(promocionEnBlanco(), 'p1');

    expect(actualizado).toBe('p1');
  });
});

describe('AnunciaLaPromocion', () => {
  /** Escribe a TODA la base de usuarios y no se puede retirar: por eso es una acción aparte. */
  it('devuelve a cuántas personas se avisó', async () => {
    TestBed.configureTestingModule({
      providers: [{ provide: PROMOCIONES_PORT, useValue: doble() }, AnunciaLaPromocion],
    });

    expect(await TestBed.inject(AnunciaLaPromocion).ejecuta('p1')).toEqual({ ok: true, valor: 4321 });
  });
});

describe('ConsultaCategoriasDePromocion', () => {
  /** Sin categorías el formulario sigue valiendo para una promoción de todo el catálogo. */
  it('un fallo devuelve la lista vacía en vez de impedir abrir el formulario', async () => {
    TestBed.configureTestingModule({
      providers: [
        {
          provide: PROMOCIONES_PORT,
          useValue: doble({ categorias: async () => fallo(creaError('sin-conexion')) }),
        },
        ConsultaCategoriasDePromocion,
      ],
    });

    expect(await TestBed.inject(ConsultaCategoriasDePromocion).ejecuta()).toEqual([]);
  });
});
