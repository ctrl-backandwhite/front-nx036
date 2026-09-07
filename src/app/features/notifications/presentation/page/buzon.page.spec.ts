import { DeferBlockBehavior } from '@angular/core/testing';
import { render, screen } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { AvisosStore } from '@ds/component/avisos/avisos.store';
import { DialogoStore } from '@ds/component/dialogo/dialogo.store';
import { AppError, creaError } from '@shared/error/app-error';
import { Result, exito, fallo } from '@shared/result/result';
import { Aviso } from '../../domain/model/aviso';
import { BUZON_PORT, DIFUSION_DE_AVISOS_PORT, GESTION_DE_AVISOS_PORT } from '../../domain/port/avisos.port';
import { BuzonStore } from '../../application/state/buzon.store';
import { ConsultaElBuzon } from '../../application/use-case/consulta-el-buzon.use-case';
import { LeeUnAviso } from '../../application/use-case/lee-un-aviso.use-case';
import { MueveAvisos } from '../../application/use-case/mueve-avisos.use-case';
import { DifundeUnAviso } from '../../application/use-case/difunde-un-aviso.use-case';
import { BuzonPage } from './buzon.page';

/**
 * El buzón completo.
 *
 * <p>Tres cosas que se rompen sin hacer ruido:
 *
 * <ul>
 *   <li>Llegar desde la campana con `?n=<id>` tiene que abrir ESE aviso. Aterrizar en el primero
 *       obliga a buscar a mano el que se acaba de pulsar.
 *   <li>El borrado DEFINITIVO se pregunta siempre, también en lote: no tiene vuelta atrás.
 *   <li>Los botones del lote se sueltan pase lo que pase. Dejarlos apagados tras un fallo fue el
 *       defecto original, y la única salida era recargar la página.
 * </ul>
 */
function aviso(parcial: Partial<Aviso> = {}): Aviso {
  return {
    id: 'a1',
    tipoDeSuceso: 'ORDER_SHIPPED',
    titulo: 'Tu pedido va en camino',
    canal: 'INBOX',
    creadoEl: '2026-09-01T10:00:00Z',
    ...parcial,
  };
}

interface Opciones {
  avisos?: readonly Aviso[];
  n?: string;
  esDeLaCasa?: boolean;
  mover?: 'falla';
}

async function monta(opciones: Opciones = {}) {
  const avisos = opciones.avisos ?? [aviso(), aviso({ id: 'a2', titulo: 'Comisión aprobada' })];
  const respuestaDeMovimiento = (): Result<void, AppError> =>
    opciones.mover === 'falla' ? fallo(creaError('conflicto', 'No se pudo mover')) : exito(undefined);

  const buzonPuerto = {
    lista: vi.fn(async () => exito(avisos)),
    sinLeer: vi.fn(async () => exito(avisos.length)),
    marcaLeido: vi.fn(async (_id: string) => exito(undefined)),
    marcaTodosLeidos: vi.fn(async (): Promise<Result<void, AppError>> => exito(undefined)),
  };
  const gestion = {
    archiva: vi.fn(async (_id: string) => respuestaDeMovimiento()),
    desarchiva: vi.fn(async (_id: string) => respuestaDeMovimiento()),
    aLaPapelera: vi.fn(async (_id: string) => respuestaDeMovimiento()),
    restaura: vi.fn(async (_id: string) => respuestaDeMovimiento()),
    borraParaSiempre: vi.fn(async (_id: string) => respuestaDeMovimiento()),
    cambiaEstado: vi.fn(async (_id: string, _e: string) => respuestaDeMovimiento()),
  };
  const difusion = {
    envia: vi.fn(async (_d: unknown) => exito(12)),
    responde: vi.fn(async (_r: unknown): Promise<Result<void, AppError>> => exito(undefined)),
  };

  const vista = await render(BuzonPage, {
    deferBlockBehavior: DeferBlockBehavior.Playthrough,
    inputs: { esDeLaCasa: opciones.esDeLaCasa ?? true, n: opciones.n ?? '' },
    providers: [
      BuzonStore,
      ConsultaElBuzon,
      LeeUnAviso,
      MueveAvisos,
      DifundeUnAviso,
      AvisosStore,
      DialogoStore,
      { provide: BUZON_PORT, useValue: buzonPuerto },
      { provide: GESTION_DE_AVISOS_PORT, useValue: gestion },
      { provide: DIFUSION_DE_AVISOS_PORT, useValue: difusion },
    ],
  });
  await vista.fixture.whenStable();
  vista.fixture.detectChanges();

  const asienta = async () => {
    await vista.fixture.whenStable();
    vista.fixture.detectChanges();
    await vista.fixture.whenStable();
    vista.fixture.detectChanges();
  };

  return {
    vista,
    asienta,
    buzonPuerto,
    gestion,
    difusion,
    buzon: vista.fixture.debugElement.injector.get(BuzonStore),
    dialogo: vista.fixture.debugElement.injector.get(DialogoStore),
    avisosDePantalla: vista.fixture.debugElement.injector.get(AvisosStore),
  };
}

