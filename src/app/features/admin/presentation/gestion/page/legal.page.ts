import { Component, computed, inject, signal } from '@angular/core';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import {
  faCircleCheck, faFloppyDisk, faPlus, faTrashCan, faTriangleExclamation, faUpload,
} from '@fortawesome/free-solid-svg-icons';
import { FormField, applyEach, form, required } from '@angular/forms/signals';
import { TraduccionService } from '@core/i18n/traduccion.service';
import { DialogoStore } from '@ds/component/dialogo/dialogo.store';
import {
  CLASES_DE_DOCUMENTO, ClaseDeDocumento, DocumentoLegal, IDIOMAS_LEGALES, SeccionLegal,
  conBorradorPendiente, fuenteDeEdicion, versionDeHoy,
} from '../../../domain/gestion/model/legal';
import {
  ConsultaDocumentosLegales, ConsultaElDocumento, GuardaElBorradorLegal, PublicaLosTextosLegales,
} from '../../../application/gestion/use-case/legal.use-case';

/** Los párrafos de una sección se separan por LÍNEA EN BLANCO al escribirlos. */
const SEPARADOR_DE_PARRAFOS = '\n\n';

/**
 * Una sección mientras se edita, con una CLAVE propia.
 *
 * <p>El documento legal no trae identificadores: sus secciones son solo encabezado y párrafos. Pero la
 * lista se reordena y se borra por el medio, y seguirla por posición haría que al quitar la segunda
 * sección Angular reconstruyera todas las de abajo: se pierde el foco a media frase y el cursor salta.
 * La clave se pone al cargar, vive solo en la pantalla y no viaja al backend.
 *
 * <p>Los párrafos viven aquí como UN texto con líneas en blanco por medio, que es como se escriben. Se
 * parten al guardar y no en cada pulsación: antes se partían y se volvían a juntar letra a letra.
 */
interface SeccionEditable {
  clave: string;
  h: string;
  p: string;
}

/** El documento entero mientras se edita. */
interface DocumentoEditable {
  titulo: string;
  intro: string;
  secciones: SeccionEditable[];
}

let siguienteClave = 0;

function conClave(seccion: SeccionLegal): SeccionEditable {
  siguienteClave += 1;
  return { h: seccion.h, p: seccion.p.join(SEPARADOR_DE_PARRAFOS), clave: `seccion-${siguienteClave}` };
}

/**
 * La edición de los textos legales.
 *
 * <p>GUARDAR y PUBLICAR son acciones distintas y la pantalla lo deja claro, porque la diferencia
 * importa: guardar deja el trabajo a medias sin que nadie lo vea, y publicar hace visible el texto Y
 * manda un correo a todas las cuentas activas. Un botón que hiciera las dos cosas convertiría cada
 * corrección de una errata en un envío masivo.
 *
 * <p>Se edita SOBRE el borrador si lo hay, no sobre lo publicado: al revés, el segundo guardado
 * perdería el primero y quien redacta no entendería por qué su trabajo desaparece.
 *
 * <p>RENDIMIENTO: el editor va bajo los selectores y se difiere con `on viewport`.
 *
 * <p>MOBILE FIRST: los selectores de documento e idioma envuelven en varias filas en pantalla estrecha
 * y los dos botones de la cabecera caen debajo del título en vez de estrujarlo.
 */
