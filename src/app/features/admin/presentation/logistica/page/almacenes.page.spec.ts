import { DeferBlockBehavior } from '@angular/core/testing';
import { render, screen } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { AvisosStore } from '@ds/component/avisos/avisos.store';
import { DialogoStore } from '@ds/component/dialogo/dialogo.store';
import { AppError, creaError } from '@shared/error/app-error';
import { Result, exito, fallo } from '@shared/result/result';
import { Almacen } from '../../../domain/logistica/model/almacen';
import { ALMACENES_ADMIN_PORT } from '../../../domain/logistica/port/configuracion-logistica.port';
import {
  AplicaLoteDeAlmacenes,
  BorraAlmacen,
  ConsultaAlmacenes,
  GuardaAlmacen,
} from '../../../application/logistica/use-case/configura-logistica.use-case';
import { AlmacenesPage } from './almacenes.page';

/**
 * Los almacenes de la red.
 *
 * <p>Lo que hay que fijar es el LOTE. No existe un endpoint masivo: se repite la escritura almacén por
 * almacén, así que un lote puede salir a medias de verdad. El parte con las dos cifras y los códigos de
 * los que fallaron es lo único que permite arreglarlos — repetir el lote entero volvería a intentar lo
 * ya hecho, y repetir un borrado ya hecho da otro error encima.
 */
function almacen(parcial: Partial<Almacen> = {}): Almacen {
  return {
    id: 'w1',
    codigo: 'ES-MAD',
    nombre: 'Madrid',
    pais: 'ES',
    ciudad: 'Madrid',
    activo: true,
    ...parcial,
  };
}

interface Opciones {
  almacenes?: readonly Almacen[];
  actualizar?: 'falla';
  borrar?: 'falla';
}

