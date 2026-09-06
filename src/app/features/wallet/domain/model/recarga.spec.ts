import { describe, expect, it } from 'vitest';
import {
  METODOS_OFRECIDOS,
  Recarga,
  esSimulada,
  importeTecleado,
  importeValido,
} from './recarga';

const recarga = (parcial: Partial<Recarga> = {}): Recarga => ({
  idDePago: 'p1',
  metodo: 'CARD',
  estado: 'PENDING',
  importeFormateado: '50,00 €',
  divisaDeCobro: 'EUR',
  proveedor: 'stripe',
  ...parcial,
});

describe('reglas de la recarga', () => {
  describe('métodos ofrecidos', () => {
    /** USDT sigue en el modelo pero apagado: la maquinaria se conserva para reactivarlo. */
    it('hoy solo se ofrecen tarjeta y PayPal', () => {
      expect(METODOS_OFRECIDOS).toEqual(['CARD', 'PAYPAL']);
    });
  });

  describe('importeValido', () => {
    it('acepta una cantidad positiva', () => {
      expect(importeValido('50')).toBe(true);
      expect(importeValido('0.01')).toBe(true);
    });

    it('rechaza el vacío, el cero y los negativos', () => {
      expect(importeValido('')).toBe(false);
      expect(importeValido('0')).toBe(false);
      expect(importeValido('-5')).toBe(false);
      expect(importeValido('hola')).toBe(false);
    });

    /**
     * Un «1e999» pegado da infinito, y al serializar el JSON el infinito viaja como `null`: el servidor
     * recibiría una recarga SIN importe.
     */
    it('rechaza el infinito, que viajaría como una recarga sin importe', () => {
      expect(importeValido('1e999')).toBe(false);
    });
  });

  describe('importeTecleado', () => {
    it('devuelve el número cuando vale y cero cuando no', () => {
      expect(importeTecleado('12.5')).toBe(12.5);
      expect(importeTecleado('1e999')).toBe(0);
      expect(importeTecleado('')).toBe(0);
    });
  });

  describe('esSimulada', () => {
    it('lo es cuando el proveedor es manual', () => {
      expect(esSimulada(recarga({ proveedor: 'manual' }))).toBe(true);
    });

    it('lo es cuando las credenciales llevan la marca de prueba', () => {
      expect(esSimulada(recarga({ secretoDeCliente: 'cs_mock_123' }))).toBe(true);
      expect(esSimulada(recarga({ urlDeAprobacion: 'https://x/pay?mock=1' }))).toBe(true);
    });

    it('no lo es contra una pasarela de verdad', () => {
      expect(
        esSimulada(
          recarga({ secretoDeCliente: 'cs_live_123', urlDeAprobacion: 'https://stripe/pay' }),
        ),
      ).toBe(false);
    });
  });
});
