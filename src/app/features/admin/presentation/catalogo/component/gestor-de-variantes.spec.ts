import { render, screen, within } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { AvisosStore } from '@ds/component/avisos/avisos.store';
import { DialogoStore } from '@ds/component/dialogo/dialogo.store';
import { creaError } from '@shared/error/app-error';
import { exito, fallo } from '@shared/result/result';
import { VarianteDeProducto } from '../../../domain/catalogo/model/variante-de-producto';
import { EliminaVariante } from '../../../application/catalogo/use-case/elimina-variante.use-case';
import { GuardaVariante } from '../../../application/catalogo/use-case/guarda-variante.use-case';
import { GuardaVariantesEnLote } from '../../../application/catalogo/use-case/guarda-variantes-en-lote.use-case';
import { ListaVariantes } from '../../../application/catalogo/use-case/lista-variantes.use-case';
import { GestorDeVariantes } from './gestor-de-variantes';

/**
 * Las variantes de un producto: el SKU, el precio y las existencias con las que se vende cada talla y
 * cada color.
 *
 * <p>Lo que se fija aquí son las tres reglas del formulario, que antes se comprobaban a ojo sobre el
 * botón y llegaban al guardado tal cual: el SKU es OBLIGATORIO —es lo que identifica la variante en el
 * almacén— y ni el precio ni las existencias pueden ser negativos. Un stock negativo no es una rareza
 * teórica: sale de teclear un guion en un campo numérico sin tope por abajo.
 *
 * <p>Y la edición en lote: sus borradores se DERIVAN de la lista, no se rellenan a mano al entrar. Así
 * una recarga del servidor no deja borradores de variantes que ya no existen, ni filas nuevas sin
 * borrador — dos formas de guardar sobre lo que no era.
 */
function variante(parcial: Partial<VarianteDeProducto> = {}): VarianteDeProducto {
  return {
    id: 'v1',
    sku: 'GORRO-AZUL-M',
    titulo: 'Azul / M',
    precio: 6.5,
    existencias: 20,
    opciones: { Color: 'Azul', Talla: 'M' },
    activa: true,
    ...parcial,
  };
}

interface Opciones {
  variantes?: readonly VarianteDeProducto[];
  guardar?: 'falla';
}

async function monta(opciones: Opciones = {}) {
  const lista = vi.fn(async (_id: string) => exito(opciones.variantes ?? [variante()]));
  const guarda = vi.fn(async (_p: string, _b: unknown, _v?: string) =>
    opciones.guardar === 'falla'
      ? fallo(creaError('conflicto', 'Ese SKU ya existe'))
      : exito(variante()),
  );
  const guardaLote = vi.fn(async (_v: unknown, _b: unknown) => exito(2));
  const elimina = vi.fn(async (_id: string) => exito(undefined));
  const cambiado = vi.fn();

  const vista = await render(GestorDeVariantes, {
    inputs: { productoId: 'p1' },
    on: { cambiado },
    providers: [
      AvisosStore,
      DialogoStore,
      { provide: ListaVariantes, useValue: { ejecuta: lista } },
      { provide: GuardaVariante, useValue: { ejecuta: guarda } },
      { provide: GuardaVariantesEnLote, useValue: { ejecuta: guardaLote } },
      { provide: EliminaVariante, useValue: { ejecuta: elimina } },
    ],
  });
  await vista.fixture.whenStable();
  vista.fixture.detectChanges();

  const asienta = async () => {
    /* El salto de macrotarea es por los recursos que se recargan: `reload()` deja la nueva carga
     * encolada, y sin ceder el turno la comprobación mira antes de que llegue a lanzarse. */
    await new Promise((sigue) => setTimeout(sigue, 0));
    await vista.fixture.whenStable();
    vista.fixture.detectChanges();
    await vista.fixture.whenStable();
    vista.fixture.detectChanges();
  };

  return {
    vista,
    asienta,
    lista,
    guarda,
    guardaLote,
    elimina,
    cambiado,
    avisos: vista.fixture.debugElement.injector.get(AvisosStore),
    dialogo: vista.fixture.debugElement.injector.get(DialogoStore),
  };
}

/**
 * La fila que se está editando: la primera que tiene campos.
 *
 * <p>Se busca recorriendo y no con `tr:has(input)` porque el DOM simulado de las pruebas todavía no
 * implementa `:has()`, y devuelve nulo sin avisar de por qué.
 */
const filaEditable = (): HTMLElement =>
  Array.from(document.querySelectorAll('nx-filas-de-variante, tr')).find((fila) =>
    fila.querySelector('input'),
  ) as HTMLElement;

