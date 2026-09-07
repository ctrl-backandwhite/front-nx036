import { render, screen } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { RangoNumerico, RangoPublicado } from './rango-numerico';

/**
 * El rango con forma de pastilla que usan el catálogo del escaparate y el del panel.
 *
 * <p>Antes estaba escrito a mano en la barra del escaparate y el panel lo resolvía con dos campos
 * sueltos SIN reglas, así que un mínimo por encima del máximo dejaba la tabla en blanco sin decir por
 * qué. Lo que se certifica aquí es justo eso: el aviso, y que el valor no suba en cada tecla.
 */
describe('RangoNumerico', () => {
  beforeEach(() => {
    document.cookie = 'nx036-locale=es; Path=/';
  });

  async function monta(minimo = '', maximo = '') {
    const publicados: RangoPublicado[] = [];
    const vista = await render(RangoNumerico, {
      inputs: { etiqueta: 'Precio', minimo, maximo },
      on: { cambiado: (r: RangoPublicado) => publicados.push(r) },
    });
    const campos = [...vista.container.querySelectorAll<HTMLInputElement>('input')];
    return { vista, publicados, minimo: campos[0], maximo: campos[1] };
  }

  it('arranca con lo que recibe, no vacío', async () => {
    const { minimo, maximo } = await monta('10', '50');

    expect(minimo.value).toBe('10');
    expect(maximo.value).toBe('50');
  });

  /**
   * Publicar por dígito sería una búsqueda entera por cada tecla: quien lo monta lleva el criterio a la
   * dirección del navegador.
   */
  it('no publica mientras se teclea, solo al salir del campo', async () => {
    const { publicados, minimo } = await monta();

    await userEvent.type(minimo, '25');
    expect(publicados, 'ha publicado a media tecleada').toEqual([]);

    await userEvent.tab();
    expect(publicados).toEqual([{ minimo: '25', maximo: '' }]);
  });

  /** Vacío significa «sin filtro», y así tiene que llegar: no como un cero. */
  it('el extremo sin poner viaja vacío', async () => {
    const { publicados, maximo } = await monta();

    await userEvent.type(maximo, '80');
    await userEvent.tab();

    expect(publicados).toEqual([{ minimo: '', maximo: '80' }]);
  });

  /** Un mínimo por encima del máximo no devuelve nada, y sin aviso parece que la lista está vacía. */
  it('avisa cuando el final va antes que el principio', async () => {
    const { vista, minimo } = await monta('', '10');

    await userEvent.type(minimo, '90');
    await userEvent.tab();
    vista.fixture.detectChanges();

    expect(screen.getByRole('alert').textContent).toContain('El final va antes que el principio');
  });

  /** Recién abierta la barra, nadie ha escrito nada: pintar de rojo ahí acusa a quien no ha hecho nada. */
  it('no acusa a nadie hasta que se toca el campo', async () => {
    const { vista } = await monta('90', '10');
    vista.fixture.detectChanges();

    expect(screen.queryByRole('alert')).toBeNull();
  });

  /** Un número negativo no existe en ninguno de los dos usos y solo devolvería la lista entera. */
  it('rechaza un número negativo', async () => {
    const { vista, minimo } = await monta();

    await userEvent.type(minimo, '-5');
    await userEvent.tab();
    vista.fixture.detectChanges();

    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  /** Se DERIVA de lo que llega: «limpiar filtros» tiene que vaciar los campos sin sincronizar nada. */
  it('limpiar desde fuera vacía los dos campos', async () => {
    const { vista, minimo, maximo } = await monta('10', '50');

    vista.fixture.componentRef.setInput('minimo', '');
    vista.fixture.componentRef.setInput('maximo', '');
    vista.fixture.detectChanges();

    expect(minimo.value).toBe('');
    expect(maximo.value).toBe('');
  });
});
