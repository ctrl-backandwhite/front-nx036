import { TestBed } from '@angular/core/testing';
import { describe, expect, it, vi } from 'vitest';
import { exito } from '@shared/result/result';
import { REDUCTOR_DE_FOTOS_PORT } from '../../domain/port/reductor-de-fotos.port';
import { MODERACION_DE_RESENAS_PORT } from '../../domain/port/moderacion-de-resenas.port';
import { RESENAS_PORT } from '../../domain/port/resenas.port';
import { medidasReducidas } from '../../domain/model/fotos-de-resena';
import { PreparaFotoDeResena } from './prepara-foto-de-resena.use-case';
import { ModeraResenas } from './modera-resenas.use-case';
import { PublicaResena } from './publica-resena.use-case';

const fichero = (tipo: string, bytes = 10) => new File([new Uint8Array(bytes)], 'f', { type: tipo });

describe('PreparaFotoDeResena', () => {
  function monta(reduce: (f: File) => Promise<File>) {
    TestBed.configureTestingModule({
      providers: [PreparaFotoDeResena, { provide: REDUCTOR_DE_FOTOS_PORT, useValue: { reduce } }],
    });
    return TestBed.inject(PreparaFotoDeResena);
  }

  it('rechaza lo que no es JPEG, PNG ni WebP sin llegar a reducirlo', async () => {
    const reduce = vi.fn();
    const r = await monta(reduce).ejecuta(fichero('image/svg+xml'));
    expect(!r.ok && r.error.codigo).toBe('FOTO_TIPO_NO_ADMITIDO');
    expect(reduce).not.toHaveBeenCalled();
  });

  it('el tope de 5 MB se mira DESPUÉS de reducir', async () => {
    const grande = fichero('image/jpeg', 8 * 1024 * 1024);
    const ok = await monta(async () => fichero('image/jpeg', 300)).ejecuta(grande);
    expect(ok.ok).toBe(true);
    TestBed.resetTestingModule();
    const mal = await monta(async (f) => f).ejecuta(grande);
    expect(!mal.ok && mal.error.codigo).toBe('FOTO_DEMASIADO_GRANDE');
  });
});

describe('ModeraResenas', () => {
  it('delega en el puerto', async () => {
    const puerto = { ocultaResena: vi.fn().mockResolvedValue(exito(undefined)), quitaFoto: vi.fn().mockResolvedValue(exito(undefined)) };
    TestBed.configureTestingModule({
      providers: [ModeraResenas, { provide: MODERACION_DE_RESENAS_PORT, useValue: puerto }],
    });
    const caso = TestBed.inject(ModeraResenas);
    await caso.ocultaResena('r1');
    await caso.quitaFoto('r1', 'f1');
    expect(puerto.ocultaResena).toHaveBeenCalledWith('r1');
    expect(puerto.quitaFoto).toHaveBeenCalledWith('r1', 'f1');
  });
});

describe('PublicaResena con fotos', () => {
  it('pasa las fotos al puerto, y nada si no hay', async () => {
    const publica = vi.fn().mockResolvedValue(exito(undefined));
    TestBed.configureTestingModule({
      providers: [PublicaResena, { provide: RESENAS_PORT, useValue: { publica } }],
    });
    const caso = TestBed.inject(PublicaResena);
    const f = fichero('image/jpeg');
    await caso.ejecuta('p1', { valoracion: 5, titulo: 'a', cuerpo: '', autor: 'x', fotos: [f] });
    await caso.ejecuta('p1', { valoracion: 5, titulo: 'a', cuerpo: '', autor: 'x', fotos: [] });
    expect(publica.mock.calls[0][1].fotos).toEqual([f]);
    expect(publica.mock.calls[1][1].fotos).toBeUndefined();
  });
});

describe('medidasReducidas', () => {
  it('escala por el lado mayor y no agranda', () => {
    expect(medidasReducidas(3200, 2400)).toEqual({ ancho: 1600, alto: 1200 });
    expect(medidasReducidas(800, 600)).toEqual({ ancho: 800, alto: 600 });
    expect(medidasReducidas(1, 4000)).toEqual({ ancho: 1, alto: 1600 });
  });
});
