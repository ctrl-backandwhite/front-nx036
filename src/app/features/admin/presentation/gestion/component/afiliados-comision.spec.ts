import { render, screen } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { AvisosStore } from '@ds/component/avisos/avisos.store';
import { creaError } from '@shared/error/app-error';
import { exito, fallo } from '@shared/result/result';
import { FijaLaComisionDelAfiliado } from '../../../application/gestion/use-case/afiliados.use-case';
import { AfiliadosComision } from './afiliados-comision';

/**
 * El porcentaje de comisión de UN afiliado.
 *
 * <p>Regla del titular (25-sep-2026): aprobado el afiliado cobra el porcentaje base del programa, y se
 * le puede subir solo a su cuenta y a su código. Esta celda es la única forma de hacerlo desde el
 * panel; la caja de configuración de al lado cambia el de TODOS y no sirve para esto.
 *
 * <p>Lo que estaba roto antes: la columna existía en la base y se leía al calcular la comisión, pero no
 * había manera de escribirla. Siempre valía nulo.
 */
async function monta(
  opciones: { propia?: number; guardar?: 'falla' } = {},
): Promise<{ fija: ReturnType<typeof vi.fn>; cambio: ReturnType<typeof vi.fn> }> {
  const fija = vi.fn(async (_id: string, _pct: number | null) =>
    opciones.guardar === 'falla'
      ? fallo(creaError('peticion-invalida', 'No vale'))
      : exito(undefined),
  );
  const cambio = vi.fn();
  const vista = await render(AfiliadosComision, {
    inputs: {
      idDeAfiliado: 'a-1',
      porcentajeDelPrograma: 10,
      ...(opciones.propia !== undefined ? { comisionPropia: opciones.propia } : {}),
    },
    on: { cambia: cambio },
    providers: [AvisosStore, { provide: FijaLaComisionDelAfiliado, useValue: { ejecuta: fija } }],
  });
  await vista.fixture.whenStable();
  return { fija, cambio };
}

/**
 * Los rótulos, en los dos idiomas que puede resolver el diccionario durante las pruebas.
 *
 * <p>Hoy resuelve en inglés, pero buscar por el texto inglés a secas ata la prueba a ese detalle: el
 * día que el montaje cargue español, seis pruebas se caen sin que nada del componente haya cambiado.
 */
const BOTON_EDITAR = /cambiar su comisión|change their commission/i;
const BOTON_GUARDAR = /^(guardar|save)$/i;
const MARCA_PROPIA = /^(propia|own|própria|专属|propre|eigen)$/i;

/** Abre el editor y escribe lo que se le pase; cadena vacía = borrar el porcentaje propio. */
async function escribe(valor: string): Promise<void> {
  await userEvent.click(screen.getByRole('button', { name: BOTON_EDITAR }));
  const campo = screen.getByRole('spinbutton');
  await userEvent.clear(campo);
  if (valor !== '') {
    await userEvent.type(campo, valor);
  }
  await userEvent.click(screen.getByRole('button', { name: BOTON_GUARDAR }));
}

describe('AfiliadosComision', () => {
  it('sin porcentaje propio enseña el del programa', async () => {
    await monta();
    expect(screen.getByText('10%')).toBeTruthy();
    expect(screen.queryByText(MARCA_PROPIA)).toBeNull();
  });

  /**
   * Un 10 % propio y el 10 % general se leen igual. Sin la marca, al bajar el general uno se quedaría
   * donde estaba y nadie entendería por qué cobra distinto que el resto.
   */
  it('con porcentaje propio lo enseña y lo distingue del general', async () => {
    await monta({ propia: 18 });
    expect(screen.getByText('18%')).toBeTruthy();
    expect(screen.getByText(MARCA_PROPIA)).toBeTruthy();
  });

  it('guarda el porcentaje nuevo y avisa de que ya está', async () => {
    const { fija, cambio } = await monta();
    await escribe('25');
    expect(fija).toHaveBeenCalledWith('a-1', 25);
    expect(cambio).toHaveBeenCalled();
  });

  /** Vaciar el campo devuelve al afiliado al del programa: manda `null`, no cero. */
  it('vaciar el campo quita el porcentaje propio', async () => {
    const { fija } = await monta({ propia: 25 });
    await escribe('');
    expect(fija).toHaveBeenCalledWith('a-1', null);
  });

  /**
   * «Nulo o cero» es la confusión que más dinero ha costado en este repositorio. Un 0 % es dejar de
   * pagar a un afiliado sin expulsarlo, y tiene que poder escribirse y distinguirse de vaciar.
   */
  it('un cero por ciento se guarda como cero, no como vacío', async () => {
    const { fija } = await monta({ propia: 25 });
    await escribe('0');
    expect(fija).toHaveBeenCalledWith('a-1', 0);
  });

  it('no manda un porcentaje fuera de 0-100', async () => {
    const { fija, cambio } = await monta();
    await escribe('150');
    expect(fija).not.toHaveBeenCalled();
    expect(cambio).not.toHaveBeenCalled();
  });

  /** Si el guardado falla, el editor NO se cierra: cerrarlo haría creer que se guardó. */
  it('si el servidor rechaza, el editor sigue abierto', async () => {
    const { cambio } = await monta({ guardar: 'falla' });
    await escribe('25');
    expect(cambio).not.toHaveBeenCalled();
    expect(screen.getByRole('spinbutton')).toBeTruthy();
  });
});
