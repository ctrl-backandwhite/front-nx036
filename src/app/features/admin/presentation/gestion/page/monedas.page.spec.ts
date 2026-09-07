import { render, screen, waitFor } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { exito, fallo } from '@shared/result/result';
import { creaError } from '@shared/error/app-error';
import { DialogoStore } from '@ds/component/dialogo/dialogo.store';
import { MONEDAS_PORT } from '../../../domain/gestion/port/sistema.port';
import { Divisa } from '../../../domain/gestion/model/dinero';
import {
  ConsultaDivisas, PublicaDivisas, SincronizaLasTasas,
} from '../../../application/gestion/use-case/sistema.use-case';
import { MonedasPage } from './monedas.page';
import { instalaObservadorDeVisibilidad } from '../pruebas/visibilidad';

/**
 * El DOM simulado de las pruebas NO trae `IntersectionObserver`, que es lo que usa `@defer (on
 * viewport)` para saber cuándo se llega a un bloque. Sin el doble, montar la pantalla revienta con
 * «IntersectionObserver is not defined» y el fallo parece del componente cuando es del entorno.
 */
instalaObservadorDeVisibilidad();

const divisa = (parcial: Partial<Divisa>): Divisa => ({
  codigo: 'USD',
  nombre: 'Dólar',
  simbolo: '$',
  tasaVsUsd: 1,
  activa: true,
  ...parcial,
});

function enEspanol(): void {
  document.cookie = 'nx036-locale=es';
}

/**
 * El corredor de pruebas es compartido y va con mucha carga: montar una pantalla entera cuesta
 * segundos, y el plazo de cinco que trae Vitest por defecto se agota sin que falle ninguna
 * comprobación. Se amplía el plazo del bloque, no las comprobaciones.
 */
const PLAZO_MS = 30_000;

describe('MonedasPage', { timeout: PLAZO_MS }, () => {
  const puerto = { lista: vi.fn(), sincroniza: vi.fn(), activa: vi.fn(), activaEnLote: vi.fn() };
  const dialogo = { confirma: vi.fn(), alerta: vi.fn() };

  const monta = () =>
    render(MonedasPage, {
      // SIN `Playthrough`, y es a propósito. Esta pantalla no tiene ningún bloque diferido: su
      // contenido se pinta al montar. Si alguien vuelve a esconderlo tras un `@defer`, estas pruebas
      // se ponen en rojo, que es justo lo que NO pasó en /admin/partners —allí el `Playthrough` los
      // pintaba a la fuerza y el defecto solo se vio midiendo en el navegador—.
      providers: [
        { provide: MONEDAS_PORT, useValue: puerto },
        { provide: DialogoStore, useValue: dialogo },
        ConsultaDivisas, SincronizaLasTasas, PublicaDivisas,
      ],
    });

  /** Sin retardo entre pulsaciones: el valor por defecto añade un turno del bucle por tecla. */
  let usuario: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    usuario = userEvent.setup({ delay: null });
    enEspanol();
    vi.resetAllMocks();
    puerto.lista.mockResolvedValue(exito([]));
    puerto.sincroniza.mockResolvedValue(exito(3));
    puerto.activa.mockResolvedValue(exito(undefined));
    puerto.activaEnLote.mockResolvedValue(exito(undefined));
    dialogo.alerta.mockResolvedValue(true);
  });

  it('avisa de la divisa sin tipo de cambio en su propia fila', async () => {
    puerto.lista.mockResolvedValue(
      exito([divisa({ codigo: 'COP', nombre: 'Peso', tasaVsUsd: 0, activa: false })]),
    );

    await monta();

    expect(await screen.findByText('sin tasa')).toBeInTheDocument();
  });

  /**
   * Sin tasa, la conversión devuelve el importe SIN convertir: el escaparate anunciaría 20 USD como
   * «20 000 COP» y el cobro, que lo hace el backend, no coincidiría con el anuncio.
   */
  it('activar una divisa sin tasa se bloquea y se explica con los códigos culpables', async () => {
    puerto.lista.mockResolvedValue(
      exito([divisa({ codigo: 'COP', nombre: 'Peso', tasaVsUsd: 0, activa: false })]),
    );

    await monta();
    await usuario.click(await screen.findByRole('button', { name: /Inactiva/ }));

    await waitFor(() =>
      expect(dialogo.alerta).toHaveBeenCalledWith(expect.stringContaining('COP'), undefined, 'error'),
    );
    expect(puerto.activa).not.toHaveBeenCalled();
  });

  it('desactivar nunca se bloquea: es la salida de emergencia', async () => {
    puerto.lista.mockResolvedValue(
      exito([divisa({ codigo: 'COP', nombre: 'Peso', tasaVsUsd: 0, activa: true })]),
    );

    await monta();
    await usuario.click(await screen.findByRole('button', { name: /Activa/ }));

    await waitFor(() => expect(puerto.activa).toHaveBeenCalledWith('COP', false));
    expect(dialogo.alerta).not.toHaveBeenCalled();
  });

  it('sincronizar dice cuántas tasas cambiaron', async () => {
    puerto.lista.mockResolvedValue(exito([divisa({})]));

    await monta();
    await usuario.click(await screen.findByRole('button', { name: 'Sincronizar tasas' }));

    await waitFor(() =>
      expect(dialogo.alerta).toHaveBeenCalledWith('Sincronizadas 3 tasas', undefined, 'success'),
    );
  });

  it('si la sincronización falla, se enseña el motivo', async () => {
    puerto.lista.mockResolvedValue(exito([divisa({})]));
    puerto.sincroniza.mockResolvedValue(fallo(creaError('sin-conexion', 'El proveedor no responde')));

    await monta();
    await usuario.click(await screen.findByRole('button', { name: 'Sincronizar tasas' }));

    await waitFor(() =>
      expect(dialogo.alerta).toHaveBeenCalledWith('El proveedor no responde', undefined, 'error'),
    );
  });
});
