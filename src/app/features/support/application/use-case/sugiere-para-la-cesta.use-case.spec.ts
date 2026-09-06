import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { exito, fallo } from '@shared/result/result';
import { creaError } from '@shared/error/app-error';
import {
  SUGERENCIAS_DE_CESTA_PORT,
  SugerenciasDeCestaPort,
} from '../../domain/port/asistente.port';
import { SugiereParaLaCesta } from './sugiere-para-la-cesta.use-case';

const UNA_SUGERENCIA = {
  items: [{ id: 'p9', slug: 'calcetines', titulo: 'Calcetines', motivo: 'DUTY' as const }],
  hueco: { gramos: 340, otroBulto: '4,20 €' },
};

describe('SugiereParaLaCesta', () => {
  let puerto: SugerenciasDeCestaPort;

  beforeEach(() => {
    puerto = { consulta: vi.fn().mockResolvedValue(exito(UNA_SUGERENCIA)) };
    TestBed.configureTestingModule({
      providers: [{ provide: SUGERENCIAS_DE_CESTA_PORT, useValue: puerto }],
    });
  });

  it('publica lo que encuentra y dice que hay algo que enseñar', async () => {
    const caso = TestBed.inject(SugiereParaLaCesta);

    expect(await caso.ejecuta([{ idProducto: 'p1', cantidad: 1 }], 'es')).toBe(true);
    expect(caso.items()).toHaveLength(1);
    expect(caso.hueco()?.gramos).toBe(340);
  });

  it('con la cesta vacía no pregunta y olvida lo anterior', async () => {
    const caso = TestBed.inject(SugiereParaLaCesta);
    await caso.ejecuta([{ idProducto: 'p1', cantidad: 1 }], 'es');

    expect(await caso.ejecuta([], 'es')).toBe(false);
    expect(puerto.consulta).toHaveBeenCalledTimes(1);
    expect(caso.items()).toHaveLength(0);
    expect(caso.hueco()).toBeNull();
  });

  /**
   * Dejar en pantalla lo de antes sería prometer sobre productos que ya no encajan con lo que se lleva.
   */
  it('si ya no queda nada que ahorrar, retira lo que tenía', async () => {
    const caso = TestBed.inject(SugiereParaLaCesta);
    await caso.ejecuta([{ idProducto: 'p1', cantidad: 1 }], 'es');
    vi.mocked(puerto.consulta).mockResolvedValue(exito({ items: [], hueco: null }));

    expect(await caso.ejecuta([{ idProducto: 'p1', cantidad: 2 }], 'es')).toBe(false);
    expect(caso.items()).toHaveLength(0);
  });

  it('si falla, calla: nunca se inventa un ahorro', async () => {
    vi.mocked(puerto.consulta).mockResolvedValue(fallo(creaError('error-del-servidor')));
    const caso = TestBed.inject(SugiereParaLaCesta);

    expect(await caso.ejecuta([{ idProducto: 'p1', cantidad: 1 }], 'es')).toBe(false);
    expect(caso.consultando()).toBe(false);
  });

  it('descarta las líneas sin producto antes de preguntar', async () => {
    await TestBed.inject(SugiereParaLaCesta).ejecuta(
      [
        { idProducto: '', cantidad: 9 },
        { idProducto: 'p1', cantidad: 1 },
      ],
      'es',
    );

    expect(puerto.consulta).toHaveBeenCalledWith([{ idProducto: 'p1', cantidad: 1 }], 'es');
  });
});
