import { render, screen } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { FichaDeProducto } from '../../domain/model/producto';
import { AdvertenciasSeguridad, IdentidadCumplimiento } from './cumplimiento-producto';
import { BasculaVariantes } from './bascula-variantes';
import { BloquePrecio } from './bloque-precio';
import { PestanasFicha } from './pestanas-ficha';

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
    idExterno: '1',
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

describe('AdvertenciasSeguridad', () => {
  /** El art. 19.d pide que la advertencia se muestre en la OFERTA, no en una página legal. */
  it('pinta las advertencias del producto', async () => {
    await render(AdvertenciasSeguridad, {
      inputs: { cumplimiento: { advertencias: ['No apto para menores de 3 años'] } },
    });
    expect(screen.getByText('No apto para menores de 3 años')).toBeInTheDocument();
  });

  it('sin advertencias no ocupa sitio', async () => {
    const { container } = await render(AdvertenciasSeguridad, {
      inputs: { cumplimiento: { advertencias: [] } },
    });
    expect(container.textContent?.trim()).toBe('');
  });
});

describe('IdentidadCumplimiento', () => {
  it('publica el fabricante y el operador de la Unión', async () => {
    await render(IdentidadCumplimiento, {
      inputs: {
        cumplimiento: {
          advertencias: [],
          fabricante: 'Fábrica S.L.',
          operadorEuropeo: {
            nombre: 'Representante UE',
            direccion: 'Calle 1',
            ciudad: 'Madrid',
            pais: 'ES',
            email: 'ue@ejemplo.com',
            papel: 'Importador',
          },
        },
      },
    });
    expect(screen.getByText('Fábrica S.L.')).toBeInTheDocument();
    expect(screen.getByText('ue@ejemplo.com')).toBeInTheDocument();
  });

  /** Un dato de cumplimiento fingido es peor que uno ausente: el ausente se ve y se corrige. */
  it('cuando falta el fabricante lo dice, no lo disimula', async () => {
    const { container } = await render(IdentidadCumplimiento, {
      inputs: {
        cumplimiento: {
          advertencias: [],
          operadorEuropeo: {
            nombre: 'Representante UE',
            direccion: 'Calle 1',
            ciudad: 'Madrid',
            pais: 'ES',
            email: 'ue@ejemplo.com',
            papel: '',
          },
        },
      },
    });
    // El texto sale del diccionario: lo que se comprueba es que NO se pinta una dirección inventada.
    expect(container.querySelectorAll('address')).toHaveLength(1);
    expect(container.textContent).toContain('Representante UE');
  });

  it('sin ningún dato no se pinta la sección', async () => {
    const { container } = await render(IdentidadCumplimiento, {
      inputs: { cumplimiento: { advertencias: [] } },
    });
    expect(container.textContent?.trim()).toBe('');
  });
});

