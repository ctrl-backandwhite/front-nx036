import {
  SolicitudDeAprovisionamiento,
  sePuedeCancelar,
  sePuedeElegirCotizacion,
  validaUrlDeMercado,
} from './aprovisionamiento';

/** Una solicitud cualquiera, con el estado que pida cada prueba. */
function solicitud(estado: string): SolicitudDeAprovisionamiento {
  return {
    id: 's1',
    urlDeOrigen: 'https://1688.com/oferta/1',
    estado,
    creadaEl: '2026-09-01T10:00:00Z',
    cuantasCotizaciones: 2,
  };
}

describe('validaUrlDeMercado', () => {
  it('acepta los mercados de los que se sabe extraer una ficha', () => {
    expect(validaUrlDeMercado('https://detail.1688.com/offer/123.html')).toBeNull();
    expect(validaUrlDeMercado('https://item.taobao.com/item.htm?id=1')).toBeNull();
    expect(validaUrlDeMercado('https://es.aliexpress.com/item/1.html')).toBeNull();
    expect(validaUrlDeMercado('https://www.ebay.com/itm/1')).toBeNull();
    expect(validaUrlDeMercado('https://www.amazon.es/dp/B01')).toBeNull();
  });

  it('recorta los espacios de un copiar y pegar antes de mirar nada', () => {
    expect(validaUrlDeMercado('  https://detail.1688.com/offer/1.html  ')).toBeNull();
  });

  it('distingue «no es una dirección» de «no es un mercado soportado»', () => {
    // Son dos remedios distintos: uno se arregla escribiendo bien y el otro buscando en otro sitio.
    expect(validaUrlDeMercado('esto no es una url')).toBe('invalida');
    expect(validaUrlDeMercado('https://mi-tienda-rara.example/producto')).toBe('no-soportada');
  });

  it('rechaza los esquemas que no son http ni https aunque construyan una URL válida', () => {
    // `javascript:` y `data:` pasan por el constructor de URL sin protestar: el filtro tiene que ser
    // explícito o se abre la puerta a guardar un enlace ejecutable en una solicitud.
    expect(validaUrlDeMercado('javascript:alert(1)')).toBe('invalida');
    expect(validaUrlDeMercado('data:text/html,<script>1</script>')).toBe('invalida');
    expect(validaUrlDeMercado('ftp://1688.com/algo')).toBe('invalida');
  });

  it('rechaza la cadena vacía', () => {
    expect(validaUrlDeMercado('')).toBe('invalida');
    expect(validaUrlDeMercado('   ')).toBe('invalida');
  });
});

describe('reglas de estado de una solicitud', () => {
  it('se puede cancelar mientras no esté aprobada ni cancelada', () => {
    expect(sePuedeCancelar(solicitud('PENDING'))).toBe(true);
    expect(sePuedeCancelar(solicitud('QUOTING'))).toBe(true);
  });

  it('no se cancela lo ya aprobado —hay un pedido detrás— ni lo ya cancelado', () => {
    expect(sePuedeCancelar(solicitud('APPROVED'))).toBe(false);
    expect(sePuedeCancelar(solicitud('CANCELLED'))).toBe(false);
  });

  it('la cotización elegida no se cambia una vez aprobada', () => {
    expect(sePuedeElegirCotizacion(solicitud('QUOTING'))).toBe(true);
    expect(sePuedeElegirCotizacion(solicitud('APPROVED'))).toBe(false);
  });
});
