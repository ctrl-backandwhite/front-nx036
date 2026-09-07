import { DeferBlockBehavior } from '@angular/core/testing';
import { render, screen } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { AvisosStore } from '@ds/component/avisos/avisos.store';
import { DialogoStore } from '@ds/component/dialogo/dialogo.store';
import { AppError, creaError } from '@shared/error/app-error';
import { Result, exito, fallo } from '@shared/result/result';
import { LimiteDeTransportista } from '../../../domain/logistica/model/limite-transportista';
import { LIMITES_DE_TRANSPORTISTA_PORT } from '../../../domain/logistica/port/configuracion-logistica.port';
import {
  AlternaLimiteDeTransportista,
  BorraLimiteDeTransportista,
  ConsultaLimitesDeTransportista,
  GuardaLimiteDeTransportista,
} from '../../../application/logistica/use-case/configura-logistica.use-case';
import { LimitesDeTransportistaPage } from './limites-de-transportista.page';

/**
 * Los topes del transportista por canal y país: peso, medidas y divisor volumétrico.
 *
 * <p>De estas filas depende si un pedido se puede despachar, así que lo que se fija es cómo se LEEN.
 * Dos cosas en concreto:
 *
 * <ul>
 *   <li>el país comodín se NOMBRA —«Resto de países»— y nunca se enseña el asterisco a pelo, que no
 *       significa nada para quien administra;
 *   <li>y el peso y las medidas se pintan en su unidad legible, no en los gramos y milímetros crudos
 *       con los que viaja el dato: «2 kg» se comprueba de un vistazo contra el contrato del
 *       transportista, «2000» no.
 * </ul>
 */
function limite(parcial: Partial<LimiteDeTransportista> = {}): LimiteDeTransportista {
  return {
    canal: 'BPA',
    pais: 'ES',
    pesoMaximoGramos: 2000,
    divisorVolumetrico: 6000,
    minimoFacturableGramos: 100,
    largoMaximoMm: 600,
    anchoMaximoMm: 400,
    altoMaximoMm: 300,
    bultoUnico: true,
    activo: true,
    ...parcial,
  };
}

interface Opciones {
  limites?: readonly LimiteDeTransportista[];
  guardar?: 'falla';
}

async function monta(opciones: Opciones = {}) {
  const puerto = {
    lista: vi.fn(
      async (): Promise<Result<readonly LimiteDeTransportista[], AppError>> =>
        exito(opciones.limites ?? [limite(), limite({ canal: 'FZZXR', pais: '*' })]),
    ),
    guarda: vi.fn(
      async (_l: LimiteDeTransportista): Promise<Result<void, AppError>> =>
        opciones.guardar === 'falla'
          ? fallo(creaError('conflicto', 'Ese canal ya tiene límite'))
          : exito(undefined),
    ),
    borra: vi.fn(
      async (_canal: string, _pais: string): Promise<Result<void, AppError>> => exito(undefined),
    ),
  };

  const vista = await render(LimitesDeTransportistaPage, {
    deferBlockBehavior: DeferBlockBehavior.Playthrough,
    providers: [
      AvisosStore,
      DialogoStore,
      ConsultaLimitesDeTransportista,
      GuardaLimiteDeTransportista,
      AlternaLimiteDeTransportista,
      BorraLimiteDeTransportista,
      { provide: LIMITES_DE_TRANSPORTISTA_PORT, useValue: puerto },
    ],
  });
  await vista.fixture.whenStable();
  vista.fixture.detectChanges();
  await vista.fixture.whenStable();
  vista.fixture.detectChanges();

  const asienta = async () => {
    await new Promise((sigue) => setTimeout(sigue, 0));
    await vista.fixture.whenStable();
    vista.fixture.detectChanges();
    await vista.fixture.whenStable();
    vista.fixture.detectChanges();
  };

  const pantalla = vista.fixture.componentInstance as unknown as Record<
    string,
    (...args: never[]) => Promise<void> | void
  >;

  return {
    vista,
    asienta,
    pantalla,
    puerto,
    avisos: vista.fixture.debugElement.injector.get(AvisosStore),
    dialogo: vista.fixture.debugElement.injector.get(DialogoStore),
  };
}

