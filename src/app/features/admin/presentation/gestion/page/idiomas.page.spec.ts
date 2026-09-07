import { render, screen, waitFor } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { exito, fallo } from '@shared/result/result';
import { creaError } from '@shared/error/app-error';
import { DialogoStore } from '@ds/component/dialogo/dialogo.store';
import { IDIOMAS_PORT } from '../../../domain/gestion/port/sistema.port';
import { IdiomaDeTienda } from '../../../domain/gestion/model/sistema';
import {
  ActivaIdiomasEnLote, BorraElIdioma, ConsultaIdiomas, GuardaElIdioma,
} from '../../../application/gestion/use-case/sistema.use-case';
import { IdiomasPage } from './idiomas.page';
import { instalaObservadorDeVisibilidad } from '../pruebas/visibilidad';

/**
 * El DOM simulado de las pruebas NO trae `IntersectionObserver`, que es lo que usa `@defer (on
 * viewport)` para saber cuándo se llega a un bloque. Sin el doble, montar la pantalla revienta con
 * «IntersectionObserver is not defined» y el fallo parece del componente cuando es del entorno.
 */
instalaObservadorDeVisibilidad();

const idioma = (parcial: Partial<IdiomaDeTienda>): IdiomaDeTienda => ({
  id: '1',
  codigo: 'es',
  etiqueta: 'Español',
  posicion: 0,
  activo: true,
  porDefecto: true,
  ...parcial,
});

/** Las pruebas se corren en español: sin la cookie, el navegador de las pruebas pediría inglés. */
function enEspanol(): void {
  document.cookie = 'nx036-locale=es';
}

/**
 * El corredor de pruebas es compartido y va con mucha carga: montar una pantalla entera cuesta
 * segundos, y el plazo de cinco que trae Vitest por defecto se agota sin que falle ninguna
 * comprobación. Se amplía el plazo del bloque, no las comprobaciones.
 */
const PLAZO_MS = 30_000;

