import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { exito, fallo } from '@shared/result/result';
import { creaError } from '@shared/error/app-error';
import { TraduccionService } from '@core/i18n/traduccion.service';
import {
  CANCELACION_DE_PEDIDO_PORT,
  FACTURA_DE_PEDIDO_PORT,
  PEDIDOS_PORT,
  SEGUIMIENTO_DE_PEDIDO_PORT,
} from '../../domain/port/pedidos.port';
import { ListaPedidos } from './lista-pedidos.use-case';
import { ConsultaPedido } from './consulta-pedido.use-case';
import { SiguePedido } from './sigue-pedido.use-case';
import { CancelaPedido } from './cancela-pedido.use-case';
import { DescargaFactura } from './descarga-factura.use-case';

/** Un doble del servicio de traducción: los casos de uso solo le piden el idioma activo. */
const traduccionEn = (idioma: string) => ({ provide: TraduccionService, useValue: { idioma: () => idioma } });

describe('casos de uso de pedidos', () => {
  const pedidos = { lista: vi.fn(), consulta: vi.fn() };
  const cancelacion = { cancela: vi.fn() };
  const seguimiento = { consulta: vi.fn() };
  const factura = { descarga: vi.fn() };

  beforeEach(() => {
    vi.resetAllMocks();
    TestBed.configureTestingModule({
      providers: [
        { provide: PEDIDOS_PORT, useValue: pedidos },
        { provide: CANCELACION_DE_PEDIDO_PORT, useValue: cancelacion },
        { provide: SEGUIMIENTO_DE_PEDIDO_PORT, useValue: seguimiento },
        { provide: FACTURA_DE_PEDIDO_PORT, useValue: factura },
        traduccionEn('pt'),
      ],
    });
  });

  it('ListaPedidos entrega lo que devuelve el puerto', async () => {
    pedidos.lista.mockResolvedValue(exito([]));
    expect((await TestBed.inject(ListaPedidos).ejecuta()).ok).toBe(true);
  });

  it('ListaPedidos deja pasar el fallo sin disfrazarlo', async () => {
    pedidos.lista.mockResolvedValue(fallo(creaError('sin-conexion')));
    const resultado = await TestBed.inject(ListaPedidos).ejecuta();
    expect(resultado.ok).toBe(false);
  });

  /** El idioma lo pone el caso de uso: dejarlo a cada pantalla acababa en títulos en chino. */
  it('ConsultaPedido manda el idioma activo', async () => {
    pedidos.consulta.mockResolvedValue(exito({ id: 'o1' }));
    await TestBed.inject(ConsultaPedido).ejecuta('o1');
    expect(pedidos.consulta).toHaveBeenCalledWith('o1', 'pt');
  });

  it('SiguePedido limpia los avisos repetidos del pedido y de cada bulto', async () => {
    seguimiento.consulta.mockResolvedValue(
      exito({
        hitos: [
          { estado: 'SHIPPED', descripcion: 'Recogido' },
          { estado: 'SHIPPED', descripcion: 'Paquete recogido' },
        ],
        bultos: [
          {
            secuencia: 1,
            pesoGramos: 100,
            contenido: [],
            hitos: [
              { estado: 'SHIPPED', descripcion: 'En tránsito' },
              { estado: 'SHIPPED', descripcion: 'En tránsito' },
            ],
          },
        ],
      }),
    );

    const resultado = await TestBed.inject(SiguePedido).ejecuta('o1');
    expect(resultado.ok).toBe(true);
    if (resultado.ok) {
      expect(resultado.valor.hitos).toHaveLength(1);
      expect(resultado.valor.bultos[0].hitos).toHaveLength(1);
    }
  });

  it('SiguePedido no intenta limpiar nada si la consulta falló', async () => {
    seguimiento.consulta.mockResolvedValue(fallo(creaError('error-del-servidor')));
    expect((await TestBed.inject(SiguePedido).ejecuta('o1')).ok).toBe(false);
  });

  it('CancelaPedido traslada el destino del reembolso tal cual se decidió', async () => {
    cancelacion.cancela.mockResolvedValue(exito(undefined));
    await TestBed.inject(CancelaPedido).ejecuta('o1', false);
    expect(cancelacion.cancela).toHaveBeenCalledWith('o1', 'pt', false);
  });

  it('DescargaFactura pide el archivo con el número del pedido y el idioma', async () => {
    factura.descarga.mockResolvedValue(exito({ contenido: new Blob(), nombre: 'NX-1.pdf' }));
    await TestBed.inject(DescargaFactura).ejecuta('o1', 'NX-1');
    expect(factura.descarga).toHaveBeenCalledWith('o1', 'NX-1', 'pt');
  });
});
