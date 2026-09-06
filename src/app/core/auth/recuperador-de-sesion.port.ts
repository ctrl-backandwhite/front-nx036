import { InjectionToken } from '@angular/core';

/**
 * «Averigua quién está dentro, si aún no se sabe».
 *
 * <p>Lo declara el NÚCLEO porque quien lo necesita es el guardián de rutas, que protege zonas de ocho
 * contextos distintos. Quien lo CUMPLE es «auth», que es el único que sabe pedirle la cuenta al backend.
 * El núcleo no gestiona identidad: declara el contrato y deja que lo implemente quien corresponde.
 *
 * <p>Sin esto, el guardián tendría que vivir dentro de «auth», y entonces cada contexto que quiera
 * proteger una ruta tendría que importar de las tripas de otro. Pasó: se llegaron a escribir OCHO
 * guardianes provisionales, uno por equipo, todos parecidos y ninguno igual.
 */
export interface RecuperadorDeSesionPort {
  /** Deja la sesión resuelta: o hay alguien dentro, o consta que no. No lanza. */
  asegura(): Promise<void>;
}

export const RECUPERADOR_DE_SESION = new InjectionToken<RecuperadorDeSesionPort>(
  'RecuperadorDeSesionPort',
);
