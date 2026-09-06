/* Qué se considera una contraseña aceptable.
 *
 * <p>Vive en `shared` y no en el sistema de diseño, aunque quien la pinta sea un componente. El motivo
 * es que también la necesita el DOMINIO de la autenticación para decidir si un alta está completa, y el
 * dominio no puede depender de la capa visual: si lo hiciera, una regla de negocio quedaría atada a
 * cómo se dibuja, y probarla exigiría montar un componente.
 *
 * <p>Aquí no hay nada de Angular: es una función pura sobre una cadena.
 */
/**
 * La política de contraseñas, EXACTAMENTE la misma que aplica el backend (`PasswordPolicy`): mínimo
 * ocho caracteres, una mayúscula, una minúscula, un dígito y un símbolo.
 *
 * <p>Vive aparte del componente para que el registro y el cambio de contraseña del perfil compartan la
 * comprobación. Dos listas de reglas escritas por separado acaban divergiendo, y el síntoma es el peor
 * posible: un formulario que se da por bueno y un servidor que lo rechaza.
 */
export interface ComprobacionContrasena {
  readonly clave: string;
  readonly cumple: boolean;
}

export function comprobacionesContrasena(contrasena: string): readonly ComprobacionContrasena[] {
  return [
    { clave: 'length', cumple: contrasena.length >= 8 },
    { clave: 'upper', cumple: /[A-Z]/.test(contrasena) },
    { clave: 'lower', cumple: /[a-z]/.test(contrasena) },
    { clave: 'digit', cumple: /\d/.test(contrasena) },
    { clave: 'symbol', cumple: /[^A-Za-z0-9]/.test(contrasena) },
  ];
}

/** Cierto cuando la contraseña cumple TODAS las reglas de la política. */
export function contrasenaValida(contrasena: string): boolean {
  return comprobacionesContrasena(contrasena).every((c) => c.cumple);
}
