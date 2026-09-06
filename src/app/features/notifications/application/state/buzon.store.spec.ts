import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { Aviso } from '../../domain/model/aviso';
import { BuzonStore } from './buzon.store';

function aviso(id: string, tipo = 'ORDER_SHIPPED'): Aviso {
  return {
    id,
    tipoDeSuceso: tipo,
    titulo: 'Aviso ' + id,
    canal: 'INAPP',
    creadoEl: '2026-09-01T10:00:00Z',
  };
}

describe('BuzonStore', () => {
  let estado: BuzonStore;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    estado = TestBed.inject(BuzonStore);
    estado.fija([aviso('a'), aviso('b', 'CONTACT_RECEIVED'), aviso('c')]);
  });

  it('el filtro por tipo cambia lo que se ve, no lo que hay', () => {
    estado.filtraPor('support');

    expect(estado.visibles().map((a) => a.id)).toEqual(['b']);
    expect(estado.categorias()).toEqual(['order', 'support']);
  });

  it('cambiar de carpeta reinicia la lectura y las casillas: hablaban de otra lista', () => {
    estado.abre('a');
    estado.alterna('a');

    estado.abreCarpeta('trash');

    expect(estado.carpeta()).toBe('trash');
    expect(estado.abierto()).toBeNull();
    expect(estado.marcados().size).toBe(0);
  });

  it('marcar todos actúa sobre lo que se ve, no sobre la bandeja entera', () => {
    estado.filtraPor('order');

    estado.alternaTodos();

    expect([...estado.marcados()]).toEqual(['a', 'c']);
    expect(estado.todosMarcados()).toBe(true);
  });

  it('vuelve a pulsarlo y se desmarcan', () => {
    estado.alternaTodos();
    estado.alternaTodos();

    expect(estado.marcados().size).toBe(0);
  });

  it('retirar el aviso abierto cierra el panel de lectura', () => {
    estado.abre('b');

    estado.retira(['b']);

    expect(estado.abierto()).toBeNull();
    expect(estado.visibles().map((a) => a.id)).toEqual(['a', 'c']);
  });

  it('marcar leído aquí no vuelve a pedir la lista y baja el contador', () => {
    estado.fijaSinLeer(3);

    estado.marcaLeidoAqui('a');

    expect(estado.visibles()[0].leidoEl).toBeTruthy();
    expect(estado.sinLeer()).toBe(2);
  });

  it('el contador nunca baja de cero', () => {
    estado.fijaSinLeer(0);
    estado.marcaLeidoAqui('a');
    expect(estado.sinLeer()).toBe(0);
  });
});
