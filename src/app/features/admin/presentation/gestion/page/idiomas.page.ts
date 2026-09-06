import { Component, computed, inject, signal } from '@angular/core';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import {
  faBan, faCheck, faCircleCheck, faPlus, faTrash, faXmark,
} from '@fortawesome/free-solid-svg-icons';
import { FormField, form, maxLength, pattern, required } from '@angular/forms/signals';
import { TraduccionService } from '@core/i18n/traduccion.service';
import { Result } from '@shared/result/result';
import { AppError } from '@shared/error/app-error';
import { DialogoStore } from '@ds/component/dialogo/dialogo.store';
import { LOCALE_OPTIONS } from '@shared/i18n/translations';
import {
  IdiomaDeTienda, ordenaIdiomas, sinDiccionarioDeInterfaz,
} from '../../../domain/gestion/model/sistema';
import {
  ActivaIdiomasEnLote, BorraElIdioma, ConsultaIdiomas, GuardaElIdioma,
} from '../../../application/gestion/use-case/sistema.use-case';

/** Cuántos motivos de fallo se enseñan en el resumen del lote antes de que el mensaje sea ilegible. */
const ERRORES_QUE_SE_ENSENAN = 8;

/**
 * Los idiomas que SÍ tienen diccionario de interfaz.
 *
 * <p>OJO, cambia respecto al React: allí se contaban las claves sueltas que le faltaban a cada idioma
 * porque los ocho diccionarios estaban en memoria. Aquí se cargan en diferido —solo español e inglés
 * viajan en el paquete inicial—, así que contar claves diría «le faltan todas» de cualquier idioma que
 * todavía no se haya descargado. La comprobación pasa a ser la que de verdad importa: si este idioma
 * TIENE diccionario propio o se queda con el inglés.
 */
const CON_DICCIONARIO: readonly string[] = LOCALE_OPTIONS.map((opcion) => opcion.code);

/** El código de un idioma es el de BCP-47 corto: dos o tres letras, opcionalmente con región. */
const CODIGO_DE_IDIOMA = /^[A-Za-z]{2,3}(-[A-Za-z0-9]{2,8})?$/;

/**
 * El registro de idiomas de la tienda, que es ILIMITADO.
 *
 * <p>Alimenta el selector del escaparate y las pestañas de contenido del editor de productos. Antes de
 * publicar uno sin diccionario de interfaz se pide permiso: el contenido de producto se traduce por su
 * cuenta, así que la ficha se vería traducida y el menú, el carrito y el pago en inglés. Ese mestizaje
 * hay que avisarlo, no descubrirlo en la tienda.
 *
 * <p>RENDIMIENTO: la tabla va bajo el pliegue y se difiere con `on viewport`; lo primero que se pinta
 * es la cabecera y el alta, que es a lo que se entra.
 *
 * <p>MOBILE FIRST: el alta se apila en el móvil (`flex-wrap`) y la tabla se desplaza en horizontal
 * dentro de su tarjeta en vez de estrujar las columnas.
 */
