import { inject } from '@angular/core';
import { CanActivateFn, CanMatchFn, GuardResult, Router, RouterStateSnapshot } from '@angular/router';
import { RolDeSesion, SesionActual } from './sesion-actual';
import { RECUPERADOR_DE_SESION } from './recuperador-de-sesion.port';

/**
 * El guardián de las zonas privadas. **Uno solo para toda la aplicación.**
 *
 * <p>Vive en el núcleo, y no dentro del contexto de autenticación, porque lo usan las rutas de la
 * cuenta, la cesta, el pago, los pedidos, la cartera, los afiliados y el panel. Estando en «auth», cada
 * uno de esos contextos habría tenido que importar de sus tripas —cosa que la regla de dependencia
 * prohíbe con razón—, y el resultado real fue que cada equipo se escribió el suyo: ocho guardianes
 * parecidos, ninguno idéntico, y ninguna garantía de que todos redirigieran igual.
 *
 * <p>Antes de decidir ESPERA a saber quién mira. Al arrancar en frío la sesión aún no está resuelta, y
 * responder que no en ese instante manda a la pantalla de acceso a alguien que sí había entrado. Es un
 * fallo que solo aparece al recargar dentro de una zona privada, y por eso se cuela con facilidad.
 *
 * <p>Esto NO es la seguridad: la seguridad la aplica el backend en cada petición. Aquí solo se evita
 * enseñar una pantalla que de todas formas no se va a poder usar.
 */
async function compruebaSesion(estado: RouterStateSnapshot): Promise<GuardResult> {
  const sesion = inject(SesionActual);
  const router = inject(Router);

  if (!sesion.resuelta()) {
    await inject(RECUPERADOR_DE_SESION).asegura();
  }
  if (sesion.haySesion()) {
    return true;
  }
  // Se guarda de dónde venía para devolverle ahí después de entrar, en vez de soltarle en la portada.
  return router.createUrlTree(['/login'], { queryParams: { volverA: estado.url } });
}

/** Exige sesión para entrar en una ruta. */
export const exigeSesion: CanActivateFn = (_ruta, estado) => compruebaSesion(estado);

/**
 * Lo contrario: rutas que solo tienen sentido SIN sesión —acceder, registrarse, recuperar contraseña—.
 *
 * <p>Existe por el botón ATRÁS. Al entrar, la pantalla de destino REEMPLAZA la del acceso en el
 * historial, pero con el acceso de Google se sale del sitio y se vuelve, así que la entrada de
 * «/login» queda antes en la pila: pulsar atrás tras entrar devolvía al formulario, ya rellenado y
 * sin ninguna utilidad, con la sensación de que el acceso no se había completado.
 *
 * <p>Se manda al CATÁLOGO y no a la portada: quien acaba de entrar quiere ver productos, y la portada
 * es la cara para quien todavía no tiene cuenta.
 *
 * <p>También cierra un caso que no es de navegación: llegar a «/login» con la sesión abierta —desde un
 * enlace viejo o un marcador— y volver a entrar encima de la sesión que ya había.
 */
export const soloSinSesion: CanActivateFn = async () => {
  const sesion = inject(SesionActual);
  const router = inject(Router);

  if (!sesion.resuelta()) {
    await inject(RECUPERADOR_DE_SESION).asegura();
  }
  return sesion.haySesion() ? router.createUrlTree(['/catalog']) : true;
};

/**
 * Exige, además, uno de estos papeles.
 *
 * <p>A quien ha entrado pero no tiene permiso se le manda a SU zona —el catálogo—, no a la portada:
 * mandarle al principio se leía como un fallo de navegación y no como una negativa.
 */
export function exigeRol(...roles: readonly RolDeSesion[]): CanActivateFn {
  return async (_ruta, estado) => {
    const sesion = inject(SesionActual);
    const router = inject(Router);

    const conSesion = await compruebaSesion(estado);
    if (conSesion !== true) {
      return conSesion;
    }
    return sesion.tiene(...roles) ? true : router.createUrlTree(['/catalog']);
  };
}

/**
 * Igual que `exigeRol`, pero decide si la ruta COINCIDE en vez de si se puede entrar.
 *
 * <p>La diferencia importa: al negar, `canActivate` corta la navegación y redirige; `canMatch` deja que
 * el enrutador pruebe la ruta siguiente. Es lo que hace falta cuando un mismo camino lleva a sitios
 * distintos según quién mire —`/admin` es el panel de control para quien administra y un desvío a los
 * pedidos para quien da soporte—, sin que ninguno de los dos tenga que saber del otro.
 *
 * <p>No redirige por su cuenta ni cuando no hay sesión: devuelve que no coincide y deja que sea la ruta
 * siguiente, con su propio guardián, quien mande a la pantalla de acceso. Así solo hay un sitio que
 * decida adónde va quien no ha entrado.
 */
export function coincideSiTieneRol(...roles: readonly RolDeSesion[]): CanMatchFn {
  return async () => {
    const sesion = inject(SesionActual);

    if (!sesion.resuelta()) {
      await inject(RECUPERADOR_DE_SESION).asegura();
    }
    return sesion.tiene(...roles);
  };
}
