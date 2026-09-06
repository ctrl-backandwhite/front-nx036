import { TestBed } from '@angular/core/testing';
import { render, screen } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { exito, fallo } from '@shared/result/result';
import { creaError } from '@shared/error/app-error';
import { AvisosStore } from '@ds/component/avisos/avisos.store';
import { DialogoStore } from '@ds/component/dialogo/dialogo.store';
import { EDICION_DE_FICHA_PORT } from '../../domain/port/edicion-de-ficha.port';
import { FichaDeProducto } from '../../domain/model/producto';
import { AccionesDeAdmin } from '../acciones-de-admin';
import { PanelDeOrigen } from './admin/panel-de-origen';
import { DesgloseEditable } from './admin/desglose-editable';
import { FotosDeVariante } from './admin/fotos-de-variante';

function ficha(cambios: Partial<FichaDeProducto> = {}): FichaDeProducto {
  return {
    id: 'p1',
    slug: 'gorro',
    titulo: 'Gorro',
    ventasMensuales: 0,
    estado: 'ACTIVE',
    precio: {},
    arancel: { centimosExtra: null, cubierto: false },
    etiquetas: [],
    origen: '1688',
    idExterno: 'EXT-1',
    moq: 1,
    numeroDeResenas: 0,
    imagenes: [],
    variantes: [],
    ejesDeVariante: [],
    tramosDePrecio: [],
    especificaciones: [],
    atributos: {},
    ...cambios,
  };
}

describe('PanelDeOrigen', () => {
  async function monta(puerto: Record<string, unknown>, entrada = ficha()) {
    const cambiada = vi.fn();
    const borrada = vi.fn();
    const vista = await render(PanelDeOrigen, {
      inputs: { ficha: entrada },
      on: { cambiada, borrada },
      providers: [{ provide: EDICION_DE_FICHA_PORT, useValue: puerto }],
    });
    return { vista, cambiada, borrada };
  }

  it('enseña de dónde salió el producto y su código externo', async () => {
    await monta({});
    expect(screen.getByText('EXT-1')).toBeInTheDocument();
  });

  it('marcar como revisado avisa y recarga la ficha', async () => {
    const marcaVerificado = vi.fn().mockResolvedValue(exito(undefined));
    const { vista, cambiada } = await monta({ marcaVerificado });
    await userEvent.click(vista.container.querySelector<HTMLElement>('input[type=checkbox]')!);
    await vista.fixture.whenStable();
    expect(marcaVerificado).toHaveBeenCalledWith('p1', true);
    expect(cambiada).toHaveBeenCalled();
  });

  it('un fallo al guardar se cuenta', async () => {
    const marcaVerificado = vi.fn().mockResolvedValue(fallo(creaError('sin-permiso', 'no puedes')));
    const { vista, cambiada } = await monta({ marcaVerificado });
    await userEvent.click(vista.container.querySelector<HTMLElement>('input[type=checkbox]')!);
    await vista.fixture.whenStable();
    expect(cambiada).not.toHaveBeenCalled();
    expect(vista.fixture.debugElement.injector.get(AvisosStore).avisos()[0].tipo).toBe('error');
  });

  /** Borrar un producto entero no puede pasar por un descuido. */
  it('borrar el producto exige confirmación', async () => {
    const borraProducto = vi.fn().mockResolvedValue(exito(undefined));
    const { vista, borrada } = await monta({ borraProducto });
    const dialogo = vista.fixture.debugElement.injector.get(DialogoStore);
    const botones = [...vista.container.querySelectorAll<HTMLElement>('button')];
    await userEvent.click(botones.at(-1)!);
    expect(dialogo.actual()).not.toBeNull();
    dialogo.cierra(true);
    // La confirmación se resuelve por promesa: hay que dejar correr la cola antes de comprobar.
    await new Promise((sigue) => setTimeout(sigue, 0));
    await vista.fixture.whenStable();
    expect(borraProducto).toHaveBeenCalledWith('p1');
    expect(borrada).toHaveBeenCalled();
  });
});

describe('DesgloseEditable', () => {
  async function monta(guarda = vi.fn().mockResolvedValue(exito(undefined))) {
    const cambiado = vi.fn();
    const vista = await render(DesgloseEditable, {
      inputs: {
        idDelProducto: 'p1',
        total: '12,00 €',
        desglose: {
          baseFormateado: '8,00 €',
          ivaFormateado: '2,00 €',
          recargoFormateado: '1,00 €',
          recargoCny: 7.5,
          subsidioDeEnvioFormateado: '1,00 €',
          subsidioDeEnvioCny: 7,
        },
      },
      on: { cambiado },
      providers: [{ provide: EDICION_DE_FICHA_PORT, useValue: { guardaImporteEnYuanes: guarda } }],
    });
    return { vista, guarda, cambiado };
  }

  it('enseña los conceptos y el total', async () => {
    const { vista } = await monta();
    expect(vista.container.textContent).toContain('8,00 €');
    expect(vista.container.textContent).toContain('12,00 €');
  });

  /** Se manda SOLO el campo que se toca: enviar los tres pisaría la otra bolsa de subsidio. */
  it('el doble clic edita un importe y guarda solo ese campo', async () => {
    const { vista, guarda, cambiado } = await monta();
    const filas = [...vista.container.querySelectorAll<HTMLElement>('.cursor-pointer')];
    await userEvent.dblClick(filas[0]);
    vista.fixture.detectChanges();
    const campo = vista.container.querySelector<HTMLInputElement>('input[type=number]')!;
    await userEvent.clear(campo);
    await userEvent.type(campo, '9.5{enter}');
    await vista.fixture.whenStable();
    expect(guarda).toHaveBeenCalledWith('p1', 'surchargeCny', 9.5);
    expect(cambiado).toHaveBeenCalled();
  });

  /** Un subsidio en negativo cobraría de más: no se manda. */
  it('un importe imposible no llega al servidor', async () => {
    const { vista, guarda } = await monta();
    const filas = [...vista.container.querySelectorAll<HTMLElement>('.cursor-pointer')];
    await userEvent.dblClick(filas[0]);
    vista.fixture.detectChanges();
    const campo = vista.container.querySelector<HTMLInputElement>('input[type=number]')!;
    await userEvent.clear(campo);
    await userEvent.type(campo, '-3{enter}');
    await vista.fixture.whenStable();
    expect(guarda).not.toHaveBeenCalled();
  });
});

