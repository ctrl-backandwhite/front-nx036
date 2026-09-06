import { Component, effect, inject, input, signal } from '@angular/core';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import {
  faBoxArchive,
  faCheckDouble,
  faFilter,
  faInbox,
  faPaperPlane,
  faRotateLeft,
  faTrash,
} from '@fortawesome/free-solid-svg-icons';
import { TraduccionService } from '@core/i18n/traduccion.service';
import { AvisosStore } from '@ds/component/avisos/avisos.store';
import { DialogoStore } from '@ds/component/dialogo/dialogo.store';
import { Aviso, Carpeta, Categoria, EstadoDeGestion } from '../../domain/model/aviso';
import { Difusion } from '../../domain/port/avisos.port';
import { BuzonStore } from '../../application/state/buzon.store';
import { ConsultaElBuzon } from '../../application/use-case/consulta-el-buzon.use-case';
import { LeeUnAviso } from '../../application/use-case/lee-un-aviso.use-case';
import { DifundeUnAviso } from '../../application/use-case/difunde-un-aviso.use-case';
import { MueveAvisos, Movimiento } from '../../application/use-case/mueve-avisos.use-case';
import { ListaDeAvisos } from '../component/lista-de-avisos';
import { LecturaDeAviso } from '../component/lectura-de-aviso';
import { DialogoDeDifusion } from '../component/dialogo-de-difusion';

/** Las tres carpetas, con su icono. En este orden, que es el de uso. */
const CARPETAS: readonly { carpeta: Carpeta; icono: typeof faInbox }[] = [
  { carpeta: 'inbox', icono: faInbox },
  { carpeta: 'archived', icono: faBoxArchive },
  { carpeta: 'trash', icono: faTrash },
];

/**
 * El buzón: carpetas, filtro por tipo, lista y panel de lectura.
 *
 * <p>Esta clase ORQUESTA y no pinta apenas: la lista, la lectura y el formulario de difusión son
 * componentes aparte. La página se queda con lo que de verdad es suyo —qué carpeta se está viendo, qué
 * pasa al pulsar cada cosa y qué se cuenta cuando algo falla.
 *
 * <p>TODAS las acciones avisan cuando el servidor las rechaza. Sin eso, el buzón se quedaba MUDO ante un
 * fallo: el aviso seguía en su sitio, no salía ningún mensaje y quien miraba volvía a pulsar creyendo
 * que había fallado el clic. La única silenciosa es la marca de leído, porque la dispara el propio buzón
 * al abrir un mensaje y no quien mira.
 *
 * <p>MOBILE FIRST: en el móvil se ve la lista O el mensaje, nunca los dos; a partir de `sm` conviven.
 */
