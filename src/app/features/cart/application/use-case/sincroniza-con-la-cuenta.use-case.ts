import { Injectable, Injector, effect, inject, untracked } from '@angular/core';
import { SesionActual } from '@core/auth/sesion-actual';
import { CARRITO_GUARDADO_PORT, CARRITO_REMOTO_PORT } from '../../domain/port/carrito.port';
import { CarritoStore } from '../state/carrito.store';

/**
 * Ata la cesta y la lista guardada a la cuenta.
 *
 * <p><b>Al entrar</b>: sube lo que se llenó como invitado a la fusión —que SUMA— y adopta la respuesta
 * del servidor como fuente de verdad. La copia local solo se abandona DESPUÉS de esa confirmación: al
 * revés, un fallo de red dejaría a quien compra sin lo que tenía en ninguno de los dos sitios. Sin nada
 * en local basta con leer la cesta de la cuenta.
 *
 * <p><b>Al salir</b>: la cesta de la cuenta desaparece de la pantalla, para que no quede a la vista de
 * quien entre después en el mismo navegador.
 *
 * <p><b>Qué se sube y qué no.</b> Solo se sube lo que está marcado como cesta de INVITADO. Es la misma
 * condición que en el front anterior se expresaba comparando identificadores de usuario, pero leída donde
 * de verdad vive: si la cesta en pantalla ya es la de una cuenta, es de otra persona y subirla la metería
 * en la cuenta de quien acaba de entrar —y la fusión SUMA, así que se quedaría ahí—. Preguntarlo así
 * ahorra además una consulta de identidad en cada arranque.
 *
 * <p>Se dispara con el HECHO de la sesión que publica el núcleo, no con la credencial guardada: el token
 * se renueva solo cada pocos minutos y reaccionar a cada renovación repetiría la sincronización sin
 * motivo. Y se espera a que la sesión esté RESUELTA: al arrancar en frío todavía no se sabe quién mira, y
 * actuar en ese instante como si no hubiera nadie borraría de la pantalla la cesta del invitado —que es
 * suya, y estaba guardada en su equipo— antes de saber siquiera si había entrado.
 */
@Injectable()
export class SincronizaConLaCuenta {
  private readonly remoto = inject(CARRITO_REMOTO_PORT);
  private readonly guardado = inject(CARRITO_GUARDADO_PORT);
  private readonly estado = inject(CarritoStore);
  private readonly sesion = inject(SesionActual);
  private readonly inyector = inject(Injector);

  private vigilando = false;

  /**
   * Empieza a vigilar la sesión. Es idempotente: la ruta de la cesta y la del pago declaran los mismos
   * proveedores, y llamarlo dos veces no puede montar dos vigilancias.
   */
  vigila(): void {
    if (this.vigilando) {
      return;
    }
    this.vigilando = true;
    effect(
      () => {
        if (!this.sesion.resuelta()) {
          return;
        }
        const haySesion = this.sesion.haySesion();
        // `untracked` es obligatorio: la sincronización LEE el estado de la cesta, y sin esto el efecto
        // se apuntaría a esas señales y volvería a dispararse en cada cambio del carrito — es decir, un
        // bucle de peticiones cada vez que alguien pulsa «+».
        untracked(() => void this.ejecuta(haySesion));
      },
      { injector: this.inyector },
    );
  }

  async ejecuta(haySesion: boolean): Promise<void> {
    if (!haySesion) {
      this.estado.sueltaLaDeLaCuenta();
      this.estado.vaciaGuardadas();
      return;
    }
    // Se decide UNA vez, antes de tocar nada: adoptar la cesta pone la marca a cierto, y leerla otra vez
    // después haría que la lista guardada se consultara en vez de subirse.
    const deInvitado = !this.estado.cestaDeLaCuenta();
    await Promise.all([this.sincronizaLaCesta(deInvitado), this.sincronizaLoGuardado(deInvitado)]);
  }

  private async sincronizaLaCesta(deInvitado: boolean): Promise<void> {
    const locales = this.estado.lineas();
    const resultado =
      locales.length > 0 && deInvitado
        ? await this.remoto.fusiona(locales)
        : await this.remoto.consulta();
    // Si falla se calla y se conserva la cesta local: quien compra no puede perder lo que ya eligió
    // porque la red haya fallado al saludar.
    if (resultado.ok) {
      this.estado.adoptaLaDeLaCuenta(resultado.valor);
    }
  }

  private async sincronizaLoGuardado(deInvitado: boolean): Promise<void> {
    const locales = this.estado.guardadas();
    const resultado =
      locales.length > 0 && deInvitado
        ? await this.guardado.fusiona(locales)
        : await this.guardado.consulta();
    if (resultado.ok) {
      this.estado.fijaGuardadas(resultado.valor);
    }
  }
}
