import { Component, signal } from '@angular/core';
import { render, screen } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { AvisosStore } from '@ds/component/avisos/avisos.store';
import { DialogoStore } from '@ds/component/dialogo/dialogo.store';
import { AppError, creaError } from '@shared/error/app-error';
import { Result, exito, fallo } from '@shared/result/result';
import { RegionFiscal } from '../../../domain/logistica/model/impuesto';
import { IMPUESTOS_PORT } from '../../../domain/logistica/port/configuracion-logistica.port';
import {
  AlternaRegionFiscal,
  BorraRegionFiscal,
  ConsultaImpuestos,
  GuardaRegionFiscal,
} from '../../../application/logistica/use-case/gestiona-impuestos.use-case';
import { RegionesFiscales } from './regiones-fiscales';

/**
 * Las regiones fiscales de un país: los estados y provincias donde el impuesto NO es el nacional.
 *
 * <p>Todo gira alrededor de una distinción que se pierde en cuanto alguien la simplifica: **la tasa
 * VACÍA no es cero**. Vacío significa «usa la nacional»; cero significa exento. Confundirlas cambia lo
 * que se le cobra a quien compra en ese estado, y no da ningún error.
 *
 * <p>Y al cambiar de país el formulario se VACÍA. Dejar escrito lo del país anterior invita a guardarlo
 * en el nuevo sin darse cuenta, con un código de estado que allí no significa nada.
 */
@Component({
  selector: 'nx-anfitrion',
  imports: [RegionesFiscales],
  template: `<nx-regiones-fiscales [pais]="pais()" [nombreDelPais]="'España'" />`,
})
class Anfitrion {
  readonly pais = signal('ES');
}

function region(parcial: Partial<RegionFiscal> = {}): RegionFiscal {
  return {
    pais: 'ES',
    codigo: 'CN',
    nombre: 'Canarias',
    puntosBasicos: 700,
    porcentaje: 7,
    activo: true,
    posicion: 1,
    ...parcial,
  };
}

interface Opciones {
  regiones?: readonly RegionFiscal[];
  guardar?: 'falla';
}

async function monta(opciones: Opciones = {}) {
  const puerto = {
    lista: vi.fn(async () => exito([])),
    regiones: vi.fn(
      async (_pais: string): Promise<Result<readonly RegionFiscal[], AppError>> =>
        exito(opciones.regiones ?? [region()]),
    ),
    guardaRegion: vi.fn(
      async (_pais: string, _datos: unknown): Promise<Result<void, AppError>> =>
        opciones.guardar === 'falla'
          ? fallo(creaError('conflicto', 'Ese código ya existe'))
          : exito(undefined),
    ),
    borraRegion: vi.fn(async (_pais: string, _codigo: string) => exito(undefined)),
  };

  const vista = await render(Anfitrion, {
    providers: [
      AvisosStore,
      DialogoStore,
      ConsultaImpuestos,
      GuardaRegionFiscal,
      AlternaRegionFiscal,
      BorraRegionFiscal,
      { provide: IMPUESTOS_PORT, useValue: puerto },
    ],
  });
  await vista.fixture.whenStable();
  vista.fixture.detectChanges();

  const asienta = async () => {
    await new Promise((sigue) => setTimeout(sigue, 0));
    await vista.fixture.whenStable();
    vista.fixture.detectChanges();
    await vista.fixture.whenStable();
    vista.fixture.detectChanges();
  };

  return {
    vista,
    asienta,
    puerto,
    anfitrion: vista.fixture.componentInstance,
    avisos: vista.fixture.debugElement.injector.get(AvisosStore),
    dialogo: vista.fixture.debugElement.injector.get(DialogoStore),
  };
}

const campo = (nombre: string) => screen.getByRole('textbox', { name: nombre });
const tasa = () => screen.getByRole('spinbutton', { name: /Tasa propia/ });
const guardar = () => screen.getByRole('button', { name: /Guardar/ });

