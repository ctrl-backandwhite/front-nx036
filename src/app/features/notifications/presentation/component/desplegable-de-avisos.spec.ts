import { render, screen } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { provideRouter } from '@angular/router';
import { Component } from '@angular/core';
import { exito } from '@shared/result/result';
import { Aviso } from '../../domain/model/aviso';
import { BUZON_PORT } from '../../domain/port/avisos.port';
import { BuzonStore } from '../../application/state/buzon.store';
import { ConsultaElBuzon } from '../../application/use-case/consulta-el-buzon.use-case';
import { LeeUnAviso } from '../../application/use-case/lee-un-aviso.use-case';
import { DesplegableDeAvisos } from './desplegable-de-avisos';

/**
 * La campana de la cabecera.
 *
 * <p>Comparte el ALMACÉN del buzón con la página de notificaciones a propósito: marcar algo como leído
 * en la página tiene que apagar el contador de aquí sin que nadie lo sincronice a mano. Es el defecto
 * clásico de una campana con su propio estado: dos números distintos para la misma cosa.
 *
 * <p>Y consulta sola cada cierto tiempo. Ese reloj se cancela al desmontar, o cada navegación deja uno
 * más corriendo contra el backend, para siempre.
 */
@Component({ selector: 'nx-vacia', template: '' })
class Vacia {}

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

async function monta(avisos: readonly Aviso[] = [aviso()]) {
  const puerto = {
    lista: vi.fn(async () => exito(avisos)),
    sinLeer: vi.fn(async () => exito(avisos.filter((a) => !a.leidoEl).length)),
    marcaLeido: vi.fn(async (_id: string) => exito(undefined)),
    marcaTodosLeidos: vi.fn(async () => exito(undefined)),
  };

  const vista = await render(DesplegableDeAvisos, {
    providers: [
      provideRouter([{ path: '**', component: Vacia }]),
      BuzonStore,
      ConsultaElBuzon,
      LeeUnAviso,
      { provide: BUZON_PORT, useValue: puerto },
    ],
  });
  await vista.fixture.whenStable();
  vista.fixture.detectChanges();

  return { vista, puerto, buzon: vista.fixture.debugElement.injector.get(BuzonStore) };
}

const campana = () => screen.getByRole('button', { name: 'Notificaciones' });

describe('DesplegableDeAvisos', () => {
  beforeEach(() => {
    document.cookie = 'nx036-locale=es';
  });

  it('consulta el buzón al montarse, sin esperar a que nadie lo abra', async () => {
    const { puerto } = await monta();

    /* El contador tiene que estar bien ANTES de que se abra: es lo único que se ve de la campana. */
    expect(puerto.lista).toHaveBeenCalledWith('inbox');
  });

  /**
   * «Sin leer» aquí NO es solo «sin abrir»: un aviso abierto que sigue pendiente de gestionar cuenta
   * igual. Es a propósito —la campana del panel avisa de lo que queda POR HACER, no de lo que queda por
   * mirar— y es justo lo que se pierde al simplificar el contador a la fecha de lectura.
   */
  it('cuenta lo que queda por atender, no solo lo que está sin abrir', async () => {
    await monta([
      aviso({ id: 'a1' }),
      aviso({ id: 'a2', leidoEl: '2026-09-02T00:00:00Z', estado: 'RESOLVED' }),
    ]);

    await userEvent.click(campana());

    expect(screen.getByText('1')).toBeInTheDocument();
  });

  it('uno ya leído pero todavía pendiente SIGUE contando', async () => {
    await monta([aviso({ id: 'a1', leidoEl: '2026-09-02T00:00:00Z', estado: 'NEW' })]);

    expect(screen.getByText('1')).toBeInTheDocument();
  });

  it('cerrado no enseña la lista; al pulsar la campana se abre', async () => {
    await monta();

    expect(screen.queryByText('Tu pedido va en camino')).toBeNull();

    await userEvent.click(campana());

    expect(screen.getByText('Tu pedido va en camino')).toBeInTheDocument();
  });

  it('sin nada que enseñar lo dice, en vez de dejar el panel en blanco', async () => {
    await monta([]);

    await userEvent.click(campana());

    expect(screen.getByText('Sin notificaciones')).toBeInTheDocument();
  });

  it('«marcar todas» las marca y vuelve a consultar', async () => {
    const { puerto } = await monta();
    await userEvent.click(campana());
    puerto.lista.mockClear();

    await userEvent.click(screen.getByRole('button', { name: /Marcar todas leídas/ }));

    expect(puerto.marcaTodosLeidos).toHaveBeenCalled();
    /* Se vuelve a pedir la lista en vez de tocar el estado a mano: así lo que se ve es lo que hay en el
     * servidor, y no una versión optimista que puede no coincidir. */
    expect(puerto.lista).toHaveBeenCalled();
  });

  /**
   * El mismo almacén que la página del buzón. Sin compartirlo, marcar leído en la página dejaba la
   * campana con el número antiguo hasta la siguiente consulta automática.
   */
  it('lo que se marca en la página apaga el contador de la campana', async () => {
    const { vista, buzon } = await monta([aviso({ id: 'a1' })]);
    await userEvent.click(campana());
    expect(screen.getByText('1')).toBeInTheDocument();

    buzon.marcaLeidoAqui('a1');
    vista.fixture.detectChanges();

    expect(screen.queryByText('1')).toBeNull();
  });

  it('ofrece el camino al buzón completo', async () => {
    await monta();

    await userEvent.click(campana());

    expect(screen.getByRole('link', { name: /Ver todas/ })).toHaveAttribute(
      'href',
      '/admin/notifications',
    );
  });

  /** Cada navegación dejaría un reloj más consultando contra el backend, para siempre. */
  it('al desmontar deja de consultar sola', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    try {
      const { vista, puerto } = await monta();
      vista.fixture.destroy();
      puerto.lista.mockClear();

      await vi.advanceTimersByTimeAsync(10 * 60_000);

      expect(puerto.lista).not.toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });
});
