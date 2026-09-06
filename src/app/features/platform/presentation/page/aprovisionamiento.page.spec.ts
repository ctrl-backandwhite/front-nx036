import { Component } from '@angular/core';
import { provideRouter } from '@angular/router';
import { TestBed } from '@angular/core/testing';
import { render, screen, within } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { Result, exito } from '@shared/result/result';
import { AppError } from '@shared/error/app-error';
import { DialogoStore } from '@ds/component/dialogo/dialogo.store';
import {
  AgenteResumido,
  Cotizacion,
  NuevaSolicitud,
  SolicitudDeAprovisionamiento,
} from '../../domain/model/aprovisionamiento';
import { TasaDeCambio } from '../../domain/model/tasa-de-cambio';
import {
  AGENTES_DE_APROVISIONAMIENTO_PORT,
  AgentesDeAprovisionamientoPort,
  COTIZACIONES_PORT,
  CotizacionesPort,
  SOLICITUDES_DE_APROVISIONAMIENTO_PORT,
  SolicitudesDeAprovisionamientoPort,
} from '../../domain/port/aprovisionamiento.port';
import { TASAS_DE_CAMBIO_PORT, TasasDeCambioPort } from '../../domain/port/tasas-de-cambio.port';
import { CreaSolicitudDeAprovisionamiento } from '../../application/use-case/crea-solicitud-de-aprovisionamiento.use-case';
import { AprovisionamientoPage } from './aprovisionamiento.page';
import es from '@shared/i18n/dictionary/es';
import en from '@shared/i18n/dictionary/en';

/**
 * El mismo texto que ve quien usa la aplicación.
 *
 * <p>Las pruebas consultan por el TEXTO, no por la clave técnica: es lo que ve quien abre la pantalla,
 * y es lo que se rompe si alguien cambia una clave por otra que no existe —el servicio devolvería la
 * clave escrita en crudo y la prueba lo delata—. Se resuelve con la misma cadena de respaldo que el
 * servicio: idioma activo, inglés, y si no, la clave.
 */
const t = (clave: string): string => es[clave] ?? en[clave] ?? clave;

/**
 * El texto de una clave como expresión, para cuando el elemento lleva algo más alrededor.
 *
 * <p>Se ESCAPA antes: hay textos con paréntesis, puntos suspensivos o interrogaciones, y esos
 * caracteres significan otra cosa dentro de una expresión regular. Sin escaparlos, la prueba pasaría
 * o fallaría por motivos que no tienen nada que ver con lo que se está comprobando.
 */
const rx = (clave: string): RegExp => new RegExp(t(clave).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));

@Component({ selector: 'nx-vacia', template: '' })
class Vacia {}

const SOLICITUD: SolicitudDeAprovisionamiento = {
  id: 's1',
  urlDeOrigen: 'https://detail.1688.com/offer/1.html',
  origen: '1688',
  estado: 'QUOTING',
  tituloOrientativo: 'Botella térmica',
  creadaEl: '2026-09-01T10:00:00Z',
  cuantasCotizaciones: 1,
};

const COTIZACION: Cotizacion = {
  id: 'q1',
  idSolicitud: 's1',
  agente: { id: 'a1', nombre: 'Wei', categoria: 'SENIOR', satisfaccion: 4.8, trabajosCompletados: 20 },
  precioEnCentimosUsd: 4500,
  diasEstimados: 12,
  estado: 'OPEN',
  creadaEl: '2026-09-02T00:00:00Z',
};

class SolicitudesFalsas implements SolicitudesDeAprovisionamientoPort {
  filas: readonly SolicitudDeAprovisionamiento[] = [SOLICITUD];
  cancelada: string | null = null;
  eliminada: string | null = null;
  creada: NuevaSolicitud | null = null;

  async mias(): Promise<Result<readonly SolicitudDeAprovisionamiento[], AppError>> {
    return exito(this.filas);
  }

  async crea(solicitud: NuevaSolicitud): Promise<Result<SolicitudDeAprovisionamiento, AppError>> {
    this.creada = solicitud;
    return exito(SOLICITUD);
  }

  async cancela(id: string): Promise<Result<SolicitudDeAprovisionamiento, AppError>> {
    this.cancelada = id;
    return exito({ ...SOLICITUD, estado: 'CANCELLED' });
  }

  async elimina(id: string): Promise<Result<void, AppError>> {
    this.eliminada = id;
    return exito(undefined);
  }
}

class CotizacionesFalsas implements CotizacionesPort {
  pedidas: string[] = [];

  async deLaSolicitud(id: string): Promise<Result<readonly Cotizacion[], AppError>> {
    this.pedidas.push(id);
    return exito([COTIZACION]);
  }

  async elige(): Promise<Result<SolicitudDeAprovisionamiento, AppError>> {
    return exito({ ...SOLICITUD, estado: 'APPROVED' });
  }
}

class AgentesFalsos implements AgentesDeAprovisionamientoPort {
  async lista(): Promise<Result<readonly AgenteResumido[], AppError>> {
    return exito([
      { id: 'a1', nombre: 'Wei', categoria: 'SENIOR', satisfaccion: 4.87, trabajosCompletados: 120 },
    ]);
  }
}

