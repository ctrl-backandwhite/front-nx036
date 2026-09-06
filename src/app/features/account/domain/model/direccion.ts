/**
 * Una dirección de envío de la cuenta.
 *
 * <p>Es vocabulario del NEGOCIO, no la forma del JSON: el backend habla de `fullName` y `line1`, y esa
 * traducción es trabajo del adaptador. Si el modelo copiara los nombres del servidor, cualquier cambio
 * suyo entraría hasta las plantillas.
 *
 * <p>OJO con el país: el de una dirección es el país de ENTREGA. NO es el país de registro de la cuenta,
 * que es el único que decide el margen y el precio. Cambiar aquí el país cambia adónde se envía y qué
 * arancel se paga, nunca lo que cuesta el producto.
 */
export interface Direccion {
  readonly id: string;
  readonly etiqueta?: string;
  readonly nombreCompleto: string;
  readonly telefono?: string;
  readonly linea1: string;
  readonly linea2?: string;
  readonly ciudad: string;
  /** Código de la subdivisión («CA», «ON», «SP»): es lo que el backend usa para el impuesto por estado. */
  readonly provincia?: string;
  readonly codigoPostal?: string;
  readonly pais: string;
  readonly porDefecto: boolean;
  readonly creadaEl: string;
}

/** Lo que se puede teclear en el formulario. Sin identificador ni fechas: eso lo pone el servidor. */
export interface DatosDeDireccion {
  etiqueta: string;
  nombreCompleto: string;
  telefono: string;
  linea1: string;
  linea2: string;
  ciudad: string;
  provincia: string;
  codigoPostal: string;
  pais: string;
  porDefecto: boolean;
}

export const DIRECCION_VACIA: DatosDeDireccion = {
  etiqueta: '',
  nombreCompleto: '',
  telefono: '',
  linea1: '',
  linea2: '',
  ciudad: '',
  provincia: '',
  codigoPostal: '',
  pais: '',
  porDefecto: false,
};

/** Los campos editables de una dirección ya guardada. El resto no se devuelve al servidor. */
export function aDatosDeDireccion(direccion: Direccion): DatosDeDireccion {
  return {
    etiqueta: direccion.etiqueta ?? '',
    nombreCompleto: direccion.nombreCompleto,
    telefono: direccion.telefono ?? '',
    linea1: direccion.linea1,
    linea2: direccion.linea2 ?? '',
    ciudad: direccion.ciudad,
    provincia: direccion.provincia ?? '',
    codigoPostal: direccion.codigoPostal ?? '',
    pais: direccion.pais,
    porDefecto: direccion.porDefecto,
  };
}

/**
 * Los cuatro campos sin los que una dirección no sirve para enviar nada.
 *
 * <p>Es una regla del negocio y por eso vive aquí: la comprueban el formulario del perfil, la página de
 * direcciones y la ventana emergente. Escrita en cada pantalla, acabaría distinta en las tres.
 */
export function direccionCompleta(datos: DatosDeDireccion): boolean {
  return (
    datos.nombreCompleto.trim() !== '' &&
    datos.linea1.trim() !== '' &&
    datos.ciudad.trim() !== '' &&
    datos.pais.trim() !== ''
  );
}

/** Qué código postal espera un país. Lo dicta el servidor: aquí no se copia su tabla de formatos. */
export interface FormatoPostal {
  readonly requerido: boolean;
  readonly patron?: string;
  readonly ejemplo?: string;
}

/**
 * ¿El código postal tecleado contradice el formato del país?
 *
 * <p>Con el campo VACÍO no se regaña: aún se está escribiendo. Que sea obligatorio donde el país tiene
 * formato lo comprueba el servidor al guardar, que es cuando ya no es una regañina. Esto solo adelanta
 * el aviso para que el fallo no se descubra al pulsar «guardar».
 */
export function codigoPostalInvalido(codigo: string, formato: FormatoPostal | null): boolean {
  const limpio = (codigo ?? '').trim();
  if (!formato?.requerido || !formato.patron || limpio.length === 0) {
    return false;
  }
  return !new RegExp(`^(?:${formato.patron})$`, 'i').test(limpio.replace(/\s+/g, ' '));
}
