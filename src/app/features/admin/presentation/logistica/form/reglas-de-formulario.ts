import {
  ValidationError,
  maxError,
  minError,
  required,
  requiredError,
  schema,
  validate,
} from '@angular/forms/signals';

/**
 * Las reglas que comparten los formularios de logística.
 *
 * <p>Aquí se editan LÍMITES DE PESO POR CANAL, REGLAS DE ADUANA E IMPUESTOS POR PAÍS: un dato mal
 * metido no se queda en la pantalla, sale caro. Un peso máximo por encima del que admite el canal
 * emite una guía que el transportista rechaza en el almacén; un porcentaje negativo cambia lo que se
 * cobra en el checkout. Por eso la validación se declara en el esquema del formulario —un sitio, y el
 * botón de guardar la respeta solo— en vez de repetirse a mano pantalla por pantalla.
 */

/**
 * Un texto obligatorio DE VERDAD.
 *
 * <p>El `required()` de Signal Forms solo rechaza la cadena vacía, así que un campo con tres espacios
 * pasaba por relleno. Las reglas del dominio —`limiteGuardable`, `almacenGuardable`,
 * `regionGuardable`, `impuestoGuardable`— comparan con `.trim()`, y el backend también: sin esto el
 * formulario daría por bueno un canal « » que el servidor rechaza después.
 */
export const TEXTO_CON_CONTENIDO = schema<string>((ruta) => {
  required(ruta);
  validate(ruta, ({ value }) => (value().trim().length > 0 ? undefined : requiredError()));
});

/** Lo mínimo que hace falta saber de un error para poder nombrarlo. */
interface ErrorConTipo {
  readonly kind: string;
}

/**
 * Cada tipo de error con la clave del mensaje que ya existe en los ocho idiomas.
 *
 * <p>`parse` es el que da un campo numérico cuando el navegador no puede leer lo tecleado; sin él, un
 * número imposible se quedaba sin explicación y el botón de guardar apagado sin decir por qué.
 *
 * <p>`max` decía «escribe un número válido», que es falso: el número está bien escrito, lo que pasa es
 * que se pasa del tope. Y `maxLength`, `pattern` y `email` no estaban en la tabla porque no existía
 * ninguna cadena traducida que los nombrara: un nombre de almacén demasiado largo o un código de país
 * mal escrito dejaban el campo en rojo y el botón apagado SIN decir qué pasaba. Ya existen.
 *
 * <p>`minLength` sigue fuera a propósito: no hay clave que lo diga y no se inventa ninguna.
 */
const MENSAJES: Readonly<Record<string, string>> = {
  required: 'dialog.field.required',
  min: 'dialog.field.min',
  max: 'dialog.field.max',
  maxLength: 'dialog.field.maxlength',
  pattern: 'dialog.field.pattern',
  email: 'dialog.field.email',
  parse: 'dialog.field.number',
};

/** Ningún impuesto indirecto pasa del 100 %: por encima, es un dedo de más en el teclado. */
export const TASA_MAXIMA = 100;

/**
 * La tasa de una región, que se edita como TEXTO porque su vacío significa algo.
 *
 * <p>Vacío = «usa la tasa nacional»; `0` = «exenta». Son dos configuraciones distintas y las dos son
 * válidas, así que el vacío no se rechaza. Lo que sí se rechaza es lo que no es un número y lo que se
 * sale del rango en el que un impuesto tiene sentido: de aquí sale lo que el backend cobra en el
 * checkout de ese estado.
 */
export function tasaFueraDeRango(texto: string): ValidationError | undefined {
  const limpio = texto.trim();
  if (limpio === '') {
    return undefined;
  }
  const numero = Number(limpio);
  if (!Number.isFinite(numero)) {
    return maxError(TASA_MAXIMA);
  }
  if (numero < 0) {
    return minError(0);
  }
  return numero > TASA_MAXIMA ? maxError(TASA_MAXIMA) : undefined;
}

/**
 * La clave de traducción del primer error del campo, o `null` si no hay ninguno que nombrar.
 *
 * <p>Se enseña UNO y no la lista entera: con tres mensajes apilados bajo un campo estrecho no se lee
 * ninguno, y el primero ya dice qué corregir.
 */
export function claveDeError(errores: readonly ErrorConTipo[]): string | null {
  for (const error of errores) {
    const clave = MENSAJES[error.kind];
    if (clave) {
      return clave;
    }
  }
  // Un tipo sin mensaje propio no se inventa un texto: enseñar «este campo es obligatorio» en un campo
  // relleno confunde más que callar.
  return null;
}