@Component({
  selector: 'nx-buzon',
  imports: [FaIconComponent, ListaDeAvisos, LecturaDeAviso, DialogoDeDifusion],
  template: `
    <div class="space-y-4" [class.max-w-3xl]="!esDeLaCasa()" [class.mx-auto]="!esDeLaCasa()">
      <header class="flex items-end justify-between gap-2 flex-wrap">
        <h1 class="text-2xl font-semibold">{{ t('notif.title') }}</h1>
        <div class="flex gap-2">
          @if (esDeLaCasa()) {
            <button type="button" class="btn btn-primary text-[12px]" (click)="difundiendo.set(true)">
              <fa-icon [icon]="iconos.enviar" /> {{ t('notif.send.btn') }}
            </button>
          }
          <button type="button" class="btn btn-outline text-[12px]" (click)="marcaTodosLeidos()">
            <fa-icon [icon]="iconos.todos" /> {{ t('notif.mark_all_read') }}
          </button>
        </div>
      </header>

      @if (difundiendo()) {
        <nx-dialogo-de-difusion (cierra)="difundiendo.set(false)" (manda)="difunde($event)" />
      }

      <div class="flex items-center justify-between gap-3 border-b border-base-200 flex-wrap">
        <div class="flex items-center gap-1">
          @for (opcion of carpetas; track opcion.carpeta) {
            <button type="button"
                    class="px-4 py-2.5 text-[13px] font-medium border-b-2 -mb-px transition-colors flex items-center gap-2"
                    [class.border-primary]="buzon.carpeta() === opcion.carpeta"
                    [class.text-primary]="buzon.carpeta() === opcion.carpeta"
                    [class.border-transparent]="buzon.carpeta() !== opcion.carpeta"
                    [class.opacity-70]="buzon.carpeta() !== opcion.carpeta"
                    [attr.aria-current]="buzon.carpeta() === opcion.carpeta ? 'page' : null"
                    (click)="abreCarpeta(opcion.carpeta)">
              <fa-icon [icon]="opcion.icono" class="text-[12px]" /> {{ t('notif.folder.' + opcion.carpeta) }}
            </button>
          }
        </div>
        <div class="flex items-center gap-2 pb-1.5">
          <fa-icon [icon]="iconos.filtro" class="text-[11px] opacity-50" />
          <label class="sr-only" for="buzon-filtro">{{ t('notif.filter.all') }}</label>
          <select id="buzon-filtro" class="select select-bordered select-sm text-[12px] min-w-[150px]"
                  [value]="buzon.filtro()" (change)="filtra($event)">
            <option value="">{{ t('notif.filter.all') }}</option>
            @for (categoria of buzon.categorias(); track categoria) {
              <option [value]="categoria">{{ t('notif.cat.' + categoria) }}</option>
            }
          </select>
        </div>
      </div>

      @if (buzon.marcados().size > 0) {
        <div class="flex items-center gap-2 flex-wrap bg-base-200 rounded-lg px-3 py-2">
          <span class="text-[12px] opacity-70 mr-1">{{ seleccionados() }}</span>
          @if (buzon.carpeta() === 'inbox') {
            <button type="button" class="btn btn-outline btn-xs" [disabled]="enLote()"
                    (click)="lote('archiva')">
              <fa-icon [icon]="iconos.archivar" /> {{ t('notif.action.archive') }}
            </button>
          }
          @if (buzon.carpeta() === 'archived') {
            <button type="button" class="btn btn-outline btn-xs" [disabled]="enLote()"
                    (click)="lote('desarchiva')">
              <fa-icon [icon]="iconos.bandeja" /> {{ t('notif.action.unarchive') }}
            </button>
          }
          @if (buzon.carpeta() === 'trash') {
            <button type="button" class="btn btn-outline btn-xs" [disabled]="enLote()"
                    (click)="lote('restaura')">
              <fa-icon [icon]="iconos.restaurar" /> {{ t('notif.action.restore') }}
            </button>
            <button type="button" class="btn btn-outline btn-xs text-error" [disabled]="enLote()"
                    (click)="loteDefinitivo()">
              <fa-icon [icon]="iconos.papelera" /> {{ t('notif.action.delete_forever') }}
            </button>
          } @else {
            <button type="button" class="btn btn-outline btn-xs text-error" [disabled]="enLote()"
                    (click)="lote('aLaPapelera')">
              <fa-icon [icon]="iconos.papelera" /> {{ t('notif.action.trash') }}
            </button>
          }
          <button type="button" class="btn btn-ghost btn-xs ml-auto" (click)="buzon.limpiaMarcados()">
            {{ t('common.cancel') }}
          </button>
        </div>
      }

      <div class="card overflow-hidden p-0 border border-base-200">
        <div class="flex flex-col sm:flex-row h-[calc(100vh-260px)] min-h-[440px]">
          <nx-lista-de-avisos
            [avisos]="buzon.visibles()"
            [carpeta]="buzon.carpeta()"
            [abiertoId]="buzon.abierto()?.id ?? null"
            [marcados]="buzon.marcados()"
            [todosMarcados]="buzon.todosMarcados()"
            (abre)="abre($event)"
            (alterna)="buzon.alterna($event)"
            (alternaTodos)="buzon.alternaTodos()"
            (mueve)="mueveUno($event.id, $event.movimiento)"
          />
          <nx-lectura-de-aviso
            [aviso]="buzon.abierto()"
            [carpeta]="buzon.carpeta()"
            [esDeLaCasa]="esDeLaCasa()"
            [enviando]="respondiendo()"
            (cierra)="buzon.abre(null)"
            (mueve)="mueveElAbierto($event)"
            (cambiaEstado)="cambiaEstado($event)"
            (responde)="responde($event)"
          />
        </div>
      </div>
    </div>
  `,
})
export class BuzonPage {
  private readonly traduccion = inject(TraduccionService);
  private readonly consulta = inject(ConsultaElBuzon);
  private readonly lee = inject(LeeUnAviso);
  private readonly mueveAvisos = inject(MueveAvisos);
  private readonly difunde_ = inject(DifundeUnAviso);
  private readonly avisosDePantalla = inject(AvisosStore);
  private readonly dialogo = inject(DialogoStore);

  protected readonly buzon = inject(BuzonStore);
  protected readonly t = this.traduccion.t;
  protected readonly carpetas = CARPETAS;

  /**
   * Si quien mira es del personal de la casa. Llega por los DATOS de la ruta y no preguntándole a la
   * sesión: la dirección del panel ya está protegida por papel, así que la ruta es la que lo sabe. De
   * paso, este contexto no tiene que entrar en las tripas del de acceso para pintar un botón.
   */
  readonly esDeLaCasa = input(false);

  /** El aviso que se quiere abrir, si se llega desde la campana (`?n=<id>`). */
  readonly n = input('');

  protected readonly difundiendo = signal(false);
  protected readonly enLote = signal(false);
  protected readonly respondiendo = signal(false);