@Component({
  selector: 'nx-idiomas-admin',
  imports: [FaIconComponent, FormField],
  template: `
    <div class="space-y-4">
      <div class="flex items-end justify-between gap-3 flex-wrap">
        <div>
          <h1 class="text-2xl font-semibold">{{ t('admin.languages.title') }}</h1>
          <p class="text-ink-500 text-sm">{{ t('admin.languages.subtitle') }}</p>
        </div>
        @if (seleccionados().size > 0) {
          <div class="flex items-center gap-1 flex-wrap">
            <span class="text-[11px] text-ink-500 mr-1">
              {{ tCon('admin.bulk.selected', { n: seleccionados().size }) }}
            </span>
            <button type="button" (click)="activaEnLote(true)" [disabled]="ocupado()"
                    class="btn btn-outline btn-sm text-[12px]" [title]="t('admin.languages.active')">
              <fa-icon [icon]="iconos.activar" /> {{ t('admin.languages.active') }}
            </button>
            <button type="button" (click)="activaEnLote(false)" [disabled]="ocupado()"
                    class="btn btn-outline btn-sm text-[12px]" [title]="t('admin.languages.inactive')">
              <fa-icon [icon]="iconos.desactivar" /> {{ t('admin.languages.inactive') }}
            </button>
          </div>
        }
      </div>

      <!-- Alta de idioma. Nace ACTIVO, así que también pasa por el aviso de interfaz sin traducir. -->
      <div class="card p-4 flex flex-wrap items-end gap-3">
        <div>
          <label for="idioma-codigo" class="text-[12px] font-medium text-ink-600 mb-1 block">
            {{ t('admin.languages.code') }}
          </label>
          <input id="idioma-codigo" class="input input-bordered input-sm w-24" placeholder="ja"
                 [formField]="formulario.codigo" />
          @if (formulario.codigo().touched() && formulario.codigo().errors().length) {
            <p role="alert" class="text-[11px] text-error mt-0.5">
              {{ formulario.codigo().errors()[0].message }}
            </p>
          }
        </div>
        <div>
          <label for="idioma-etiqueta" class="text-[12px] font-medium text-ink-600 mb-1 block">
            {{ t('admin.languages.label') }}
          </label>
          <input id="idioma-etiqueta" class="input input-bordered input-sm w-48" placeholder="日本語"
                 [formField]="formulario.etiqueta" />
          @if (formulario.etiqueta().touched() && formulario.etiqueta().errors().length) {
            <p role="alert" class="text-[11px] text-error mt-0.5">
              {{ formulario.etiqueta().errors()[0].message }}
            </p>
          }
        </div>
        <div>
          <label for="idioma-bandera" class="text-[12px] font-medium text-ink-600 mb-1 block">
            {{ t('admin.languages.flag') }}
          </label>
          <input id="idioma-bandera" class="input input-bordered input-sm w-20" placeholder="🇯🇵"
                 [formField]="formulario.bandera" />
        </div>
        <button type="button" (click)="anade()" [disabled]="ocupado() || formulario().invalid()"
                class="btn btn-primary btn-sm">
          <fa-icon [icon]="iconos.anadir" /> {{ t('admin.languages.add') }}
        </button>
      </div>

      <!-- RENDIMIENTO: la tabla queda bajo la cabecera y el alta, así que se difiere hasta que se
           llega a ella. El hueco se reserva para que la página no dé un salto al aparecer. -->
      @defer (on viewport) {
      <div class="card overflow-hidden">
        <div class="overflow-x-auto">
          <table class="table table-sm">
            <thead class="bg-ink-50 text-ink-500 text-left text-[12px]">
              <tr>
                <th class="px-3 py-2 w-8">
                  <input type="checkbox" class="checkbox checkbox-xs" [checked]="todosMarcados()"
                         (change)="alternaTodos()" [attr.aria-label]="t('admin.categories.select_all')" />
                </th>
                <th class="px-3 py-2">{{ t('admin.languages.code') }}</th>
                <th class="px-3 py-2">{{ t('admin.languages.label') }}</th>
                <th class="px-3 py-2 text-center">{{ t('admin.languages.active') }}</th>
                <th class="px-3 py-2 text-center">{{ t('admin.languages.default') }}</th>
                <th class="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody>
              @for (idioma of idiomas(); track idioma.id) {
                <!-- La fila marcada se tiñe con una clase entera y no con una asociación por clase:
                     la barra de la opacidad no forma parte de un nombre que Angular sepa leer. -->
                <tr class="border-t border-ink-100" [class]="marcado(idioma.id) ? 'bg-brand-50/40' : ''">
                  <td class="px-3 py-2 w-8">
                    <input type="checkbox" class="checkbox checkbox-xs" [checked]="marcado(idioma.id)"
                           (change)="alterna(idioma.id)" [attr.aria-label]="idioma.codigo" />
                  </td>
                  <td class="px-3 py-2 font-mono">{{ idioma.bandera }} {{ idioma.codigo }}</td>
                  <td class="px-3 py-2">{{ idioma.etiqueta }}</td>
                  <td class="px-3 py-2 text-center">
                    <button type="button" (click)="alternaActivo(idioma)"
                            class="btn btn-xs btn-circle"
                            [class.btn-success]="idioma.activo" [class.btn-ghost]="!idioma.activo"
                            [title]="rotuloDeEstado(idioma)"
                            [attr.aria-label]="idioma.codigo + ': ' + rotuloDeEstado(idioma)">
                      <fa-icon [icon]="idioma.activo ? iconos.si : iconos.no" />
                    </button>
                  </td>
                  <td class="px-3 py-2 text-center">
                    <input type="radio" name="idiomaPorDefecto" class="radio radio-xs"
                           [checked]="idioma.porDefecto" (change)="marcaPorDefecto(idioma)"
                           [title]="t('admin.languages.default')"
                           [attr.aria-label]="idioma.codigo + ': ' + t('admin.languages.default')" />
                  </td>
                  <td class="px-3 py-2 text-right">
                    <button type="button" (click)="borra(idioma)"
                            class="btn btn-ghost btn-xs btn-square text-error"
                            [title]="t('actions.delete')"
                            [attr.aria-label]="t('actions.delete') + ' ' + idioma.codigo">
                      <fa-icon [icon]="iconos.borrar" />
                    </button>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </div>
      } @placeholder {
        <div class="card h-64"></div>
      }
    </div>
  `,
})
export class IdiomasPage {
  protected readonly t = inject(TraduccionService).t;
  protected readonly tCon = inject(TraduccionService).tCon;
  private readonly dialogo = inject(DialogoStore);
  private readonly consulta = inject(ConsultaIdiomas);
  private readonly guarda = inject(GuardaElIdioma);
  private readonly borraElIdioma = inject(BorraElIdioma);
  private readonly loteDeActivacion = inject(ActivaIdiomasEnLote);