@Component({
  selector: 'nx-legal-admin',
  imports: [FaIconComponent, FormField],
  template: `
    <div class="space-y-4">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <h1 class="text-xl font-semibold">{{ t('admin.legal.title') }}</h1>
        <div class="flex items-center gap-2">
          <button type="button" class="btn btn-sm"
                  [disabled]="!sucio() || guardando() || formulario().invalid()"
                  (click)="guardaElBorrador()">
            <fa-icon [icon]="iconos.guardar" /> {{ t('admin.legal.save') }}
          </button>
          <button type="button" class="btn btn-primary btn-sm" [disabled]="publicando()"
                  (click)="publica()">
            <fa-icon [icon]="iconos.publicar" /> {{ t('admin.legal.publish') }}
          </button>
        </div>
      </div>

      <!-- Qué significa cada botón. Sin esto, «publicar» parece un guardar con otro nombre. -->
      <div class="rounded-lg border border-info/30 bg-info/10 p-3 text-[12px] leading-relaxed">
        {{ t('admin.legal.help') }}
      </div>

      @if (pendientes().length > 0) {
        <div class="rounded-lg border border-warning/40 bg-warning/10 p-3 text-[12px]" role="alert">
          <fa-icon [icon]="iconos.aviso" class="mr-1.5 text-warning" />
          {{ tCon('admin.legal.pending', { n: pendientes().length }) }}
          <span class="ml-1 opacity-70">{{ resumenDePendientes() }}</span>
        </div>
      }

      <div class="flex flex-wrap gap-2">
        @for (candidata of clases; track candidata) {
          <button type="button" (click)="eligeClase(candidata)"
                  class="btn btn-xs" [class]="candidata === clase() ? 'btn-primary' : 'btn-ghost'">
            {{ t('footer.link.' + candidata) }}
          </button>
        }
        <span class="mx-2 opacity-30">|</span>
        @for (candidato of idiomas; track candidato) {
          <button type="button" (click)="eligeIdioma(candidato)"
                  [title]="existe(candidato) ? '' : t('admin.legal.missing_lang')"
                  class="btn btn-xs" [class]="clasesDelIdioma(candidato)">
            {{ candidato }}{{ existe(candidato) ? '' : ' ·' }}
          </button>
        }
      </div>

      @if (cargando()) {
        <div class="p-6 text-center opacity-60">{{ t('common.loading') }}</div>
      } @else if (!documento()) {
        <div class="card p-6 text-center text-[13px] opacity-70">{{ t('admin.legal.not_found') }}</div>
      } @else {
        <!-- RENDIMIENTO: el editor queda bajo los selectores de documento e idioma; se difiere hasta
             que se llega a él y mientras tanto se reserva su hueco. -->
        @defer (on viewport) {
        <div class="card space-y-3 p-4">
          <div class="flex items-center gap-2 text-[11px] opacity-70">
            <span>v{{ documento()?.version }}</span>
            @if (documento()?.tieneBorrador) {
              <span class="badge badge-warning badge-sm">{{ t('admin.legal.has_draft') }}</span>
            } @else {
              <span class="badge badge-ghost badge-sm">
                <fa-icon [icon]="iconos.alDia" class="mr-1" />{{ t('admin.legal.in_sync') }}
              </span>
            }
          </div>

          <label class="block" for="legal-titulo">
            <span class="text-[12px] opacity-70">{{ t('admin.legal.doc_title') }}</span>
            <input id="legal-titulo" class="input input-bordered w-full"
                   [formField]="formulario.titulo" />
            @if (formulario.titulo().touched() && formulario.titulo().errors().length) {
              <span role="alert" class="text-[11px] text-error mt-0.5 block">
                {{ formulario.titulo().errors()[0].message }}
              </span>
            }
          </label>

          <label class="block" for="legal-intro">
            <span class="text-[12px] opacity-70">{{ t('admin.legal.intro') }}</span>
            <textarea id="legal-intro" class="input input-bordered min-h-20 w-full text-[13px]"
                      [formField]="formulario.intro"></textarea>
          </label>

          @for (seccion of modelo().secciones; track seccion.clave) {
            <div class="rounded-lg border border-base-300 p-3">
              <div class="flex items-center gap-2">
                <input class="input input-bordered input-sm flex-1 font-medium"
                       [attr.aria-label]="t('admin.legal.doc_title')"
                       [formField]="formulario.secciones[$index].h" />
                <button type="button" class="btn btn-ghost btn-xs text-error"
                        [attr.aria-label]="t('actions.delete')" (click)="borraSeccion($index)">
                  <fa-icon [icon]="iconos.borrar" />
                </button>
              </div>
              <!-- Los párrafos se separan por línea en blanco: es la convención que ya usa cualquiera
                   que escriba texto, y evita montar un editor enriquecido para un documento legal. -->
              <textarea class="input input-bordered mt-2 min-h-28 w-full text-[13px]"
                        [attr.aria-label]="t('admin.newsletter.content')"
                        [formField]="formulario.secciones[$index].p"></textarea>
            </div>
          }

          <button type="button" class="btn btn-ghost btn-sm" (click)="anadeSeccion()">
            <fa-icon [icon]="iconos.anadir" /> {{ t('admin.legal.add_section') }}
          </button>
        </div>
        } @placeholder {
          <div class="card h-96"></div>
        }
      }
    </div>
  `,
})
export class LegalPage {
  protected readonly t = inject(TraduccionService).t;
  protected readonly tCon = inject(TraduccionService).tCon;
  private readonly dialogo = inject(DialogoStore);
  private readonly consultaDocumentos = inject(ConsultaDocumentosLegales);
  private readonly consultaDocumento = inject(ConsultaElDocumento);
  private readonly guarda = inject(GuardaElBorradorLegal);
  private readonly publicacion = inject(PublicaLosTextosLegales);

