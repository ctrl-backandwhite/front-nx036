import { Injectable, inject } from '@angular/core';
import { Result, fallo } from '@shared/result/result';
import { AppError, creaError } from '@shared/error/app-error';
import { PlataformaDeTienda, SolicitudDeConexion, TiendaConectada, estaDisponible } from '../../domain/model/tienda';
import { TIENDAS_CONECTADAS_PORT } from '../../domain/port/tiendas.port';

/**
 * Conectar una tienda.
 *
 * <p>Existe por la comprobación previa: una plataforma anunciada como «Próximamente» no se conecta, y
 * preguntarlo aquí ahorra una llamada que el backend iba a rechazar. Sin este paso, el usuario pegaba
 * su token, veía un error genérico y lo interpretaba como que lo había copiado mal — el error habitual
 * al conectar una tienda es justo ese, así que confundir los dos casos es especialmente caro.
 *
 * <p>El identificador se recorta antes de enviarlo: `my-shop.myshopify.com ` con un espacio al final es
 * lo que sale de un copiar y pegar, y el backend no encuentra la tienda.
 */
@Injectable()
export class ConectaTienda {
  private readonly tiendas = inject(TIENDAS_CONECTADAS_PORT);

  async ejecuta(
    solicitud: SolicitudDeConexion,
    plataformas: readonly PlataformaDeTienda[],
  ): Promise<Result<TiendaConectada, AppError>> {
    if (!estaDisponible(plataformas, solicitud.plataforma)) {
      // El mensaje sale del diccionario en la pantalla: el código va aquí para que se pueda distinguir
      // de un rechazo del servidor sin comparar textos.
      return fallo(creaError('peticion-invalida', '', { codigo: 'PLATAFORMA_NO_DISPONIBLE' }));
    }
    return this.tiendas.conecta({
      ...solicitud,
      identificador: solicitud.identificador.trim(),
    });
  }
}