  protected readonly iconos = {
    anadir: faPlus, borrar: faTrash, si: faCheck, no: faXmark,
    activar: faCircleCheck, desactivar: faBan,
  };

  protected readonly idiomas = signal<readonly IdiomaDeTienda[]>([]);
  protected readonly seleccionados = signal<ReadonlySet<string>>(new Set());
  protected readonly ocupado = signal(false);

  /**
   * El alta de un idioma.
   *
   * <p>El CÓDIGO es la clave con la que lo guarda el backend y el rótulo del selector de la tienda: sin
   * él no hay idioma. Antes eso se comprobaba dentro del manejador y se contaba con una ventana de
   * aviso después de pulsar; ahora lo dice el esquema, el botón se apaga y el campo explica por qué.
   *
   * <p>La ETIQUETA no se exige: el caso de uso pone el código en mayúsculas cuando falta, para que el
   * selector de la tienda nunca aparezca en blanco.
   */
  protected readonly modelo = signal({ codigo: '', etiqueta: '', bandera: '' });
  protected readonly formulario = form(this.modelo, (ruta) => {
    required(ruta.codigo, { message: () => this.t('dialog.field.required') });
    pattern(ruta.codigo, CODIGO_DE_IDIOMA, { message: () => this.t('login.error.bad_data') });
    // La bandera es un emoji: dos o tres símbolos como mucho, no una frase.
    maxLength(ruta.bandera, 8, { message: () => this.t('login.error.bad_data') });
  });

  protected readonly todosMarcados = computed(() => {
    const lista = this.idiomas();
    const marcados = this.seleccionados();
    return lista.length > 0 && lista.every((idioma) => marcados.has(idioma.id));
  });

  constructor() {
    void this.carga();
  }

  protected marcado(id: string): boolean {
    return this.seleccionados().has(id);
  }

  protected rotuloDeEstado(idioma: IdiomaDeTienda): string {
    return this.t(idioma.activo ? 'admin.languages.active' : 'admin.languages.inactive');
  }

  protected alterna(id: string): void {
    this.seleccionados.update((previos) => {
      const siguientes = new Set(previos);
      if (!siguientes.delete(id)) {
        siguientes.add(id);
      }
      return siguientes;
    });
  }

  protected alternaTodos(): void {
    this.seleccionados.set(
      this.todosMarcados() ? new Set() : new Set(this.idiomas().map((idioma) => idioma.id)),
    );
  }

  /** El alta crea el idioma ya ACTIVO: por eso pide permiso igual que el interruptor de la fila. */
  protected async anade(): Promise<void> {
    if (this.formulario().invalid()) {
      return;
    }
    const alta = this.modelo();
    const codigo = alta.codigo.trim().toLowerCase();
    if (!(await this.autorizaActivacion([codigo]))) {
      return;
    }
    await this.conFallo(() =>
      this.guarda.ejecuta({
        codigo,
        etiqueta: alta.etiqueta.trim(),
        bandera: alta.bandera.trim() || undefined,
        posicion: this.idiomas().length,
        activo: true,
      }),
    );
    // Se vacía con `reset` para que además quede sin tocar: si no, el alta recién hecha se quedaría en
    // rojo por «obligatorio» nada más terminar.
    this.formulario().reset({ codigo: '', etiqueta: '', bandera: '' });
  }