  protected readonly iconos = {
    guardar: faFloppyDisk, publicar: faUpload, aviso: faTriangleExclamation,
    alDia: faCircleCheck, anadir: faPlus, borrar: faTrashCan,
  };

  protected readonly clases = CLASES_DE_DOCUMENTO;
  protected readonly idiomas = IDIOMAS_LEGALES;

  protected readonly clase = signal<ClaseDeDocumento>('privacy');
  protected readonly idioma = signal('es');
  protected readonly documentos = signal<readonly DocumentoLegal[]>([]);
  protected readonly documento = signal<DocumentoLegal | null>(null);
  protected readonly cargando = signal(true);
  protected readonly guardando = signal(false);
  protected readonly publicando = signal(false);

  /**
   * El documento en edición, como UN formulario.
   *
   * <p>Cada sección lleva su encabezado obligatorio: una sección sin título se pinta en el escaparate
   * como un bloque de texto suelto, sin nada que diga de qué habla.
   */
  protected readonly modelo = signal<DocumentoEditable>({ titulo: '', intro: '', secciones: [] });
  protected readonly formulario = form(this.modelo, (ruta) => {
    required(ruta.titulo, { message: () => this.t('dialog.field.required') });
    applyEach(ruta.secciones, (seccion) => {
      required(seccion.h, { message: () => this.t('dialog.field.required') });
    });
  });

  /**
   * Hay cambios en pantalla que todavía no se han guardado. Es lo que decide si publicar avisa.
   *
   * <p>Ya no es un signal que haya que acordarse de encender en cada manejador —donde se olvidaba— sino
   * el estado que el propio formulario lleva. Se apaga al volver a leer el documento, que es cuando lo
   * de la pantalla y lo del servidor vuelven a coincidir.
   */
  protected readonly sucio = computed(() => this.formulario().dirty());

  protected readonly pendientes = computed(() => conBorradorPendiente(this.documentos()));
  protected readonly resumenDePendientes = computed(() =>
    this.pendientes().map((d) => `${d.clase}/${d.idioma}`).join(', '),
  );

  constructor() {
    void this.carga();
  }

  protected existe(idioma: string): boolean {
    return this.documentos().some((d) => d.clase === this.clase() && d.idioma === idioma);
  }

  protected clasesDelIdioma(idioma: string): string {
    if (idioma === this.idioma()) {
      return 'btn-primary';
    }
    return this.existe(idioma) ? 'btn-ghost' : 'btn-ghost opacity-40';
  }

  protected eligeClase(clase: ClaseDeDocumento): void {
    this.clase.set(clase);
    void this.leeElDocumento();
  }

  protected eligeIdioma(idioma: string): void {
    this.idioma.set(idioma);
    void this.leeElDocumento();
  }

  /**
   * Quitar o añadir una sección también es un cambio pendiente.
   *
   * <p>Se marca a mano porque no lo hace ningún campo: la directiva marca sucio lo que se TECLEA, y aquí
   * lo que cambia es la lista.
   */
  protected borraSeccion(indice: number): void {
    this.modelo.update((previo) => ({
      ...previo,
      secciones: previo.secciones.filter((_, k) => k !== indice),
    }));
    this.formulario().markAsDirty();
  }

