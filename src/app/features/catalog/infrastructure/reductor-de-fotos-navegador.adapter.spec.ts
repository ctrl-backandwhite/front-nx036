import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Plataforma } from '@core/platform/plataforma';
import { ReductorDeFotosNavegadorAdapter } from './reductor-de-fotos-navegador.adapter';

describe('ReductorDeFotosNavegadorAdapter', () => {
  const original = new File([new Uint8Array(1000)], 'movil.heic.png', { type: 'image/png' });
  let contexto: { fillStyle: string; fillRect: ReturnType<typeof vi.fn>; drawImage: ReturnType<typeof vi.fn> } | null;
  let lienzo: { width: number; height: number; getContext: () => unknown; toBlob: unknown };
  let blobDeSalida: Blob | null;
  let toBlob: ReturnType<typeof vi.fn>;

  function monta(documento: unknown) {
    TestBed.configureTestingModule({
      providers: [
        ReductorDeFotosNavegadorAdapter,
        { provide: Plataforma, useValue: { documentoSiLoHay: documento } },
      ],
    });
    return TestBed.inject(ReductorDeFotosNavegadorAdapter);
  }
  const doc = () => ({ createElement: () => lienzo });

  beforeEach(() => {
    contexto = { fillStyle: '', fillRect: vi.fn(), drawImage: vi.fn() };
    blobDeSalida = new Blob([new Uint8Array(200)], { type: 'image/jpeg' });
    toBlob = vi.fn((cb: (b: Blob | null) => void) => cb(blobDeSalida));
    lienzo = { width: 0, height: 0, getContext: () => contexto, toBlob };
    vi.stubGlobal('createImageBitmap', vi.fn(async () => ({ width: 3200, height: 2400, close: vi.fn() })));
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    TestBed.resetTestingModule();
  });

  it('en el servidor devuelve el original', async () => {
    expect(await monta(null).reduce(original)).toBe(original);
  });

  it('sin createImageBitmap devuelve el original', async () => {
    vi.stubGlobal('createImageBitmap', undefined);
    expect(await monta(doc()).reduce(original)).toBe(original);
  });

  it('escala a 1600 de lado mayor y sale como JPEG con calidad 0,85', async () => {
    const salida = await monta(doc()).reduce(original);
    expect(lienzo.width).toBe(1600);
    expect(lienzo.height).toBe(1200);
    expect(toBlob).toHaveBeenCalledWith(expect.any(Function), 'image/jpeg', 0.85);
    expect(salida.type).toBe('image/jpeg');
    expect(salida.name).toBe('movil.heic.jpg');
    expect(contexto!.fillStyle).toBe('#ffffff');
  });

  it('si no hizo falta escalar y no adelgaza, deja el original', async () => {
    vi.stubGlobal('createImageBitmap', vi.fn(async () => ({ width: 800, height: 600, close: vi.fn() })));
    blobDeSalida = new Blob([new Uint8Array(5000)], { type: 'image/jpeg' });
    expect(await monta(doc()).reduce(original)).toBe(original);
  });

  it('si no se puede decodificar, devuelve el original', async () => {
    vi.stubGlobal('createImageBitmap', vi.fn().mockRejectedValue(new Error('formato')));
    expect(await monta(doc()).reduce(original)).toBe(original);
  });

  it('sin contexto de dibujo o sin blob, devuelve el original', async () => {
    contexto = null;
    expect(await monta(doc()).reduce(original)).toBe(original);
    TestBed.resetTestingModule();
    contexto = { fillStyle: '', fillRect: vi.fn(), drawImage: vi.fn() };
    blobDeSalida = null;
    expect(await monta(doc()).reduce(original)).toBe(original);
  });

  it('una foto sin nombre con extensión sale como foto.jpg', async () => {
    const sin = new File([new Uint8Array(1000)], '', { type: 'image/png' });
    expect((await monta(doc()).reduce(sin)).name).toBe('foto.jpg');
  });
});
