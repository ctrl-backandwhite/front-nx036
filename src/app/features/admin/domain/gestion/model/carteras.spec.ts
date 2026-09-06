import {
  MovimientoDeCartera, ajusteValido, depositoValido, referenciaDelMovimiento, traduceNota,
} from './carteras';

/** Un diccionario mínimo: lo que se prueba es el mecanismo, no el texto de cada idioma. */
const TEXTOS: Record<string, string> = {
  'admin.wallets.note.order': 'Pedido {order}',
  'admin.wallets.note.recharge': 'Recarga con {method}',
  'admin.wallets.note.hold': 'Retenido',
  'admin.wallets.note.refund': 'Devolución',
  'admin.wallets.note.manual_topup': 'Ingreso manual',
  'admin.wallets.note.adjustment': 'Ajuste',
  'admin.wallets.detail.order_ref': 'Pedido #{id}',
  'recharge.method.card': 'tarjeta',
};
const t = (clave: string): string => TEXTOS[clave] ?? clave;

describe('depositoValido', () => {
  it('exige que sume: un ingreso de cero no mueve saldo y ensucia el libro mayor', () => {
    expect(depositoValido(0)).toBe(false);
    expect(depositoValido(-100)).toBe(false);
    expect(depositoValido(2500)).toBe(true);
  });
});

describe('ajusteValido', () => {
  it('vale en las dos direcciones, pero nunca a cero', () => {
    expect(ajusteValido(-1000, 'error de cobro')).toBe(true);
    expect(ajusteValido(1000, 'compensación')).toBe(true);
    expect(ajusteValido(0, 'lo que sea')).toBe(false);
  });

  /** El apunte queda en el libro mayor: alguien tendrá que explicarlo cuando el cliente pregunte. */
  it('exige motivo', () => {
    expect(ajusteValido(-1000, '   ')).toBe(false);
    expect(ajusteValido(-1000, '')).toBe(false);
  });
});

describe('traduceNota', () => {
  it('traduce la referencia de pedido conservando el número', () => {
    expect(traduceNota('Order NX-1234', t)).toBe('Pedido NX-1234');
  });

  it('traduce la recarga y también el nombre del método', () => {
    expect(traduceNota('Wallet recharge via CARD', t)).toBe('Recarga con tarjeta');
  });

  it('reconoce el resto de notas conocidas', () => {
    expect(traduceNota('Hold for order NX-1', t)).toBe('Retenido');
    expect(traduceNota('Refund of order NX-1', t)).toBe('Devolución');
    expect(traduceNota('Admin manual top-up', t)).toBe('Ingreso manual');
    expect(traduceNota('[Adjustment] cobro duplicado', t)).toBe('Ajuste: cobro duplicado');
  });

  /** Lo que no se reconoce se enseña crudo: peor que traducido, muchísimo mejor que un hueco. */
  it('devuelve tal cual lo que no sabe traducir', () => {
    expect(traduceNota('Something new from the backend', t)).toBe('Something new from the backend');
  });

  it('sin nota pinta un guion', () => {
    expect(traduceNota(null, t)).toBe('—');
    expect(traduceNota('', t)).toBe('—');
  });
});

describe('referenciaDelMovimiento', () => {
  function apunte(cambios: Partial<MovimientoDeCartera> = {}): MovimientoDeCartera {
    return {
      id: 'm1', clase: 'TOPUP', importeCentimos: 100, saldoResultanteCentimos: 100,
      descripcion: null, idPedido: null, creadoEl: '2026-03-05T10:00:00Z', ...cambios,
    };
  }

  it('gana el pedido cuando el apunte lo tiene, recortado a ocho caracteres', () => {
    const texto = referenciaDelMovimiento(apunte({ idPedido: '3f2504e0-4f89-11d3-9a0c' }), t);

    expect(texto).toBe('Pedido #3f2504e0');
  });

  it('sin pedido cae a la nota traducida', () => {
    expect(referenciaDelMovimiento(apunte({ descripcion: 'Refund' }), t)).toBe('Devolución');
  });
});