  protected async alternaActivo(idioma: IdiomaDeTienda): Promise<void> {
    // Apagar nunca pregunta: lo que hay que avisar es lo que se PUBLICA, no lo que se retira.
    if (!idioma.activo && !(await this.autorizaActivacion([idioma.codigo]))) {
      return;
    }
    await this.conFallo(() => this.guarda.ejecuta({ ...idioma, activo: !idioma.activo }));
  }

  protected async marcaPorDefecto(idioma: IdiomaDeTienda): Promise<void> {
    await this.conFallo(() => this.guarda.ejecuta({ ...idioma, porDefecto: true }));
  }

  protected async borra(idioma: IdiomaDeTienda): Promise<void> {
    if (!(await this.dialogo.confirma(this.t('admin.languages.delete_confirm')))) {
      return;
    }
    await this.conFallo(() => this.borraElIdioma.ejecuta(idioma.id));
  }

  /**
   * Activar o desactivar los marcados.
   *
   * <p>No hay endpoint masivo: el caso de uso recorre uno a uno y devuelve el recuento, así que aquí se
   * enseña el resumen con los motivos de los que se quedaron sin cambiar. Tragárselos dejaría creer que
   * el lote entero salió bien.
   */
  protected async activaEnLote(activo: boolean): Promise<void> {
    const marcados = this.idiomas().filter((idioma) => this.seleccionados().has(idioma.id));
    if (!marcados.length) {
      return;
    }
    if (activo && !(await this.autorizaActivacion(marcados.map((idioma) => idioma.codigo)))) {
      return;
    }
    this.ocupado.set(true);
    const resumen = await this.loteDeActivacion.ejecuta(marcados, activo);
    this.ocupado.set(false);
    this.seleccionados.set(new Set());
    await this.carga();
    const detalle = resumen.errores.slice(0, ERRORES_QUE_SE_ENSENAN).join('\n');
    await this.dialogo.alerta(
      this.tCon('admin.bulk.done', { ok: resumen.correctos, fail: resumen.fallidos })
        + (detalle ? '\n' + detalle : ''),
      undefined,
      resumen.fallidos ? 'warning' : 'success',
    );
  }

  /**
   * Pide permiso antes de poner en el escaparate un idioma sin diccionario de interfaz.
   *
   * <p>Devuelve cierto cuando no hay nada que avisar, para poder encadenarlo en el propio manejador.
   */
  private async autorizaActivacion(codigos: readonly string[]): Promise<boolean> {
    const incompletos = sinDiccionarioDeInterfaz(codigos, CON_DICCIONARIO);
    if (!incompletos.length) {
      return true;
    }
    return this.dialogo.confirma(
      this.conRespaldo(
        'admin.languages.untranslated_confirm',
        'La interfaz no está traducida a estos idiomas ({langs}): quien los elija verá el menú, el'
          + ' carrito y el pago en inglés. ¿Activarlos igualmente?',
      ).replaceAll('{langs}', incompletos.join(', ')),
    );
  }

  /**
   * El texto de una clave que todavía NO está en los ocho diccionarios.
   *
   * <p>`t()` devuelve la clave misma cuando falta, y una clave técnica en pantalla no dice nada. Es el
   * mismo respaldo que traía el React para estos avisos internos del panel.
   */
  private conRespaldo(clave: string, respaldo: string): string {
    const traducido = this.t(clave);
    return traducido === clave ? respaldo : traducido;
  }

  /** Cualquier escritura: si el backend dice que no, se enseña; y si dice que sí, se relee. */
  private async conFallo(accion: () => Promise<Result<void, AppError>>): Promise<void> {
    this.ocupado.set(true);
    const resultado = await accion();
    this.ocupado.set(false);
    if (!resultado.ok) {
      await this.dialogo.alerta(resultado.error.mensaje || this.t('common.error'), undefined, 'error');
      return;
    }
    await this.carga();
  }

  private async carga(): Promise<void> {
    const resultado = await this.consulta.ejecuta();
    if (resultado.ok) {
      this.idiomas.set(ordenaIdiomas(resultado.valor));
    }
  }
}
