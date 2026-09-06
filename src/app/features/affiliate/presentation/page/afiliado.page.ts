import { Component, computed, inject, signal, viewChild } from '@angular/core';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import {
  faArrowPointer,
  faCartShopping,
  faHandshakeAngle,
  faHourglassHalf,
  faTriangleExclamation,
} from '@fortawesome/free-solid-svg-icons';
import { TraduccionService } from '@core/i18n/traduccion.service';
import { AvisosStore } from '@ds/component/avisos/avisos.store';
import {
  MetodoDeCobro,
  PanelDeAfiliado,
  PerfilDeCobro,
  vistaDelAfiliado,
} from '../../domain/model/afiliado';
import { ConsultaPanelDeAfiliado } from '../../application/use-case/consulta-panel-de-afiliado.use-case';
import { GestionaCobro } from '../../application/use-case/gestiona-cobro.use-case';
import { AltaDeAfiliado } from '../component/alta-de-afiliado';
import { EnlacesDeReferido } from '../component/enlaces-de-referido';
import { FormularioDeCobro, PerfilDeCobroForm } from '../component/perfil-de-cobro';
import { TablaDeComisiones } from '../component/tabla-de-comisiones';
import { TarjetaIndicador } from '../component/tarjeta-indicador';

/**
 * El panel de referidos de quien participa en el programa.
 *
 * <p>Cuatro pantallas en una, según en qué punto esté la solicitud: la invitación, la espera a que un
 * administrador la apruebe, el aviso de cuenta suspendida y el panel. Cuál toca lo decide el dominio;
 * aquí solo se pinta.
 *
 * <p>Todo fallo del servidor se AVISA. Sin ese aviso, un rechazo dejaba la pantalla exactamente igual
 * —ni enlace nuevo, ni alta, ni una palabra— y el afiliado volvía a pulsar creyendo que no había hecho
 * bien el clic.
 */
@Component({
  selector: 'nx-afiliado',
  imports: [
    FaIconComponent,
    AltaDeAfiliado,
    EnlacesDeReferido,
    PerfilDeCobroForm,
    TablaDeComisiones,
    TarjetaIndicador,
  ],
  template: `
    @if (cargando()) {
      <div class="space-y-3 max-w-4xl">
        @for (hueco of huecos; track hueco) {
          <div class="card p-5">
            <div class="skeleton h-5 w-1/3 mb-3"></div>
            <div class="skeleton h-4 w-full"></div>
          </div>
        }
      </div>
    } @else if (panel(); as datos) {
      @switch (vista()) {
        @case ('alta') {
          <nx-alta-de-afiliado
            [porcentaje]="datos.porcentajeDeComision"
            [minimoFormateado]="datos.minimoDeCobroFormateado"
            [enviando]="inscribiendo()"
            (inscribe)="seInscribe()"
          />
        }
        @case ('pendiente') {
          <div class="space-y-5 max-w-2xl mx-auto">
            <header class="text-center max-w-xl mx-auto"><h1>{{ t('affiliate.title') }}</h1></header>
            <section class="card p-6 space-y-3 max-w-lg mx-auto w-full text-center">
              <div
                class="mx-auto w-12 h-12 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center"
              >
                <fa-icon [icon]="iconos.reloj" class="text-xl" />
              </div>
              <h2 class="font-medium">{{ t('affiliate.pending.title') }}</h2>
              <p class="text-sm text-ink-500">{{ t('affiliate.pending.body') }}</p>
            </section>
          </div>
        }
        @case ('suspendida') {
          <div class="space-y-5 max-w-2xl mx-auto">
            <header class="text-center max-w-xl mx-auto"><h1>{{ t('affiliate.title') }}</h1></header>
            <div role="alert" class="alert alert-warning text-sm max-w-lg mx-auto">
              <fa-icon [icon]="iconos.aviso" />
              <span>{{ t('affiliate.suspended.body') }}</span>
            </div>
          </div>
        }
        @default {
          <div class="space-y-5 max-w-4xl">
            <header>
              <h1>{{ t('affiliate.title') }}</h1>
              <p class="text-sm text-ink-500 mt-1">{{ subtitulo() }}</p>
            </header>

            <div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <nx-tarjeta-indicador
                [icono]="iconos.clic"
                [etiqueta]="t('affiliate.kpi.clicks')"
                [valor]="datos.estadisticas.clics.toString()"
              />
              <nx-tarjeta-indicador
                [icono]="iconos.cesta"
                [etiqueta]="t('affiliate.kpi.conversions')"
                [valor]="datos.estadisticas.conversiones.toString()"
              />
              <nx-tarjeta-indicador
                [icono]="iconos.acuerdo"
                [etiqueta]="t('affiliate.kpi.approved')"
                [valor]="datos.estadisticas.aprobadoFormateado"
                tono="text-emerald-600"
              />
              <nx-tarjeta-indicador
                [icono]="iconos.acuerdo"
                [etiqueta]="t('affiliate.kpi.paid')"
                [valor]="datos.estadisticas.pagadoFormateado"
              />
            </div>

            <nx-enlaces-de-referido
              [panel]="datos"
              [perfil]="perfil()"
              [origen]="origen"
              [creando]="creandoCodigo()"
              [solicitando]="solicitandoCobro()"
              [metodo]="metodoElegido()"
              (cambiaMetodo)="metodoElegido.set($event)"
              (creaCodigo)="creaCodigo()"
              (solicita)="solicitaCobro($event)"
            />

            <nx-perfil-de-cobro
              [perfil]="perfil()"
              [guardando]="guardandoPerfil()"
              (guarda)="guardaPerfil($event)"
            />

            <nx-tabla-de-comisiones [comisiones]="datos.comisiones" />
          </div>
        }
      }
    }
  `,
})
export class AfiliadoPage {
  private readonly consulta = inject(ConsultaPanelDeAfiliado);
  private readonly cobro = inject(GestionaCobro);
  private readonly avisos = inject(AvisosStore);
  private readonly traduccion = inject(TraduccionService);

