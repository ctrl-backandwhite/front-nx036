import { Component, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import { MarcoAdmin, UsuarioDelPanel } from './marco-admin';
import { SesionActual } from '@core/auth/sesion-actual';
import { CarritoStore } from '@features/cart/application/state/carrito.store';
import { CierraSesion } from '@features/auth/application/use-case/cierra-sesion.use-case';
import { BusquedaGlobal } from '@features/admin/presentation/gestion/component/busqueda-global';
import { DesplegableDeAvisos } from '@features/notifications/presentation/component/desplegable-de-avisos';

/**
 * El anfitrión del marco del panel. Mismo papel que el del escaparate y por el mismo motivo: el marco
 * no conoce la sesión ni la cesta, y quien las junta tiene que poder ver varios contextos a la vez.
 *
 * <p>Y con el mismo agujero que aquel: el marco se montaba AUTOCERRADO, así que sus dos huecos —el
 * buscador global y el buzón de avisos— no recibían nada. Los dos componentes estaban escritos y
 * probados; en el panel no había forma de buscar un pedido por su número ni de ver un aviso.
 */
@Component({
  selector: 'nx-pagina-de-panel',
  imports: [MarcoAdmin, BusquedaGlobal, DesplegableDeAvisos],
  template: `
    <nx-marco-admin
      [usuario]="usuario()"
      [lineasCesta]="lineasCesta()"
      (cierraSesion)="sal()"
      (abreCesta)="abreLaCesta()"
    >
      <!-- El buscador va en el MARCO y no en cada pantalla: salta desde cualquier sección del panel y
           lleva a otra, así que ninguna en concreto es su dueña. -->
      <nx-busqueda-global nx-buscador />

      <!-- El buzón, igual: los avisos llegan mientras se está en cualquier parte del panel. -->
      <nx-desplegable-de-avisos nx-avisos />
    </nx-marco-admin>
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

  /**
   * El icono de la cesta abre el CAJÓN, igual que en el escaparate y que en el front anterior. Antes
   * navegaba a `/cart`, que además saca a quien administra del panel entero.
   */
  protected abreLaCesta(): void {
    this.carrito.abreCajon();
  }
}