describe('GestorDeVariantes', () => {
  beforeEach(() => {
    document.cookie = 'nx036-locale=es';
  });

  it('enseña cada variante con su SKU, su precio crudo y sus opciones', async () => {
    await monta();

    expect(screen.getByText('GORRO-AZUL-M')).toBeInTheDocument();
    /* El precio se enseña en la divisa de ORIGEN y sin convertir: es el coste que se teclea, no lo que
     * paga el cliente. */
    expect(screen.getByText('6.50 CNY')).toBeInTheDocument();
    expect(screen.getAllByText(/Azul/).length).toBeGreaterThan(0);
  });

  it('una variante sin datos opcionales no enseña «undefined»', async () => {
    await monta({
      variantes: [variante({ sku: undefined, titulo: undefined, precio: undefined, opciones: {} })],
    });

    expect(screen.getAllByText('—').length).toBeGreaterThan(0);
  });

  describe('crear una variante', () => {
    it('sin SKU no se puede guardar: es lo que la identifica en el almacén', async () => {
      const { guarda, asienta } = await monta();

      await userEvent.click(screen.getByRole('button', { name: /Añadir variante/ }));
      await asienta();

      /* El botón nace APAGADO: la comprobación va sobre el estado del control, no sobre pulsar y ver
       * qué pasa, porque pulsar un botón apagado no prueba nada. */
      expect(within(filaEditable()).getByRole('button', { name: 'Guardar' })).toBeDisabled();
      expect(guarda).not.toHaveBeenCalled();
    });

    it('con SKU se guarda y se avisa', async () => {
      const { guarda, avisos, asienta } = await monta();

      await userEvent.click(screen.getByRole('button', { name: /Añadir variante/ }));
      await asienta();
      const fila = filaEditable();
      await userEvent.type(within(fila).getByRole('textbox', { name: 'SKU' }), 'GORRO-ROJO-L');
      await userEvent.click(within(fila).getByRole('button', { name: 'Guardar' }));
      await asienta();

      expect(guarda).toHaveBeenCalled();
      expect(avisos.avisos().at(-1)?.tipo).toBe('success');
    });

    /** Un stock negativo sale de teclear un guion en un campo numérico sin tope por abajo. */
    it('unas existencias negativas no salen de la pantalla', async () => {
      const { guarda, asienta } = await monta();

      await userEvent.click(screen.getByRole('button', { name: /Añadir variante/ }));
      await asienta();
      const fila = filaEditable();
      await userEvent.type(within(fila).getByRole('textbox', { name: 'SKU' }), 'GORRO-ROJO-L');
      /* Se escribe el valor CRUDO en vez de teclearlo: un campo numérico del DOM simulado descarta el
       * signo mientras se teclea, y lo que hay que probar es qué pasa cuando el valor negativo YA está
       * en el campo —que es lo que ocurre al pegarlo o al llegar de un formulario reabierto—. */
      const stock = within(fila).getByRole('spinbutton', { name: 'Stock' }) as HTMLInputElement;
      stock.value = '-5';
      stock.dispatchEvent(new Event('input', { bubbles: true }));
      await asienta();

      expect(within(fila).getByRole('button', { name: 'Guardar' })).toBeDisabled();
      expect(guarda).not.toHaveBeenCalled();
    });

    it('si el servidor lo rechaza, se enseña SU motivo y la fila sigue abierta', async () => {
      const { avisos, asienta } = await monta({ guardar: 'falla' });

      await userEvent.click(screen.getByRole('button', { name: /Añadir variante/ }));
      await asienta();
      const fila = filaEditable();
      await userEvent.type(within(fila).getByRole('textbox', { name: 'SKU' }), 'GORRO-ROJO-L');
      await userEvent.click(within(fila).getByRole('button', { name: 'Guardar' }));
      await asienta();

      expect(avisos.avisos().at(-1)).toMatchObject({ tipo: 'error', mensaje: 'Ese SKU ya existe' });
      expect(filaEditable()).not.toBeNull();
    });
  });

  it('borrar PREGUNTA con el SKU delante', async () => {
    const { elimina, dialogo, asienta } = await monta();

    await userEvent.click(screen.getAllByRole('button', { name: 'Eliminar' })[0]);
    await asienta();

    expect(dialogo.actual()?.mensaje).toContain('GORRO-AZUL-M');
    dialogo.cierra(false);
    await asienta();
    expect(elimina).not.toHaveBeenCalled();
  });

  it('al borrar de verdad se avisa y se recarga', async () => {
    const { elimina, lista, cambiado, dialogo, asienta } = await monta();
    lista.mockClear();

    await userEvent.click(screen.getAllByRole('button', { name: 'Eliminar' })[0]);
    await asienta();
    dialogo.cierra(true);
    await asienta();

    expect(elimina).toHaveBeenCalledWith('v1');
    expect(lista).toHaveBeenCalled();
    /* La ficha de arriba enseña las mismas variantes: hay que avisarla o se queda con las viejas. */
    expect(cambiado).toHaveBeenCalled();
  });

  describe('la edición en lote', () => {
    it('guarda todas de una y dice cuántas', async () => {
      const { guardaLote, avisos, asienta } = await monta();

      await userEvent.click(screen.getByRole('button', { name: /Editar todas/ }));
      await asienta();
      await userEvent.click(screen.getByRole('button', { name: /Guardar todo/ }));
      await asienta();

      expect(guardaLote).toHaveBeenCalled();
      expect(avisos.avisos().at(-1)?.mensaje).toContain('2');
    });

    /** Lo tecleado en un lote que se canceló no puede reaparecer en el siguiente. */
    it('al volver a entrar, los borradores se rehacen desde la lista', async () => {
      const { asienta } = await monta();

      await userEvent.click(screen.getByRole('button', { name: /Editar todas/ }));
      await asienta();
      const campo = within(filaEditable()).getByRole('textbox', { name: 'SKU' });
      await userEvent.clear(campo);
      await userEvent.type(campo, 'BASURA');

      await userEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
      await asienta();
      await userEvent.click(screen.getByRole('button', { name: /Editar todas/ }));
      await asienta();

      expect(within(filaEditable()).getByRole('textbox', { name: 'SKU' })).toHaveValue(
        'GORRO-AZUL-M',
      );
    });
  });
});
