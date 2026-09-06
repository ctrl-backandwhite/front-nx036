import { inject } from '@angular/core';
import { CanActivateFn, GuardResult, Router, RouterStateSnapshot } from '@angular/router';
import { CuentaStore } from '../../application/state/cuenta.store';
import { RecuperaCuenta } from '../../application/use-case/recupera-cuenta.use-case';

/**
 * Exige sesión para entrar en el perfil y en las direcciones.
 *
 * <p>Hace lo mismo que el guardián de «auth», y se escribe aquí por una razón concreta: la regla de
 * aislamiento entre contextos —que el lint verifica— prohíbe a «account» importar la capa de
 * presentación de «auth». El guardián es una pieza de verdad común, y su sitio natural sería `core/` o
 * el sistema de diseño; hasta que se mueva ahí, cada contexto declara el suyo apoyándose en el puerto de
 * DOMINIO de «auth», que sí es contrato público. Queda anotado en el informe del porte.
 *
 * <p>Antes de decidir ESPERA a saber quién mira: al arrancar en frío la cuenta aún no está resuelta, y
 * responder que no en ese instante mandaría a la pantalla de acceso a alguien que sí había entrado. Es
 * un fallo que solo se ve al recargar dentro de una zona privada.
 */
async function compruebaSesion(estado: RouterStateSnapshot): Promise<GuardResult> {
  const cuenta = inject(CuentaStore);
  const router = inject(Router);

  if (!cuenta.resuelta()) {
    await inject(RecuperaCuenta).ejecuta();
  }
  if (cuenta.hayTitular()) {
    return true;
  }
  // Se guarda de dónde venía para devolverle ahí después de entrar, en vez de soltarle en la portada.
  return router.createUrlTree(['/login'], { queryParams: { volverA: estado.url } });
}

export const exigeSesion: CanActivateFn = (_ruta, estado) => compruebaSesion(estado);
