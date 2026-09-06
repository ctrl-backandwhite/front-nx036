import { esDireccionExterna } from './pago';

/**
 * Tratar como externa la dirección relativa del modo simulado recargaba la aplicación entera en medio de
 * un cobro.
 */
describe('esDireccionExterna', () => {
  it('una dirección absoluta sale del sitio', () => {
    expect(esDireccionExterna('https://checkout.stripe.com/c/pay/abc')).toBe(true);
    expect(esDireccionExterna('http://www.sandbox.paypal.com/x')).toBe(true);
  });

  it('una relativa se navega por dentro', () => {
    expect(esDireccionExterna('/checkout/return?orderId=1')).toBe(false);
  });

  it('no se deja engañar por un esquema raro', () => {
    expect(esDireccionExterna('javascript:alert(1)')).toBe(false);
  });
});