describe('LimitesDeTransportistaPage', () => {
  beforeEach(() => {
    document.cookie = 'nx036-locale=es';
  });

  it('carga los límites al entrar', async () => {
    const { puerto } = await monta();

    expect(puerto.lista).toHaveBeenCalled();
    expect(screen.getAllByText(/BPA/).length).toBeGreaterThan(0);
  });

  it('un fallo al leerlos se cuenta', async () => {
    const puerto = {
      lista: vi.fn(async () => fallo(creaError('sin-conexion', 'No hay red'))),
      guarda: vi.fn(),
      borra: vi.fn(),
    };
    const vista = await render(LimitesDeTransportistaPage, {
      deferBlockBehavior: DeferBlockBehavior.Playthrough,
      providers: [
        AvisosStore,
        DialogoStore,
        ConsultaLimitesDeTransportista,
        GuardaLimiteDeTransportista,
        AlternaLimiteDeTransportista,
        BorraLimiteDeTransportista,
        { provide: LIMITES_DE_TRANSPORTISTA_PORT, useValue: puerto },
      ],
    });
    await vista.fixture.whenStable();
    vista.fixture.detectChanges();

    const avisos = vista.fixture.debugElement.injector.get(AvisosStore);
    expect(avisos.avisos().at(-1)).toMatchObject({ tipo: 'error', mensaje: 'No hay red' });
  });

  /** El asterisco a pelo no significa nada para quien administra. */
  it('el país comodín se NOMBRA, no se enseña el asterisco', async () => {
    const { vista } = await monta({ limites: [limite({ pais: '*' })] });

    const texto = vista.fixture.nativeElement.textContent as string;
    expect(texto).toContain('Resto de países');
  });

  /** «2 kg» se comprueba de un vistazo contra el contrato; «2000» no. */
  it('el peso se pinta en su unidad legible, no en gramos crudos', async () => {
    const { vista } = await monta({ limites: [limite({ pesoMaximoGramos: 2000 })] });

    const texto = vista.fixture.nativeElement.textContent as string;
    expect(texto).toMatch(/2([.,]0+)?\s?kg/i);
  });

  it('filtrar por canal deja solo sus filas', async () => {
    const { vista, pantalla, asienta } = await monta();

    (pantalla['seleccionDeCanal'] as unknown as { set(v: { canal: string }): void }).set({
      canal: 'FZZXR',
    });
    await asienta();

    const texto = vista.fixture.nativeElement.textContent as string;
    expect(texto).toContain('FZZXR');
  });

  it('abrir el alta enseña el formulario', async () => {
    const { asienta } = await monta();

    await userEvent.click(screen.getByRole('button', { name: /Añadir límite/ }));
    await asienta();

    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('alternar la actividad de una fila la guarda y recarga', async () => {
    const { pantalla, puerto, asienta } = await monta();
    puerto.lista.mockClear();

    await pantalla['alterna'](limite() as never);
    await asienta();

    expect(puerto.guarda).toHaveBeenCalled();
    expect(puerto.lista).toHaveBeenCalled();
  });

  describe('borrar un límite', () => {
    /** Sin ese límite, el destino pasa a usar el del comodín: hay que decirlo antes de borrar. */
    it('PREGUNTA nombrando el canal y el destino', async () => {
      const { pantalla, puerto, dialogo, asienta } = await monta();

      const enCurso = pantalla['borra'](limite({ pais: '*' }) as never);
      await asienta();

      expect(dialogo.actual()?.mensaje).toContain('BPA');
      /* El comodín se nombra también en la pregunta: «¿eliminar el límite para *?» no se entiende. */
      expect(dialogo.actual()?.mensaje).toContain('Resto de países');
      dialogo.cierra(false);
      await enCurso;
      expect(puerto.borra).not.toHaveBeenCalled();
    });

    it('y borra al confirmar', async () => {
      const { pantalla, puerto, dialogo, asienta } = await monta();

      const enCurso = pantalla['borra'](limite() as never);
      await asienta();
      dialogo.cierra(true);
      await enCurso;
      await asienta();

      expect(puerto.borra).toHaveBeenCalled();
    });
  });
});
