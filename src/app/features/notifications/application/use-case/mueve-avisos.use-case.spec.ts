import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { exito, fallo } from '@shared/result/result';
import { creaError } from '@shared/error/app-error';
import { Aviso } from '../../domain/model/aviso';
import { GESTION_DE_AVISOS_PORT, GestionDeAvisosPort } from '../../domain/port/avisos.port';
import { BuzonStore } from '../state/buzon.store';
import { MueveAvisos } from './mueve-avisos.use-case';

function aviso(id: string): Aviso {
  return {
    id,
    tipoDeSuceso: 'ORDER_SHIPPED',
    titulo: 'Pedido ' + id,
    canal: 'INAPP',
    creadoEl: '2026-09-01T10:00:00Z',
  };
}

function doble(): GestionDeAvisosPort {
  const bien = () => Promise.resolve(exito(undefined));
  return {
    archiva: vi.fn(bien),
    desarchiva: vi.fn(bien),
    aLaPapelera: vi.fn(bien),
    restaura: vi.fn(bien),
    borraParaSiempre: vi.fn(bien),
    cambiaEstado: vi.fn(bien),
  };
}

describe('MueveAvisos', () => {
  let puerto: GestionDeAvisosPort;
  let estado: BuzonStore;

  beforeEach(() => {
    puerto = doble();
    TestBed.configureTestingModule({
      providers: [{ provide: GESTION_DE_AVISOS_PORT, useValue: puerto }],
    });
    estado = TestBed.inject(BuzonStore);
    estado.fija([aviso('a'), aviso('b'), aviso('c')]);
  });

  it('retira de la bandeja lo que se acaba de mover', async () => {
    const resultado = await TestBed.inject(MueveAvisos).uno('b', 'archiva');

    expect(resultado.ok).toBe(true);
    expect(puerto.archiva).toHaveBeenCalledWith('b');
    expect(estado.visibles().map((a) => a.id)).toEqual(['a', 'c']);
  });

  it('deja el aviso donde estaba si el servidor lo rechaza', async () => {
    vi.mocked(puerto.aLaPapelera).mockResolvedValue(fallo(creaError('error-del-servidor', 'no')));

    const resultado = await TestBed.inject(MueveAvisos).uno('a', 'aLaPapelera');

    expect(resultado.ok).toBe(false);
    expect(estado.visibles()).toHaveLength(3);
  });

  it('aplica el lote entero y limpia la selección', async () => {
    estado.alterna('a');
    estado.alterna('c');

    const resultado = await TestBed.inject(MueveAvisos).enLote(['a', 'c'], 'archiva');

    expect(resultado.ok).toBe(true);
    expect(estado.visibles().map((a) => a.id)).toEqual(['b']);
    expect(estado.marcados().size).toBe(0);
  });

  /**
   * Es el caso que dejaba la barra de lote apagada para siempre y sin decir nada: se esperan TODAS,
   * las que salieron bien se retiran y el fallo se devuelve para que la pantalla lo cuente.
   */
  it('si una del lote falla, aplica el resto y devuelve el fallo', async () => {
    vi.mocked(puerto.archiva).mockImplementation((id: string) =>
      id === 'c' ? Promise.resolve(fallo(creaError('conflicto', 'ya no está'))) : Promise.resolve(exito(undefined)),
    );

    const resultado = await TestBed.inject(MueveAvisos).enLote(['a', 'c'], 'archiva');

    expect(resultado.ok).toBe(false);
    expect(estado.visibles().map((a) => a.id)).toEqual(['b', 'c']);
    expect(estado.marcados().size).toBe(0);
  });

  it('un lote vacío no llama a nadie', async () => {
    const resultado = await TestBed.inject(MueveAvisos).enLote([], 'archiva');

    expect(resultado.ok).toBe(true);
    expect(puerto.archiva).not.toHaveBeenCalled();
  });

  it('cambiar de estado NO saca el aviso de la bandeja: solo cambia su etiqueta', async () => {
    await TestBed.inject(MueveAvisos).cambiaEstado('a', 'RESOLVED');

    expect(puerto.cambiaEstado).toHaveBeenCalledWith('a', 'RESOLVED');
    expect(estado.visibles()).toHaveLength(3);
  });
});
