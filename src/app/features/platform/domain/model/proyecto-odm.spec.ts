import {
  ProyectoOdm,
  presupuestoEnCentimosUsd,
  presupuestoEnDolares,
  tienePresupuesto,
} from './proyecto-odm';
import { TasaDeCambio } from './tasa-de-cambio';

/** Las tasas reales del día en que se descubrió el fallo: unidades por UN dólar. */
const TASAS: readonly TasaDeCambio[] = [
  { codigo: 'USD', porDolar: 1 },
  { codigo: 'EUR', porDolar: 0.92 },
  { codigo: 'CNY', porDolar: 7.24 },
];

function proyecto(centimos?: number): ProyectoOdm {
  return {
    id: 'p1',
    clase: 'ODM_FREE',
    titulo: 'Botella térmica',
    presupuestoEnCentimosUsd: centimos,
    estado: 'INTAKE',
    creadoEl: '2026-09-01T00:00:00Z',
  };
}

describe('presupuestoEnCentimosUsd', () => {
  /**
   * LA prueba de este contexto. Multiplicando en vez de dividir, 100 € se guardaban como 92 $ en
   * lugar de 108,70 $: un 15 % menos de presupuesto del que el cliente había autorizado, y el
   * proveedor trabajando con esa cifra.
   */
  it('convierte a dólares DIVIDIENDO por la tasa, no multiplicando', () => {
    expect(presupuestoEnCentimosUsd('100', 'EUR', TASAS)).toBe(10870);
    expect(presupuestoEnCentimosUsd('100', 'EUR', TASAS)).not.toBe(9200);
  });

  it('no toca el importe cuando ya viene en dólares', () => {
    expect(presupuestoEnCentimosUsd('250.50', 'USD', TASAS)).toBe(25050);
  });

  it('convierte desde una divisa con tasa alta', () => {
    // 724 CNY / 7,24 = 100 USD
    expect(presupuestoEnCentimosUsd('724', 'CNY', TASAS)).toBe(10000);
  });

  it('sin presupuesto devuelve indefinido, no cero', () => {
    // Un presupuesto vacío no es un presupuesto de cero dólares, y el backend distingue los dos casos.
    expect(presupuestoEnCentimosUsd('', 'EUR', TASAS)).toBeUndefined();
    expect(presupuestoEnCentimosUsd('0', 'EUR', TASAS)).toBeUndefined();
    expect(presupuestoEnCentimosUsd('-5', 'EUR', TASAS)).toBeUndefined();
    expect(presupuestoEnCentimosUsd('mucho', 'EUR', TASAS)).toBeUndefined();
  });

  it('con una divisa desconocida deja el importe tal cual en vez de inventarse un cambio', () => {
    expect(presupuestoEnCentimosUsd('100', 'XYZ', TASAS)).toBe(10000);
  });
});

describe('lectura del presupuesto guardado', () => {
  it('reconoce que hay presupuesto solo cuando pasa de cero', () => {
    expect(tienePresupuesto(proyecto(10000))).toBe(true);
    expect(tienePresupuesto(proyecto(0))).toBe(false);
    expect(tienePresupuesto(proyecto(undefined))).toBe(false);
  });

  it('devuelve el importe en dólares enteros', () => {
    expect(presupuestoEnDolares(proyecto(10870))).toBe(108.7);
    expect(presupuestoEnDolares(proyecto(undefined))).toBe(0);
  });
});
