import { Service, inject } from '@angular/core';
import { TokenStore } from '@core/auth/token-store';
import { USUARIO_ACTUAL_PORT } from '../../domain/port/autenticacion.port';
import { destinoPorDefecto, destinoSeguro, pareceCredencial } from '../../domain/model/acceso-social';
import { DESTINO_TRAS_ACCESO_PORT } from '../../domain/port/destino-tras-acceso.port';
import { SesionStore } from '../state/sesion.store';

/**
 * Cerrar el acceso con Google o GitHub cuando el proveedor devuelve a la aplicación.
 *
 * <p>El backend trae los testigos en el FRAGMENTO de la dirección (`#token=…&refresh=…`), que no viaja
 * al servidor. De ahí salen las dos cautelas: se comprueba que lo recibido tenga forma de credencial
 * firmada —cualquiera puede escribir ese fragmento a mano— y se limpia la barra de direcciones para no
 * dejar testigos a la vista ni en el historial.
 *
 * <p>Devuelve ADÓNDE hay que ir; no navega. Navegar es cosa de la pantalla, y así este caso de uso se
 * prueba sin enrutador.
 */
@Service()
export class CompletaAccesoSocial {
  private readonly usuarioActual = inject(USUARIO_ACTUAL_PORT);
  private readonly tokens = inject(TokenStore);
  private readonly sesion = inject(SesionStore);
  private readonly destino = inject(DESTINO_TRAS_ACCESO_PORT);

  /**
   * @param fragmento lo que venía tras la almohadilla, ya sin ella.
   * @returns la ruta a la que llevar a quien acaba de entrar, o `null` si el retorno no era válido.
   */
  async ejecuta(fragmento: string): Promise<string | null> {
    const parametros = new URLSearchParams(fragmento);
    const token = parametros.get('token');
    const refresco = parametros.get('refresh');

    if (!pareceCredencial(token)) {
      return null;
    }
    this.tokens.guarda(token, pareceCredencial(refresco) ? refresco : null);

    // Si el perfil no responde —red caída, un 500— se sigue adelante igual: la sesión ya está guardada
    // y dejar a alguien mirando un giro para siempre es peor que llevarle al destino por defecto.
    const resultado = await this.usuarioActual.consulta();
    const usuario = resultado.ok ? resultado.valor : null;
    this.sesion.fija(usuario);

    // El destino se apuntó ANTES de saltar al proveedor: el salto sale del navegador y vuelve, así que
    // nada que estuviera solo en memoria sobrevive. Se consume de una vez para que no reaparezca en el
    // siguiente acceso.
    const guardado = this.destino.recoge();
    return destinoSeguro(guardado) ?? destinoPorDefecto(usuario?.rol);
  }
}
