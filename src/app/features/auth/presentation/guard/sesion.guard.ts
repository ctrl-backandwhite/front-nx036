import { inject } from '@angular/core';
import { CanActivateFn, GuardResult, Router, RouterStateSnapshot } from '@angular/router';
import { Rol } from '../../domain/model/usuario';
import { SesionStore } from '../../application/state/sesion.store';
import { RecuperaSesion } from '../../application/use-case/recupera-sesion.use-case';

/**
 * Comprueba que hay sesión, y si no la hay decide adónde va.
 *
 * <p>Es una función normal y no un guardián, para que los dos guardianes de abajo puedan reutilizarla
 * sin llamarse entre sí: `CanActivateFn` admite devolver observables y promesas, así que encadenar un
 * guardián dentro de otro obliga a tratar formas que aquí no se usan.
 *
 * <p>Antes de decidir ESPERA a saber quién mira: al arrancar en frío la sesión aún no está resuelta, y
 * responder que no en ese instante mandaría a la pantalla de acceso a alguien que sí había entrado. Es
 * un fallo que solo aparece al recargar dentro de una zona privada, y por eso se cuela con facilidad.
 */
async function compruebaSesion(estado: RouterStateSnapshot): Promise<GuardResult> {
  const sesion = inject(SesionStore);
  const router = inject(Router);

  if (!sesion.resuelta()) {
    await inject(RecuperaSesion).ejecuta();
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
 * Exige, además, uno de estos papeles.
 *
 * <p>A quien ha entrado pero no tiene permiso se le manda a SU zona —el catálogo—, no a la portada:
 * mandarle al principio se leía como un fallo de navegación y no como una negativa.
 *
 * <p>Esto NO es la seguridad: la seguridad la aplica el backend en cada petición. Aquí solo se evita
 * enseñar una pantalla que de todos modos no va a poder usar.
 */
export function exigeRol(...roles: readonly Rol[]): CanActivateFn {
  return async (_ruta, estado) => {
    const sesion = inject(SesionStore);
    const router = inject(Router);

    const conSesion = await compruebaSesion(estado);
    if (conSesion !== true) {
      return conSesion;
    }
    return sesion.tiene(...roles) ? true : router.createUrlTree(['/catalog']);
  };
}