describe('BasculaVariantes', () => {
  it('sin datos lo dice en vez de enseñar una tabla vacía', async () => {
    const { container } = await render(BasculaVariantes, { inputs: { ficha: ficha() } });
    expect(container.querySelector('table')).toBeNull();
    expect(container.textContent?.trim().length).toBeGreaterThan(0);
  });

  /** Sin el cruce con las opciones, la tabla enseñaba los colores en chino. */
  it('traduce el valor de la variante con las opciones del producto', async () => {
    const conBascula = ficha({
      variantes: [
        {
          id: 'v',
          existencias: 1,
          opciones: { Color: '黑色' },
          activa: true,
          pesoGramos: 250,
          largoMm: 100,
          anchoMm: 100,
          altoMm: 100,
        },
      ],
      ejesDeVariante: [
        {
          id: 'color',
          nombreZh: '颜色',
          nombre: 'Color',
          posicion: 0,
          valores: [{ id: '1', valorZh: '黑色', valorLocalizado: 'Negro', posicion: 0 }],
        },
      ],
    });
    await render(BasculaVariantes, { inputs: { ficha: conBascula } });
    expect(screen.getByText('Negro')).toBeInTheDocument();
    expect(screen.getByText('250')).toBeInTheDocument();
  });

  /**
   * Un valor en ideogramas sin traducción es un fallo a la vista: quien navega en español lee
   * «卡其色【牛筋软底】» en una tabla donde todo lo demás está en su idioma.
   *
   * <p>Pasa cuando una variante quedó con un valor que ya no figura entre las opciones declaradas del
   * producto —una carga vieja corregida a medias—. Esa variante ni siquiera se puede elegir en la
   * ficha, así que además de ilegible es inalcanzable: el guion dice «no lo sé» sin fingir nada.
   */
  it('no enseña ideogramas cuando no hay traducción', async () => {
    const huerfana = ficha({
      variantes: [
        {
          id: 'v',
          existencias: 1,
          opciones: { Color: '卡其色【牛筋软底】' },
          activa: true,
          // Un peso de tres cifras a propósito: a partir de mil, el separador de miles depende del
          // idioma («1.000» / «1,000») y la prueba dejaría de pasar según dónde se ejecute.
          pesoGramos: 300,
        },
      ],
      ejesDeVariante: [
        {
          id: 'color',
          nombreZh: '颜色',
          nombre: 'Color',
          posicion: 0,
          valores: [{ id: '1', valorZh: '卡其色', valorLocalizado: 'Caqui', posicion: 0 }],
        },
      ],
    });

    const { container } = await render(BasculaVariantes, { inputs: { ficha: huerfana } });

    expect(container.textContent).not.toContain('卡其色');
    expect(container.textContent).toContain('—');
    // La fila NO desaparece: el peso y la talla siguen siendo datos ciertos de una variante que existe.
    expect(container.textContent).toContain('300');
  });

  /**
   * Una variante desactivada no se puede comprar, así que su peso no le sirve a nadie: la tabla
   * prometía pesos de combinaciones que no se pueden pedir. Y como la retirada suele ser justo la que
   * arrastra datos viejos, era también por donde asomaba el chino sin traducir.
   */
  it('no lista las variantes desactivadas', async () => {
    const conRetirada = ficha({
      variantes: [
        { id: 'viva', existencias: 1, opciones: { Talla: '36' }, activa: true, pesoGramos: 300 },
        { id: 'muerta', existencias: 9, opciones: { Talla: '44' }, activa: false, pesoGramos: 999 },
      ],
      ejesDeVariante: [],
    });

    const { container } = await render(BasculaVariantes, { inputs: { ficha: conRetirada } });

    expect(container.textContent).toContain('300');
    expect(container.textContent).not.toContain('999');
    expect(container.textContent).not.toContain('44');
  });

  /** Lo que no lleva ideogramas se enseña tal cual: una talla («37») no se traduce. */
  it('deja pasar los valores que no son chinos aunque no estén traducidos', async () => {
    const conTalla = ficha({
      variantes: [
        { id: 'v', existencias: 1, opciones: { Talla: '37' }, activa: true, pesoGramos: 300 },
      ],
      ejesDeVariante: [],
    });

    const { container } = await render(BasculaVariantes, { inputs: { ficha: conTalla } });

    expect(container.textContent).toContain('37');
  });
});

describe('BloquePrecio', () => {
  it('pinta el precio destacado y el pedido mínimo', async () => {
    await render(BloquePrecio, {
      inputs: { destacado: { importe: 9, divisa: 'EUR', formateado: '9,00 €' }, moq: 6 },
    });
    expect(screen.getByText('9,00 €')).toBeInTheDocument();
    expect(screen.getByText('6')).toBeInTheDocument();
  });

  /** Componer el importe aquí enseñaría un número que el pedido no va a cobrar. */
  it('sin cadena del backend pinta un guión', async () => {
    await render(BloquePrecio, { inputs: { destacado: { importe: null, divisa: 'EUR' } } });
    expect(screen.getByText('—')).toBeInTheDocument();
  });
});

describe('PestanasFicha', () => {
  /**
   * El ORDEN es parte del requisito, no un detalle: «Detalles» va primera porque su sección va
   * primera, y la barra tiene que seguir a lo que hay debajo. Contar las pestañas no lo comprobaba.
   *
   * <p>«Recomendado por el vendedor» ya no está: su bloque subió junto a la tarjeta del vendedor, por
   * encima de esta barra, y una pestaña que lleva hacia arriba se sale de la propia barra.
   */
  it('ofrece las secciones de la ficha en el orden en que aparecen', async () => {
    await render(PestanasFicha);

    expect(screen.getAllByRole('tab').map((t) => t.textContent?.trim())).toEqual([
      'Details',
      'Reviews',
      'Attributes',
      'Packing',
    ]);
  });

  /**
   * No ocultan contenido: todas las secciones están siempre en la página. Es lo que permite buscar
   * dentro con el navegador y que un enlace a una sección concreta funcione.
   */
  it('pulsar una pestaña la marca y lleva a su sección', async () => {
    const seccion = document.createElement('section');
    seccion.id = 'tab-packing';
    seccion.scrollIntoView = vi.fn();
    document.body.appendChild(seccion);

    const vista = await render(PestanasFicha);
    // Se busca POR SU RÓTULO, no por su posición: el orden de la barra ya ha cambiado dos veces y un
    // índice fijo convertía un cambio de orden en un fallo que no señalaba a nada.
    const pestana = screen.getByRole('tab', { name: 'Packing' });
    await userEvent.click(pestana);
    vista.fixture.detectChanges();

    expect(pestana).toHaveAttribute('aria-selected', 'true');
    expect(seccion.scrollIntoView).toHaveBeenCalled();
    seccion.remove();
  });
});
