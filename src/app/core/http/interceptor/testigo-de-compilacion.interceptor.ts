import { HttpInterceptorFn } from '@angular/common/http';
import { PLATFORM_ID, inject } from '@angular/core';
import { isPlatformServer } from '@angular/common';
import { cabecerasDeCompilacion } from '@core/config/backend-al-construir';

/**
 * Identifica ante el backend las peticiones hechas MIENTRAS SE GENERA EL HTML.
 *
 * <p>El backend limita el escaparate público a 100 peticiones por minuto y por IP: es su defensa
 * contra el volcado masivo del catálogo, y está bien que exista. El problema es que prerenderizar
 * fichas es, visto desde ahí, exactamente un volcado —el compilador pide las fichas tan deprisa como
 * puede— y en ese cupo no caben más de unas quince. Las demás se escribían con la pantalla de «no se ha
 * podido cargar este producto» dentro, y la compilación terminaba en verde.
 *
 * <p>Esta cabecera es lo que distingue «somos nosotros compilando» de «alguien está vaciando el
 * catálogo». Lo que concede al otro lado es un CUPO MÁS ALTO, no la ausencia de límite, y solo para los
 * GET del catálogo público: si el testigo se filtrase, quien lo tenga podría leer más deprisa, no
 * vaciar la tienda sin freno ni tocar la autenticación.
 *
 * <p>En el NAVEGADOR no hace nada, y esa es la mitad importante: el testigo no puede acabar dentro del
 * paquete que se descarga cualquiera. Aquí solo existe porque este mismo código corre también en Node
 * al compilar, que es cuando la variable de entorno está puesta.
 *
 * <p>Va DESPUÉS del reintento ante el 429 a propósito. El reintento rehace la petición entera, así que
 * la repetición vuelve a pasar por aquí y también lleva el testigo; al revés, la primera llevaría
 * cabecera y las siguientes no.
 */
export const testigoDeCompilacionInterceptor: HttpInterceptorFn = (peticion, siguiente) => {
  if (!isPlatformServer(inject(PLATFORM_ID))) {
    return siguiente(peticion);
  }

  const cabeceras = cabecerasDeCompilacion();
  const nombres = Object.keys(cabeceras);
  if (nombres.length === 0) {
    return siguiente(peticion);
  }

  return siguiente(peticion.clone({ setHeaders: cabeceras }));
};
