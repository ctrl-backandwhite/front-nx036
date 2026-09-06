import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { TokenStore } from '@core/auth/token-store';

/**
 * Exige sesión para entrar en el panel de afiliados.
 *
 * <p>PIEZA PROVISIONAL. El guardián bueno es `exigeSesion` de «auth», pero vive en
 * `auth/presentation/` y el aislamiento entre contextos acotados —que verifica el lint— impide entrar en
 * la presentación de otro contexto. Mientras ese guardián no se mueva a `core/` (que es donde le
 * corresponde: lo necesitan pedidos, la cartera, afiliados, cuenta, cesta, pago y panel), cada contexto
 * declara el suyo, mínimo, como manda la guía de porte para las piezas compartidas que aún no existen.
 *
 * <p>Se comprueba la CREDENCIAL, que está en `core` y es transversal, no el usuario: preguntar por él
 * obligaría a una llamada al backend en cada navegación. Esto NO es la seguridad —la aplica el backend
 * en cada petición—: aquí solo se evita pintar una pantalla que de todos modos saldría vacía. Si la
 * credencial resulta estar caducada, el interceptor la renueva o la borra, y la siguiente navegación ya
 * cae aquí.
 */
export const exigeSesion: CanActivateFn = (_ruta, estado) => {
  const tokens = inject(TokenStore);
  const router = inject(Router);

  if (tokens.haySesion()) {
    return true;
  }
  // Se guarda de dónde venía para devolverle ahí después de entrar, en vez de soltarle en la portada.
  return router.createUrlTree(['/login'], { queryParams: { volverA: estado.url } });
};
