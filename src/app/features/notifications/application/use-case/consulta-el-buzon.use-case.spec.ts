import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { exito, fallo } from '@shared/result/result';
import { creaError } from '@shared/error/app-error';
import { Aviso } from '../../domain/model/aviso';
import { BUZON_PORT, BuzonPort } from '../../domain/port/avisos.port';
import { BuzonStore } from '../state/buzon.store';
import { ConsultaElBuzon } from './consulta-el-buzon.use-case';
import { LeeUnAviso } from './lee-un-aviso.use-case';

function aviso(id: string, leido = false): Aviso {
  return {
    id,
    tipoDeSuceso: 'ORDER_SHIPPED',
    titulo: 'Pedido ' + id,
    canal: 'INAPP',
    creadoEl: '2026-09-01T10:00:00Z',
    ...(leido ? { leidoEl: '2026-09-01T12:00:00Z', estado: 'RECEIVED' } : {}),
  };
}

describe('ConsultaElBuzon y LeeUnAviso', () => {
  let puerto: BuzonPort;
  let estado: BuzonStore;

  beforeEach(() => {
    puerto = {
      lista: vi.fn().mockResolvedValue(exito([aviso('a'), aviso('b', true)])),
      sinLeer: vi.fn().mockResolvedValue(exito(7)),
      marcaLeido: vi.fn().mockResolvedValue(exito(undefined)),
      marcaTodosLeidos: vi.fn().mockResolvedValue(exito(undefined)),
    };
    TestBed.configureTestingModule({
      providers: [{ provide: BUZON_PORT, useValue: puerto }],
    });
    estado = TestBed.inject(BuzonStore);
  });

  it('deja puesta la carpeta pedida y cuenta los que quedan sin leer', async () => {
    const resultado = await TestBed.inject(ConsultaElBuzon).ejecuta('archived');

    expect(resultado.ok).toBe(true);
    expect(puerto.lista).toHaveBeenCalledWith('archived');
    expect(estado.visibles()).toHaveLength(2);
    // El contador se saca de la MISMA lista, no de otra llamada: así no pueden contradecirse.
    expect(estado.sinLeer()).toBe(1);
  });

  it('devuelve el fallo para que la pantalla lo cuente en vez de quedarse muda', async () => {
    vi.mocked(puerto.lista).mockResolvedValue(fallo(creaError('error-del-servidor', 'vaya')));

    const resultado = await TestBed.inject(ConsultaElBuzon).ejecuta('inbox');

    expect(resultado.ok).toBe(false);
    expect(estado.cargando()).toBe(false);
  });

  it('la campana se conforma con un cero cuando el contador no llega', async () => {
    vi.mocked(puerto.sinLeer).mockResolvedValue(fallo(creaError('sin-conexion')));

    expect(await TestBed.inject(ConsultaElBuzon).cuantosSinLeer()).toBe(0);
  });

  it('abrir un aviso sin leer lo marca y baja el contador sin recargar la lista', async () => {
    await TestBed.inject(ConsultaElBuzon).ejecuta('inbox');

    await TestBed.inject(LeeUnAviso).ejecuta(aviso('a'));

    expect(puerto.marcaLeido).toHaveBeenCalledWith('a');
    expect(estado.abierto()?.id).toBe('a');
    expect(estado.sinLeer()).toBe(0);
    expect(puerto.lista).toHaveBeenCalledTimes(1);
  });

  it('abrir uno que ya estaba leído no vuelve a marcarlo', async () => {
    await TestBed.inject(ConsultaElBuzon).ejecuta('inbox');

    await TestBed.inject(LeeUnAviso).ejecuta(aviso('b', true));

    expect(puerto.marcaLeido).not.toHaveBeenCalled();
  });

  it('marcar todos deja el contador a cero', async () => {
    await TestBed.inject(ConsultaElBuzon).ejecuta('inbox');

    const resultado = await TestBed.inject(LeeUnAviso).todos();

    expect(resultado.ok).toBe(true);
    expect(estado.sinLeer()).toBe(0);
  });

  it('si marcar todos falla, el contador NO miente', async () => {
    vi.mocked(puerto.marcaTodosLeidos).mockResolvedValue(fallo(creaError('sin-conexion')));
    await TestBed.inject(ConsultaElBuzon).ejecuta('inbox');

    const resultado = await TestBed.inject(LeeUnAviso).todos();

    expect(resultado.ok).toBe(false);
    expect(estado.sinLeer()).toBe(1);
  });
});
