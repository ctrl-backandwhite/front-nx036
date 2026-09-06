import {
  Plan, Suscripcion, claveDePeriodo, estadoEfectivo, periodoDelPlan, suscripcionCoincide,
} from './facturacion';

function plan(cambios: Partial<Plan> = {}): Plan {
  return {
    id: '1', codigo: 'PRO', nombre: 'Pro', mensualCentimos: 0, anualCentimos: 0,
    divisa: 'USD', activo: true, posicion: 0, ...cambios,
  };
}

describe('claveDePeriodo', () => {
  /**
   * El backend manda dos convenciones históricas. Unificarlas aquí es lo que impide que la pantalla
   * acabe pintando el valor crudo del enumerado.
   */
  it('unifica MONTHLY y MONTH, y YEARLY y YEAR', () => {
    expect(claveDePeriodo('MONTHLY')).toBe('admin.billing.period.monthly');
    expect(claveDePeriodo('month')).toBe('admin.billing.period.monthly');
    expect(claveDePeriodo('YEARLY')).toBe('admin.billing.period.yearly');
    expect(claveDePeriodo('YEAR')).toBe('admin.billing.period.yearly');
  });

  it('conoce el gratuito y el de precio a medida', () => {
    expect(claveDePeriodo('FREE')).toBe('admin.billing.period.free');
    expect(claveDePeriodo('CUSTOM')).toBe('admin.billing.period.custom');
  });

  it('devuelve nulo ante algo que no sabe traducir, para que la pantalla decida el respaldo', () => {
    expect(claveDePeriodo('LO_QUE_SEA')).toBeNull();
    expect(claveDePeriodo(null)).toBeNull();
  });
});

describe('periodoDelPlan', () => {
  it('el plan a medida es el de empresa', () => {
    expect(periodoDelPlan(plan({ codigo: 'ENTERPRISE' }))).toBe('CUSTOM');
  });

  it('los dos precios a cero es el plan gratuito', () => {
    expect(periodoDelPlan(plan())).toBe('FREE');
  });

  /** Con los dos ciclos a la venta no está atado a ninguno: decir «anual» a secas confundiría. */
  it('los dos precios por encima de cero significa que ofrece ambos ciclos', () => {
    expect(periodoDelPlan(plan({ mensualCentimos: 1900, anualCentimos: 19000 }))).toBe('BOTH');
  });

  it('con un solo precio, el ciclo es ese', () => {
    expect(periodoDelPlan(plan({ anualCentimos: 19000 }))).toBe('YEAR');
    expect(periodoDelPlan(plan({ mensualCentimos: 1900 }))).toBe('MONTH');
  });
});

describe('estadoEfectivo', () => {
  /** Un plan gratuito en «prueba» haría pensar que la cuenta va a empezar a pagar. */
  it('un plan gratuito nunca figura en periodo de prueba', () => {
    expect(estadoEfectivo('FREE', 'TRIALING')).toBe('ACTIVE');
  });

  it('el resto de estados pasan sin tocarse', () => {
    expect(estadoEfectivo('PRO', 'TRIALING')).toBe('TRIALING');
    expect(estadoEfectivo('FREE', 'CANCELLED')).toBe('CANCELLED');
  });
});

describe('suscripcionCoincide', () => {
  const suscripcion: Suscripcion = {
    id: 's1', idUsuario: 'u1', emailUsuario: 'Ana@Nx036.local', plan: 'PRO',
    estado: 'ACTIVE', periodo: 'MONTHLY',
  };

  it('filtra por estado', () => {
    expect(suscripcionCoincide(suscripcion, 'ACTIVE', '')).toBe(true);
    expect(suscripcionCoincide(suscripcion, 'PAUSED', '')).toBe(false);
  });

  it('busca en el correo y en el plan sin distinguir mayúsculas', () => {
    expect(suscripcionCoincide(suscripcion, null, 'ana@')).toBe(true);
    expect(suscripcionCoincide(suscripcion, null, 'pro')).toBe(true);
    expect(suscripcionCoincide(suscripcion, null, 'nadie')).toBe(false);
  });

  it('sin nada escrito, todo coincide', () => {
    expect(suscripcionCoincide(suscripcion, null, '   ')).toBe(true);
  });
});