class TasasFalsas implements TasasDeCambioPort {
  async consulta(): Promise<Result<readonly TasaDeCambio[], AppError>> {
    return exito([{ codigo: 'USD', porDolar: 1 }]);
  }
}

async function monta(solicitudes = new SolicitudesFalsas(), cotizaciones = new CotizacionesFalsas()) {
  await render(AprovisionamientoPage, {
    providers: [
      provideRouter([{ path: '**', component: Vacia }]),
      CreaSolicitudDeAprovisionamiento,
      { provide: SOLICITUDES_DE_APROVISIONAMIENTO_PORT, useValue: solicitudes },
      { provide: COTIZACIONES_PORT, useValue: cotizaciones },
      { provide: AGENTES_DE_APROVISIONAMIENTO_PORT, useValue: new AgentesFalsos() },
      { provide: TASAS_DE_CAMBIO_PORT, useValue: new TasasFalsas() },
    ],
  });
  return { solicitudes, cotizaciones };
}


/**
 * El idioma activo se fija a español ANTES de montar nada.
 *
 * <p>El servicio de preferencias lo deduce de la cookie y, si no la hay, del idioma del navegador. En
 * el entorno de pruebas ese idioma es el inglés, así que sin fijarlo las comprobaciones dependerían de
 * la máquina donde se ejecutan: la misma prueba pasaría aquí y fallaría en otro equipo.
 */
/**
 * Escribir SIN retardo entre teclas.
 *
 * <p>El valor por defecto simula a alguien tecleando, y un formulario de tres campos se come el plazo
 * de la prueba. Aquí no se está midiendo la mecanografía de nadie.
 */
const SIN_RETARDO = { delay: null };

beforeEach(() => {
  document.cookie = 'nx036-locale=es; Path=/';
});

describe('AprovisionamientoPage', () => {
  it('lista las solicitudes con su estado y su enlace de origen', async () => {
    await monta();

    expect(await screen.findByText(t('sourcing.status.QUOTING'))).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /1688/ })).toHaveAttribute(
      'href',
      'https://detail.1688.com/offer/1.html',
    );
  }, 20000);

  it('el enlace al mercado ajeno no filtra de dónde viene', async () => {
    await monta();

    expect(await screen.findByRole('link', { name: /1688/ })).toHaveAttribute(
      'rel',
      'noopener noreferrer',
    );
  }, 20000);

  it('las cotizaciones SOLO se piden al desplegar la tarjeta', async () => {
    // Veinte solicitudes serían veinte peticiones que casi nadie mira.
    const { cotizaciones } = await monta();
    await screen.findByText(t('sourcing.status.QUOTING'));
    expect(cotizaciones.pedidas).toEqual([]);

    await userEvent.click(screen.getByRole('button', { name: rx('sourcing.quotes') }));

    expect(cotizaciones.pedidas).toEqual(['s1']);
    expect(await screen.findByText('Wei')).toBeInTheDocument();
  }, 20000);

  it('sin solicitudes enseña el vacío', async () => {
    const puerto = new SolicitudesFalsas();
    puerto.filas = [];

    await monta(puerto);

    expect(await screen.findByText(t('sourcing.empty'))).toBeInTheDocument();
  }, 20000);

  it('cancelar es reversible y NO pregunta; eliminar es definitivo y SÍ pregunta', async () => {
    const { solicitudes } = await monta();
    const dialogo = TestBed.inject(DialogoStore);

    await userEvent.click(await screen.findByRole('button', { name: t('actions.cancel') }));
    expect(solicitudes.cancelada).toBe('s1');

    await userEvent.click(screen.getByRole('button', { name: t('actions.delete') }));
    expect(dialogo.actual()?.clase).toBe('confirm');
    expect(solicitudes.eliminada).toBeNull();
  }, 20000);

  it('una solicitud ya aprobada no ofrece cancelar: hay un pedido detrás', async () => {
    const puerto = new SolicitudesFalsas();
    puerto.filas = [{ ...SOLICITUD, estado: 'APPROVED' }];

    await monta(puerto);

    await screen.findByText(t('sourcing.status.APPROVED'));
    expect(screen.queryByRole('button', { name: t('actions.cancel') })).toBeNull();
  }, 20000);

  it('un enlace de un mercado no soportado se rechaza SIN llamar al backend', async () => {
    const { solicitudes } = await monta();

    await userEvent.click(await screen.findByRole('button', { name: rx('sourcing.new') }));
    const formulario = await screen.findByRole('dialog');
    await userEvent.type(within(formulario).getByLabelText(t('sourcing.url')), 'https://otra-tienda.example/p', SIN_RETARDO);
    // Dentro del formulario: «Nueva solicitud» también es el botón de la cabecera.
    await userEvent.click(within(formulario).getByRole('button', { name: t('sourcing.new') }));

    expect(await screen.findByRole('alert')).toHaveTextContent(t('sourcing.url.unsupported'));
    expect(solicitudes.creada).toBeNull();
  }, 20000);

  it('la pestaña de agentes enseña el escaparate', async () => {
    await monta();

    await userEvent.click(screen.getByRole('tab', { name: t('sourcing.tab.agents') }));

    expect(await screen.findByText('Wei')).toBeInTheDocument();
    expect(screen.getByText('4.87')).toBeInTheDocument();
  }, 20000);
});
