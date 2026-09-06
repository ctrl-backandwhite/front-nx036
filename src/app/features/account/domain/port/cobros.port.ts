import { InjectionToken } from '@angular/core';
import { Result } from '@shared/result/result';
import { AppError } from '@shared/error/app-error';
import { ConfiguracionDeCobro, MetodoDePago } from '../model/cobro';

/** Los métodos de pago guardados, tal como los conoce NUESTRO backend. */
export interface MetodosDePagoPort {
  configuracion(): Promise<Result<ConfiguracionDeCobro, AppError>>;
  lista(): Promise<Result<readonly MetodoDePago[], AppError>>;
  marcaPorDefecto(referencia: string): Promise<Result<void, AppError>>;
  guardaPaypal(correo: string): Promise<Result<void, AppError>>;
  /** Paso 1 de la baja de un método: el servidor manda un código al correo. */
  pideCodigoDeBaja(referencia: string): Promise<Result<void, AppError>>;
  /** Paso 2: se elimina validando ese código. */
  elimina(referencia: string, codigo: string): Promise<Result<void, AppError>>;
  /**
   * Abre en el servidor la intención de guardar una tarjeta y devuelve su secreto de cliente.
   *
   * <p>El secreto lo consume la PASARELA, no nosotros: es lo que le autoriza a guardar una tarjeta a
   * nombre de esta cuenta. Nuestro backend nunca ve el número.
   */
  abreAltaDeTarjeta(): Promise<Result<string, AppError>>;
}

export const METODOS_DE_PAGO_PORT = new InjectionToken<MetodosDePagoPort>('MetodosDePagoPort');

/**
 * El hueco de la página donde la pasarela pinta su campo seguro.
 *
 * <p>Es lo ÚNICO que el dominio dice del asunto: «un sitio en la página». Qué se pinta ahí —un marco
 * aislado de otro dominio, un campo normal, nada— lo decide el adaptador, y la pantalla se limita a
 * ofrecer el hueco.
 */
export type HuecoDeTarjeta = HTMLElement;

/**
 * Un campo de tarjeta ya montado y vivo.
 *
 * <p>Se devuelve un MANEJADOR en vez de dejar que la pantalla hable con la pasarela porque así el orden
 * de montaje deja de ser una convención que se pierde al traducir: sin campo montado no hay manejador,
 * y sin manejador no hay forma de confirmar nada. En el original ese requisito vivía en un envoltorio
 * de React (`<Elements>`) y la única manera de saberlo era leer un comentario.
 */
export interface CampoDeTarjeta {
  /** Confirma el alta con el secreto que abrió el servidor. El número nunca sale del campo. */
  confirmaAlta(secretoDeCliente: string, titular: string): Promise<Result<void, AppError>>;
  /** Vacía lo tecleado sin desmontar el campo, para poder añadir otra tarjeta seguida. */
  limpia(): void;
  /** Suelta el campo. Se llama al destruir la pantalla o la ventana emergente. */
  destruye(): void;
}

/**
 * La pasarela de tarjetas, vista desde el negocio.
 *
 * <p>Detrás hay Stripe, pero ni el dominio ni las pantallas lo saben: aquí no aparece su nombre, ni sus
 * tipos, ni su ciclo de vida. Cambiar de proveedor —o poner un doble en una prueba— es escribir otro
 * adaptador y cambiar una línea en `account.providers.ts`.
 *
 * <p>La clave publicable se PASA como argumento en vez de que el adaptador la busque por su cuenta: ya
 * la ha leído quien pintó la sección, y volver a pedirla sería una segunda llamada para el mismo dato.
 */
export interface PasarelaDeTarjetaPort {
  monta(
    hueco: HuecoDeTarjeta,
    clavePublicable: string,
  ): Promise<Result<CampoDeTarjeta, AppError>>;
}

export const PASARELA_DE_TARJETA_PORT = new InjectionToken<PasarelaDeTarjetaPort>(
  'PasarelaDeTarjetaPort',
);
