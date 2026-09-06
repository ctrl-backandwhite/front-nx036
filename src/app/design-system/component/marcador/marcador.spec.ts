import { render, screen } from '@testing-library/angular';
import { fireEvent } from '@testing-library/dom';
import { ImagenSegura } from './imagen-segura';
import { Esqueleto } from './esqueleto';
import { EsqueletoTarjetaProducto } from './esqueleto-tarjeta-producto';
import { EsqueletoFilaTabla } from '../../directive/esqueleto-fila-tabla.directive';

describe('ImagenSegura', () => {
  it('pinta la foto cuando hay dirección', async () => {
    await render(ImagenSegura, {
      inputs: { src: 'https://cdn.nx036.test/gorro.webp', alt: 'Gorro de lana' },
    });

    expect(screen.getByRole('img', { name: 'Gorro de lana' })).toHaveAttribute(
      'src',
      'https://cdn.nx036.test/gorro.webp',
    );
  });

  it('sin dirección enseña el marcador neutro, no un hueco anónimo', async () => {
    await render(ImagenSegura, { inputs: { src: null, alt: 'Gorro de lana' } });

    // Sigue siendo una imagen para quien escucha la página: el nombre accesible no se pierde.
    expect(screen.getByRole('img', { name: 'Gorro de lana' })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Gorro de lana' }).tagName).not.toBe('IMG');
  });

  /**
   * Los servicios de relleno devuelven una foto con «800 × 800» escrito encima. Enseñar eso es peor que
   * no enseñar nada: parece el producto.
   */
  it('trata como rota la dirección de un servicio de relleno', async () => {
    await render(ImagenSegura, {
      inputs: { src: 'https://placehold.co/800', alt: 'Gorro de lana' },
    });

    expect(screen.getByRole('img', { name: 'Gorro de lana' }).tagName).not.toBe('IMG');
  });

  it('aguanta dos fallos antes de rendirse al marcador', async () => {
    vi.useFakeTimers();
    try {
      const { fixture } = await render(ImagenSegura, {
        inputs: { src: 'https://cdn.nx036.test/gorro.webp', alt: 'Gorro de lana' },
      });

      for (let intento = 1; intento <= 2; intento++) {
        fireEvent.error(screen.getByRole('img', { name: 'Gorro de lana' }));
        vi.advanceTimersByTime(500 * intento);
        fixture.detectChanges();
        const imagen = screen.getByRole('img', { name: 'Gorro de lana' });
        expect(imagen.tagName).toBe('IMG');
        // El parámetro que rompe la caché: sin él el navegador devolvería la misma respuesta fallida.
        expect(imagen.getAttribute('src')).toContain(`nxr=${intento}`);
      }

      fireEvent.error(screen.getByRole('img', { name: 'Gorro de lana' }));
      fixture.detectChanges();
      expect(screen.getByRole('img', { name: 'Gorro de lana' }).tagName).not.toBe('IMG');
    } finally {
      vi.useRealTimers();
    }
  });
});

describe('Esqueletos', () => {
  it('el bloque queda fuera del árbol accesible y lleva la utilidad de brillo', async () => {
    const { container } = await render('<nx-esqueleto clase="h-4 w-20" />', {
      imports: [Esqueleto],
    });

    const bloque = container.querySelector('nx-esqueleto');
    expect(bloque).toHaveAttribute('aria-hidden', 'true');
    expect(bloque).toHaveClass('skeleton', 'h-4', 'w-20');
  });

  it('la tarjeta de producto reserva el hueco de la foto y de las dos líneas de texto', async () => {
    const { container } = await render(EsqueletoTarjetaProducto);

    expect(container.querySelectorAll('nx-esqueleto')).toHaveLength(5);
  });

  it('la fila de tabla pinta tantas celdas como columnas se le pidan', async () => {
    const { container } = await render(
      '<table><tbody><tr [nxEsqueletoFilaTabla]="4"></tr></tbody></table>',
      { imports: [EsqueletoFilaTabla] },
    );

    expect(container.querySelectorAll('td')).toHaveLength(4);
  });
});
