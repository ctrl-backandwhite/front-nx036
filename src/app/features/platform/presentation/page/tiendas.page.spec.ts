import { render, screen } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { TestBed } from '@angular/core/testing';
import { Result, exito, fallo } from '@shared/result/result';
import { AppError, creaError } from '@shared/error/app-error';
import { DialogoStore } from '@ds/component/dialogo/dialogo.store';
import { PlataformaDeTienda, SolicitudDeConexion, TiendaConectada } from '../../domain/model/tienda';
import {
  PLATAFORMAS_DE_TIENDA_PORT,
  PlataformasDeTiendaPort,
  TIENDAS_CONECTADAS_PORT,
  TiendasConectadasPort,
} from '../../domain/port/tiendas.port';
import { ConectaTienda } from '../../application/use-case/conecta-tienda.use-case';
import { TiendasPage } from './tiendas.page';
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

const PLATAFORMAS: readonly PlataformaDeTienda[] = [
  { codigo: 'shopify', etiqueta: 'Shopify', disponible: true },
  { codigo: 'prestashop', etiqueta: 'PrestaShop', disponible: false },
];

function tienda(parcial: Partial<TiendaConectada> = {}): TiendaConectada {
  return {
    id: 't1',
    plataforma: 'shopify',
    identificador: 'mi-tienda.myshopify.com',
    estado: 'CONNECTED',
    creadaEl: '2026-09-01T00:00:00Z',
    publicaciones: 12,
    ...parcial,
  };
}

class TiendasFalsas implements TiendasConectadasPort {
  tiendas: readonly TiendaConectada[] = [];
  sincronizada: string | null = null;
  desconectada: string | null = null;
  respuestaDeSincronizar: Result<TiendaConectada, AppError> = exito(tienda());

  async lista(): Promise<Result<readonly TiendaConectada[], AppError>> {
    return exito(this.tiendas);
  }

  async conecta(solicitud: SolicitudDeConexion): Promise<Result<TiendaConectada, AppError>> {
    return exito(tienda({ identificador: solicitud.identificador }));
  }

  async sincroniza(id: string): Promise<Result<TiendaConectada, AppError>> {
    this.sincronizada = id;
    return this.respuestaDeSincronizar;
  }

  async desconecta(id: string): Promise<Result<void, AppError>> {
    this.desconectada = id;
    return exito(undefined);
  }
}

class PlataformasFalsas implements PlataformasDeTiendaPort {
  async lista(): Promise<Result<readonly PlataformaDeTienda[], AppError>> {
    return exito(PLATAFORMAS);
  }
}

async function monta(puerto: TiendasFalsas) {
  return render(TiendasPage, {
    providers: [
      ConectaTienda,
      { provide: TIENDAS_CONECTADAS_PORT, useValue: puerto },
      { provide: PLATAFORMAS_DE_TIENDA_PORT, useValue: new PlataformasFalsas() },
    ],
  });
}


/**
 * El idioma activo se fija a español ANTES de montar nada.
 *
 * <p>El servicio de preferencias lo deduce de la cookie y, si no la hay, del idioma del navegador. En
 * el entorno de pruebas ese idioma es el inglés, así que sin fijarlo las comprobaciones dependerían de
 * la máquina donde se ejecutan: la misma prueba pasaría aquí y fallaría en otro equipo.
 */
beforeEach(() => {
  document.cookie = 'nx036-locale=es; Path=/';
});

describe('TiendasPage', () => {
  it('sin tiendas enseña el mosaico de integraciones, no un mensaje vacío', async () => {
    // Una lista vacía sin salida es un callejón: desde aquí se empieza pulsando una plataforma.
    await monta(new TiendasFalsas());

    expect(await screen.findByText(t('shops.empty.title'))).toBeInTheDocument();
    expect(screen.getByText('Shopify')).toBeInTheDocument();
  }, 20000);

  it('marca como «próximamente» las integraciones que aún no existen y no deja pulsarlas', async () => {
    await monta(new TiendasFalsas());

    await screen.findByText('PrestaShop');
    const boton = screen.getByText('PrestaShop').closest('button');
    expect(boton).toBeDisabled();
  }, 20000);

  it('con tiendas enseña una tarjeta por cada una con su estado y sus publicaciones', async () => {
    const puerto = new TiendasFalsas();
    puerto.tiendas = [tienda()];

    await monta(puerto);

    expect(await screen.findByText('mi-tienda.myshopify.com')).toBeInTheDocument();
    expect(screen.getByText(t('shops.status.CONNECTED'))).toBeInTheDocument();
    expect(screen.getByText(/12/)).toBeInTheDocument();
  }, 20000);

  it('enseña el error de la última sincronización, que es lo que explica los cero productos', async () => {
    const puerto = new TiendasFalsas();
    puerto.tiendas = [
      tienda({
        publicaciones: 0,
        mensajeDeSincronizacion: '0 productos publicados',
        errorDeSincronizacion: 'Token sin permiso write_products',
      }),
    ];

    await monta(puerto);

    expect(await screen.findByRole('alert')).toHaveTextContent('Token sin permiso write_products');
  }, 20000);

  it('sincronizar avisa cuando falla: en silencio, el usuario repite el clic sin saber qué pasa', async () => {
    const puerto = new TiendasFalsas();
    puerto.tiendas = [tienda()];
    puerto.respuestaDeSincronizar = fallo(creaError('conflicto', 'La tienda no responde'));

    await monta(puerto);
    const dialogo = TestBed.inject(DialogoStore);

    await userEvent.click(await screen.findByRole('button', { name: rx('shops.action.sync') }));

    expect(puerto.sincronizada).toBe('t1');
    expect(dialogo.actual()?.mensaje).toBe('La tienda no responde');
  }, 20000);

  it('desconectar PREGUNTA antes, con el nombre de la tienda delante', async () => {
    const puerto = new TiendasFalsas();
    puerto.tiendas = [tienda()];

    await monta(puerto);
    const dialogo = TestBed.inject(DialogoStore);

    await userEvent.click(await screen.findByRole('button', { name: rx('shops.action.disconnect') }));

    expect(dialogo.actual()?.clase).toBe('confirm');
    // Todavía no se ha desconectado nada: falta confirmar.
    expect(puerto.desconectada).toBeNull();
  }, 20000);

  it('el formulario de conexión pide plataforma, identificador y token', async () => {
    await monta(new TiendasFalsas());

    await userEvent.click(
      (await screen.findAllByRole('button', { name: rx('shops.connect') }))[0],
    );

    expect(await screen.findByLabelText(t('shops.connect.platform'))).toBeInTheDocument();
    expect(screen.getByLabelText(t('shops.connect.handle'))).toBeInTheDocument();
    expect(screen.getByLabelText(t('shops.connect.token'))).toBeInTheDocument();
  }, 20000);
});
