import { Component, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import { MarcoEscaparate, UsuarioDelMarco } from './marco-escaparate';
import { SesionActual } from '@core/auth/sesion-actual';
import { CarritoStore } from '@features/cart/application/state/carrito.store';
import { CierraSesion } from '@features/auth/application/use-case/cierra-sesion.use-case';

/**
 * El anfitrión del marco del escaparate.
 *
 * <p>Hace falta porque el marco es, a propósito, una pieza tonta: sabe pintar la cabecera, el pie y la
 * barra del móvil, pero no sabe quién ha entrado ni qué lleva la cesta — se lo tienen que dar. Eso es lo
 * que lo hace reutilizable y probable sin montar media aplicación.
 *
 * <p>Alguien tiene que cablearlo, y ese alguien no puede ser un contexto: la cabecera enseña a la vez la
 * sesión («auth»), la cesta («cart») y los avisos («notifications»), y ningún contexto puede meterse en
 * las tripas de otro. Por eso vive en `layout`, que junto a la raíz de composición es la única capa
 * autorizada a ver el mapa entero.
 *
 * <p>Esto faltaba: el marco estaba escrito y probado, pero no lo montaba ninguna ruta, así que la
 * aplicación se servía SIN cabecera, sin pie y sin cajón de cesta. No lo delataba ninguna prueba —cada
 * pieza pasaba la suya— ni el lint ni la compilación: solo se vio midiendo el HTML que llega.
 */
@Component({
  selector: 'nx-pagina-de-escaparate',
  imports: [MarcoEscaparate],
  template: `
    <nx-marco-escaparate
      [usuario]="usuario()"
      [lineasCesta]="lineasCesta()"
      (cierraSesion)="sal()"
      (abreCesta)="vaALaCesta()"
    />
  `,
})
export class PaginaDeEscaparate {
  private readonly sesion = inject(SesionActual);
  private readonly carrito = inject(CarritoStore);
  private readonly cerrar = inject(CierraSesion);
  private readonly router = inject(Router);

  protected readonly usuario = computed<UsuarioDelMarco | null>(() => {
    const datos = this.sesion.datos();
    return datos ? { nombre: datos.nombreVisible, esPersonal: this.sesion.esPersonalInterno() } : null;
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
