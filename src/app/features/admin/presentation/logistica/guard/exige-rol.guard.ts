import { inject } from '@angular/core';
import { CanActivateFn, GuardResult, Router, RouterStateSnapshot } from '@angular/router';
import { Rol } from '@features/auth/domain/model/usuario';
import { QuienMiraStore } from '../../../application/logistica/state/quien-mira.store';
import { AveriguaQuienMira } from '../../../application/logistica/use-case/averigua-quien-mira.use-case';

/**
 * Exige sesión y papel para entrar en el área de pedidos y logística del panel.
 *
 * <p>PIEZA PROVISIONAL, igual que las de «orders», «wallet» y «account». El guardián bueno es `exigeRol`
 * de «auth», pero vive en `auth/presentation/` y el aislamiento entre contextos —que verifica el lint—
 * prohíbe entrar en la presentación de otro. Mientras no se mueva a `core/` —que es donde le
 * corresponde: lo necesitan pedidos, cartera, cuenta, cesta, pago y panel—, cada contexto declara el
 * suyo apoyándose en el DOMINIO de «auth», que sí es contrato público. Queda anotado en el informe.
 *
 * <p>Antes de decidir ESPERA a saber quién mira: al arrancar en frío no está resuelto, y responder que
 * no en ese instante echaría del panel a quien sí había entrado. Es un fallo que solo aparece al
 * recargar dentro de una zona privada, y por eso se cuela con facilidad.
 *
 * <p>Esto NO es la seguridad: la aplica el backend en cada petición. Aquí solo se evita pintar una
 * pantalla que de todos modos saldría vacía.
 */
async function compruebaPapel(
  estado: RouterStateSnapshot,
  roles: readonly Rol[],
): Promise<GuardResult> {
  const quienMira = inject(QuienMiraStore);
  const averigua = inject(AveriguaQuienMira);
  const router = inject(Router);

  await averigua.ejecuta();

  if (!quienMira.usuario()) {
    // Se guarda de dónde venía para devolverle ahí después de entrar, en vez de soltarle en la portada.
    return router.createUrlTree(['/login'], { queryParams: { volverA: estado.url } });
  }
  // A quien ha entrado pero no tiene permiso se le manda a SU zona —el catálogo—, no a la portada:
  // mandarle al principio se leía como un fallo de navegación y no como una negativa.
  return quienMira.tiene(...roles) ? true : router.createUrlTree(['/catalog']);
}

export function exigeRol(...roles: readonly Rol[]): CanActivateFn {
  return (_ruta, estado) => compruebaPapel(estado, roles);
}
