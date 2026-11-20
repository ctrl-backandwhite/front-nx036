import { render, screen } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { exito, fallo } from '@shared/result/result';
import { creaError } from '@shared/error/app-error';
import { SesionActual } from '@core/auth/sesion-actual';
import { DialogoStore } from '@ds/component/dialogo/dialogo.store';
import { APLICACION_DEL_CATALOGO } from '../../catalog.providers';
import { RESENAS_PORT } from '../../domain/port/resenas.port';
import { MODERACION_DE_RESENAS_PORT } from '../../domain/port/moderacion-de-resenas.port';
import { REDUCTOR_DE_FOTOS_PORT } from '../../domain/port/reductor-de-fotos.port';
import { ANADIR_AL_CARRITO_PORT } from '@features/cart/domain/port/carrito-compartido.port';
import { CESTA_PORT } from '../../domain/port/cesta.port';
import { FormularioDeResena } from './formulario-de-resena';
import { SeccionResenas } from './seccion-resenas';

const CESTA_DE_OTRO_CONTEXTO = {
  provide: ANADIR_AL_CARRITO_PORT,
  useValue: { unidades: () => 0, anade: vi.fn(), abreElCajon: vi.fn() },
};
const CESTA = { provide: CESTA_PORT, useValue: { productosQueLleva: async () => exito([]) } };

function foto(nombre: string, tipo = 'image/jpeg', bytes = 10): File {
  return new File([new Uint8Array(bytes)], nombre, { type: tipo });
}

/** userEvent por defecto descarta lo que no cumple el accept: aquí se quiere probar justo eso. */
const usuario = userEvent.setup({ applyAccept: false });

