import { render, screen } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ImagenDeProducto } from '../../domain/model/producto';
import { GaleriaFicha } from './galeria-ficha';

const FOTOS: ImagenDeProducto[] = [
  { id: 'a', direccion: 'a.jpg', posicion: 0, papel: 'MAIN' },
  { id: 'b', direccion: 'b.jpg', posicion: 1, papel: 'GALLERY' },
  { id: 'c', direccion: 'c.jpg', posicion: 2, papel: 'GALLERY' },
];

/**
 * Los rótulos salen del diccionario y cambian con el idioma, así que las pruebas buscan por ESTRUCTURA
 * y no por texto: lo que hay que asegurar es el comportamiento, no la traducción.
 */
function miniaturas(raiz: HTMLElement): HTMLElement[] {
  return [...raiz.querySelectorAll<HTMLElement>('[data-tira-miniaturas] > div > button')];
}

/** jsdom no trae `DragEvent`: se finge con un evento normal, que es lo que la plantilla escucha. */
function arrastre(nombre: string): Event {
  return new Event(nombre, { bubbles: true, cancelable: true });
}

describe('GaleriaFicha', () => {
  it('enseña la foto activa en grande', async () => {
    await render(GaleriaFicha, { inputs: { fotos: FOTOS, titulo: 'Gorro', activa: 1 } });
    expect(screen.getByAltText('Gorro')).toHaveAttribute('src', 'b.jpg');
  });

  /**
   * Cuando el color elegido no tiene miniatura propia, su foto manda como principal SIN meterla en la
   * tira: la galería es del producto, y una foto de variante en medio confunde.
   */
  it('la foto del color manda sobre la de la galería', async () => {
    await render(GaleriaFicha, {
      inputs: { fotos: FOTOS, titulo: 'Gorro', activa: 0, fotoDeVariante: 'color.jpg' },
    });
    expect(screen.getByAltText('Gorro')).toHaveAttribute('src', 'color.jpg');
  });

  it('pulsar una miniatura cambia la foto y corta el pase automático', async () => {
    const interactua = vi.fn();
    const vista = await render(GaleriaFicha, {
      inputs: { fotos: FOTOS, titulo: 'Gorro', activa: 0 },
      on: { interactua },
    });
    await userEvent.click(miniaturas(vista.container)[2]);
    vista.fixture.detectChanges();
    expect(interactua).toHaveBeenCalled();
    expect(screen.getByAltText('Gorro')).toHaveAttribute('src', 'c.jpg');
  });

  it('sin fotos no deja un hueco: lo dice', async () => {
    const vista = await render(GaleriaFicha, {
      inputs: { fotos: [], titulo: 'Gorro', activa: 0 },
    });
    expect(vista.container.querySelector('img')).toBeNull();
    expect(vista.container.textContent?.trim().length).toBeGreaterThan(0);
  });

  /** Ni las papeleras ni el reordenado deben existir para quien solo mira. */
  it('sin permiso de edición no hay papeleras', async () => {
    const vista = await render(GaleriaFicha, {
      inputs: { fotos: FOTOS, titulo: 'Gorro', activa: 0 },
    });
    expect(vista.container.querySelectorAll('.bg-error')).toHaveLength(0);
  });

  it('el administrador puede borrar una foto', async () => {
    const borraImagen = vi.fn();
    const vista = await render(GaleriaFicha, {
      inputs: { fotos: FOTOS, titulo: 'Gorro', activa: 0, puedeEditar: true },
      on: { borraImagen },
    });
    const papeleras = vista.container.querySelectorAll<HTMLElement>('.bg-error');
    await userEvent.click(papeleras[0]);
    vista.fixture.detectChanges();
    expect(borraImagen).toHaveBeenCalledWith('a');
  });

  it('el vídeo sustituye a la foto y se reproduce mudo', async () => {
    const vista = await render(GaleriaFicha, {
      inputs: { fotos: FOTOS, titulo: 'Gorro', activa: 0, urlDelVideo: 'v.mp4' },
    });
    const botonDelVideo = vista.container.querySelector<HTMLElement>('button:has(video)');
    await userEvent.click(botonDelVideo!);
    vista.fixture.detectChanges();
    const reproductor = vista.container.querySelector<HTMLVideoElement>('video[controls]');
    expect(reproductor).not.toBeNull();

    /* Se mira la PROPIEDAD, no el atributo, y la diferencia no es teórica: así estaba antes y por eso
     * esta prueba daba verde mientras los vídeos sonaban. Angular escribe `muted` como atributo, y el
     * navegador solo lo consulta al crear el elemento; como la dirección llega por enlace, para
     * entonces ya es tarde. Medido en el navegador: atributo puesto, `video.muted` en false y el
     * volumen al máximo. Lo que hay que certificar es que no suena, no que la palabra esté escrita. */
    expect(reproductor?.muted, 'el vídeo NO está mudo').toBe(true);
    expect(reproductor?.volume, 'el vídeo conserva volumen').toBe(0);
  });

  it('con una sola foto no ofrece flechas ni contador', async () => {
    const vista = await render(GaleriaFicha, {
      inputs: { fotos: [FOTOS[0]], titulo: 'Gorro', activa: 0 },
    });
    expect(vista.container.textContent).not.toContain('1 / 1');
  });

  /** En una pantalla táctil no hay flechas: se pasa deslizando, que es el gesto que ya se espera. */
  it('se pasa de foto deslizando', async () => {
    const vista = await render(GaleriaFicha, {
      inputs: { fotos: FOTOS, titulo: 'Gorro', activa: 0 },
    });
    const zona = vista.container.querySelector<HTMLElement>('.relative.flex-1')!;
    zona.dispatchEvent(
      new TouchEvent('touchstart', { touches: [{ clientX: 200 } as unknown as Touch] }),
    );
    zona.dispatchEvent(
      new TouchEvent('touchend', { changedTouches: [{ clientX: 100 } as unknown as Touch] }),
    );
    vista.fixture.detectChanges();
    expect(screen.getByAltText('Gorro')).toHaveAttribute('src', 'b.jpg');
  });

  /** Un roce corto suele ser un desplazamiento vertical, no un gesto de pasar. */
  it('un roce corto no cambia la foto', async () => {
    const vista = await render(GaleriaFicha, {
      inputs: { fotos: FOTOS, titulo: 'Gorro', activa: 0 },
    });
    const zona = vista.container.querySelector<HTMLElement>('.relative.flex-1')!;
    zona.dispatchEvent(
      new TouchEvent('touchstart', { touches: [{ clientX: 200 } as unknown as Touch] }),
    );
    zona.dispatchEvent(
      new TouchEvent('touchend', { changedTouches: [{ clientX: 185 } as unknown as Touch] }),
    );
    vista.fixture.detectChanges();
    expect(screen.getByAltText('Gorro')).toHaveAttribute('src', 'a.jpg');
  });

  it('los puntos del móvil saltan a su foto', async () => {
    const vista = await render(GaleriaFicha, {
      inputs: { fotos: FOTOS, titulo: 'Gorro', activa: 0 },
    });
    const puntos = [...vista.container.querySelectorAll<HTMLElement>('.sm\\:hidden button')];
    await userEvent.click(puntos[2]);
    vista.fixture.detectChanges();
    expect(screen.getByAltText('Gorro')).toHaveAttribute('src', 'c.jpg');
  });

  /** Reordenar deja la PRIMERA como imagen principal del producto. */
  it('el administrador reordena arrastrando una miniatura', async () => {
    const reordena = vi.fn();
    const vista = await render(GaleriaFicha, {
      inputs: { fotos: FOTOS, titulo: 'Gorro', activa: 0, puedeEditar: true },
      on: { reordena },
    });
    const celdas = [...vista.container.querySelectorAll<HTMLElement>('.cursor-move')];
    celdas[2].dispatchEvent(arrastre('dragstart'));
    celdas[0].dispatchEvent(arrastre('dragover'));
    celdas[0].dispatchEvent(arrastre('drop'));
    vista.fixture.detectChanges();
    expect(reordena).toHaveBeenCalledWith(['c', 'a', 'b']);
  });

  it('sin permiso, arrastrar no reordena nada', async () => {
    const reordena = vi.fn();
    const vista = await render(GaleriaFicha, {
      inputs: { fotos: FOTOS, titulo: 'Gorro', activa: 0 },
      on: { reordena },
    });
    const celdas = [...vista.container.querySelectorAll<HTMLElement>('[data-tira-miniaturas] > div')];
    celdas[2].dispatchEvent(arrastre('dragstart'));
    celdas[0].dispatchEvent(arrastre('drop'));
    vista.fixture.detectChanges();
    expect(reordena).not.toHaveBeenCalled();
  });

  /** Los clips del proveedor llegan con música o locución: aquí solo son demostración visual. */
  it('el vídeo se vuelve a silenciar si alguien sube el volumen', async () => {
    const vista = await render(GaleriaFicha, {
      inputs: { fotos: FOTOS, titulo: 'Gorro', activa: 0, urlDelVideo: 'v.mp4' },
    });
    await userEvent.click(vista.container.querySelector<HTMLElement>('button:has(video)')!);
    vista.fixture.detectChanges();
    const reproductor = vista.container.querySelector<HTMLVideoElement>('video[controls]')!;
    reproductor.muted = false;
    reproductor.dispatchEvent(new Event('volumechange'));
    expect(reproductor.muted).toBe(true);
  });

  it('el administrador puede quitar el vídeo', async () => {
    const borraVideo = vi.fn();
    const vista = await render(GaleriaFicha, {
      inputs: { fotos: FOTOS, titulo: 'Gorro', activa: 0, urlDelVideo: 'v.mp4', puedeEditar: true },
      on: { borraVideo },
    });
    await userEvent.click(vista.container.querySelectorAll<HTMLElement>('.bg-error')[0]);
    vista.fixture.detectChanges();
    expect(borraVideo).toHaveBeenCalled();
  });

  it('ampliar la foto abre el visor a pantalla completa', async () => {
    const vista = await render(GaleriaFicha, {
      inputs: { fotos: FOTOS, titulo: 'Gorro', activa: 0 },
    });
    await userEvent.click(vista.container.querySelector<HTMLElement>('.cursor-zoom-in')!);
    vista.fixture.detectChanges();
    expect(vista.container.querySelector('[role=dialog]')).not.toBeNull();
  });

  /**
   * Mientras el pase corre el fundido es largo —es decorativo—; en cuanto manda quien mira, el cambio
   * tiene que ser inmediato: un fundido largo tras pulsar se percibe como que la web va lenta.
   */
  it('el fundido es largo durante el pase e inmediato después', async () => {
    const vista = await render(GaleriaFicha, {
      inputs: { fotos: FOTOS, titulo: 'Gorro', activa: 0, pasePasando: true },
    });
    expect(screen.getByAltText('Gorro').className).toContain('animate-fade-gallery');

    await vista.rerender({
      inputs: { fotos: FOTOS, titulo: 'Gorro', activa: 0, pasePasando: false },
    });
    expect(screen.getByAltText('Gorro').className).toContain('animate-fade-gallery-fast');
  });

  it('el contador dice en qué foto se está', async () => {
    const vista = await render(GaleriaFicha, {
      inputs: { fotos: FOTOS, titulo: 'Gorro', activa: 1 },
    });
    expect(vista.container.textContent).toContain('2 / 3');
  });

  /**
   * BORRADO EN LOTE, solo para quien administra.
   *
   * <p>Antes había que quitar las fotos una a una, con su confirmación cada vez: limpiar una galería de
   * ocho imágenes del proveedor eran ocho gestos y ocho preguntas.
   */
  describe('quitar varias fotos a la vez', () => {
    it('quien solo mira no ve casillas de selección', async () => {
      const { container } = await render(GaleriaFicha, {
        inputs: { fotos: FOTOS, titulo: 'Gorro', activa: 0 },
      });

      expect(container.querySelectorAll('input[type=checkbox]')).toHaveLength(0);
    });

    it('quien administra puede marcar y las quita de una', async () => {
      const lotes: { imagenes: readonly string[]; video: boolean }[] = [];
      const { container } = await render(GaleriaFicha, {
        inputs: { fotos: FOTOS, titulo: 'Gorro', activa: 0, puedeEditar: true },
        on: { borraSeleccion: (lote: { imagenes: readonly string[]; video: boolean }) => lotes.push(lote) },
      });

      const casillas = [...container.querySelectorAll<HTMLInputElement>('input[type=checkbox]')];
      expect(casillas).toHaveLength(3);
      await userEvent.click(casillas[0]);
      await userEvent.click(casillas[2]);

      const botones = [...container.querySelectorAll<HTMLButtonElement>('button')];
      const quitar = botones.find((b) => b.className.includes('btn-error'))!;
      await userEvent.click(quitar);

      expect(lotes).toEqual([{ imagenes: ['a', 'c'], video: false }]);
    });

    /** Sin nada marcado la barra no está: un botón de borrar que no borra nada solo estorba. */
    it('sin selección no aparece la barra de borrado', async () => {
      const { container } = await render(GaleriaFicha, {
        inputs: { fotos: FOTOS, titulo: 'Gorro', activa: 0, puedeEditar: true },
      });

      const conError = [...container.querySelectorAll('button')].filter((b) =>
        b.className.includes('btn-error'),
      );
      expect(conError).toHaveLength(0);
    });

    /**
     * La casilla marcada tiene que VERSE marcada. El fondo blanco que la hace visible sobre la foto se
     * estaba aplicando también al estado marcado —la utilidad gana al componente—, así que la marca
     * quedaba blanca sobre blanco: se seleccionaban tres fotos, la barra decía «3 seleccionadas» y no
     * se veía ninguna marcada.
     */
    it('la casilla marcada queda marcada de verdad', async () => {
      const { container } = await render(GaleriaFicha, {
        inputs: { fotos: FOTOS, titulo: 'Gorro', activa: 0, puedeEditar: true },
      });
      const casillas = [...container.querySelectorAll<HTMLInputElement>('input[type=checkbox]')];

      await userEvent.click(casillas[0]);

      expect(casillas[0].checked).toBe(true);
      expect(casillas[1].checked).toBe(false);
      // El blanco solo mientras está vacía: si se aplicara siempre, taparía el color del marcado.
      expect(casillas[0].className).toContain('[&:not(:checked)]:bg-white/90');
    });

    /**
     * El vídeo se marca como una foto más. Quien limpia una galería lo quiere quitar en el mismo
     * gesto, no con una segunda vuelta y una segunda pregunta.
     */
    it('el vídeo también se puede marcar, y va en el mismo lote', async () => {
      const lotes: { imagenes: readonly string[]; video: boolean }[] = [];
      const { container } = await render(GaleriaFicha, {
        inputs: {
          fotos: FOTOS,
          titulo: 'Gorro',
          activa: 0,
          puedeEditar: true,
          urlDelVideo: 'clip.mp4',
        },
        on: { borraSeleccion: (lote: { imagenes: readonly string[]; video: boolean }) => lotes.push(lote) },
      });

      // La miniatura del vídeo va la PRIMERA de la tira, así que su casilla también.
      const [video, primeraFoto] = [
        ...container.querySelectorAll<HTMLInputElement>('input[type=checkbox]'),
      ];
      expect(container.querySelectorAll('input[type=checkbox]')).toHaveLength(4);
      await userEvent.click(primeraFoto);
      await userEvent.click(video);

      const quitar = [...container.querySelectorAll<HTMLButtonElement>('button')].find((b) =>
        b.className.includes('btn-error'),
      )!;
      await userEvent.click(quitar);

      expect(lotes).toEqual([{ imagenes: ['a'], video: true }]);
    });

    /** Marcar SOLO el vídeo ya basta para que aparezca la barra: es una cosa que quitar. */
    it('marcar solo el vídeo enseña la barra de borrado', async () => {
      const { container } = await render(GaleriaFicha, {
        inputs: {
          fotos: FOTOS,
          titulo: 'Gorro',
          activa: 0,
          puedeEditar: true,
          urlDelVideo: 'clip.mp4',
        },
      });
      const [video] = [...container.querySelectorAll<HTMLInputElement>('input[type=checkbox]')];

      await userEvent.click(video);

      const conError = [...container.querySelectorAll('button')].filter((b) =>
        b.className.includes('btn-error'),
      );
      expect(conError).toHaveLength(1);
    });

    /**
     * Al cambiar las fotos la selección se vacía. Si no, tras borrar tres quedarían marcados tres
     * identificadores que ya no existen y la barra ofrecería quitar algo que no está.
     */
    it('la selección se olvida cuando cambian las fotos', async () => {
      const vista = await render(GaleriaFicha, {
        inputs: { fotos: FOTOS, titulo: 'Gorro', activa: 0, puedeEditar: true },
      });
      const casillas = [...vista.container.querySelectorAll<HTMLInputElement>('input[type=checkbox]')];
      await userEvent.click(casillas[0]);

      vista.fixture.componentRef.setInput('fotos', [FOTOS[1], FOTOS[2]]);
      vista.fixture.detectChanges();

      const conError = [...vista.container.querySelectorAll('button')].filter((b) =>
        b.className.includes('btn-error'),
      );
      expect(conError).toHaveLength(0);
    });
  });
});
