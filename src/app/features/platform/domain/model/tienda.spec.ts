import { PlataformaDeTienda, estaDisponible, inicialDePlataforma } from './tienda';

const PLATAFORMAS: readonly PlataformaDeTienda[] = [
  { codigo: 'shopify', etiqueta: 'Shopify', disponible: true },
  { codigo: 'woocommerce', etiqueta: 'WooCommerce', disponible: true },
  { codigo: 'prestashop', etiqueta: 'PrestaShop', disponible: false },
];

describe('estaDisponible', () => {
  it('dice que sí a las integraciones reales', () => {
    expect(estaDisponible(PLATAFORMAS, 'shopify')).toBe(true);
  });

  it('dice que no a las anunciadas como «Próximamente»', () => {
    // Sin esta comprobación, la pantalla ofrecía conectar tiendas que el backend rechaza después, y
    // el usuario lo interpretaba como que había pegado mal su token.
    expect(estaDisponible(PLATAFORMAS, 'prestashop')).toBe(false);
  });

  it('una plataforma que no está en la lista no está disponible', () => {
    expect(estaDisponible(PLATAFORMAS, 'magento')).toBe(false);
    expect(estaDisponible([], 'shopify')).toBe(false);
  });
});

describe('inicialDePlataforma', () => {
  it('usa la primera letra en mayúscula', () => {
    expect(inicialDePlataforma(PLATAFORMAS[0])).toBe('S');
  });

  it('una etiqueta vacía no deja una tarjeta muda', () => {
    expect(inicialDePlataforma({ codigo: 'x', etiqueta: '', disponible: true })).toBe('?');
  });
});