describe('FormularioDeResena, fotos', () => {
  let revoca: ReturnType<typeof vi.fn>;
  let crea: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    let n = 0;
    crea = vi.fn(() => 'blob:vista-' + ++n);
    revoca = vi.fn();
    URL.createObjectURL = crea as unknown as typeof URL.createObjectURL;
    URL.revokeObjectURL = revoca as unknown as typeof URL.revokeObjectURL;
  });
  afterEach(() => vi.restoreAllMocks());

  async function monta(publica = vi.fn().mockResolvedValue(exito(undefined)), reduce = async (f: File) => f) {
    const publicada = vi.fn();
    const cierra = vi.fn();
    const vista = await render(FormularioDeResena, {
      inputs: { idDelProducto: 'p1' },
      on: { publicada, cierra },
      providers: [
        ...APLICACION_DEL_CATALOGO,
        CESTA_DE_OTRO_CONTEXTO,
        CESTA,
        { provide: RESENAS_PORT, useValue: { lista: vi.fn(), publica } },
        { provide: MODERACION_DE_RESENAS_PORT, useValue: {} },
        { provide: REDUCTOR_DE_FOTOS_PORT, useValue: { reduce } },
      ],
    });
    await vista.fixture.whenStable();
    return { vista, publica, publicada, cierra };
  }

  const campo = (c: HTMLElement) => c.querySelector<HTMLInputElement>('input[type=file]')!;
  const miniaturas = (c: HTMLElement) => c.querySelectorAll('li img');
  const enviar = (c: HTMLElement) => c.querySelector<HTMLButtonElement>('button[type=submit]')!;

  async function escribe(vista: Awaited<ReturnType<typeof monta>>['vista'], texto = 'Muy buena') {
    await usuario.type(vista.container.querySelector('textarea')!, texto);
    vista.fixture.detectChanges();
  }

  it('el selector admite JPEG, PNG y WebP, varias a la vez, y se alcanza con teclado', async () => {
    const { vista } = await monta();
    const input = campo(vista.container);
    expect(input.accept).toBe('image/jpeg,image/png,image/webp');
    expect(input.multiple).toBe(true);
    // sr-only y no hidden: hidden lo sacaría del orden de tabulación.
    expect(input.classList.contains('hidden')).toBe(false);
    expect(vista.container.querySelector('label[for=resena-fotos]')!.className).toContain('min-h-11');
  });

  it('elegir fotos las previsualiza con su contador', async () => {
    const reduce = vi.fn(async (f: File) => f);
    const { vista } = await monta(undefined, reduce);
    await usuario.upload(campo(vista.container), [foto('a.jpg'), foto('b.png', 'image/png')]);
    vista.fixture.detectChanges();
    expect(miniaturas(vista.container)).toHaveLength(2);
    expect(reduce).toHaveBeenCalledTimes(2);
    expect(vista.container.textContent).toMatch(/2\s+of\s+4/);
    expect(campo(vista.container).value).toBe('');
  });

  it('quitar una foto libera su dirección temporal', async () => {
    const { vista } = await monta();
    await usuario.upload(campo(vista.container), [foto('a.jpg'), foto('b.jpg')]);
    vista.fixture.detectChanges();
    await usuario.click(screen.getByRole('button', { name: /Remove photo 1/i }));
    vista.fixture.detectChanges();
    expect(miniaturas(vista.container)).toHaveLength(1);
    expect(revoca).toHaveBeenCalledWith('blob:vista-1');
  });

  it('con cuatro fotos no admite la quinta y lo dice', async () => {
    const { vista } = await monta();
    const cinco = ['a', 'b', 'c', 'd', 'e'].map((n) => foto(n + '.jpg'));
    await usuario.upload(campo(vista.container), cinco);
    vista.fixture.detectChanges();
    expect(miniaturas(vista.container)).toHaveLength(4);
    expect(vista.container.textContent).toContain('up to 4 photos');
    expect(campo(vista.container).disabled).toBe(true);
  });

  it('un tipo no admitido se rechaza con su mensaje', async () => {
    const { vista } = await monta();
    await usuario.upload(campo(vista.container), foto('a.gif', 'image/gif'));
    vista.fixture.detectChanges();
    expect(miniaturas(vista.container)).toHaveLength(0);
    expect(vista.container.textContent).toContain('Only JPG, PNG or WebP');
  });

  it('una foto de más de 5 MB tras reducirla se rechaza', async () => {
    const { vista } = await monta(undefined, async () => foto('grande.jpg', 'image/jpeg', 5 * 1024 * 1024 + 1));
    await usuario.upload(campo(vista.container), foto('a.jpg'));
    vista.fixture.detectChanges();
    expect(miniaturas(vista.container)).toHaveLength(0);
    expect(vista.container.textContent).toContain('over 5 MB');
  });

  it('envía con las fotos ya reducidas', async () => {
    const reducida = foto('reducida.jpg');
    const { vista, publica, publicada } = await monta(undefined, async () => reducida);
    await usuario.upload(campo(vista.container), foto('a.png', 'image/png'));
    await escribe(vista);
    await usuario.click(enviar(vista.container));
    await vista.fixture.whenStable();
    expect(publica).toHaveBeenCalledWith('p1', expect.objectContaining({ fotos: [reducida] }));
    expect(publicada).toHaveBeenCalled();
    expect(revoca).toHaveBeenCalledWith('blob:vista-1');
  });

  it('sin fotos no manda ninguna', async () => {
    const { vista, publica } = await monta();
    await escribe(vista);
    await usuario.click(enviar(vista.container));
    await vista.fixture.whenStable();
    expect(publica.mock.calls[0][1].fotos).toBeUndefined();
  });

  it('cancelar avisa a quien lo monta', async () => {
    const { vista, cierra } = await monta();
    await usuario.click(screen.getByRole('button', { name: /cancel/i }));
    expect(cierra).toHaveBeenCalled();
    expect(vista.container).toBeTruthy();
  });

  it('al destruirse libera las miniaturas', async () => {
    const { vista } = await monta();
    await usuario.upload(campo(vista.container), foto('a.jpg'));
    vista.fixture.destroy();
    expect(revoca).toHaveBeenCalledWith('blob:vista-1');
  });

  it('409: ya reseñó este producto; el envío queda apagado y no se reintenta', async () => {
    const publica = vi
      .fn()
      .mockResolvedValue(fallo(creaError('conflicto', 'x', { codigo: 'REVIEW_ALREADY_EXISTS', estado: 409 })));
    const { vista } = await monta(publica);
    await escribe(vista);
    await usuario.click(enviar(vista.container));
    await vista.fixture.whenStable();
    vista.fixture.detectChanges();
    expect(vista.container.textContent).toContain('already posted a review');
    expect(enviar(vista.container).disabled).toBe(true);
    await usuario.click(enviar(vista.container));
    expect(publica).toHaveBeenCalledTimes(1);
  });

  it('429: se cuenta con su mensaje y NO se reintenta solo', async () => {
    const publica = vi
      .fn()
      .mockResolvedValue(fallo(creaError('demasiadas-peticiones', '', { codigo: 'REVIEW_RATE_LIMITED', estado: 429 })));
    const { vista } = await monta(publica);
    await escribe(vista);
    await usuario.click(enviar(vista.container));
    await vista.fixture.whenStable();
    vista.fixture.detectChanges();
    expect(vista.container.textContent).toContain('several reviews in a row');
    expect(publica).toHaveBeenCalledTimes(1);
  });

  it('los códigos del backend de fotos tienen mensaje propio, y los demás el que llegue', async () => {
    const publica = vi
      .fn()
      .mockResolvedValueOnce(fallo(creaError('peticion-invalida', 'x', { codigo: 'REVIEW_IMAGE_INVALID' })))
      .mockResolvedValueOnce(fallo(creaError('error-del-servidor', 'Algo raro')));
    const { vista } = await monta(publica);
    await escribe(vista);
    await usuario.click(enviar(vista.container));
    await vista.fixture.whenStable();
    vista.fixture.detectChanges();
    expect(vista.container.textContent).toContain('could not be used');
    await usuario.click(enviar(vista.container));
    await vista.fixture.whenStable();
    vista.fixture.detectChanges();
    expect(vista.container.textContent).toContain('Algo raro');
  });

  it('un doble clic mientras se envía no manda dos peticiones', async () => {
    let suelta!: () => void;
    const publica = vi.fn().mockReturnValue(new Promise((r) => (suelta = () => r(exito(undefined)))));
    const { vista } = await monta(publica);
    await escribe(vista);
    const boton = enviar(vista.container);
    const formulario = vista.container.querySelector('form')!;
    formulario.dispatchEvent(new Event('submit', { cancelable: true }));
    formulario.dispatchEvent(new Event('submit', { cancelable: true }));
    vista.fixture.detectChanges();
    expect(boton.disabled).toBe(true);
    expect(publica).toHaveBeenCalledTimes(1);
    suelta();
    await vista.fixture.whenStable();
  });
});