  protected readonly iconos = {
    enviar: faPaperPlane,
    todos: faCheckDouble,
    filtro: faFilter,
    bandeja: faInbox,
    archivar: faBoxArchive,
    papelera: faTrash,
    restaurar: faRotateLeft,
  };

  constructor() {
    void this.recarga();
    // Si se llega desde un aviso concreto, se abre ESE y no el primero: venir de un aviso y aterrizar
    // en otro obliga a buscarlo a mano. El efecto depende del parámetro, así que también funciona
    // cuando se pulsa otro estando ya aquí —la dirección cambia sin volver a montar la pantalla.
    effect(() => {
      const pedido = this.n();
      const encontrado = pedido
        ? this.buzon.visibles().find((aviso) => aviso.id === pedido)
        : undefined;
      if (encontrado && encontrado.id !== this.buzon.abierto()?.id) {
        void this.abre(encontrado);
      }
    });
  }

  protected seleccionados(): string {
    return this.traduccion.tCon('admin.bulk.selected', { n: this.buzon.marcados().size });
  }

  protected async abre(aviso: Aviso): Promise<void> {
    await this.lee.ejecuta(aviso);
  }

  protected abreCarpeta(carpeta: Carpeta): void {
    this.buzon.abreCarpeta(carpeta);
    void this.recarga();
  }

  protected filtra(evento: Event): void {
    this.buzon.filtraPor((evento.target as HTMLSelectElement).value as Categoria | '');
  }

  protected async marcaTodosLeidos(): Promise<void> {
    const resultado = await this.lee.todos();
    if (!resultado.ok) {
      this.cuentaElFallo(resultado.error.mensaje);
      return;
    }
    await this.recarga();
  }

  protected async mueveUno(id: string, movimiento: Movimiento): Promise<void> {
    if (movimiento === 'borraParaSiempre' && !(await this.confirmaElBorrado())) {
      return;
    }
    const resultado = await this.mueveAvisos.uno(id, movimiento);
    if (!resultado.ok) {
      this.cuentaElFallo(resultado.error.mensaje);
    }
  }

  protected async mueveElAbierto(movimiento: Movimiento): Promise<void> {
    const abierto = this.buzon.abierto();
    if (abierto) {
      await this.mueveUno(abierto.id, movimiento);
    }
  }

  protected async lote(movimiento: Movimiento): Promise<void> {
    this.enLote.set(true);
    try {
      const resultado = await this.mueveAvisos.enLote([...this.buzon.marcados()], movimiento);
      if (!resultado.ok) {
        this.cuentaElFallo(resultado.error.mensaje);
      }
    } finally {
      // Pase lo que pase se sueltan los botones: dejarlos apagados para siempre fue el fallo original.
      this.enLote.set(false);
    }
  }

  protected async loteDefinitivo(): Promise<void> {
    if (await this.confirmaElBorrado()) {
      await this.lote('borraParaSiempre');
    }
  }

  protected async cambiaEstado(estado: EstadoDeGestion): Promise<void> {
    const abierto = this.buzon.abierto();
    if (!abierto) {
      return;
    }
    const resultado = await this.mueveAvisos.cambiaEstado(abierto.id, estado);
    if (!resultado.ok) {
      this.cuentaElFallo(resultado.error.mensaje);
      return;
    }
    await this.recarga();
  }

  protected async difunde(difusion: Difusion): Promise<void> {
    const resultado = await this.difunde_.ejecuta(difusion);
    if (!resultado.ok) {
      this.avisosDePantalla.error(resultado.error.mensaje || this.t('notif.send.error'));
      return;
    }
    this.difundiendo.set(false);
    this.avisosDePantalla.exito(this.traduccion.tCon('notif.send.ok', { n: resultado.valor }));
    await this.recarga();
  }

  protected async responde(respuesta: {
    email: string;
    asunto: string;
    mensaje: string;
  }): Promise<void> {
    this.respondiendo.set(true);
    try {
      const resultado = await this.difunde_.responde(respuesta);
      if (resultado.ok) {
        this.avisosDePantalla.exito(this.t('notif.reply.ok'));
        return;
      }
      this.avisosDePantalla.error(resultado.error.mensaje || this.t('notif.reply.error'));
    } finally {
      this.respondiendo.set(false);
    }
  }

  private confirmaElBorrado(): Promise<boolean> {
    // El borrado definitivo no tiene vuelta atrás: se pregunta siempre, también en lote.
    return this.dialogo.confirma(
      this.t('notif.action.delete_forever_confirm'),
      this.t('notif.action.delete_forever'),
    );
  }

  private cuentaElFallo(mensaje: string): void {
    this.avisosDePantalla.error(mensaje || this.t('common.error'));
  }

  private async recarga(): Promise<void> {
    const resultado = await this.consulta.ejecuta(this.buzon.carpeta());
    if (!resultado.ok) {
      this.cuentaElFallo(resultado.error.mensaje);
    }
  }
}