  protected anadeSeccion(): void {
    this.modelo.update((previo) => ({
      ...previo,
      secciones: [...previo.secciones, conClave({ h: '', p: [''] })],
    }));
    this.formulario().markAsDirty();
  }

  /** Guardar NO publica y NO avisa a nadie: es la mitad segura de esta pantalla. */
  protected async guardaElBorrador(): Promise<void> {
    this.guardando.set(true);
    const documento = this.modelo();
    const resultado = await this.guarda.ejecuta(this.clase(), this.idioma(), documento.titulo, {
      intro: documento.intro,
      // La clave de edición se queda aquí: el documento que se guarda es el del dominio.
      secciones: documento.secciones.map(({ h, p }) => ({ h, p: p.split(SEPARADOR_DE_PARRAFOS) })),
    });
    this.guardando.set(false);
    if (!resultado.ok) {
      await this.dialogo.alerta(resultado.error.mensaje || this.t('common.error'), undefined, 'error');
      return;
    }
    await this.carga();
    await this.dialogo.alerta(this.t('admin.legal.saved'), undefined, 'success');
  }

  /**
   * Publicar hace visible el texto Y escribe a toda la base de usuarios, y eso no se puede retirar.
   *
   * <p>Además publica el ÚLTIMO borrador GUARDADO: lo que esté a medio escribir en pantalla no viaja.
   * Sin ese aviso, retocar el texto y pulsar publicar manda el correo masivo con la versión vieja y
   * tira los cambios sin dejar rastro.
   */
  protected async publica(): Promise<void> {
    const version = versionDeHoy();
    const aviso = this.tCon('admin.legal.publish_confirm', { v: version })
      + (this.sucio()
        ? '\n\n' + this.conRespaldo(
            'admin.legal.publish_unsaved',
            'Ojo: este documento tiene cambios sin guardar y NO se publicarán. Guarda el borrador'
              + ' antes de publicar.',
          )
        : '');
    if (!(await this.dialogo.confirma(aviso))) {
      return;
    }
    this.publicando.set(true);
    const resultado = await this.publicacion.ejecuta(version);
    this.publicando.set(false);
    if (!resultado.ok) {
      await this.dialogo.alerta(resultado.error.mensaje || this.t('common.error'), undefined, 'error');
      return;
    }
    await this.carga();
    await this.dialogo.alerta(
      this.tCon('admin.legal.published', { n: resultado.valor.avisados, v: resultado.valor.version }),
      undefined,
      'success',
    );
  }

  /** Respaldo para las claves que aún no están en los ocho diccionarios: `t()` devolvería la clave. */
  private conRespaldo(clave: string, respaldo: string): string {
    const traducido = this.t(clave);
    return traducido === clave ? respaldo : traducido;
  }

  private async carga(): Promise<void> {
    const listado = await this.consultaDocumentos.ejecuta();
    if (listado.ok) {
      this.documentos.set(listado.valor);
    }
    await this.leeElDocumento();
  }

  /**
   * Trae el documento elegido y vuelca en pantalla la fuente de edición.
   *
   * <p>Que no exista NO es un error: se ofrece crearlo guardando, así que el rechazo deja el editor
   * vacío en vez de un aviso rojo.
   */
  private async leeElDocumento(): Promise<void> {
    this.cargando.set(true);
    const resultado = await this.consultaDocumento.ejecuta(this.clase(), this.idioma());
    this.cargando.set(false);
    if (!resultado.ok) {
      this.documento.set(null);
      // `reset` además de escribir el valor deja el formulario LIMPIO y sin tocar: es lo que apaga el
      // aviso de «cambios sin guardar» al cambiar de documento o después de guardar.
      this.formulario().reset({ titulo: '', intro: '', secciones: [] });
      return;
    }
    const documento = resultado.valor;
    const fuente = fuenteDeEdicion(documento);
    this.documento.set(documento);
    this.formulario().reset({
      titulo: fuente.titulo,
      intro: fuente.cuerpo.intro,
      secciones: fuente.cuerpo.secciones.map(conClave),
    });
  }
}