describe('BuzonPage', () => {
  beforeEach(() => {
    document.cookie = 'nx036-locale=es';
  });

  it('carga la bandeja al entrar', async () => {
    const { buzonPuerto } = await monta();

    expect(buzonPuerto.lista).toHaveBeenCalledWith('inbox');
    expect(screen.getByText('Tu pedido va en camino')).toBeInTheDocument();
  });

  /** Venir de un aviso y aterrizar en otro obliga a buscar a mano el que se acaba de pulsar. */
  it('llegando desde la campana se abre ESE aviso, no el primero', async () => {
    const { buzon, asienta } = await monta({ n: 'a2' });
    await asienta();

    expect(buzon.abierto()?.id).toBe('a2');
  });

  it('sin parámetro no se abre ninguno solo', async () => {
    const { buzon } = await monta();

    expect(buzon.abierto()).toBeNull();
  });

  it('cambiar de carpeta vuelve a pedir esa carpeta', async () => {
    const { buzonPuerto, asienta } = await monta();
    buzonPuerto.lista.mockClear();

    await userEvent.click(screen.getByRole('button', { name: /Papelera/ }));
    await asienta();

    expect(buzonPuerto.lista).toHaveBeenCalledWith('trash');
  });

  it('«marcar todas leídas» las marca y recarga', async () => {
    const { buzonPuerto, asienta } = await monta();
    buzonPuerto.lista.mockClear();

    await userEvent.click(screen.getByRole('button', { name: /Marcar todas leídas/ }));
    await asienta();

    expect(buzonPuerto.marcaTodosLeidos).toHaveBeenCalled();
    expect(buzonPuerto.lista).toHaveBeenCalled();
  });

  it('un fallo al marcar se cuenta, no se traga', async () => {
    const { buzonPuerto, avisosDePantalla, asienta } = await monta();
    buzonPuerto.marcaTodosLeidos.mockResolvedValueOnce(
      fallo(creaError('error-del-servidor', 'El servidor no pudo')),
    );

    await userEvent.click(screen.getByRole('button', { name: /Marcar todas leídas/ }));
    await asienta();

    expect(avisosDePantalla.avisos().at(-1)).toMatchObject({
      tipo: 'error',
      mensaje: 'El servidor no pudo',
    });
  });

  describe('el lote', () => {
    /** El borrado definitivo no tiene vuelta atrás: se pregunta siempre, también en lote. */
    it('borrar para siempre PREGUNTA, y no borra si se dice que no', async () => {
      const { buzon, gestion, dialogo, vista, asienta } = await monta();
      buzon.abreCarpeta('trash');
      buzon.alterna('a1');
      vista.fixture.detectChanges();

      /* Los mismos rótulos existen en la barra del lote y en cada fila: hay que pulsar el del LOTE,
       * que es el que lleva la selección, y no el de la primera fila. */
      await userEvent.click(screen.getAllByRole('button', { name: /Eliminar definitivamente/ })[0]);
      await asienta();

      expect(dialogo.actual()?.clase).toBe('confirm');
      expect(gestion.borraParaSiempre).not.toHaveBeenCalled();

      dialogo.cierra(false);
      await asienta();
      expect(gestion.borraParaSiempre).not.toHaveBeenCalled();
    });

    /**
     * Si un fallo dejara los botones apagados, la única salida sería recargar la página — con la
     * selección perdida y sin saber qué se llegó a mover.
     */
    it('tras un fallo los botones se sueltan igual', async () => {
      const { buzon, vista, avisosDePantalla, asienta } = await monta({ mover: 'falla' });
      buzon.alterna('a1');
      vista.fixture.detectChanges();

      await userEvent.click(screen.getAllByRole('button', { name: /^Archivar/ })[0]);
      await asienta();

      expect(avisosDePantalla.avisos().at(-1)?.tipo).toBe('error');
      expect(screen.getAllByRole('button', { name: /^Archivar/ })[0]).not.toBeDisabled();
    });
  });

  describe('gestionar un aviso abierto', () => {
    const pantalla = (vista: { componentInstance: unknown }) =>
      vista.componentInstance as unknown as Record<string, (...args: never[]) => Promise<void> | void>;

    it('cambiar el estado de gestión lo guarda y recarga', async () => {
      const { vista, gestion, buzonPuerto, buzon, asienta } = await monta({ n: 'a1' });
      await asienta();
      buzonPuerto.lista.mockClear();

      await pantalla(vista.fixture)['cambiaEstado']('IN_PROGRESS' as never);
      await asienta();

      expect(gestion.cambiaEstado).toHaveBeenCalledWith('a1', 'IN_PROGRESS');
      /* Se recarga para que la etiqueta de la lista y la del panel no puedan discrepar. */
      expect(buzonPuerto.lista).toHaveBeenCalled();
      expect(buzon.abierto()?.id).toBe('a1');
    });

    it('sin nada abierto, cambiar el estado no hace nada', async () => {
      const { vista, gestion, asienta } = await monta();

      await pantalla(vista.fixture)['cambiaEstado']('RESOLVED' as never);
      await asienta();

      expect(gestion.cambiaEstado).not.toHaveBeenCalled();
    });

    it('mover el abierto lo archiva', async () => {
      const { vista, gestion, asienta } = await monta({ n: 'a1' });
      await asienta();

      await pantalla(vista.fixture)['mueveElAbierto']('archiva' as never);
      await asienta();

      expect(gestion.archiva).toHaveBeenCalledWith('a1');
    });

    it('borrar para siempre UNO también pregunta antes', async () => {
      const { vista, gestion, dialogo, asienta } = await monta();

      const enCurso = pantalla(vista.fixture)['mueveUno']('a1' as never, 'borraParaSiempre' as never);
      await asienta();

      expect(dialogo.actual()?.clase).toBe('confirm');
      dialogo.cierra(false);
      await enCurso;
      expect(gestion.borraParaSiempre).not.toHaveBeenCalled();
    });

    it('un fallo al mover se cuenta', async () => {
      const { vista, avisosDePantalla, asienta } = await monta({ mover: 'falla' });

      await pantalla(vista.fixture)['mueveUno']('a1' as never, 'archiva' as never);
      await asienta();

      expect(avisosDePantalla.avisos().at(-1)).toMatchObject({
        tipo: 'error',
        mensaje: 'No se pudo mover',
      });
    });
  });

  it('responder a una petición de contacto avisa de que salió', async () => {
    const { vista, difusion, avisosDePantalla, asienta } = await monta();

    await (vista.fixture.componentInstance as unknown as Record<
      string,
      (r: unknown) => Promise<void>
    >)['responde']({ email: 'ana@ejemplo.com', asunto: 'Re: x', mensaje: 'Hola' });
    await asienta();

    expect(difusion.responde).toHaveBeenCalled();
    expect(avisosDePantalla.avisos().at(-1)?.tipo).toBe('success');
  });

  it('difundir un aviso dice a cuántos ha llegado', async () => {
    const { difusion, avisosDePantalla, vista } = await monta();

    await vista.fixture.componentInstance['difunde']({
      destino: 'ALL',
      titulo: 'Mantenimiento',
      cuerpo: 'El sábado',
    });
    vista.fixture.detectChanges();

    expect(difusion.envia).toHaveBeenCalled();
    expect(avisosDePantalla.avisos().at(-1)?.mensaje).toContain('12');
  });
});
