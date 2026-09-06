import { TestBed } from '@angular/core/testing';
import { Result, exito, fallo } from '@shared/result/result';
import { AppError, creaError } from '@shared/error/app-error';
import { PlataformaDeTienda, SolicitudDeConexion, TiendaConectada } from '../../domain/model/tienda';
import { TIENDAS_CONECTADAS_PORT, TiendasConectadasPort } from '../../domain/port/tiendas.port';
import { ConectaTienda } from './conecta-tienda.use-case';

const PLATAFORMAS: readonly PlataformaDeTienda[] = [
  { codigo: 'shopify', etiqueta: 'Shopify', disponible: true },
  { codigo: 'prestashop', etiqueta: 'PrestaShop', disponible: false },
];

const TIENDA: TiendaConectada = {
  id: 't1',
  plataforma: 'shopify',
  identificador: 'mi-tienda.myshopify.com',
  estado: 'CONNECTED',
  creadaEl: '2026-09-01T00:00:00Z',
  publicaciones: 0,
};

/**
 * Un doble del puerto. Es de CUATRO métodos, no de cuarenta: eso es lo que se gana partiendo el cajón
 * de sastre de la API en puertos por capacidad.
 */
class TiendasFalsas implements TiendasConectadasPort {
  recibido: SolicitudDeConexion | null = null;
  respuesta: Result<TiendaConectada, AppError> = exito(TIENDA);

  async lista(): Promise<Result<readonly TiendaConectada[], AppError>> {
    return exito([TIENDA]);
  }

  async conecta(solicitud: SolicitudDeConexion): Promise<Result<TiendaConectada, AppError>> {
    this.recibido = solicitud;
    return this.respuesta;
  }

  async sincroniza(): Promise<Result<TiendaConectada, AppError>> {
    return exito(TIENDA);
  }

  async desconecta(): Promise<Result<void, AppError>> {
    return exito(undefined);
  }
}

describe('ConectaTienda', () => {
  let puerto: TiendasFalsas;
  let caso: ConectaTienda;

  beforeEach(() => {
    puerto = new TiendasFalsas();
    TestBed.configureTestingModule({
      providers: [ConectaTienda, { provide: TIENDAS_CONECTADAS_PORT, useValue: puerto }],
    });
    caso = TestBed.inject(ConectaTienda);
  });

  it('conecta una plataforma disponible', async () => {
    const resultado = await caso.ejecuta(
      { plataforma: 'shopify', identificador: 'mi-tienda.myshopify.com' },
      PLATAFORMAS,
    );

    expect(resultado.ok).toBe(true);
    expect(puerto.recibido?.plataforma).toBe('shopify');
  });

  it('recorta el identificador: un copiar y pegar deja un espacio al final', () => {
    return caso
      .ejecuta({ plataforma: 'shopify', identificador: '  mi-tienda.myshopify.com  ' }, PLATAFORMAS)
      .then(() => {
        expect(puerto.recibido?.identificador).toBe('mi-tienda.myshopify.com');
      });
  });

  it('NO llama al backend con una plataforma que todavía no existe', async () => {
    const resultado = await caso.ejecuta(
      { plataforma: 'prestashop', identificador: 'mi-tienda' },
      PLATAFORMAS,
    );

    expect(resultado.ok).toBe(false);
    expect(resultado.ok ? null : resultado.error.codigo).toBe('PLATAFORMA_NO_DISPONIBLE');
    // Lo importante: la petición no ha salido. Es lo que evita que el usuario crea que falló su token.
    expect(puerto.recibido).toBeNull();
  });

  it('deja pasar el fallo del servidor tal y como llega', async () => {
    puerto.respuesta = fallo(creaError('conflicto', 'Esa tienda ya está conectada'));

    const resultado = await caso.ejecuta(
      { plataforma: 'shopify', identificador: 'mi-tienda' },
      PLATAFORMAS,
    );

    expect(resultado.ok).toBe(false);
    expect(resultado.ok ? '' : resultado.error.mensaje).toBe('Esa tienda ya está conectada');
  });
});
