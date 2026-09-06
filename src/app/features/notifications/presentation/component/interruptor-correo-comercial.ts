import { Component, computed, inject } from '@angular/core';
import { TraduccionService } from '@core/i18n/traduccion.service';
import { AvisosStore } from '@ds/component/avisos/avisos.store';
import { PreferenciasDeCorreo } from '../../application/use-case/preferencias-de-correo.use-case';
import { PROVEEDORES_NOTIFICATIONS } from '../../notifications.providers';

/**
 * El interruptor de «quiero recibir novedades por correo».
 *
 * <p>En el front de React vive DENTRO de la página de afiliados, pero no es de allí: decidir qué correos
 * le llegan a quien tiene cuenta es exactamente lo mismo que hace el buzón, así que su sitio es este
 * contexto. Se porta aquí y se deja listo para que la página de afiliados lo COMPONGA.
 *
 * <p>Por qué no está en el sistema de diseño: porque llama al backend. El sistema de diseño es para
 * piezas visuales SIN negocio, y una que consulta y guarda una preferencia de la cuenta no lo es. Se
 * queda aquí, se exporta, y quien arma las rutas —que sí ve el mapa entero— lo coloca donde toca.
 *
 * <p>Se provee A SÍ MISMO (`providers`), así que funciona allí donde se le suelte, sin que quien lo
 * compone tenga que acordarse de registrar nada.
 *
 * <p>Mientras no se sepa la preferencia NO se pinta nada: un interruptor en una posición inventada es
 * peor que ninguno, porque quien lo vea apagado creerá que ya se dio de baja.
 */
@Component({
  selector: 'nx-interruptor-correo-comercial',
  providers: PROVEEDORES_NOTIFICATIONS,
  template: `
    @if (quiereRecibir() !== null) {
      <label class="card p-3 flex items-center gap-3 text-[13px] cursor-pointer border border-base-200">
        <input type="checkbox" class="toggle toggle-sm toggle-primary"
               [checked]="quiereRecibir()"
               (change)="cambia($event)" />
        <span>{{ t('affiliate.email_pref') }}</span>
      </label>
    }
  `,
})
export class InterruptorCorreoComercial {
  private readonly preferencias = inject(PreferenciasDeCorreo);
  private readonly avisos = inject(AvisosStore);

  protected readonly t = inject(TraduccionService).t;

  /** En positivo, que es como se lee: marcado quiere decir «sí, mándame novedades». */
  protected readonly quiereRecibir = computed(() => {
    const sinPublicidad = this.preferencias.sinPublicidad();
    return sinPublicidad === null ? null : !sinPublicidad;
  });

  constructor() {
    void this.preferencias.consulta();
  }

  protected async cambia(evento: Event): Promise<void> {
    const marcado = (evento.target as HTMLInputElement).checked;
    const resultado = await this.preferencias.fija(marcado);
    if (!resultado.ok) {
      // Un interruptor que vuelve solo a su sitio sin explicar nada parece un fallo de la pantalla.
      this.avisos.error(resultado.error.mensaje || this.t('common.error'));
    }
  }
}
