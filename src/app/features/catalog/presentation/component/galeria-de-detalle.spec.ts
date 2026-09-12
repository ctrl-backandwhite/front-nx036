import { render, screen } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ImagenDeProducto } from '../../domain/model/producto';
import { GaleriaDeDetalle } from './galeria-de-detalle';

const FOTOS: ImagenDeProducto[] = [
  { id: 'a', direccion: 'a.jpg', posicion: 8, papel: 'DETAIL' },
  { id: 'b', direccion: 'b.jpg', posicion: 9, papel: 'DETAIL' },
  { id: 'c', direccion: 'c.jpg', posicion: 10, papel: 'DETAIL' },
];

/**
 * Solo los botones de MINIATURA. No vale con coger todos los botones del elemento de lista: con
 * permiso de edición cada uno lleva además su papelera, y contarlos todos daba el doble.
 */
function miniaturas(raiz: HTMLElement): HTMLElement[] {
  return [
    ...raiz.querySelectorAll<HTMLElement>('[role="listitem"] > button.w-\\[120px\\]'),
  ];
}

function visorAbierto(): HTMLElement | null {
  return document.querySelector('[role="dialog"]');
}

/**
 * La barra de lote se busca por ESTRUCTURA y no por su texto: los rótulos salen del diccionario y en
 * las pruebas `t()` devuelve la clave, no la palabra. Es la misma convención que galeria-ficha.spec.
 */
function botonDeBorrarLote(raiz: HTMLElement): HTMLElement | null {
  return raiz.querySelector<HTMLElement>('button.btn-error:not(.btn-circle)');
}

/**
 * Simula coger una miniatura y soltarla sobre otra. `userEvent` no cubre arrastrar y soltar, así que
 * se despachan los tres sucesos que escucha el componente, igual que en la galería principal.
 */
function arrastra(desde: HTMLElement, hasta: HTMLElement): void {
  desde.dispatchEvent(new Event('dragstart', { bubbles: true }));
  hasta.dispatchEvent(new Event('dragover', { bubbles: true, cancelable: true }));
  hasta.dispatchEvent(new Event('drop', { bubbles: true }));
}

