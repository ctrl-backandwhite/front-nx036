import { aFicha, aPedido } from './pedido.dto';

/**
 * La traducción del pedido, del vocabulario del backend al del dominio.
 *
 * <p>Aquí no hay red ni Angular: son funciones puras, y son exactamente el sitio donde un pedido se
 * pinta mal sin que nada falle. Lo que se fija:
 *
 * <ul>
 *   <li>los respaldos cuando el servidor no manda un campo (una tienda sin nombre comercial, un total
 *       sin formatear);
 *   <li>y sobre todo la diferencia entre CERO y SIN CALCULAR: un «0,00 €» de envío se lee como envío
 *       gratis, que es una promesa comercial distinta de «pendiente de cotizar».
 * </ul>
 */
describe('traducción del pedido', () => {
  describe('aPedido', () => {
    it('renombra los campos al vocabulario del dominio', () => {
      expect(
        aPedido({
          id: 'o1',
          orderNumber: 'NX-1001',
          status: 'PAID',
          customerEmail: 'ana@nx036.com',
          itemCount: 3,
          totalFormatted: '129,72 €',
          totalCents: 12972,
          currency: 'EUR',
          placedAt: '2026-09-01T10:00:00Z',
        }),
      ).toMatchObject({
        id: 'o1',
        numero: 'NX-1001',
        estado: 'PAID',
        emailCliente: 'ana@nx036.com',
        articulos: 3,
        totalFormateado: '129,72 €',
        realizadoEl: '2026-09-01T10:00:00Z',
      });
    });

    it('prefiere el nombre comercial de la tienda, y si no hay usa el identificador', () => {
      const base = { id: 'o1', orderNumber: 'NX-1', status: 'NEW' };

      expect(aPedido({ ...base, shopName: 'Moda Ana', shopHandle: 'moda-ana' }).tienda).toBe(
        'Moda Ana',
      );
      /* Sin respaldo, la columna saldría vacía y no habría forma de saber de qué tienda es el pedido. */
      expect(aPedido({ ...base, shopHandle: 'moda-ana' }).tienda).toBe('moda-ana');
    });

    it('un pedido sin líneas contadas cuenta cero, no «indefinido»', () => {
      expect(aPedido({ id: 'o1', orderNumber: 'NX-1', status: 'NEW' }).articulos).toBe(0);
    });
  });

  describe('el canal en la fila del listado', () => {
    const base = { id: 'o1', orderNumber: 'NX-1', status: 'PAID' };

    it('lleva el transportista, el canal y si el pedido saldria hoy por el', () => {
      expect(
        aPedido({
          ...base,
          shippingCarrier: 'FOURPX',
          shippingChannelCode: 'S1427',
          canalAdmisible: false,
          canalMotivo: 'VALOR_FUERA_DEL_TOPE',
        }),
      ).toMatchObject({
        transportista: 'FOURPX',
        canalDeEnvio: 'S1427',
        canalAdmisible: false,
        motivoDelCanal: 'valor-fuera-del-tope',
      });
    });

    it('cada motivo del servidor tiene el suyo y uno nuevo llega como desconocido', () => {
      const motivo = (canalMotivo: string) => aPedido({ ...base, canalMotivo }).motivoDelCanal;

      expect(motivo('SIN_TRANSPORTISTA')).toBe('sin-transportista');
      expect(motivo('SIN_CANAL')).toBe('sin-canal');
      expect(motivo('TRANSPORTISTA_DISTINTO')).toBe('transportista-distinto');
      expect(motivo('PRODUCTO_NO_LOCALIZABLE')).toBe('producto-no-localizable');
      expect(motivo('MERCANCIA_NO_ADMITIDA')).toBe('mercancia-no-admitida');
      expect(motivo('INVENTADO_MAÑANA')).toBe('desconocido');
      expect(aPedido(base).motivoDelCanal).toBeUndefined();
    });

    it('sin veredicto del servidor no se afirma nada de la admisibilidad', () => {
      expect(aPedido(base).canalAdmisible).toBeUndefined();
    });
  });

  describe('aFicha', () => {
    const BASE = { id: 'o1', orderNumber: 'NX-1', status: 'PAID', currency: 'EUR' };

    it('trae el transportista visible, el canal con su nombre, la clase de linea y el detalle', () => {
      const ficha = aFicha({
        ...BASE,
        shippingCarrier: 'FOURPX',
        shippingCarrierName: '4PX',
        shippingChannelCode: 'S1427',
        shippingChannelName: 'Linea general',
        shippingLineType: 'GENERAL',
        canalAdmisible: false,
        canalMotivo: 'MERCANCIA_NO_ADMITIDA',
        canalDetalle: 'Calzado de piel no admitido',
      });

      expect(ficha).toMatchObject({
        transportista: 'FOURPX',
        nombreDelTransportista: '4PX',
        canalDeEnvio: 'S1427',
        nombreDelCanal: 'Linea general',
        tipoDeLinea: 'general',
        detalleDelCanal: 'Calzado de piel no admitido',
        motivoDelCanal: 'mercancia-no-admitida',
      });
    });

    it('lee si el pedido tiene factura; sin el dato queda sin decidir', () => {
      expect(aFicha({ ...BASE, status: 'CANCELLED', invoiceAvailable: true }).conFactura).toBe(true);
      expect(aFicha({ ...BASE, invoiceAvailable: false }).conFactura).toBe(false);
      expect(aFicha(BASE).conFactura).toBeUndefined();
    });

    it('sin nombre visible del transportista cae al identificador', () => {
      expect(aFicha({ ...BASE, shippingCarrier: 'FOURPX' }).nombreDelTransportista).toBe('FOURPX');
      expect(aFicha(BASE).nombreDelTransportista).toBeUndefined();
    });

    it('cada clase de linea se traduce y una nueva se lee como desconocida', () => {
      const tipo = (shippingLineType: string) => aFicha({ ...BASE, shippingLineType }).tipoDeLinea;

      expect(tipo('ROPA')).toBe('ropa');
      expect(tipo('CON_BATERIA')).toBe('con-bateria');
      expect(tipo('DESCONOCIDA')).toBe('desconocida');
      expect(tipo('NUEVA')).toBe('desconocida');
      expect(aFicha(BASE).tipoDeLinea).toBeUndefined();
    });

    it('traduce cada bulto con el canal con el que realmente se emitio', () => {
      const ficha = aFicha({
        ...BASE,
        shipments: [
          {
            sequenceNo: 2,
            carrier: 'YUNEXPRESS',
            productCode: 'FZZXR',
            trackingNumber: 'T1',
            waybillNumber: 'W1',
            status: 'SHIPPED',
            weightGrams: 450,
            declaredValueCents: 1200,
            coincideConElCanal: false,
          },
          {},
        ],
      });

      expect(ficha.bultos[0]).toEqual({
        numero: 2,
        transportista: 'YUNEXPRESS',
        canalEmitido: 'FZZXR',
        numeroDeSeguimiento: 'T1',
        numeroDeGuia: 'W1',
        estado: 'SHIPPED',
        pesoEnGramos: 450,
        coincideConElCanal: false,
      });
      expect(ficha.bultos[1].numero).toBe(0);
      expect(aFicha(BASE).bultos).toEqual([]);
    });

    it('un pedido de integración se distingue del de la plataforma', () => {
      expect(aFicha({ ...BASE, source: 'INTEGRATION' }).origen).toBe('INTEGRATION');
      expect(aFicha({ ...BASE, source: 'STOREFRONT' }).origen).toBe('PLATFORM');
      /* Sin origen no se inventa ninguno: un pedido antiguo sin el campo no puede aparecer como venido
       * de una integración que no existe. */
      expect(aFicha(BASE).origen).toBeUndefined();
    });

    it('formatea los importes que llegan en céntimos cuando el servidor no los formatea', () => {
      expect(aFicha({ ...BASE, subtotalCents: 12972 }).subtotalFormateado).toBe('129.72 EUR');
    });

    it('pero si el servidor los formatea, manda el suyo', () => {
      expect(
        aFicha({ ...BASE, subtotalCents: 12972, subtotalFormatted: '129,72 €' }).subtotalFormateado,
      ).toBe('129,72 €');
    });

    /**
     * El caso que importa: envío e impuestos se quedan SIN VALOR mientras no se hayan cotizado. Un
     * «0,00 €» en la columna de envío se lee como envío gratis, y eso es una promesa al cliente.
     */
    it('el envío sin cotizar queda vacío, NO en cero', () => {
      const ficha = aFicha(BASE);

      expect(ficha.envioFormateado).toBeUndefined();
      expect(ficha.impuestosFormateado).toBeUndefined();
    });

    it('un envío ya cotizado en cero SÍ se enseña cuando el servidor lo formatea', () => {
      expect(aFicha({ ...BASE, shippingFormatted: '0,00 €' }).envioFormateado).toBe('0,00 €');
    });

    it('traduce la dirección de envío entera', () => {
      const ficha = aFicha({
        ...BASE,
        shippingAddress: {
          fullName: 'Ana Ruiz',
          line1: 'Mayor 1',
          city: 'Madrid',
          region: 'Madrid',
          postalCode: '28001',
          country: 'ES',
          phone: '+34600000000',
        },
      });

      expect(ficha.direccionDeEnvio).toMatchObject({
        nombreCompleto: 'Ana Ruiz',
        linea1: 'Mayor 1',
        ciudad: 'Madrid',
        codigoPostal: '28001',
        pais: 'ES',
      });
    });

    it('sin dirección no se inventa una vacía: se deja sin ella', () => {
      expect(aFicha(BASE).direccionDeEnvio).toBeUndefined();
    });

    it('las líneas heredan la moneda del pedido para poder formatear su importe', () => {
      const ficha = aFicha({
        ...BASE,
        items: [{ id: 'l1', title: 'Gorro', qty: 2, unitPriceCents: 690, lineTotalCents: 1380 }],
      });

      expect(ficha.lineas[0]).toMatchObject({
        titulo: 'Gorro',
        cantidad: 2,
        precioUnitarioFormateado: '6.90 EUR',
        totalLineaFormateado: '13.80 EUR',
      });
    });

    it('un pedido sin líneas devuelve una lista vacía, no un nulo que reviente al recorrerlo', () => {
      expect(aFicha(BASE).lineas).toEqual([]);
    });
  });
});
