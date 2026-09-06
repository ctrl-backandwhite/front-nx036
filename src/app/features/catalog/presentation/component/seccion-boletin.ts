import { Component, inject, signal } from '@angular/core';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faEnvelopeOpenText } from '@fortawesome/free-solid-svg-icons';
import { TraduccionService } from '@core/i18n/traduccion.service';
import { AltaBoletin } from '@ds/component/boletin/alta-boletin';
import { ALTA_EN_EL_BOLETIN_PORT } from '../../domain/port/alta-en-el-boletin.port';

/**
 * El boletín en la PORTADA.
 *
 * <p>Antes solo estaba en el pie y, con el desplazamiento infinito del catálogo, era casi inalcanzable:
 * había que llegar al final de todos los productos. Aquí queda a la vista de quien baja la portada. El
 * formulario es el mismo del pie —la pieza vive en el sistema de diseño—; lo que cambia es el marco:
 * una tarjeta con icono y titular, en lugar de una columna estrecha.
 */
@Component({
  selector: 'nx-seccion-boletin',
  imports: [FaIconComponent, AltaBoletin],
  template: `
    <section class="card p-8 lg:p-10 text-center bg-brand-50/60 border-brand-100">
      <div class="max-w-xl mx-auto">
        <div
          class="w-12 h-12 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center mx-auto mb-3"
        >
          <fa-icon [icon]="iconoSobre" class="text-lg" />
        </div>
        <h2 class="text-xl md:text-2xl font-medium tracking-tight">
          {{ t('newsletter.footer.title') }}
        </h2>
        <p class="mt-2 text-ink-600">{{ t('newsletter.footer.pitch') }}</p>
        <div class="mt-5 max-w-md mx-auto">
          <nx-alta-boletin
            [enviado]="enviado()"
            [yaSuscrito]="yaSuscrito()"
            (suscribe)="apunta($event)"
          />
        </div>
      </div>
    </section>
  `,
})
export class SeccionBoletin {
  private readonly puerto = inject(ALTA_EN_EL_BOLETIN_PORT);

  protected readonly t = inject(TraduccionService).t;
  protected readonly iconoSobre = faEnvelopeOpenText;

  protected readonly enviado = signal(false);
  protected readonly yaSuscrito = signal(false);

  /**
   * Manda el alta y da SIEMPRE las gracias, también si el backend falla.
   *
   * <p>Es deliberado, y lo hereda del front anterior: quien acaba de dejar su correo no puede arreglar
   * un error del servidor, y contárselo solo convierte un gesto amable en una pantalla rota. Lo que sí
   * se distingue es el caso de «ya estabas apuntado», porque ahí el texto tiene que ser otro o parece
   * que el alta no ha servido de nada.
   */
  protected async apunta(correo: string): Promise<void> {
    const resultado = await this.puerto.suscribe(correo);
    this.yaSuscrito.set(resultado.ok && resultado.valor.yaEstaba);
    this.enviado.set(true);
  }
}