describe('GaleriaDeDetalle', () => {
  it('enseña una miniatura por cada foto de la descripción', async () => {
    const { container } = await render(GaleriaDeDetalle, {
      inputs: { fotos: FOTOS, titulo: 'Vestido' },
    });

    expect(miniaturas(container)).toHaveLength(3);
  });

  /**
   * Lo que se rompería en producción si esta prueba fallara: la tarjeta de detalles volvería a
   * enseñar las fotos a tamaño completo, una debajo de otra, empujando hacia abajo la conformidad
   * del producto y las recomendaciones. Es exactamente el defecto que hizo nacer este componente.
   */
  it('las fotos se enseñan pequeñas: no hay ninguna imagen a tamaño completo en la tira', async () => {
    const { container } = await render(GaleriaDeDetalle, {
      inputs: { fotos: FOTOS, titulo: 'Vestido' },
    });

    expect(visorAbierto()).toBeNull();
    for (const boton of miniaturas(container)) {
      expect(boton.className).toContain('w-[120px]');
    }
  });

  it('al pulsar una miniatura se abre la ventana emergente con esa foto', async () => {
    const { container } = await render(GaleriaDeDetalle, {
      inputs: { fotos: FOTOS, titulo: 'Vestido' },
    });

    await userEvent.click(miniaturas(container)[1]);

    const visor = visorAbierto();
    expect(visor).not.toBeNull();
    expect(visor?.querySelector('img')).toHaveAttribute('src', 'b.jpg');
  });

  it('sin permiso de edición no hay papeleras ni casillas', async () => {
    const { container } = await render(GaleriaDeDetalle, {
      inputs: { fotos: FOTOS, titulo: 'Vestido', puedeEditar: false },
    });

    // Con permiso habría seis botones —miniatura y papelera por foto— y tres casillas.
    expect(container.querySelectorAll('[role="listitem"] button')).toHaveLength(3);
    expect(container.querySelectorAll('input[type="checkbox"]')).toHaveLength(0);
  });

  it('con permiso de edición, la papelera avisa de QUÉ foto se quita', async () => {
    const borra = vi.fn();
    const { container } = await render(GaleriaDeDetalle, {
      inputs: { fotos: FOTOS, titulo: 'Vestido', puedeEditar: true },
      on: { borra },
    });

    await userEvent.click(screen.getByLabelText('Quitar la imagen 3 del detalle'));

    expect(borra).toHaveBeenCalledWith('c');
    expect(miniaturas(container)).toHaveLength(3);
  });

  /**
   * Da la vuelta a propósito. Con la flecha muerta en el último, quien está pasando carteles cree que
   * la ventana se ha colgado: no hay nada que indique que ha llegado al final.
   */
  it('pasar del último vuelve al primero', async () => {
    const { container } = await render(GaleriaDeDetalle, {
      inputs: { fotos: FOTOS, titulo: 'Vestido' },
    });
    await userEvent.click(miniaturas(container)[2]);

    await userEvent.keyboard('{ArrowRight}');

    expect(visorAbierto()?.querySelector('img')).toHaveAttribute('src', 'a.jpg');
  });

  it('un producto sin fotos de descripción no pinta ninguna miniatura', async () => {
    // Lo normal en casi todo el catálogo: solo lo cargado desde el 12-sep-2026 las trae.
    const { container } = await render(GaleriaDeDetalle, {
      inputs: { fotos: [], titulo: 'Vestido' },
    });

    expect(miniaturas(container)).toHaveLength(0);
  });

  /**
   * Lo que se rompería en producción: volver a la situación de antes, en la que limpiar la
   * descripción de un proveedor —tres o cuatro carteles de cada cuatro imágenes— eran tantos gestos
   * y tantas preguntas de confirmación como fotos.
   */
  it('se pueden marcar varias y quitarlas de una vez', async () => {
    const borraSeleccion = vi.fn();
    const { container } = await render(GaleriaDeDetalle, {
      inputs: { fotos: FOTOS, titulo: 'Vestido', puedeEditar: true },
      on: { borraSeleccion },
    });
    const casillas = container.querySelectorAll<HTMLInputElement>('input[type="checkbox"]');

    await userEvent.click(casillas[0]);
    await userEvent.click(casillas[2]);
    await userEvent.click(botonDeBorrarLote(container)!);

    expect(borraSeleccion).toHaveBeenCalledWith(['a', 'c']);
  });

  it('la barra de lote solo aparece cuando hay algo marcado', async () => {
    const { container } = await render(GaleriaDeDetalle, {
      inputs: { fotos: FOTOS, titulo: 'Vestido', puedeEditar: true },
    });
    expect(botonDeBorrarLote(container)).toBeNull();

    await userEvent.click(container.querySelector<HTMLInputElement>('input[type="checkbox"]')!);

    expect(botonDeBorrarLote(container)).not.toBeNull();
  });

  /**
   * Lo que se rompería en producción si esta prueba fallara: quien administra tendría que entrar al
   * panel para cambiar el orden de los carteles de la descripción, mientras que las fotos del
   * producto se reordenan arrastrando desde la propia ficha. Es la asimetría que el dueño señaló.
   */
  it('arrastrar una miniatura sobre otra avisa del nuevo orden', async () => {
    const reordena = vi.fn();
    const { container } = await render(GaleriaDeDetalle, {
      inputs: { fotos: FOTOS, titulo: 'Vestido', puedeEditar: true },
      on: { reordena },
    });
    const celdas = [...container.querySelectorAll<HTMLElement>('[role="listitem"]')];

    arrastra(celdas[2], celdas[0]);

    expect(reordena).toHaveBeenCalledWith(['c', 'a', 'b']);
  });

  /** Sin permiso no se arrastra nada: el atributo ni siquiera está puesto. */
  it('sin permiso de edición las miniaturas no son arrastrables', async () => {
    const reordena = vi.fn();
    const { container } = await render(GaleriaDeDetalle, {
      inputs: { fotos: FOTOS, titulo: 'Vestido', puedeEditar: false },
      on: { reordena },
    });
    const celdas = [...container.querySelectorAll<HTMLElement>('[role="listitem"]')];

    expect(celdas[0].getAttribute('draggable')).toBeNull();

    arrastra(celdas[2], celdas[0]);

    expect(reordena).not.toHaveBeenCalled();
  });

  /** Soltar donde se cogió no es un cambio: emitir ahí guardaría por nada en cada clic fallido. */
  it('soltar en el mismo sitio no avisa de nada', async () => {
    const reordena = vi.fn();
    const { container } = await render(GaleriaDeDetalle, {
      inputs: { fotos: FOTOS, titulo: 'Vestido', puedeEditar: true },
      on: { reordena },
    });
    const celdas = [...container.querySelectorAll<HTMLElement>('[role="listitem"]')];

    arrastra(celdas[1], celdas[1]);

    expect(reordena).not.toHaveBeenCalled();
  });
});
