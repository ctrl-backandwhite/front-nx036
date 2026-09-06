import { Component, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import { MarcoAdmin, UsuarioDelPanel } from './marco-admin';
import { SesionActual } from '@core/auth/sesion-actual';
import { CarritoStore } from '@features/cart/application/state/carrito.store';
import { CierraSesion } from '@features/auth/application/use-case/cierra-sesion.use-case';

/**
 * El anfitrión del marco del panel. Mismo papel que el del escaparate y por el mismo motivo: el marco
 * no conoce la sesión ni la cesta, y quien las junta tiene que poder ver varios contextos a la vez.
 */
@Component({
  selector: 'nx-pagina-de-panel',
  imports: [MarcoAdmin],
  template: `
    <nx-marco-admin
      [usuario]="usuario()"
      [lineasCesta]="lineasCesta()"
      (cierraSesion)="sal()"
      (abreCesta)="vaALaCesta()"
    />
  `,
})
export class PaginaDePanel {
  private readonly sesion = inject(SesionActual);
  private readonly carrito = inject(CarritoStore);
  private readonly cerrar = inject(CierraSesion);
  private readonly router = inject(Router);

  protected readonly usuario = computed<UsuarioDelPanel | null>(() => {
    const datos = this.sesion.datos();
    if (!datos) {
      return null;
    }
    return {
      nombre: datos.nombreVisible,
      correo: '',
      papel: datos.rol === 'ADMIN' ? 'ADMIN' : 'OPERATOR',
      avatar: datos.avatarUrl,
    };
  });

  protected readonly lineasCesta = computed(() => this.carrito.lineas().length);

  protected async sal(): Promise<void> {
    await this.cerrar.ejecuta();
    await this.router.navigateByUrl('/');
  }

  protected async vaALaCesta(): Promise<void> {
    await this.router.navigateByUrl('/cart');
  }
}
