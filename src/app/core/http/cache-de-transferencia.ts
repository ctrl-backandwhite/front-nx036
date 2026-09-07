import { HttpRequest } from '@angular/common/http';
import { inject } from '@angular/core';
import { IDIOMA_POR_DEFECTO, MONEDA_POR_DEFECTO, PreferenciasService } from '../preferences/preferencias';
import { PaisDelUsuario } from './pais-del-usuario';

/**
 * Las preferencias con las que se genera el HTML al COMPILAR.
 *
 * <p>Al prerenderizar no hay navegador ni cookie que leer, así que el servicio de preferencias cae a sus
 * valores por defecto y no hay sesión de la que sacar un país. Es decir: todo lo que se guarda en la
 * caché de transferencia está calculado en español, a dólares y sin país de registro.
 */
export const PREFERENCIAS_DE_COMPILACION = {
  idioma: IDIOMA_POR_DEFECTO,
  moneda: MONEDA_POR_DEFECTO,
  pais: '',
} as const;

export interface PreferenciasEfectivas {
  readonly idioma: string;
  readonly moneda: string;
  readonly pais: string;
}

/**
 * Si lo que se guardó al compilar sirve para QUIEN está mirando.
 *
 * <p>Las tres cambian la respuesta del backend: la moneda decide los importes, el idioma decide los
 * títulos y los mensajes, y el país de registro decide el margen. Basta con que una no coincida para que
 * la respuesta guardada sea la de otra persona.
 */
export function sirveLoGuardadoAlCompilar(preferencias: PreferenciasEfectivas): boolean {
  return (
    preferencias.idioma === PREFERENCIAS_DE_COMPILACION.idioma &&
    preferencias.moneda === PREFERENCIAS_DE_COMPILACION.moneda &&
    preferencias.pais === PREFERENCIAS_DE_COMPILACION.pais
  );
}

/**
 * Quién puede reaprovechar las peticiones que viajan dentro del HTML prerenderizado.
 *
 * <p>DEFECTO QUE CIERRA ESTO: la caché de transferencia se indexa SOLO por método, dirección y
 * parámetros —está a la vista en `makeCacheKey` de `@angular/common/http`, que ni mira las cabeceras—. Y
 * la moneda, el idioma y el país viajan justamente en cabeceras. Resultado: quien entraba a una ficha
 * prerenderizada con el euro puesto se llevaba la respuesta en dólares que se guardó al compilar, y no se
 * corregía sola: la petición no llegaba a salir, así que los precios se quedaban mal TODA la visita, no
 * solo en el primer pintado. Se veía sobre todo en las fichas, que son las que se prerenderizan.
 *
 * <p>La alternativa era apagar la caché entera, y eso es tirar la mitad del beneficio de prerenderizar:
 * la página llegaría pintada y acto seguido volvería a pedir lo mismo. Así que se conserva para quien
 * coincide con lo que se compiló y se descarta para el resto, que vuelve a pedirlo y ve sus precios.
 *
 * <p>Al PRERENDERIZAR devuelve cierto siempre —ahí las preferencias SON las de compilación—, que es lo
 * que hace que se llegue a guardar algo. Si devolviera falso en el servidor no habría caché para nadie.
 */
export function filtraLaCacheDeTransferencia(_peticion: HttpRequest<unknown>): boolean {
  const preferencias = inject(PreferenciasService);
  const pais = inject(PaisDelUsuario);

  return sirveLoGuardadoAlCompilar({
    idioma: preferencias.idioma(),
    moneda: preferencias.moneda(),
    pais: pais.codigo(),
  });
}
