import { describe, expect, it } from 'vitest';
import { ResumenDePedido } from './pedido';
import {
  CRITERIO_VACIO,
  anosConPedidos,
  filtraPedidos,
  filtrosPuestos,
} from './criterio-de-pedidos';

const pedido = (parcial: Partial<ResumenDePedido>): ResumenDePedido => ({
  id: '1',
  numero: 'NX-0001',
  estado: 'PAID',
  cancelable: false,
  totalFormateado: '10,00 €',
  articulos: 1,
  realizadoEl: '2026-05-10T12:00:00Z',
  ...parcial,
});

describe('criterio de pedidos', () => {
  describe('filtrosPuestos', () => {
    it('sin nada puesto cuenta cero', () => {
      expect(filtrosPuestos(CRITERIO_VACIO)).toBe(0);
    });

    it('cuenta cada filtro con valor', () => {
      expect(filtrosPuestos({ ...CRITERIO_VACIO, texto: 'NX', estado: 'PAID' })).toBe(2);
    });
  });

  describe('filtraPedidos', () => {
    const pedidos = [
      pedido({ id: '1', numero: 'NX-0001', realizadoEl: '2026-05-10T12:00:00Z' }),
      pedido({ id: '2', numero: 'NX-0002', estado: 'SHIPPED', realizadoEl: '2025-12-03T12:00:00Z' }),
    ];

    it('sin criterio los devuelve todos', () => {
      expect(filtraPedidos(pedidos, CRITERIO_VACIO)).toHaveLength(2);
    });

    it('busca por número, sin distinguir mayúsculas', () => {
      expect(filtraPedidos(pedidos, { ...CRITERIO_VACIO, texto: 'nx-0002' })).toHaveLength(1);
    });

    it('filtra por estado', () => {
      const encontrados = filtraPedidos(pedidos, { ...CRITERIO_VACIO, estado: 'SHIPPED' });
      expect(encontrados.map((p) => p.id)).toEqual(['2']);
    });

    it('filtra por año, mes y día por separado', () => {
      expect(filtraPedidos(pedidos, { ...CRITERIO_VACIO, ano: '2026' })).toHaveLength(1);
      expect(filtraPedidos(pedidos, { ...CRITERIO_VACIO, mes: '12' })).toHaveLength(1);
      expect(filtraPedidos(pedidos, { ...CRITERIO_VACIO, dia: '3' })).toHaveLength(1);
    });

    /** El extremo se toma completo: pedir «hasta el 10» tiene que incluir el propio día 10. */
    it('el intervalo incluye los días de los extremos', () => {
      const dentro = filtraPedidos(pedidos, {
        ...CRITERIO_VACIO,
        desde: '2026-05-10',
        hasta: '2026-05-10',
      });
      expect(dentro.map((p) => p.id)).toEqual(['1']);
    });

    it('deja fuera lo anterior a «desde»', () => {
      expect(filtraPedidos(pedidos, { ...CRITERIO_VACIO, desde: '2026-01-01' })).toHaveLength(1);
    });

    /** Un pedido sin fecha no puede afirmarse que caiga dentro del intervalo. */
    it('un pedido sin fecha queda fuera de cualquier filtro de fecha', () => {
      const sinFecha = [pedido({ id: '3', realizadoEl: undefined })];
      expect(filtraPedidos(sinFecha, { ...CRITERIO_VACIO, ano: '2026' })).toHaveLength(0);
      expect(filtraPedidos(sinFecha, CRITERIO_VACIO)).toHaveLength(1);
    });
  });

  describe('anosConPedidos', () => {
    it('devuelve los años sin repetir y del más reciente al más antiguo', () => {
      expect(
        anosConPedidos([
          pedido({ realizadoEl: '2025-01-01T00:00:00Z' }),
          pedido({ realizadoEl: '2026-01-01T00:00:00Z' }),
          pedido({ realizadoEl: '2026-06-01T00:00:00Z' }),
          pedido({ realizadoEl: undefined }),
        ]),
      ).toEqual(['2026', '2025']);
    });
  });
});
