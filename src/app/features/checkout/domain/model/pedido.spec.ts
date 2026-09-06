import { DireccionDeEnvio, direccionUtilizable, elSaldoAlcanza } from './pedido';

function direccion(parcial: Partial<DireccionDeEnvio> = {}): DireccionDeEnvio {
  return {
    nombreCompleto: 'Ana Ruiz',
    linea1: 'Calle Mayor 1',
    ciudad: 'Madrid',
    pais: 'ES',
    ...parcial,
  };
}

describe('direccionUtilizable', () => {
  it('con nombre, calle, ciudad y país, se puede enviar', () => {
    expect(direccionUtilizable(direccion())).toBe(true);
  });

  it.each([
    ['nombreCompleto', { nombreCompleto: '  ' }],
    ['linea1', { linea1: '' }],
    ['ciudad', { ciudad: '' }],
    ['pais', { pais: '' }],
  ])('sin %s no hay envío posible', (_campo, hueco) => {
    expect(direccionUtilizable(direccion(hueco))).toBe(false);
  });

  /** El piso, la provincia y el código postal dependen del país: no se exigen aquí. */
  it('no exige piso, provincia ni código postal', () => {
    expect(direccionUtilizable(direccion({ linea2: '', provincia: '', codigoPostal: '' }))).toBe(
      true,
    );
  });
});

/**
 * Los dos importes llegan en CÉNTIMOS DE DÓLAR del servidor. Compararlos en crudo con divisas distintas
 * fue un fallo real: con el yen, sin decimales, el pedido salía cien veces más caro y un cliente japonés
 * no podía pagar con su saldo.
 */
describe('elSaldoAlcanza', () => {
  it('alcanza cuando el disponible cubre el total', () => {
    expect(elSaldoAlcanza(15000, 12972)).toBe(true);
  });

  it('el importe justo alcanza', () => {
    expect(elSaldoAlcanza(12972, 12972)).toBe(true);
  });

  it('no alcanza por poco que falte', () => {
    expect(elSaldoAlcanza(12971, 12972)).toBe(false);
  });

  /**
   * Mientras no se conoce el total NO alcanza. Dejarlo pasar «solo un momento» es el rato en que se creaba
   * un pedido que el cobro rechazaba después y había que limpiar a mano.
   */
  it('sin total todavía, no alcanza', () => {
    expect(elSaldoAlcanza(999999, undefined)).toBe(false);
  });

  it('sin saldo conocido, tampoco', () => {
    expect(elSaldoAlcanza(undefined, 100)).toBe(false);
  });
});