describe('FotosDeVariante', () => {
  const conColores = ficha({
    imagenes: [{ id: 'i1', direccion: 'https://cdn/O1CN01aaa.jpg', posicion: 0, papel: 'MAIN' }],
    ejesDeVariante: [
      {
        id: 'color',
        nombreZh: '颜色',
        nombre: 'Color',
        posicion: 0,
        valores: [
          { id: 'v1', valorZh: '黑色', valor: 'Negro', imagen: 'https://cdn/O1CN01aaa.cib.jpg', posicion: 0 },
          { id: 'v2', valorZh: '红色', valor: 'Rojo', imagen: 'https://cdn/O1CN01bbb.jpg', posicion: 1 },
        ],
      },
    ],
  });

  /** Solo las que FALTAN: ofrecer una que ya está solo lleva a duplicarla. */
  it('ofrece únicamente las fotos que no están ya en la galería', async () => {
    const vista = await render(FotosDeVariante, { inputs: { ficha: conColores } });
    const fotos = vista.container.querySelectorAll('img');
    expect(fotos).toHaveLength(1);
    expect(fotos[0]).toHaveAttribute('src', 'https://cdn/O1CN01bbb.jpg');
  });

  it('sin fotos pendientes no ocupa sitio', async () => {
    const vista = await render(FotosDeVariante, { inputs: { ficha: ficha() } });
    expect(vista.container.textContent?.trim()).toBe('');
  });
});

describe('AccionesDeAdmin', () => {
  /** Cada gesto sigue el mismo guion: confirmar, ejecutar, avisar y recargar. */
  it('sin confirmar no se borra nada', async () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [AccionesDeAdmin, { provide: EDICION_DE_FICHA_PORT, useValue: {} }],
    });
    const acciones = TestBed.inject(AccionesDeAdmin);
    const alTerminar = vi.fn();
    const gesto = acciones.borraImagen('i1', alTerminar);
    await new Promise((sigue) => setTimeout(sigue, 0));
    TestBed.inject(DialogoStore).cierra(false);
    await gesto;
    expect(alTerminar).not.toHaveBeenCalled();
  });

  it('al confirmar, borra y recarga', async () => {
    const borraImagen = vi.fn().mockResolvedValue(exito(undefined));
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [AccionesDeAdmin, { provide: EDICION_DE_FICHA_PORT, useValue: { borraImagen } }],
    });
    const acciones = TestBed.inject(AccionesDeAdmin);
    const alTerminar = vi.fn();
    const gesto = acciones.borraImagen('i1', alTerminar);
    await new Promise((sigue) => setTimeout(sigue, 0));
    TestBed.inject(DialogoStore).cierra(true);
    await gesto;
    expect(borraImagen).toHaveBeenCalledWith('i1');
    expect(alTerminar).toHaveBeenCalled();
  });

  it('reordenar no pide confirmación: se ve al vuelo', async () => {
    const reordenaImagenes = vi.fn().mockResolvedValue(exito(undefined));
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        AccionesDeAdmin,
        { provide: EDICION_DE_FICHA_PORT, useValue: { reordenaImagenes } },
      ],
    });
    const alTerminar = vi.fn();
    await TestBed.inject(AccionesDeAdmin).reordena('p1', ['b', 'a'], alTerminar);
    expect(reordenaImagenes).toHaveBeenCalledWith('p1', ['b', 'a']);
    expect(alTerminar).toHaveBeenCalled();
  });

  it('copiar una foto de variante avisa del resultado', async () => {
    const anadeImagen = vi.fn().mockResolvedValue(fallo(creaError('conflicto', 'ya está')));
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [AccionesDeAdmin, { provide: EDICION_DE_FICHA_PORT, useValue: { anadeImagen } }],
    });
    const alTerminar = vi.fn();
    await TestBed.inject(AccionesDeAdmin).copiaFotoDeVariante('p1', 'foto.jpg', alTerminar);
    expect(alTerminar).not.toHaveBeenCalled();
    expect(TestBed.inject(AvisosStore).avisos()[0].tipo).toBe('error');
  });
});
