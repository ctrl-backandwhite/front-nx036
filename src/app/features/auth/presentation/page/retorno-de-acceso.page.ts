import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { DOCUMENT } from '@angular/core';
import { TraduccionService } from '@core/i18n/traduccion.service';
import { esNavegador } from '@core/platform/plataforma';
import { CompletaAccesoSocial } from '../../application/use-case/completa-acceso-social.use-case';

/**
 * El retorno del acceso con Google o GitHub.
 *
 * <p>El backend devuelve aquí con los testigos en el FRAGMENTO de la dirección
 * (`/auth/callback#token=…&refresh=…`), que no viaja al servidor. Esta pantalla no decide nada: lee el
 * fragmento, se lo entrega al caso de uso y navega adonde este diga.
 *
 * <p>Lo PRIMERO que hace es limpiar la barra de direcciones, antes incluso de guardar nada: dejar
 * testigos a la vista —y en el historial, y en lo que se comparte al copiar la dirección— es un
 * problema aunque la sesión acabe bien.
 *
 * <p>Se atiende UNA sola vez: al hidratar, la página se monta con el HTML ya pintado y un segundo
 * intento sobre un fragmento ya borrado acabaría mandando a la pantalla de acceso con un error falso.
 */
@Component({
  selector: 'nx-retorno-de-acceso',
  template: `
    <div class="min-h-screen flex flex-col items-center justify-center gap-4 bg-base-200">
      <span class="loading loading-spinner loading-lg text-primary"></span>
      <!--
        Traducido: escrito a fuego salía en español a un cliente inglés o chino, justo en la pantalla
        final del acceso. Como la traducción devuelve la clave cuando falta la traducción, un texto así pasa
        desapercibido en las revisiones.
      -->
      <p role="status" class="text-sm opacity-70">{{ t('login.signing_in') }}</p>
    </div>
  `,
})
export class RetornoDeAccesoPage {
  private readonly completa = inject(CompletaAccesoSocial);
  private readonly router = inject(Router);
  private readonly documento = inject(DOCUMENT);

  protected readonly t = inject(TraduccionService).t;

  private readonly atendido = signal(false);

  constructor() {
    if (esNavegador() && !this.atendido()) {
      this.atendido.set(true);
      void this.resuelve();
    }
  }

  private async resuelve(): Promise<void> {
    const ventana = this.documento.defaultView;
    const bruto = ventana?.location.hash ?? '';
    const fragmento = bruto.startsWith('#') ? bruto.slice(1) : bruto;

    // Se limpia ANTES de nada: aunque falle todo lo demás, los testigos no se quedan a la vista.
    ventana?.history.replaceState(null, '', '/auth/callback');

    const destino = await this.completa.ejecuta(fragmento);
    await this.router.navigateByUrl(destino ?? '/login?error=google', { replaceUrl: true });
  }
}