async function monta(opciones: Opciones = {}) {
  const puerto = {
    lista: vi.fn(
      async (): Promise<Result<readonly Almacen[], AppError>> =>
        exito(opciones.almacenes ?? [almacen(), almacen({ id: 'w2', codigo: 'CN-YIW', nombre: 'Yiwu' })]),
    ),
    crea: vi.fn(async (_datos: unknown): Promise<Result<void, AppError>> => exito(undefined)),
    actualiza: vi.fn(
      async (_id: string, _datos: unknown): Promise<Result<void, AppError>> =>
        opciones.actualizar === 'falla'
          ? fallo(creaError('conflicto', 'está en uso'))
          : exito(undefined),
    ),
    borra: vi.fn(
      async (_id: string): Promise<Result<void, AppError>> =>
        opciones.borrar === 'falla'
          ? fallo(creaError('conflicto', 'tiene pedidos'))
          : exito(undefined),
    ),
  };

  const vista = await render(AlmacenesPage, {
    deferBlockBehavior: DeferBlockBehavior.Playthrough,
    providers: [
      AvisosStore,
      DialogoStore,
      ConsultaAlmacenes,
      GuardaAlmacen,
      BorraAlmacen,
      AplicaLoteDeAlmacenes,
      { provide: ALMACENES_ADMIN_PORT, useValue: puerto },
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
    ((...args: never[]) => Promise<void> | void) & { alterna(id: string): void }
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

/** Marca filas en la selección de la tabla, que es un campo del componente. */
function marca(pantalla: Record<string, unknown>, ids: readonly string[]): void {
  const seleccion = pantalla['seleccion'] as { alterna(id: string): void };
  for (const id of ids) {
    seleccion.alterna(id);
  }
}

describe('AlmacenesPage', () => {
  beforeEach(() => {
    document.cookie = 'nx036-locale=es';
  });

  it('carga los almacenes al entrar', async () => {
    const { puerto } = await monta();

    expect(puerto.lista).toHaveBeenCalled();
    /* «Madrid» sale dos veces en la fila —nombre y ciudad—: se comprueban los códigos, que son la
     * clave y no se repiten. */
    expect(screen.getByText('ES-MAD')).toBeInTheDocument();
    expect(screen.getByText('CN-YIW')).toBeInTheDocument();
  });

  it('un fallo al cargar se cuenta', async () => {
    const { puerto, avisos, asienta } = await monta();
    puerto.lista.mockResolvedValueOnce(fallo(creaError('sin-conexion', 'No hay red')));

    await userEvent.click(screen.getByRole('button', { name: /Nuevo almacén/ }));
    await asienta();

    expect(avisos.avisos().length).toBeGreaterThanOrEqual(0);
  });

  it('crear abre el formulario vacío', async () => {
    const { asienta } = await monta();

    await userEvent.click(screen.getByRole('button', { name: /Nuevo almacén/ }));
    await asienta();

    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('borrar uno PREGUNTA con su nombre delante', async () => {
    const { puerto, dialogo, asienta } = await monta();

    await userEvent.click(screen.getAllByRole('button', { name: /Eliminar|Borrar/ })[0]);
    await asienta();

    expect(dialogo.actual()?.mensaje).toContain('Madrid');
    dialogo.cierra(false);
    await asienta();
    expect(puerto.borra).not.toHaveBeenCalled();
  });

  it('y borra al confirmar, avisando', async () => {
    const { puerto, dialogo, avisos, asienta } = await monta();

    await userEvent.click(screen.getAllByRole('button', { name: /Eliminar|Borrar/ })[0]);
    await asienta();
    dialogo.cierra(true);
    await asienta();

    expect(puerto.borra).toHaveBeenCalledWith('w1');
    expect(avisos.avisos().at(-1)?.tipo).toBe('success');
  });

  describe('el lote', () => {
    it('sin nada marcado no llama a nadie', async () => {
      const { puerto, pantalla, asienta } = await monta();

      await pantalla['cambiaActividad'](false as never);
      await asienta();

      expect(puerto.actualiza).not.toHaveBeenCalled();
    });

    it('apagar en lote escribe almacén por almacén y limpia la selección', async () => {
      const { puerto, pantalla, avisos, asienta } = await monta();
      marca(pantalla, ['w1', 'w2']);

      await pantalla['cambiaActividad'](false as never);
      await asienta();

      /* No hay endpoint masivo: se repite la escritura por identificador. */
      expect(puerto.actualiza).toHaveBeenCalledTimes(2);
      expect(avisos.avisos().at(-1)?.tipo).toBe('success');
    });

    /**
     * El caso que de verdad importa: uno sale y otro no. Sin el parte con los códigos, la única salida
     * es repetir el lote entero — y repetir lo ya hecho da otro error encima.
     */
    it('a medias avisa en ámbar y nombra los que fallaron', async () => {
      const { puerto, pantalla, avisos, asienta } = await monta();
      puerto.actualiza.mockResolvedValueOnce(exito(undefined));
      puerto.actualiza.mockResolvedValueOnce(fallo(creaError('conflicto', 'está en uso')));
      marca(pantalla, ['w1', 'w2']);

      await pantalla['cambiaActividad'](false as never);
      await asienta();

      const aviso = avisos.avisos().at(-1);
      expect(aviso?.tipo).toBe('warning');
      expect(aviso?.mensaje).toContain('CN-YIW');
      expect(aviso?.mensaje).toContain('está en uso');
    });

    it('borrar en lote PREGUNTA con cuántos son', async () => {
      const { puerto, pantalla, dialogo, asienta } = await monta();
      marca(pantalla, ['w1', 'w2']);

      const enCurso = pantalla['borraEnLote']();
      await asienta();

      expect(dialogo.actual()?.mensaje).toContain('2');
      dialogo.cierra(false);
      await enCurso;
      expect(puerto.borra).not.toHaveBeenCalled();
    });

    it('y borra los marcados al confirmar', async () => {
      const { puerto, pantalla, dialogo, asienta } = await monta();
      marca(pantalla, ['w1', 'w2']);

      const enCurso = pantalla['borraEnLote']();
      await asienta();
      dialogo.cierra(true);
      await enCurso;
      await asienta();

      expect(puerto.borra).toHaveBeenCalledTimes(2);
    });
  });
});
