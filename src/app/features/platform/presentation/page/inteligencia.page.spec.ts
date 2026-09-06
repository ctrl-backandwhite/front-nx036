import { Component } from '@angular/core';
import { provideRouter } from '@angular/router';
import { TestBed } from '@angular/core/testing';
import { render, screen } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { Result, exito, fallo } from '@shared/result/result';
import { AppError, creaError } from '@shared/error/app-error';
import { AvisosStore } from '@ds/component/avisos/avisos.store';
import {
  AlertaDeTendencia,
  NuevaAlerta,
  ProductoGanador,
  TendenciaDeAnuncio,
} from '../../domain/model/inteligencia';
import { TasaDeCambio } from '../../domain/model/tasa-de-cambio';
import {
  ALERTAS_DE_TENDENCIA_PORT,
  AlertasDeTendenciaPort,
  TENDENCIAS_PORT,
  TendenciasPort,
} from '../../domain/port/inteligencia.port';
import { TASAS_DE_CAMBIO_PORT, TasasDeCambioPort } from '../../domain/port/tasas-de-cambio.port';
import { CreaAlertaDeTendencia } from '../../application/use-case/crea-alerta-de-tendencia.use-case';
import { InteligenciaPage } from './inteligencia.page';
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

class TendenciasFalsas implements TendenciasPort {
  fuentesPedidas: (string | undefined)[] = [];
  idiomasPedidos: string[] = [];

  async anuncios(fuente?: string): Promise<Result<readonly TendenciaDeAnuncio[], AppError>> {
    this.fuentesPedidas.push(fuente);
    return exito([
      {
        id: 'a1',
        fuente: 'tiktok',
        titular: 'Auriculares que arrasan',
        slugDeProducto: 'auriculares-tws',
        interacciones: 900,
        // Dato antiguo en la escala de 0 a 100: no se puede volver a multiplicar.
        puntuacion: 60,
        region: 'ES',
        capturadaEl: '2026-09-01T00:00:00Z',
      },
    ]);
  }

  async ventas(idioma: string): Promise<Result<readonly ProductoGanador[], AppError>> {
    this.idiomasPedidos.push(idioma);
    return exito([{ slug: 'gorra', titulo: 'Gorra', ventasMensuales: 300, precio: 72.4 }]);
  }

  async ganadores(): Promise<Result<readonly ProductoGanador[], AppError>> {
    return exito([]);
  }
}

class AlertasFalsas implements AlertasDeTendenciaPort {
  filas: readonly AlertaDeTendencia[] = [];
  creada: NuevaAlerta | null = null;
  respuestaDeCrear: Result<AlertaDeTendencia, AppError> = exito({
    id: 'a1',
    canal: 'EMAIL',
    activa: true,
    creadaEl: 'x',
  });

  async lista(): Promise<Result<readonly AlertaDeTendencia[], AppError>> {
    return exito(this.filas);
  }

  async crea(alerta: NuevaAlerta): Promise<Result<AlertaDeTendencia, AppError>> {
    this.creada = alerta;
    return this.respuestaDeCrear;
  }

  async elimina(): Promise<Result<void, AppError>> {
    return exito(undefined);
  }
}

class TasasFalsas implements TasasDeCambioPort {
  async consulta(): Promise<Result<readonly TasaDeCambio[], AppError>> {
    return exito([
      { codigo: 'USD', porDolar: 1 },
      { codigo: 'CNY', porDolar: 7.24 },
    ]);
  }
}

async function monta(tendencias = new TendenciasFalsas(), alertas = new AlertasFalsas()) {
  await render(InteligenciaPage, {
    providers: [
      provideRouter([{ path: '**', component: Vacia }]),
      CreaAlertaDeTendencia,
      { provide: TENDENCIAS_PORT, useValue: tendencias },
      { provide: ALERTAS_DE_TENDENCIA_PORT, useValue: alertas },
      { provide: TASAS_DE_CAMBIO_PORT, useValue: new TasasFalsas() },
    ],
  });
  return { tendencias, alertas };
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

describe('InteligenciaPage', () => {
  it('arranca en la pestaña de anuncios con su tabla', async () => {
    await monta();

    expect(await screen.findByText('Auriculares que arrasan')).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: t('intel.tab.ads') })).toHaveAttribute(
      'aria-selected',
      'true',
    );
  }, 20000);

  it('la puntuación se recorta a la escala de 0 a 100', async () => {
    // Con datos antiguos ya en esa escala, volver a multiplicar pintaba «6000/100».
    await monta();

    expect(await screen.findByText('60/100')).toBeInTheDocument();
  }, 20000);

  it('el titular con producto enlaza a su ficha', async () => {
    await monta();

    expect(await screen.findByRole('link', { name: 'Auriculares que arrasan' })).toHaveAttribute(
      'href',
      '/catalog/auriculares-tws',
    );
  }, 20000);

  it('filtrar por fuente vuelve a pedir los anuncios', async () => {
    const { tendencias } = await monta();
    await screen.findByText('Auriculares que arrasan');

    await userEvent.click(screen.getByRole('button', { name: 'amazon' }));

    expect(tendencias.fuentesPedidas).toContain('amazon');
  }, 20000);

  it('las rejillas de producto se piden en el idioma activo', async () => {
    // Sus títulos vienen ya traducidos del backend, no del diccionario de la interfaz.
    const { tendencias } = await monta();

    expect(tendencias.idiomasPedidos).toContain('es');
  }, 20000);

  it('crear una alerta manda el umbral en la escala del backend', async () => {
    const { alertas } = await monta();

    await userEvent.click(screen.getByRole('tab', { name: t('intel.tab.alerts') }));
    await userEvent.type(await screen.findByLabelText(t('intel.alert.keyword')), 'gorra', SIN_RETARDO);
    await userEvent.click(screen.getByRole('button', { name: rx('intel.add_alert') }));

    expect(alertas.creada).toEqual({ palabraClave: 'gorra', umbral: 0.75, canal: 'EMAIL' });
  }, 20000);

  it('si la alerta no llega a crearse, se DICE', async () => {
    // Quien la configuró se quedaría esperando un aviso que no va a llegar nunca.
    const alertas = new AlertasFalsas();
    alertas.respuestaDeCrear = fallo(creaError('peticion-invalida', 'Umbral no válido'));

    await monta(new TendenciasFalsas(), alertas);
    const avisos = TestBed.inject(AvisosStore);

    await userEvent.click(screen.getByRole('tab', { name: t('intel.tab.alerts') }));
    await userEvent.click(await screen.findByRole('button', { name: rx('intel.add_alert') }));

    expect(avisos.avisos()[0]?.mensaje).toBe('Umbral no válido');
  }, 20000);

  it('sin alertas enseña el vacío', async () => {
    await monta();

    await userEvent.click(screen.getByRole('tab', { name: t('intel.tab.alerts') }));

    expect(await screen.findByText(t('intel.empty.alerts'))).toBeInTheDocument();
  }, 20000);
});
