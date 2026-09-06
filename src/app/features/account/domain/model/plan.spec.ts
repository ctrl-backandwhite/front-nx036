import {
  Plan,
  Suscripcion,
  centimosDelPeriodo,
  esPlanActual,
  esPlanDeEmpresa,
  esPlanDePrueba,
  esPlanDestacado,
  esPlanGratis,
  precioFormateado,
  pruebaAgotada,
} from './plan';

function plan(cambios: Partial<Plan> = {}): Plan {
  return {
    id: 'plan-1',
    codigo: 'PRO',
    nombre: 'Pro',
    centimosMensuales: 2900,
    centimosAnuales: 29000,
    precioMensualFormateado: '29,00 €',
    precioAnualFormateado: '290,00 €',
    posicion: 2,
    limites: {},
    ...cambios,
  };
}

const SUSCRITO: Suscripcion = {
  idPlan: 'plan-1',
  estado: 'ACTIVE',
  periodoDeFacturacion: 'MONTHLY',
};

describe('precio del periodo', () => {
  it('mensual y anual leen campos distintos', () => {
    expect(centimosDelPeriodo(plan(), 'MENSUAL')).toBe(2900);
    expect(centimosDelPeriodo(plan(), 'ANUAL')).toBe(29000);
    expect(precioFormateado(plan(), 'MENSUAL')).toBe('29,00 €');
    expect(precioFormateado(plan(), 'ANUAL')).toBe('290,00 €');
  });

  /** El importe formateado lo escribe el backend; si no viene, no se inventa aquí. */
  it('sin importe formateado devuelve indefinido, no un número suelto', () => {
    expect(precioFormateado(plan({ precioMensualFormateado: undefined }), 'MENSUAL')).toBeUndefined();
  });
});

describe('clases de plan', () => {
  it('el plan a medida no tiene tarifa', () => {
    expect(esPlanDeEmpresa(plan({ codigo: 'ENTERPRISE' }))).toBe(true);
    expect(esPlanDeEmpresa(plan())).toBe(false);
  });

  it('el gratis es el que no cuesta nada y no es a medida', () => {
    expect(esPlanGratis(plan({ centimosMensuales: 0 }), 'MENSUAL')).toBe(true);
    expect(esPlanGratis(plan({ centimosMensuales: 0 }), 'ANUAL')).toBe(false);
    expect(esPlanGratis(plan({ codigo: 'ENTERPRISE', centimosMensuales: 0 }), 'MENSUAL')).toBe(false);
  });

  it('el destacado lo decide la posición que da el backend', () => {
    expect(esPlanDestacado(plan({ posicion: 3 }))).toBe(true);
    expect(esPlanDestacado(plan({ posicion: 1 }))).toBe(false);
  });

  /** Se reconoce por el código o por no costar nada: las dos formas se han dado en producción. */
  it('la prueba se reconoce por el código o por el precio', () => {
    expect(esPlanDePrueba(plan({ codigo: 'free' }))).toBe(true);
    expect(esPlanDePrueba(plan({ centimosMensuales: 0, centimosAnuales: 0 }))).toBe(true);
    expect(esPlanDePrueba(plan())).toBe(false);
    expect(esPlanDePrueba(undefined)).toBe(false);
  });
});

describe('esPlanActual', () => {
  it('es el actual si coincide el plan y la suscripción está viva', () => {
    expect(esPlanActual(SUSCRITO, plan())).toBe(true);
  });

  it('una suscripción cancelada ya no marca el plan como actual', () => {
    expect(esPlanActual({ ...SUSCRITO, estado: 'CANCELED' }, plan())).toBe(false);
  });

  it('sin suscripción, ninguno es el actual', () => {
    expect(esPlanActual(null, plan())).toBe(false);
  });
});

describe('pruebaAgotada', () => {
  it('el plan gratis se bloquea cuando la prueba ya se gastó', () => {
    expect(pruebaAgotada(plan({ centimosMensuales: 0 }), 'MENSUAL', true, false)).toBe(true);
  });

  /** Si es el plan que ya se tiene, no se bloquea: bloquearlo diría que el plan actual no existe. */
  it('no se bloquea el plan que ya se está usando', () => {
    expect(pruebaAgotada(plan({ centimosMensuales: 0 }), 'MENSUAL', true, true)).toBe(false);
  });

  it('los planes de pago nunca se bloquean por la prueba', () => {
    expect(pruebaAgotada(plan(), 'MENSUAL', true, false)).toBe(false);
  });

  it('sin prueba gastada, el gratis sigue disponible', () => {
    expect(pruebaAgotada(plan({ centimosMensuales: 0 }), 'MENSUAL', false, false)).toBe(false);
  });
});
