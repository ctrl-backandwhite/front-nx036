import { InjectionToken } from '@angular/core';
import { Result } from '@shared/result/result';
import { AppError } from '@shared/error/app-error';
import { PlataformaDeTienda, SolicitudDeConexion, TiendaConectada } from '../model/tienda';

/**
 * Las tiendas que alguien tiene conectadas: verlas, conectar una más, sincronizar y desconectar.
 *
 * <p>Este contexto NO tiene un puerto único. El módulo del que sale —`api/platform.ts` del front de
 * React— era un cajón de sastre con sesenta y nueve endpoints de diez áreas distintas: notificaciones,
 * tiques, almacenes, academia, mentores, tiendas, aprovisionamiento, inteligencia, ODM e impresión.
 * Convertirlo en una interfaz habría dado el `ApiPort` de cuarenta métodos que las normas prohíben, y
 * cualquier doble de prueba habría tenido que fingir los cuarenta para probar dos.
 *
 * <p>Así que se parte por CAPACIDAD: un puerto por lo que se quiere PODER hacer, no por el fichero del
 * que venía. Quien pinta el mosaico de plataformas disponibles no necesita saber desconectar nada.
 */
export interface TiendasConectadasPort {
  lista(): Promise<Result<readonly TiendaConectada[], AppError>>;
  conecta(solicitud: SolicitudDeConexion): Promise<Result<TiendaConectada, AppError>>;
  sincroniza(id: string): Promise<Result<TiendaConectada, AppError>>;
  desconecta(id: string): Promise<Result<void, AppError>>;
}

export const TIENDAS_CONECTADAS_PORT = new InjectionToken<TiendasConectadasPort>(
  'TiendasConectadasPort',
);

/**
 * El catálogo de plataformas que se pueden conectar, con cuáles están de verdad disponibles.
 *
 * <p>Puerto aparte del anterior porque cambia a otro ritmo —es casi una tabla fija— y porque lo consume
 * gente distinta: el mosaico del estado vacío y el desplegable del formulario solo necesitan esto.
 */
export interface PlataformasDeTiendaPort {
  lista(): Promise<Result<readonly PlataformaDeTienda[], AppError>>;
}

export const PLATAFORMAS_DE_TIENDA_PORT = new InjectionToken<PlataformasDeTiendaPort>(
  'PlataformasDeTiendaPort',
);
