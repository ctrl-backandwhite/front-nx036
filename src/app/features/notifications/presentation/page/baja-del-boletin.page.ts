import { Component, effect, inject, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faCircleCheck, faTriangleExclamation } from '@fortawesome/free-solid-svg-icons';
import { TraduccionService } from '@core/i18n/traduccion.service';
import { Plataforma } from '@core/platform/plataforma';
import { GestionaElBoletin } from '../../application/use-case/gestiona-el-boletin.use-case';

/**
 * La baja del boletín, a la que se llega desde el enlace del pie de cada envío.
 *
 * <p>Se da de baja SOLA al abrir: quien pulsa «no quiero más correos» ya ha dicho lo que quería, y
 * pedirle que lo confirme otra vez es hacerle trabajar para dejar de recibir algo que no pidió.
 *
 * <p>Va por TESTIGO, no por dirección de correo: si aceptara un correo, cualquiera podría dar de baja a
 * otro escribiendo su dirección.
 *
 * <p>Solo actúa en el NAVEGADOR: al prerenderizar no hay a quién dar de baja, y hacerlo allí una vez
 * daría de baja a quien generó el HTML.
 */
@Component({
  selector: 'nx-baja-del-boletin',
  imports: [RouterLink, FaIconComponent],
  template: `
    <div class="max-w-md mx-auto py-16 px-4 text-center space-y-4">
      @switch (estado()) {
        @case ('procesando') {
          <div class="loading loading-spinner loading-lg text-primary"></div>
        }
        @case ('hecho') {
          <fa-icon [icon]="iconos.hecho" class="text-4xl text-success" />
          <h1 class="text-xl font-medium">{{ t('newsletter.unsub.ok_title') }}</h1>
          <p class="text-sm opacity-70">{{ t('newsletter.unsub.ok_body') }}</p>
        }
        @case ('error') {
          <fa-icon [icon]="iconos.aviso" class="text-4xl text-warning" />
          <h1 class="text-xl font-medium">{{ t('newsletter.unsub.err_title') }}</h1>
          <p class="text-sm opacity-70">{{ t('newsletter.unsub.err_body') }}</p>
        }
      }
      <a routerLink="/" class="btn btn-outline btn-sm">{{ t('newsletter.unsub.home') }}</a>
    </div>
  `,
})
export class BajaDelBoletinPage {
  private readonly plataforma = inject(Plataforma);
  private readonly boletin = inject(GestionaElBoletin);

  protected readonly t = inject(TraduccionService).t;

  /** El testigo del enlace del correo. Lo ata el enrutador desde `?token=…`. */
  readonly token = input('');

  protected readonly estado = signal<'procesando' | 'hecho' | 'error'>('procesando');
  protected readonly iconos = { hecho: faCircleCheck, aviso: faTriangleExclamation };

  constructor() {
    effect(() => {
      const testigo = this.token();
      if (!this.plataforma.esNavegador) {
        return;
      }
      if (!testigo) {
        this.estado.set('error');
        return;
      }
      void this.daDeBaja(testigo);
    });
  }

  private async daDeBaja(testigo: string): Promise<void> {
    const resultado = await this.boletin.daDeBaja(testigo);
    this.estado.set(resultado.ok && resultado.valor ? 'hecho' : 'error');
  }
}