describe('IdiomasPage', { timeout: PLAZO_MS }, () => {
  const puerto = { lista: vi.fn(), guarda: vi.fn(), borra: vi.fn() };
  const dialogo = { confirma: vi.fn(), alerta: vi.fn() };

  const monta = () =>
    render(IdiomasPage, {
      // SIN `Playthrough`, y es a propósito. Esta pantalla no tiene ningún bloque diferido: su
      // contenido se pinta al montar. Si alguien vuelve a esconderlo tras un `@defer`, estas pruebas
      // se ponen en rojo, que es justo lo que NO pasó en /admin/partners —allí el `Playthrough` los
      // pintaba a la fuerza y el defecto solo se vio midiendo en el navegador—.
      providers: [
        { provide: IDIOMAS_PORT, useValue: puerto },
        { provide: DialogoStore, useValue: dialogo },
        ConsultaIdiomas, GuardaElIdioma, BorraElIdioma, ActivaIdiomasEnLote,
      ],
    });

  /** Sin retardo entre pulsaciones: el valor por defecto añade un turno del bucle por tecla. */
  let usuario: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    usuario = userEvent.setup({ delay: null });
    enEspanol();
    vi.resetAllMocks();
    puerto.lista.mockResolvedValue(exito([]));
    puerto.guarda.mockResolvedValue(exito(undefined));
    puerto.borra.mockResolvedValue(exito(undefined));
    dialogo.confirma.mockResolvedValue(true);
    dialogo.alerta.mockResolvedValue(true);
  });

  it('enseña los idiomas en el orden que decide quien administra, no en el que llegan', async () => {
    puerto.lista.mockResolvedValue(
      exito([
        idioma({ id: '2', codigo: 'ja', etiqueta: '日本語', posicion: 3, activo: false, porDefecto: false }),
        idioma({}),
      ]),
    );

    await monta();

    // Se ESPERA a que estén las tres filas: la tabla va tras un `@defer`, que se resuelve una
    // microtarea después de montar. `findAllByRole` se conforma con la primera —la cabecera— y
    // devolvía una lista de uno.
    await waitFor(() => {
      expect(screen.getAllByRole('row')).toHaveLength(3);
    });
    const filas = screen.getAllByRole('row');
    // La primera fila es la cabecera; después mandan las posiciones (0 antes que 3).
    expect(filas[1]).toHaveTextContent('Español');
    expect(filas[2]).toHaveTextContent('日本語');
  });

  /**
   * El aviso que de verdad importa: un idioma sin diccionario de interfaz deja la ficha traducida y el
   * menú, el carrito y el pago en inglés.
   */
  it('activar un idioma sin diccionario de interfaz pide permiso y, si se dice que no, no guarda', async () => {
    puerto.lista.mockResolvedValue(
      exito([idioma({ id: '2', codigo: 'ja', etiqueta: '日本語', activo: false, porDefecto: false })]),
    );
    dialogo.confirma.mockResolvedValue(false);

    await monta();
    await usuario.click(await screen.findByRole('button', { name: 'ja: Inactivo' }));

    await waitFor(() => expect(dialogo.confirma).toHaveBeenCalledWith(expect.stringContaining('ja')));
    expect(puerto.guarda).not.toHaveBeenCalled();
  });

  it('desactivar nunca pregunta: lo que hay que avisar es lo que se publica', async () => {
    puerto.lista.mockResolvedValue(
      exito([idioma({ id: '2', codigo: 'ja', etiqueta: '日本語', activo: true, porDefecto: false })]),
    );

    await monta();
    await usuario.click(await screen.findByRole('button', { name: 'ja: Activo' }));

    await waitFor(() =>
      expect(puerto.guarda).toHaveBeenCalledWith(expect.objectContaining({ codigo: 'ja', activo: false })),
    );
    expect(dialogo.confirma).not.toHaveBeenCalled();
  });

  it('el alta nace activa, así que también pide permiso y guarda el idioma nuevo', async () => {
    await monta();
    await usuario.type(screen.getByLabelText('Código'), 'ja');
    await usuario.click(screen.getByRole('button', { name: 'Añadir' }));

    await waitFor(() =>
      expect(puerto.guarda).toHaveBeenCalledWith(
        expect.objectContaining({ codigo: 'ja', activo: true, etiqueta: 'JA' }),
      ),
    );
    expect(dialogo.confirma).toHaveBeenCalled();
  });

  it('un rechazo del backend se enseña, no se traga', async () => {
    puerto.lista.mockResolvedValue(
      exito([idioma({ id: '2', codigo: 'ja', activo: false, porDefecto: false })]),
    );
    puerto.guarda.mockResolvedValue(fallo(creaError('conflicto', 'Ese idioma ya existe')));

    await monta();
    await usuario.click(await screen.findByRole('button', { name: 'ja: Inactivo' }));

    await waitFor(() =>
      expect(dialogo.alerta).toHaveBeenCalledWith('Ese idioma ya existe', undefined, 'error'),
    );
  });

  /** No hay endpoint masivo: se guarda uno a uno y el resumen dice cuántos quedaron sin cambiar. */
  it('el lote recorre los marcados y resume aciertos y fallos', async () => {
    puerto.lista.mockResolvedValue(
      exito([
        idioma({ id: '1', codigo: 'ja', activo: false, porDefecto: false }),
        idioma({ id: '2', codigo: 'ar', posicion: 1, activo: false, porDefecto: false }),
      ]),
    );
    puerto.guarda
      .mockResolvedValueOnce(exito(undefined))
      .mockResolvedValueOnce(fallo(creaError('sin-permiso', 'No puedes')));

    await monta();
    await usuario.click(await screen.findByLabelText('Seleccionar todo'));
    await usuario.click(screen.getByRole('button', { name: 'Activo' }));

    await waitFor(() =>
      expect(dialogo.alerta).toHaveBeenCalledWith(
        expect.stringContaining('ar: No puedes'), undefined, 'warning',
      ),
    );
    expect(puerto.guarda).toHaveBeenCalledTimes(2);
  });
});
