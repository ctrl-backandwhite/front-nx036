import { render, screen } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { ImporteEnYuanes } from '../../../../domain/catalogo/model/ficha-de-producto';
import { FilaDeYuanes } from './fila-de-yuanes';

/**
 * Uno de los tres importes en yuanes del resumen de la ficha: el recargo y las dos bolsas de
 * subvención. Deciden el precio de venta, así que lo que se certifica es quién puede tocarlos y qué se
 * niega a salir hacia el servidor.
 */
describe('FilaDeYuanes', () => {
  async function monta(crudo: number | null = 7.5) {
    const guardados: { campo: ImporteEnYuanes; importe: number }[] = [];
    const vista = await render(FilaDeYuanes, {
      inputs: {
        campo: 'recargo' as ImporteEnYuanes,
        etiqueta: 'Recargo',
        etiquetaDelCampo: 'Recargo en yuanes',
        ayuda: 'Doble clic para editar el recargo',
        formateado: '1,00 €',
        crudo,
      },
      on: { guardado: (v: { campo: ImporteEnYuanes; importe: number }) => guardados.push(v) },
    });
    return { vista, guardados };
  }

  const campoNumerico = (vista: { container: Element }) =>
    vista.container.querySelector<HTMLInputElement>('input[type=number]');

  it('en reposo enseña el importe ya convertido, no los yuanes', async () => {
    const { vista } = await monta();

    expect(screen.getByText('1,00 €')).toBeInTheDocument();
    expect(campoNumerico(vista), 'no debería haber campo hasta que se pida editar').toBeNull();
  });

  it('el doble clic abre el campo con los yuanes dentro', async () => {
    const { vista } = await monta();

    await userEvent.dblClick(screen.getByText('Recargo'));
    vista.fixture.detectChanges();

    expect(campoNumerico(vista)?.value).toBe('7.5');
  });

  /**
   * El equivalente TÁCTIL del doble clic.
   *
   * <p>En una pantalla táctil el doble toque no llega como doble clic: el navegador lo interpreta como
   * ampliar. Sin este botón, desde una tableta no había forma de corregir un recargo — y de paso la
   * edición tampoco estaba al alcance del teclado, porque el gesto colgaba de un div.
   */
  it('el lápiz abre el mismo campo sin doble clic', async () => {
    const { vista } = await monta();

    await userEvent.click(screen.getByRole('button', { name: /Recargo en yuanes/ }));
    vista.fixture.detectChanges();

    expect(campoNumerico(vista)?.value).toBe('7.5');
  });

  it('con Intro se guarda el importe tecleado', async () => {
    const { vista, guardados } = await monta();

    await userEvent.click(screen.getByRole('button', { name: /Recargo en yuanes/ }));
    vista.fixture.detectChanges();
    const campo = campoNumerico(vista)!;
    await userEvent.clear(campo);
    await userEvent.type(campo, '9{enter}');

    expect(guardados).toEqual([{ campo: 'recargo', importe: 9 }]);
  });

  /** El subsidio se RESTA: en negativo acabaría cobrando de más a quien compra. */
  it('un importe negativo no sale hacia el servidor', async () => {
    const { vista, guardados } = await monta();

    await userEvent.click(screen.getByRole('button', { name: /Recargo en yuanes/ }));
    vista.fixture.detectChanges();
    const campo = campoNumerico(vista)!;
    await userEvent.clear(campo);
    await userEvent.type(campo, '-3{enter}');

    expect(guardados).toEqual([]);
  });

  /** Salir del campo CANCELA: un doble clic sin querer no puede acabar cambiando el precio. */
  it('salir del campo cancela sin guardar', async () => {
    const { vista, guardados } = await monta();

    await userEvent.click(screen.getByRole('button', { name: /Recargo en yuanes/ }));
    vista.fixture.detectChanges();
    const campo = campoNumerico(vista)!;
    await userEvent.clear(campo);
    await userEvent.type(campo, '9');
    campo.blur();
    vista.fixture.detectChanges();

    expect(guardados).toEqual([]);
    expect(campoNumerico(vista)).toBeNull();
  });

  /** Sin importe guardado se empieza en cero, no en vacío: un campo numérico vacío no es válido. */
  it('sin importe previo se empieza en cero', async () => {
    const { vista } = await monta(null);

    await userEvent.click(screen.getByRole('button', { name: /Recargo en yuanes/ }));
    vista.fixture.detectChanges();

    expect(campoNumerico(vista)?.value).toBe('0');
  });
});
