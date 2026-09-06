import {
  Promocion, descuentoLegible, estadoDePromocion, paraCampoDeFecha, paraElBackend,
  promocionEnBlanco, resumenDeAmbito,
} from './promociones';

function promocion(cambios: Partial<Promocion> = {}): Promocion {
  return {
    id: 'p1', nombre: 'Rebajas', clase: 'SEASONAL', ambito: 'ALL', activa: true, vigente: true,
    prioridad: 0, usos: 0, categorias: [], productos: [], ...cambios,
  };
}

describe('promocionEnBlanco', () => {
  it('arranca como rebaja automática de todo el catálogo, activa', () => {
    const nueva = promocionEnBlanco();

    expect(nueva.ambito).toBe('ALL');
    expect(nueva.codigo).toBe('');
    expect(nueva.activa).toBe(true);
  });
});

describe('paraCampoDeFecha', () => {
  /** El campo del navegador no admite zona: con la Z se queda vacío sin decir nada. */
  it('recorta el instante a lo que entiende datetime-local', () => {
    expect(paraCampoDeFecha('2026-03-05T10:30:00.000Z')).toBe('2026-03-05T10:30');
  });

  it('sin fecha devuelve cadena vacía', () => {
    expect(paraCampoDeFecha(undefined)).toBe('');
  });
});

describe('paraElBackend', () => {
  /** Sin zona, el servidor lo lee como su propia hora local y la rebaja empieza cuando no toca. */
  it('devuelve el instante con zona', () => {
    expect(paraElBackend('2026-03-05T10:30')).toBe(new Date('2026-03-05T10:30').toISOString());
  });

  it('sin fecha no manda nada, en vez de mandar una fecha inventada', () => {
    expect(paraElBackend('')).toBeUndefined();
    expect(paraElBackend(undefined)).toBeUndefined();
  });

  it('una fecha imposible tampoco viaja', () => {
    expect(paraElBackend('no es una fecha')).toBeUndefined();
  });
});

describe('estadoDePromocion', () => {
  /**
   * `vigente` y `activa` son cosas distintas: marcada activa pero fuera de fechas no rebaja nada, y
   * pintarla igual que una viva haría creer que el escaparate está de rebajas.
   */
  it('distingue la que descuenta ahora de la programada y de la apagada', () => {
    expect(estadoDePromocion(promocion())).toBe('viva');
    expect(estadoDePromocion(promocion({ vigente: false }))).toBe('programada');
    expect(estadoDePromocion(promocion({ vigente: false, activa: false }))).toBe('apagada');
  });
});

describe('resumenDeAmbito', () => {
  it('cuenta cuántas categorías o productos alcanza', () => {
    expect(resumenDeAmbito(promocion({ ambito: 'CATEGORY', categorias: ['a', 'b'] })))
      .toEqual({ clave: 'admin.promo.scope_cat', cuantos: 2 });
    expect(resumenDeAmbito(promocion({ ambito: 'PRODUCT', productos: ['a'] })))
      .toEqual({ clave: 'admin.promo.scope_prod', cuantos: 1 });
    expect(resumenDeAmbito(promocion())).toEqual({ clave: 'admin.promo.scope_all', cuantos: 0 });
  });
});

describe('descuentoLegible', () => {
  it('prefiere el porcentaje al importe', () => {
    expect(descuentoLegible(promocion({ porcentaje: 20, importeCentimos: 500 }))).toBe('-20%');
  });

  it('cae al importe cuando no hay porcentaje', () => {
    expect(descuentoLegible(promocion({ importeCentimos: 550 }))).toBe('-5.50');
  });

  it('sin descuento pinta un guion', () => {
    expect(descuentoLegible(promocion())).toBe('—');
  });
});
