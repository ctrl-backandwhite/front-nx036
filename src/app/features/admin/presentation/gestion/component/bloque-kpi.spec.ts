import { faBoxesStacked } from '@fortawesome/free-solid-svg-icons';
import { render, screen } from '@testing-library/angular';
import { BloqueKpi } from './bloque-kpi';

/**
 * Las pruebas que MONTAN un componente tardan más de lo que Vitest espera por defecto (5 s) cuando hay
 * varios equipos compilando a la vez: el arranque de Angular compite por la máquina. El plazo se sube
 * aquí para que un fallo signifique lo que tiene que significar —que la lógica está mal— y no que el
 * ordenador iba cargado.
 */
vi.setConfig({ testTimeout: 30_000 });

/**
 * El contador de la cifra ANIMA salvo que el sistema pida movimiento reducido, y el DOM simulado
 * responde que no lo pide: la cifra tarda 900 ms en llegar a su valor, y la comprobación dependía de
 * ganarle la carrera al reloj —con la máquina cargada, la perdía—.
 *
 * <p>Aquí se finge que el sistema SÍ pide movimiento reducido, que es el caso que esta prueba dice
 * comprobar: la cifra se pone de una vez. La animación en sí tiene su propia prueba en el sistema de
 * diseño (`movimiento.spec.ts`), que es donde le corresponde.
 */
let restauraMedios: () => void;

beforeEach(() => {
  const previo = Object.getOwnPropertyDescriptor(window, 'matchMedia');
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    value: (consulta: string) => ({ matches: true, media: consulta }) as MediaQueryList,
  });
  restauraMedios = () => {
    if (previo) {
      Object.defineProperty(window, 'matchMedia', previo);
    } else {
      Reflect.deleteProperty(window, 'matchMedia');
    }
  };
});

afterEach(() => restauraMedios());

describe('BloqueKpi', () => {
  it('enseña el rótulo y la cifra', async () => {
    await render(BloqueKpi, {
      inputs: { icono: faBoxesStacked, etiqueta: 'Productos', valor: 1240 },
    });

    expect(screen.getByText('Productos')).toBeInTheDocument();
    // Con movimiento reducido —lo que finge esta prueba— el contador salta directamente a la cifra.
    expect(await screen.findByText(/1.?240/)).toBeInTheDocument();
  });

  /** Un cero es un DATO: verlo mientras carga hace pensar que el catálogo está vacío. */
  it('mientras carga no enseña un cero, sino un indicador de espera', async () => {
    const { container } = await render(BloqueKpi, {
      inputs: { icono: faBoxesStacked, etiqueta: 'Productos', cargando: true },
    });

    expect(screen.queryByText('0')).toBeNull();
    expect(container.querySelector('.loading')).toBeTruthy();
  });

  it('la tendencia solo aparece cuando hay algo que contar', async () => {
    const { rerender } = await render(BloqueKpi, {
      inputs: { icono: faBoxesStacked, etiqueta: 'Activos', valor: 10 },
    });
    expect(screen.queryByText('80%')).toBeNull();

    await rerender({
      inputs: { icono: faBoxesStacked, etiqueta: 'Activos', valor: 10, tendencia: '80%', alAlza: true },
    });

    expect(screen.getByText('80%')).toBeInTheDocument();
  });
});
