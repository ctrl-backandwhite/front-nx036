import { signal } from '@angular/core';
import { render, screen } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { InfoDeAranceles } from './info-de-aranceles';
import { CampoDeCupon } from './campo-de-cupon';
import { CampoDeReferido } from './campo-de-referido';
import { CamposDeDireccion } from './campos-de-direccion';
import { LineasDeLaCompra } from './lineas-de-la-compra';
import { SelectorDeMetodo } from './selector-de-metodo';
import { AvisosDeAduana } from './avisos-de-aduana';

describe('InfoDeAranceles', () => {
  beforeEach(() => {
    document.cookie = 'nx036-locale=es';
  });

  it('el icono tiene nombre accesible y abre un diálogo con la explicación', async () => {
    const vista = await render(InfoDeAranceles);

    await userEvent.click(screen.getByRole('button'));
    vista.fixture.detectChanges();

    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  /** Al leer un texto largo es habitual hacer clic para seleccionar: cerrarse ahí resulta exasperante. */
  it('pinchar DENTRO del panel no lo cierra', async () => {
    const vista = await render(InfoDeAranceles);
    await userEvent.click(screen.getByRole('button'));
    vista.fixture.detectChanges();

    await userEvent.click(screen.getByRole('dialog'));
    vista.fixture.detectChanges();

    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('el fondo cierra, y es alcanzable con el teclado', async () => {
    const vista = await render(InfoDeAranceles);
    await userEvent.click(screen.getByRole('button'));
    vista.fixture.detectChanges();

    const fondo = document.querySelector('[role="presentation"]') as HTMLElement;
    expect(fondo.getAttribute('tabindex')).toBe('-1');
    await userEvent.click(fondo);
    vista.fixture.detectChanges();

    expect(screen.queryByRole('dialog')).toBeNull();
  });
});

describe('CampoDeCupon', () => {
  beforeEach(() => {
    document.cookie = 'nx036-locale=es';
  });

  /** Los cupones están dados de alta en mayúsculas: escribirlos en minúsculas daba «no válido». */
  it('escribe en mayúsculas mientras se teclea', async () => {
    const vista = await render(CampoDeCupon);
    const aplicados: string[] = [];
    vista.fixture.componentInstance.aplica.subscribe((c: string) => aplicados.push(c));

    await userEvent.type(screen.getByRole('textbox'), 'verano10');
    await userEvent.click(screen.getByRole('button'));

    expect(aplicados).toEqual(['VERANO10']);
  });

  /** Validarlo en cada pulsación dispararía una cotización por letra, y cada una llama al transportista. */
  it('no aplica nada mientras se teclea', async () => {
    const vista = await render(CampoDeCupon);
    const aplicados: string[] = [];
    vista.fixture.componentInstance.aplica.subscribe((c: string) => aplicados.push(c));

    await userEvent.type(screen.getByRole('textbox'), 'verano10');

    expect(aplicados).toHaveLength(0);
  });

  it('enseña el motivo del rechazo bajo el campo', async () => {
    await render(CampoDeCupon, { inputs: { error: 'Cupón caducado' } });

    expect(screen.getByRole('alert')).toHaveTextContent('Cupón caducado');
  });

  it('un cupón aceptado se confirma con su código', async () => {
    await render(CampoDeCupon, { inputs: { aceptado: 'VERANO10' } });

    expect(screen.getByText(/VERANO10/)).toBeInTheDocument();
  });
});

describe('CampoDeReferido', () => {
  beforeEach(() => {
    document.cookie = 'nx036-locale=es';
  });

  it('si vino del enlace se enseña ya aplicado, diciendo de dónde viene', async () => {
    await render(CampoDeReferido, {
      inputs: { codigo: 'ANA10', aplicado: true, deEnlace: true },
    });

    expect(screen.getByText('ANA10')).toBeInTheDocument();
    expect(screen.queryByRole('textbox')).toBeNull();
  });

  it('un código no válido se dice bajo el campo', async () => {
    await render(CampoDeReferido, { inputs: { invalido: true } });

    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('se puede escribir a mano y aplicar', async () => {
    const vista = await render(CampoDeReferido);
    const aplicados: string[] = [];
    vista.fixture.componentInstance.aplica.subscribe((c: string) => aplicados.push(c));

    await userEvent.type(screen.getByRole('textbox'), 'ANA10');
    await userEvent.click(screen.getByRole('button'));

    expect(aplicados).toEqual(['ANA10']);
  });
});

describe('CamposDeDireccion', () => {
  beforeEach(() => {
    document.cookie = 'nx036-locale=es';
  });

  /** Todas las claves presentes: el formulario solo crea campo para las que existen en el objeto. */
  const VACIA = {
    nombreCompleto: '',
    linea1: '',
    linea2: '',
    ciudad: '',
    provincia: '',
    codigoPostal: '',
    pais: '',
    telefono: '',
  };

  /** Sin etiqueta asociada se oyen siete «cuadro de texto» seguidos y no se puede rellenar nada. */
  it('cada campo tiene su etiqueta asociada', async () => {
    await render(CamposDeDireccion, { inputs: { valor: VACIA } });

    expect(screen.getByLabelText(/nombre/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/ciudad/i)).toBeInTheDocument();
  });

  it('escribir emite la dirección entera, no solo el campo', async () => {
    const vista = await render(CamposDeDireccion, { inputs: { valor: VACIA } });
    const emitidas: { ciudad: string }[] = [];
    // El campo es un `model()`, así que la salida `valorChange` se escucha desde la propia señal.
    vista.fixture.componentInstance.valor.subscribe((d: { ciudad: string }) => emitidas.push(d));

    await userEvent.type(screen.getByLabelText(/ciudad/i), 'M');

    expect(emitidas.at(-1)?.ciudad).toBe('M');
  });

  /**
   * Lo que antes no había: el formulario DICE qué falta. Un campo obligatorio que se toca y se deja
   * vacío enseña su mensaje debajo, en vez de dejar el botón de pagar apagado sin explicación.
   */
  it('un campo obligatorio que se toca y se deja vacío enseña su mensaje', async () => {
    await render(CamposDeDireccion, { inputs: { valor: VACIA } });

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();

    await userEvent.click(screen.getByLabelText(/ciudad/i));
    await userEvent.tab();

    expect(screen.getByText('Este campo es obligatorio.')).toBeInTheDocument();
  });

  it('con los cuatro campos del envío escritos, la dirección se da por completa', async () => {
    const vista = await render(CamposDeDireccion, {
      inputs: { valor: { ...VACIA, nombreCompleto: 'Ana', linea1: 'Calle 1', ciudad: 'Madrid', pais: 'ES' } },
    });

    expect(vista.fixture.componentInstance.completa()).toBe(true);
  });
});

describe('LineasDeLaCompra', () => {
  beforeEach(() => {
    document.cookie = 'nx036-locale=es';
  });

  const LINEA = {
    productId: 'p1',
    slug: 'camiseta',
    titulo: 'Camiseta',
    precioUnitarioOrigen: 100,
    divisaDeOrigen: 'CNY',
    cantidad: 1,
  };

  const VALORACION = {
    subtotal: signal('10,00 €'),
    unitario: () => '10,00 €',
    totalDeLinea: () => '10,00 €',
  };

  /** Las notas viajan por un `model()`: escribir tiene que seguir avisando al estado de la compra. */
  it('escribir una nota la emite al padre', async () => {
    const vista = await render(LineasDeLaCompra, {
      inputs: {
        lineas: [LINEA],
        valoracion: VALORACION,
        notas: '',
        sePuedeBajar: () => true,
      },
    });
    const emitidas: string[] = [];
    vista.fixture.componentInstance.notas.subscribe((n: string) => emitidas.push(n));

    await userEvent.type(screen.getByLabelText(/notas/i), 'Portería');

    expect(emitidas.at(-1)).toBe('Portería');
  });
});

describe('SelectorDeMetodo', () => {
  beforeEach(() => {
    document.cookie = 'nx036-locale=es';
  });

  it('los métodos guardados se pueden elegir, y el marcado por defecto se señala', async () => {
    const vista = await render(SelectorDeMetodo, {
      inputs: {
        guardados: [
          { id: 'pm_1', clase: 'CARD' as const, marca: 'visa', ultimosCuatro: '4242', porDefecto: true },
        ],
        clave: 'new-card',
        metodo: 'CARD' as const,
      },
    });
    const elegidos: { clave: string; idDeTarjeta: string | null }[] = [];
    vista.fixture.componentInstance.elige.subscribe((m: { clave: string; idDeTarjeta: string | null }) =>
      elegidos.push(m),
    );

    await userEvent.click(screen.getByRole('button', { name: /VISA/ }));

    expect(elegidos[0]).toEqual({ clave: 'guardado:pm_1', metodo: 'CARD', idDeTarjeta: 'pm_1' });
  });

  /** Con PayPal guardado no hay tarjeta que cobrar del lado servidor: el identificador no viaja. */
  it('un PayPal guardado no lleva identificador de tarjeta', async () => {
    const vista = await render(SelectorDeMetodo, {
      inputs: {
        guardados: [{ id: 'pp_1', clase: 'PAYPAL' as const, correoDePaypal: 'a***@b.com', porDefecto: false }],
        clave: 'new-card',
        metodo: 'CARD' as const,
      },
    });
    const elegidos: { metodo: string; idDeTarjeta: string | null }[] = [];
    vista.fixture.componentInstance.elige.subscribe((m: { metodo: string; idDeTarjeta: string | null }) =>
      elegidos.push(m),
    );

    await userEvent.click(screen.getByRole('button', { name: /PayPal ·/ }));

    expect(elegidos[0]).toMatchObject({ metodo: 'PAYPAL', idDeTarjeta: null });
  });

  it('con el monedero y saldo corto, avisa y enlaza a recargar', async () => {
    await render(SelectorDeMetodo, {
      inputs: {
        guardados: [],
        clave: 'wallet',
        metodo: 'WALLET' as const,
        saldo: { disponibleCentimosUsd: 100, disponibleFormateado: '1,00 $' },
        alcanza: false,
      },
    });

    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByRole('link')).toBeInTheDocument();
  });

  it('mientras el saldo no llega lo dice, en vez de enseñar cero', async () => {
    await render(SelectorDeMetodo, {
      inputs: { guardados: [], clave: 'wallet', metodo: 'WALLET' as const, saldo: null },
    });

    expect(screen.queryByRole('alert')).toBeNull();
  });

  /** La tarjeta NO se teclea en nuestro sitio: se avisa de adónde se va. */
  it('con tarjeta nueva explica que se sale a la página del proveedor', async () => {
    const vista = await render(SelectorDeMetodo, {
      inputs: { guardados: [], clave: 'new-card', metodo: 'CARD' as const },
    });

    expect(vista.fixture.nativeElement.textContent).toMatch(/segura|Stripe|redirig/i);
  });
});

describe('AvisosDeAduana', () => {
  beforeEach(() => {
    document.cookie = 'nx036-locale=es';
  });

  it('un país sin cobertura se avisa', async () => {
    await render(AvisosDeAduana, {
      inputs: { cotizacion: { cubierto: false }, hayPais: true },
    });

    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  /**
   * Sin límite que enseñar, el destino no admite NINGÚN importe: invitar a «ajustar el pedido para quedar
   * por debajo» sería mandar a una puerta que no existe.
   */
  it('un destino bloqueado sin límite no invita a reducir el pedido', async () => {
    const vista = await render(AvisosDeAduana, {
      inputs: { cotizacion: { cubierto: true, aduanaBloqueada: true }, hayPais: true },
    });

    expect(vista.fixture.nativeElement.textContent).not.toContain('()');
  });

  it('con límite, se dice cuál es', async () => {
    const vista = await render(AvisosDeAduana, {
      inputs: {
        cotizacion: { cubierto: true, aduanaBloqueada: true, limiteDeAduana: '150 EUR' },
        hayPais: true,
      },
    });

    expect(vista.fixture.nativeElement.textContent).toContain('150 EUR');
  });

  /** El total ya lleva el recargo: el aviso solo explica por qué el envío es más caro. */
  it('el umbral superado avisa, pero no bloquea', async () => {
    await render(AvisosDeAduana, {
      inputs: {
        cotizacion: { cubierto: true, umbralDeAduanaSuperado: true, aduanaBloqueada: false },
        hayPais: true,
      },
    });

    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('sin país no avisa de nada', async () => {
    await render(AvisosDeAduana, { inputs: { cotizacion: undefined, hayPais: false } });

    expect(screen.queryByRole('alert')).toBeNull();
  });
});
