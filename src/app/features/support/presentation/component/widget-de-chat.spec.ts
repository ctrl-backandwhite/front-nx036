import { Component } from '@angular/core';
import { Router, provideRouter } from '@angular/router';
import { render, screen } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { ALMACEN_LOCAL } from '@core/storage/almacen.port';
import { AlmacenMemoriaAdapter } from '@core/storage/almacen-memoria.adapter';
import { MEMORIA_DE_SESION_PORT } from '../../domain/port/memoria-de-sesion.port';
import { ConversacionStore } from '../../application/state/conversacion.store';
import { PreguntaAlAsistente } from '../../application/use-case/pregunta-al-asistente.use-case';
import { WidgetDeChat } from './widget-de-chat';

/**
 * El chat de la esquina.
 *
 * <p>Dos comportamientos que no se ven mirando la pantalla y que cuestan caro perder:
 *
 * <ul>
 *   <li>Al preguntar algo que se traduce en una búsqueda, la rejilla de detrás se actualiza SOLO si ya
 *       se está en el catálogo. Fuera de él no se navega: sacar a alguien de la ficha que está leyendo,
 *       sin haberlo pedido, es peor que ofrecerle un enlace.
 *   <li>Al enviar, el campo se vacía Y se olvida que estaba tocado. Vaciarlo sin lo segundo lo deja en
 *       rojo pidiendo texto justo después de haber mandado la pregunta.
 * </ul>
 */
@Component({ selector: 'nx-vacia', template: '' })
class Vacia {}

interface Opciones {
  /** Adónde se ha navegado antes de abrir el chat. */
  rutaActual?: string;
  busqueda?: { consulta: string } | null;
}

async function monta(opciones: Opciones = {}) {
  const pregunta = {
    ejecuta: vi.fn(
      async (_mensaje: string, _idioma: string, _traduce: (clave: string) => string) => ({
        busqueda: opciones.busqueda ?? null,
      }),
    ),
  };

  const vista = await render(WidgetDeChat, {
    providers: [
      provideRouter([{ path: '**', component: Vacia }]),
      ConversacionStore,
      { provide: PreguntaAlAsistente, useValue: pregunta },
      { provide: ALMACEN_LOCAL, useValue: new AlmacenMemoriaAdapter() },
      { provide: MEMORIA_DE_SESION_PORT, useValue: { lee: () => null, guarda: () => undefined } },
    ],
  });
  const router = vista.fixture.debugElement.injector.get(Router);
  if (opciones.rutaActual) {
    await router.navigateByUrl(opciones.rutaActual);
  }
  const navega = vi.spyOn(router, 'navigate');
  await vista.fixture.whenStable();
  vista.fixture.detectChanges();

  return { vista, pregunta, navega };
}

const campo = () => document.querySelector<HTMLTextAreaElement | HTMLInputElement>('#chat-campo')!;

async function abre() {
  await userEvent.click(screen.getByRole('button', { name: 'Abrir el asistente' }));
}

describe('WidgetDeChat', () => {
  beforeEach(() => {
    document.cookie = 'nx036-locale=es';
  });

  it('nace cerrado: solo se ve el botón que lo abre', async () => {
    await monta();

    expect(screen.queryByRole('dialog')).toBeNull();
    expect(screen.getByRole('button', { name: 'Abrir el asistente' })).toBeInTheDocument();
  });

  it('al abrirlo aparece la conversación y el campo', async () => {
    await monta();

    await abre();

    expect(screen.getByRole('dialog', { name: 'Asistente de la tienda' })).toBeInTheDocument();
    expect(campo()).toBeInTheDocument();
  });

  it('un mensaje vacío no se manda', async () => {
    const { pregunta } = await monta();
    await abre();

    await userEvent.click(screen.getByRole('button', { name: 'Enviar' }));

    expect(pregunta.ejecuta).not.toHaveBeenCalled();
  });

  /** Un mensaje de solo espacios está tan vacío como uno sin nada. */
  it('un mensaje de solo espacios tampoco', async () => {
    const { pregunta } = await monta();
    await abre();

    await userEvent.type(campo(), '   ');
    await userEvent.click(screen.getByRole('button', { name: 'Enviar' }));

    expect(pregunta.ejecuta).not.toHaveBeenCalled();
  });

  it('con texto se manda, el campo se vacía y se puede volver a escribir', async () => {
    const { pregunta, vista } = await monta();
    await abre();

    await userEvent.type(campo(), '¿tenéis gorros de lana?');
    await userEvent.click(screen.getByRole('button', { name: 'Enviar' }));
    await vista.fixture.whenStable();
    vista.fixture.detectChanges();

    expect(pregunta.ejecuta.mock.calls[0]![0]).toBe('¿tenéis gorros de lana?');
    expect(campo().value).toBe('');
    /* Vaciado y listo para la siguiente: el formulario se reinicia entero al enviar, así que la segunda
     * pregunta se comporta igual que la primera. */
    expect(screen.getByRole('button', { name: 'Enviar' })).toBeDisabled();

    await userEvent.type(campo(), 'otra más');
    expect(screen.getByRole('button', { name: 'Enviar' })).not.toBeDisabled();
  });

  describe('cuando la respuesta trae una búsqueda', () => {
    it('estando en el catálogo, la rejilla de detrás se actualiza', async () => {
      const { navega } = await monta({ rutaActual: '/catalog', busqueda: { consulta: 'gorro' } });
      await abre();

      await userEvent.type(campo(), 'gorros');
      await userEvent.click(screen.getByRole('button', { name: 'Enviar' }));

      expect(navega).toHaveBeenCalledWith(['/catalog'], {
        queryParams: { q: 'gorro' },
        replaceUrl: true,
      });
    });

    /** Sacar a alguien de la ficha que está leyendo, sin pedirlo, es peor que ofrecerle un enlace. */
    it('fuera del catálogo NO se navega', async () => {
      const { navega } = await monta({
        rutaActual: '/catalog/gorro-de-lana',
        busqueda: { consulta: 'gorro' },
      });
      await abre();

      await userEvent.type(campo(), 'gorros');
      await userEvent.click(screen.getByRole('button', { name: 'Enviar' }));

      expect(navega).not.toHaveBeenCalled();
    });

    it('sin búsqueda en la respuesta tampoco se navega', async () => {
      const { navega } = await monta({ rutaActual: '/catalog', busqueda: null });
      await abre();

      await userEvent.type(campo(), 'hola');
      await userEvent.click(screen.getByRole('button', { name: 'Enviar' }));

      expect(navega).not.toHaveBeenCalled();
    });
  });

  it('se puede cerrar y volver a abrir sin perder la conversación', async () => {
    const { vista } = await monta();
    await abre();
    const conversacion = vista.fixture.debugElement.injector.get(ConversacionStore);
    conversacion.anade({ de: 'yo', texto: 'hola' });
    vista.fixture.detectChanges();

    await userEvent.click(screen.getByRole('button', { name: 'Cerrar' }));
    expect(screen.queryByRole('dialog')).toBeNull();

    await abre();
    expect(screen.getByText('hola')).toBeInTheDocument();
  });
});
