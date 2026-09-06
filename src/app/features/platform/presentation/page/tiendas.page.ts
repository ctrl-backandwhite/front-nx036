import { Component, inject, signal } from '@angular/core';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faPlus } from '@fortawesome/free-solid-svg-icons';
import { TraduccionService } from '@core/i18n/traduccion.service';
import { DialogoStore } from '@ds/component/dialogo/dialogo.store';
import { PlataformaDeTienda, SolicitudDeConexion, TiendaConectada } from '../../domain/model/tienda';
import { PLATAFORMAS_DE_TIENDA_PORT, TIENDAS_CONECTADAS_PORT } from '../../domain/port/tiendas.port';
import { ConectaTienda } from '../../application/use-case/conecta-tienda.use-case';
import { DialogoConectarTienda } from '../component/dialogo-conectar-tienda';
import { TarjetaDeTienda } from '../component/tarjeta-de-tienda';
import { TiendasVacias } from '../component/tiendas-vacias';

/**
 * Las tiendas conectadas.
 *
 * <p>Las TRES acciones avisan al fallar, y eso no es opcional. Un token equivocado es EL error habitual
 * al conectar una tienda: sin aviso, el formulario se quedaba abierto y en silencio y quien lo usaba
 * repetía el pegado convencido de haber fallado el clic.
 *
 * <p>MOBILE FIRST: las tarjetas en una columna, dos a partir de `sm` y tres en pantalla grande. La
 * cabecera envuelve para que el botón de conectar no empuje el título fuera de la pantalla estrecha.
 */
@Component({
  selector: 'nx-tiendas',
  imports: [FaIconComponent, TarjetaDeTienda, TiendasVacias, DialogoConectarTienda],
  template: `
    <div class="space-y-5">
      <header class="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1>{{ t('shops.title') }}</h1>
          <p class="text-sm text-ink-500 mt-1">{{ t('shops.subtitle') }}</p>
        </div>
        <button type="button" class="btn btn-primary" (click)="abre()">
          <fa-icon [icon]="iconoMas" /> {{ t('shops.connect') }}
        </button>
      </header>

      @if (tiendas().length === 0) {
        <nx-tiendas-vacias [plataformas]="plataformas()" (elige)="abre($event)" />
      } @else {
        <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          @for (tienda of tiendas(); track tienda.id) {
            <nx-tarjeta-de-tienda
              [tienda]="tienda"
              (sincroniza)="sincroniza(tienda)"
              (desconecta)="desconecta(tienda)"
            />
          }
        </div>
      }

      @if (formularioAbierto()) {
        <nx-dialogo-conectar-tienda
          [plataformas]="plataformas()"
          [inicial]="plataformaInicial()"
          [enviando]="conectando()"
          (conecta)="conecta($event)"
          (cancela)="formularioAbierto.set(false)"
        />
      }
    </div>
  `,
})
export class TiendasPage {
  private readonly puertoDeTiendas = inject(TIENDAS_CONECTADAS_PORT);
  private readonly puertoDePlataformas = inject(PLATAFORMAS_DE_TIENDA_PORT);
  private readonly conectaTienda = inject(ConectaTienda);
  private readonly dialogo = inject(DialogoStore);
  protected readonly t = inject(TraduccionService).t;

  protected readonly iconoMas = faPlus;

  protected readonly tiendas = signal<readonly TiendaConectada[]>([]);
  protected readonly plataformas = signal<readonly PlataformaDeTienda[]>([]);

  protected readonly formularioAbierto = signal(false);
  protected readonly plataformaInicial = signal('shopify');
  protected readonly conectando = signal(false);

  constructor() {
    void this.recarga();
    void this.cargaPlataformas();
  }

  protected abre(plataforma?: string): void {
    if (plataforma) {
      this.plataformaInicial.set(plataforma);
    }
    this.formularioAbierto.set(true);
  }

  protected async conecta(solicitud: SolicitudDeConexion): Promise<void> {
    this.conectando.set(true);
    try {
      const resultado = await this.conectaTienda.ejecuta(solicitud, this.plataformas());
      if (!resultado.ok) {
        await this.avisa(resultado.error.mensaje);
        return;
      }
      this.formularioAbierto.set(false);
      await this.recarga();
    } finally {
      this.conectando.set(false);
    }
  }

  protected async sincroniza(tienda: TiendaConectada): Promise<void> {
    const resultado = await this.puertoDeTiendas.sincroniza(tienda.id);
    if (!resultado.ok) {
      await this.avisa(resultado.error.mensaje);
      return;
    }
    await this.recarga();
  }

  protected async desconecta(tienda: TiendaConectada): Promise<void> {
    // Desconectar borra las publicaciones de esa tienda: se pregunta, y con el nombre delante, para
    // que nadie desconecte la que no era desde una rejilla de tarjetas parecidas.
    const mensaje = this.t('shops.action.disconnect_confirm').replace(
      '{shop}',
      tienda.identificador || tienda.plataforma,
    );
    if (!(await this.dialogo.confirma(mensaje))) {
      return;
    }
    const resultado = await this.puertoDeTiendas.desconecta(tienda.id);
    if (!resultado.ok) {
      await this.avisa(resultado.error.mensaje);
      return;
    }
    await this.recarga();
  }

  private async recarga(): Promise<void> {
    const resultado = await this.puertoDeTiendas.lista();
    if (resultado.ok) {
      this.tiendas.set(resultado.valor);
    }
  }

  private async cargaPlataformas(): Promise<void> {
    const resultado = await this.puertoDePlataformas.lista();
    if (resultado.ok) {
      this.plataformas.set(resultado.valor);
    }
  }

  /** El mensaje lo escribe el backend, ya traducido. Si no vino ninguno, se usa el genérico. */
  private async avisa(mensaje: string): Promise<void> {
    await this.dialogo.alerta(mensaje || this.t('common.error'), undefined, 'error');
  }
}