  protected readonly t = this.traduccion.t;
  protected readonly huecos = [1, 2, 3];
  protected readonly iconos = {
    clic: faArrowPointer,
    cesta: faCartShopping,
    acuerdo: faHandshakeAngle,
    reloj: faHourglassHalf,
    aviso: faTriangleExclamation,
  };

  /** El dominio con el que se componen los enlaces de referido. */
  protected readonly origen = typeof location === 'undefined' ? '' : location.origin;

  private readonly formulario = viewChild(PerfilDeCobroForm);

  protected readonly panel = signal<PanelDeAfiliado | null>(null);
  protected readonly perfil = signal<PerfilDeCobro | null>(null);
  protected readonly cargando = signal(true);
  protected readonly inscribiendo = signal(false);
  protected readonly creandoCodigo = signal(false);
  protected readonly solicitandoCobro = signal(false);
  protected readonly guardandoPerfil = signal(false);
  protected readonly metodoElegido = signal<MetodoDeCobro | null>(null);

  protected readonly vista = computed(() => {
    const datos = this.panel();
    return datos ? vistaDelAfiliado(datos) : 'alta';
  });

  constructor() {
    void this.carga();
  }

  protected subtitulo(): string {
    return this.traduccion.tCon('affiliate.subtitle', {
      pct: this.panel()?.porcentajeDeComision ?? 0,
    });
  }

  private async carga(): Promise<void> {
    this.cargando.set(true);
    try {
      const [panel, perfil] = await Promise.all([
        this.consulta.ejecuta(),
        this.cobro.consultaPerfil(),
      ]);
      this.panel.set(panel.ok ? panel.valor : null);
      // El perfil de cobro es opcional: sin él se pinta el panel y el formulario aparece en cuanto se
      // pueda leer. No merece bloquear la pantalla entera.
      this.perfil.set(perfil.ok ? perfil.valor : null);
    } finally {
      this.cargando.set(false);
    }
  }

  private avisaDelFallo(mensaje: string): void {
    this.avisos.error(mensaje || this.t('common.error'));
  }

  protected async seInscribe(): Promise<void> {
    this.inscribiendo.set(true);
    try {
      const resultado = await this.consulta.inscribe();
      if (resultado.ok) {
        this.panel.set(resultado.valor);
      } else {
        this.avisaDelFallo(resultado.error.mensaje);
      }
    } finally {
      this.inscribiendo.set(false);
    }
  }

  protected async creaCodigo(): Promise<void> {
    this.creandoCodigo.set(true);
    try {
      const resultado = await this.consulta.creaCodigo();
      if (!resultado.ok) {
        this.avisaDelFallo(resultado.error.mensaje);
        return;
      }
      // Se relee el panel entero en vez de añadir la fila: el servidor devuelve además los recuentos.
      await this.carga();
    } finally {
      this.creandoCodigo.set(false);
    }
  }

  /**
   * Pide el cobro. NO lo paga: deja constancia para que un administrador lo apruebe y lo transfiera
   * fuera de la aplicación. Es así a propósito.
   */
  protected async solicitaCobro(metodo: MetodoDeCobro): Promise<void> {
    this.solicitandoCobro.set(true);
    try {
      const resultado = await this.cobro.solicita(metodo);
      if (!resultado.ok) {
        this.avisaDelFallo(resultado.error.mensaje);
        return;
      }
      this.avisos.exito(this.t('affiliate.payout.requested'));
      await this.carga();
    } finally {
      this.solicitandoCobro.set(false);
    }
  }

  protected async guardaPerfil(datos: FormularioDeCobro): Promise<void> {
    this.guardandoPerfil.set(true);
    try {
      const resultado = await this.cobro.guardaPerfil(datos);
      if (!resultado.ok) {
        this.avisaDelFallo(this.mensajeDeGuardado(resultado.error.codigo, resultado.error.mensaje));
        return;
      }
      this.perfil.set(resultado.valor);
      this.formulario()?.limpiaSecretos();
      this.avisos.exito(this.t('affiliate.payout.profile.saved'));
    } finally {
      this.guardandoPerfil.set(false);
    }
  }

  /**
   * Los dos fallos que se explican mejor aquí que con el texto genérico del servidor: la contraseña y
   * el IBAN. Son los que la gente comete de verdad, y saber cuál de los dos falló ahorra el intento.
   */
  private mensajeDeGuardado(codigo: string | undefined, mensaje: string): string {
    if (codigo === 'INVALID_PASSWORD') {
      return this.t('affiliate.payout.profile.err_password');
    }
    if (codigo === 'INVALID_IBAN') {
      return this.t('affiliate.payout.profile.err_iban');
    }
    return mensaje;
  }
}