describe('RegionesFiscales', () => {
  beforeEach(() => {
    document.cookie = 'nx036-locale=es';
  });

  it('pide las regiones del país y las pinta', async () => {
    const { puerto } = await monta();

    expect(puerto.regiones).toHaveBeenCalledWith('ES');
    expect(screen.getByText('Canarias')).toBeInTheDocument();
  });

  it('un fallo al leerlas se cuenta en vez de dejar la tabla vacía en silencio', async () => {
    const { puerto, anfitrion, avisos, asienta } = await monta();
    puerto.regiones.mockResolvedValueOnce(fallo(creaError('sin-conexion', 'No hay red')));

    anfitrion.pais.set('FR');
    await asienta();

    /* Una tabla vacía sin explicación se lee como «este país no tiene regiones», que es una conclusión
     * distinta —y peligrosa— de «no se han podido leer». */
    expect(avisos.avisos().at(-1)).toMatchObject({ tipo: 'error', mensaje: 'No hay red' });
  });

  /** Guardar el código de un estado de EE.UU. en Francia no da error: da un impuesto mal aplicado. */
  it('al cambiar de país se vacía el formulario y se vuelve a pedir', async () => {
    const { puerto, anfitrion, asienta } = await monta();
    await userEvent.type(campo('Código'), 'CN');
    await userEvent.type(campo('Nombre'), 'Canarias');

    anfitrion.pais.set('FR');
    await asienta();

    expect(puerto.regiones).toHaveBeenCalledWith('FR');
    expect(campo('Código')).toHaveValue('');
    expect(campo('Nombre')).toHaveValue('');
  });

  describe('lo que no se puede guardar', () => {
    it('sin código ni nombre el botón está apagado', async () => {
      await monta();

      expect(guardar()).toBeDisabled();
    });

    it('una tasa fuera de rango tampoco: un impuesto del 300 % no existe', async () => {
      const { puerto, asienta } = await monta();

      await userEvent.type(campo('Código'), 'CN');
      await userEvent.type(campo('Nombre'), 'Canarias');
      await userEvent.type(tasa(), '300');
      await asienta();

      expect(guardar()).toBeDisabled();
      expect(puerto.guardaRegion).not.toHaveBeenCalled();
    });
  });

  /**
   * La tasa vacía es un VALOR: «usa la nacional». Rechazarla obligaría a teclear la tasa del país en
   * cada región que no tenga una propia, y cualquier cambio nacional dejaría todas desactualizadas.
   */
  it('la tasa VACÍA se puede guardar: significa «usa la nacional»', async () => {
    const { puerto, asienta } = await monta();

    await userEvent.type(campo('Código'), 'CT');
    await userEvent.type(campo('Nombre'), 'Cataluña');
    await userEvent.click(guardar());
    await asienta();

    expect(puerto.guardaRegion).toHaveBeenCalledWith(
      'ES',
      expect.objectContaining({ codigo: 'CT', nombre: 'Cataluña', porcentaje: '' }),
    );
  });

  it('si el servidor lo rechaza, se enseña SU motivo', async () => {
    const { avisos, asienta } = await monta({ guardar: 'falla' });

    await userEvent.type(campo('Código'), 'CT');
    await userEvent.type(campo('Nombre'), 'Cataluña');
    await userEvent.click(guardar());
    await asienta();

    expect(avisos.avisos().at(-1)).toMatchObject({ tipo: 'error', mensaje: 'Ese código ya existe' });
  });

  /** Convertir el vacío en cero al encender o apagar dejaría el estado exento sin que nadie lo pidiera. */
  it('encender o apagar una región CONSERVA su tasa, incluida la ausencia de tasa', async () => {
    const { puerto, asienta } = await monta({
      regiones: [region({ codigo: 'CT', nombre: 'Cataluña', porcentaje: null, puntosBasicos: null })],
    });

    await userEvent.click(screen.getAllByRole('button', { name: /Activo|Desactivar|Activar/ })[0]);
    await asienta();

    expect(puerto.guardaRegion).toHaveBeenCalledWith(
      'ES',
      expect.objectContaining({ codigo: 'CT', porcentaje: '', activo: false }),
    );
  });

  it('borrar PREGUNTA con el nombre y el código delante', async () => {
    const { puerto, dialogo, asienta } = await monta();

    await userEvent.click(screen.getAllByRole('button', { name: /Eliminar|Borrar/ })[0]);
    await asienta();

    expect(dialogo.actual()?.mensaje).toContain('Canarias (CN)');
    dialogo.cierra(false);
    await asienta();
    expect(puerto.borraRegion).not.toHaveBeenCalled();
  });

  it('y borra al confirmar', async () => {
    const { puerto, dialogo, asienta } = await monta();

    await userEvent.click(screen.getAllByRole('button', { name: /Eliminar|Borrar/ })[0]);
    await asienta();
    dialogo.cierra(true);
    await asienta();

    expect(puerto.borraRegion).toHaveBeenCalledWith('ES', 'CN');
  });
});
