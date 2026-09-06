/**
 * El programa de referidos visto por quien participa en él.
 *
 * <p>Los importes viajan como CADENAS ya formateadas. El endpoint de afiliados manda céntimos y la
 * divisa en la que están, así que quien traduce del backend les da forma —sin aplicar ningún tipo de
 * cambio— y de aquí adentro solo circula texto listo para pintar. Así ninguna pantalla se ve tentada de
 * dividir entre cien.
 */
export type EstadoDeAfiliado = 'PENDING' | 'ACTIVE' | 'SUSPENDED';

export type EstadoDeComision = 'PENDING' | 'APPROVED' | 'PAID' | 'REJECTED';

/** Adónde se manda el dinero cuando se pide el cobro. */
export type MetodoDeCobro = 'WALLET' | 'BANK' | 'PAYPAL';

export const METODOS_DE_COBRO: readonly MetodoDeCobro[] = ['WALLET', 'BANK', 'PAYPAL'];

export interface CodigoDeReferido {
  readonly id: string;
  readonly codigo: string;
  readonly clics: number;
  /** Camino relativo del enlace; el dominio lo pone la pantalla, que es la que sabe dónde vive. */
  readonly camino: string;
}

export interface Comision {
  readonly id: string;
  readonly creadaEl?: string;
  readonly baseFormateada: string;
  readonly porcentaje: number;
  readonly importeFormateado: string;
  readonly estado: EstadoDeComision;
}

export interface EstadisticasDeAfiliado {
  readonly clics: number;
  readonly conversiones: number;
  readonly pendienteFormateado: string;
  readonly aprobadoFormateado: string;
  readonly pagadoFormateado: string;
}

export interface PanelDeAfiliado {
  readonly estado: EstadoDeAfiliado;
  readonly porcentajeDeComision: number;
  /** Falso mientras no se haya aceptado el programa. Sin esto no hay panel, hay una invitación. */
  readonly inscrito: boolean;
  readonly puedePedirCobro: boolean;
  readonly minimoDeCobroFormateado: string;
  readonly cobroSolicitado: boolean;
  readonly codigos: readonly CodigoDeReferido[];
  readonly estadisticas: EstadisticasDeAfiliado;
  readonly comisiones: readonly Comision[];
}

export interface PerfilDeCobro {
  readonly metodoPreferido: MetodoDeCobro;
  readonly titular?: string;
  /** El IBAN solo se devuelve ENMASCARADO: el número real nunca sale del servidor. */
  readonly ibanEnmascarado?: string;
  readonly bic?: string;
  readonly correoPaypal?: string;
  readonly tieneBanco: boolean;
  readonly tienePaypal: boolean;
}

/** Lo que se envía al guardar los datos de cobro. Ver `datosDeCobroParaGuardar`. */
export interface DatosDeCobro {
  readonly titular: string;
  readonly bic: string;
  readonly correoPaypal: string;
  readonly metodoPreferido: MetodoDeCobro;
  readonly contrasena: string;
  /** Solo cuando se teclea uno nuevo; si va vacío, se conserva el guardado. */
  readonly iban?: string;
}

/**
 * Qué pantalla toca según en qué punto está la solicitud.
 *
 * <p>Son cuatro situaciones distintas y cada una necesita decir otra cosa: sin inscribir hay que
 * explicar el programa; pendiente hay que decir que lo está mirando alguien; suspendida hay que decirlo
 * sin más; y activa es el panel. Enseñar el panel vacío en los tres primeros casos hacía pensar que el
 * programa no funcionaba.
 */
export type VistaDelAfiliado = 'alta' | 'pendiente' | 'suspendida' | 'panel';

export function vistaDelAfiliado(panel: PanelDeAfiliado): VistaDelAfiliado {
  if (!panel.inscrito) {
    return 'alta';
  }
  if (panel.estado === 'PENDING') {
    return 'pendiente';
  }
  return panel.estado === 'SUSPENDED' ? 'suspendida' : 'panel';
}

/**
 * ¿Se puede pedir el cobro por este método?
 *
 * <p>La cartera siempre; el banco y PayPal solo si sus datos están guardados. Ofrecer un método sin
 * datos terminaba en una solicitud que el administrador tenía que rechazar a mano.
 */
export function metodoDisponible(metodo: MetodoDeCobro, perfil: PerfilDeCobro | null): boolean {
  if (metodo === 'WALLET') {
    return true;
  }
  if (!perfil) {
    return false;
  }
  return metodo === 'BANK' ? perfil.tieneBanco : perfil.tienePaypal;
}

/**
 * Prepara lo que hay que guardar del perfil de cobro.
 *
 * <p>El guardado REEMPLAZA el perfil entero, así que se reenvían siempre todos los campos con su valor
 * actual, no solo el que se ha tocado. El IBAN es la excepción: el servidor solo lo devuelve enmascarado
 * («****1332»), así que el navegador nunca tiene el valor real para reenviarlo. Si el campo va vacío se
 * OMITE la clave, para no pisar el IBAN guardado con una cadena vacía.
 */
export function datosDeCobroParaGuardar(
  formulario: Omit<DatosDeCobro, 'iban'> & { readonly iban: string },
): DatosDeCobro {
  const iban = formulario.iban.trim();
  const base: DatosDeCobro = {
    titular: formulario.titular,
    bic: formulario.bic,
    correoPaypal: formulario.correoPaypal,
    metodoPreferido: formulario.metodoPreferido,
    contrasena: formulario.contrasena,
  };
  return iban ? { ...base, iban } : base;
}