describe('SeccionResenas, fotos y moderación', () => {
  const con2 = {
    items: [
      {
        id: 'r1',
        valoracion: 5,
        autor: 'Ana',
        idioma: 'en',
        cuerpo: 'Muy bien',
        fotos: [
          { id: 'f1', url: 'https://img/1.jpg', ancho: 800, alto: 600 },
          { id: 'f2', url: 'https://img/2.jpg', ancho: 800, alto: 600 },
        ],
      },
    ],
    total: 1,
    media: 5,
    reparto: { '5': 1 },
  };

  async function monta(rol: 'USER' | 'ADMIN') {
    const lista = vi.fn(async () => exito(con2));
    const moderacion = {
      ocultaResena: vi.fn().mockResolvedValue(exito(undefined)),
      quitaFoto: vi.fn().mockResolvedValue(exito(undefined)),
    };
    const vista = await render(SeccionResenas, {
      inputs: { idDelProducto: 'p1' },
      providers: [
        ...APLICACION_DEL_CATALOGO,
        CESTA_DE_OTRO_CONTEXTO,
        CESTA,
        { provide: RESENAS_PORT, useValue: { lista, publica: vi.fn() } },
        { provide: MODERACION_DE_RESENAS_PORT, useValue: moderacion },
        { provide: REDUCTOR_DE_FOTOS_PORT, useValue: { reduce: async (f: File) => f } },
      ],
    });
    vista.fixture.debugElement.injector
      .get(SesionActual)
      .publica({ id: 'u1', rol, nombreVisible: 'Ana', pais: 'ES' });
    await vista.fixture.whenStable();
    vista.fixture.detectChanges();
    return { vista, lista, moderacion };
  }

  it('pinta las miniaturas con carga diferida y texto alternativo', async () => {
    const { vista } = await monta('USER');
    const imagenes = vista.container.querySelectorAll<HTMLImageElement>('nx-fotos-de-resena img');
    expect(imagenes).toHaveLength(2);
    expect(imagenes[0].getAttribute('loading')).toBe('lazy');
    expect(imagenes[0].alt).toContain('Ana');
  });

  it('una reseña sin fotos, o de un backend viejo sin el campo, no pinta nada', async () => {
    const vista = await render(SeccionResenas, {
      inputs: { idDelProducto: 'p1' },
      providers: [
        ...APLICACION_DEL_CATALOGO,
        CESTA_DE_OTRO_CONTEXTO,
        CESTA,
        {
          provide: RESENAS_PORT,
          useValue: {
            lista: async () =>
              exito({ items: [{ id: 'r', valoracion: 4, idioma: 'en', cuerpo: 'Bien' }], total: 1, media: 4, reparto: { '4': 1 } }),
            publica: vi.fn(),
          },
        },
        { provide: MODERACION_DE_RESENAS_PORT, useValue: {} },
      ],
    });
    await vista.fixture.whenStable();
    vista.fixture.detectChanges();
    expect(vista.container.querySelectorAll('nx-fotos-de-resena img')).toHaveLength(0);
  });

  it('al pulsar una miniatura abre el visor y se recorre entre las fotos de esa reseña', async () => {
    const { vista } = await monta('USER');
    await userEvent.click(vista.container.querySelectorAll<HTMLElement>('nx-fotos-de-resena li > button')[0]);
    vista.fixture.detectChanges();
    const visor = () => vista.container.querySelector('nx-visor-galeria img') as HTMLImageElement;
    expect(visor().src).toContain('1.jpg');
    await userEvent.click(screen.getByRole('button', { name: /next/i }));
    vista.fixture.detectChanges();
    expect(visor().src).toContain('2.jpg');
    await userEvent.click(screen.getByRole('button', { name: /next/i }));
    vista.fixture.detectChanges();
    expect(visor().src).toContain('1.jpg');
    await userEvent.click(screen.getByRole('button', { name: /previous|prev/i }));
    vista.fixture.detectChanges();
    expect(visor().src).toContain('2.jpg');
    await userEvent.click(screen.getByRole('button', { name: /close/i }));
    vista.fixture.detectChanges();
    expect(vista.container.querySelector('nx-visor-galeria')).toBeNull();
  });

  it('quien compra no ve las acciones de moderación', async () => {
    const { vista } = await monta('USER');
    expect(vista.container.textContent).not.toContain('Hide review');
    expect(screen.queryByRole('button', { name: /Remove photo/i })).toBeNull();
  });

  it('quien administra oculta la reseña tras confirmar y la lista se recarga', async () => {
    const { vista, lista, moderacion } = await monta('ADMIN');
    const dialogo = vista.fixture.debugElement.injector.get(DialogoStore);
    vi.spyOn(dialogo, 'confirma').mockResolvedValue(true);
    await userEvent.click(screen.getByRole('button', { name: 'Hide review' }));
    await vista.fixture.whenStable();
    expect(moderacion.ocultaResena).toHaveBeenCalledWith('r1');
    expect(lista).toHaveBeenCalledTimes(2);
  });

  it('si no confirma no se hace nada', async () => {
    const { vista, moderacion } = await monta('ADMIN');
    vi.spyOn(vista.fixture.debugElement.injector.get(DialogoStore), 'confirma').mockResolvedValue(false);
    await userEvent.click(screen.getByRole('button', { name: 'Hide review' }));
    await userEvent.click(screen.getByRole('button', { name: /Remove photo 1/i }));
    expect(moderacion.ocultaResena).not.toHaveBeenCalled();
    expect(moderacion.quitaFoto).not.toHaveBeenCalled();
  });

  it('quien administra quita una foto tras confirmar y la lista se recarga', async () => {
    const { vista, lista, moderacion } = await monta('ADMIN');
    vi.spyOn(vista.fixture.debugElement.injector.get(DialogoStore), 'confirma').mockResolvedValue(true);
    await userEvent.click(screen.getByRole('button', { name: /Remove photo 2/i }));
    await vista.fixture.whenStable();
    expect(moderacion.quitaFoto).toHaveBeenCalledWith('r1', 'f2');
    expect(lista).toHaveBeenCalledTimes(2);
  });

  it('un fallo de moderación se cuenta y no recarga', async () => {
    const { vista, lista, moderacion } = await monta('ADMIN');
    moderacion.ocultaResena.mockResolvedValue(fallo(creaError('sin-permiso', 'No')));
    moderacion.quitaFoto.mockResolvedValue(fallo(creaError('sin-permiso', 'No')));
    vi.spyOn(vista.fixture.debugElement.injector.get(DialogoStore), 'confirma').mockResolvedValue(true);
    await userEvent.click(screen.getByRole('button', { name: 'Hide review' }));
    await userEvent.click(screen.getByRole('button', { name: /Remove photo 1/i }));
    await vista.fixture.whenStable();
    expect(moderacion.ocultaResena).toHaveBeenCalled();
    expect(moderacion.quitaFoto).toHaveBeenCalled();
    expect(lista).toHaveBeenCalledTimes(1);
  });

  it('publicar desde el formulario cierra y recarga la lista', async () => {
    const { vista, lista } = await monta('USER');
    await userEvent.click(vista.container.querySelector<HTMLElement>('button.btn-outline')!);
    vista.fixture.detectChanges();
    expect(vista.container.querySelector('nx-formulario-de-resena')).not.toBeNull();
    const publicada = vista.fixture.debugElement.query((d) => d.name === 'nx-formulario-de-resena');
    publicada.componentInstance.publicada.emit();
    vista.fixture.detectChanges();
    await vista.fixture.whenStable();
    expect(vista.container.querySelector('nx-formulario-de-resena')).toBeNull();
    expect(lista).toHaveBeenCalledTimes(2);
  });
});
