import { describe, expect, it } from 'vitest';
import {
  EstadoDePedido,
  estaCancelado,
  pasoActivo,
  permiteElegirDestinoDelReembolso,
  tieneEnvioEnCurso,
  tieneFactura,
} from './pedido';

describe('reglas del pedido', () => {
  describe('estaCancelado', () => {
    it('lo está tanto si se anuló como si se devolvió el dinero', () => {
      expect(estaCancelado('CANCELLED')).toBe(true);
      expect(estaCancelado('REFUNDED')).toBe(true);
    });

    it('no lo está mientras el pedido siga su curso', () => {
      expect(estaCancelado('PAID')).toBe(false);
      expect(estaCancelado('DELIVERED')).toBe(false);
    });
  });

  describe('pasoActivo', () => {
    it('un pedido cancelado no tiene camino que enseñar', () => {
      expect(pasoActivo({ estado: 'CANCELLED' })).toBe(-1);
      expect(pasoActivo({ estado: 'REFUNDED' })).toBe(-1);
    });

    it('avanza con el estado', () => {
      expect(pasoActivo({ estado: 'PENDING' })).toBe(0);
      expect(pasoActivo({ estado: 'AWAITING_PAYMENT' })).toBe(0);
      expect(pasoActivo({ estado: 'PAID' })).toBe(1);
      expect(pasoActivo({ estado: 'FORWARDED' })).toBe(2);
      expect(pasoActivo({ estado: 'SHIPPED' })).toBe(3);
      expect(pasoActivo({ estado: 'DELIVERED' })).toBe(4);
    });

    /**
     * La fecha manda sobre el estado: si el paquete ya está entregado, enseñar el camión en marcha hace
     * dudar del resto del seguimiento.
     */
    it('la fecha de entrega gana al estado que aún no se ha movido', () => {
      expect(pasoActivo({ estado: 'PAID', entregadoEl: '2026-09-01T10:00:00Z' })).toBe(4);
      expect(pasoActivo({ estado: 'PAID', enviadoEl: '2026-09-01T10:00:00Z' })).toBe(3);
    });
  });

  describe('tieneEnvioEnCurso', () => {
    it('solo los estados con actividad de envío ofrecen el seguimiento', () => {
      expect(tieneEnvioEnCurso('FORWARDED')).toBe(true);
      expect(tieneEnvioEnCurso('SHIPPED')).toBe(true);
      expect(tieneEnvioEnCurso('DELIVERED')).toBe(true);
      expect(tieneEnvioEnCurso('PAID')).toBe(false);
      expect(tieneEnvioEnCurso('CANCELLED')).toBe(false);
    });
  });

  describe('tieneFactura', () => {
    it('no hay factura de lo que nadie pagó ni de lo que se anuló', () => {
      const sinFactura: EstadoDePedido[] = ['PENDING', 'AWAITING_PAYMENT', 'CANCELLED'];
      for (const estado of sinFactura) {
        expect(tieneFactura(estado)).toBe(false);
      }
    });

    it('sí la hay en cuanto el pedido se cobró', () => {
      expect(tieneFactura('PAID')).toBe(true);
      expect(tieneFactura('DELIVERED')).toBe(true);
      // Reembolsado también: la factura existió y la operación hay que poder acreditarla.
      expect(tieneFactura('REFUNDED')).toBe(true);
    });
  });

  describe('permiteElegirDestinoDelReembolso', () => {
    it('solo hay elección cuando se pagó por una pasarela externa', () => {
      expect(permiteElegirDestinoDelReembolso('CARD')).toBe(true);
      expect(permiteElegirDestinoDelReembolso('PAYPAL')).toBe(true);
    });

    it('lo pagado con la cartera vuelve a la cartera, sin preguntar', () => {
      expect(permiteElegirDestinoDelReembolso('WALLET')).toBe(false);
      expect(permiteElegirDestinoDelReembolso('USDT')).toBe(false);
      expect(permiteElegirDestinoDelReembolso(undefined)).toBe(false);
    });
  });
});
