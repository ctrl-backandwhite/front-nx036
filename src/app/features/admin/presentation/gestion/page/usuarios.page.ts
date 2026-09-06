import { Component, computed, effect, inject, linkedSignal, signal } from '@angular/core';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faUserPlus } from '@fortawesome/free-solid-svg-icons';
import { TraduccionService } from '@core/i18n/traduccion.service';
import { Result } from '@shared/result/result';
import { AppError } from '@shared/error/app-error';
import { AvisosStore } from '@ds/component/avisos/avisos.store';
import { DialogoStore } from '@ds/component/dialogo/dialogo.store';
import { OpcionFiltro } from '@ds/component/filtros/filtro-seleccion';
import {
  CambiosDeUsuario,
  FiltroDeUsuarios,
  ROLES,
  UsuarioGestionado,
  paisesPresentes,
} from '../../../domain/gestion/model/usuarios';
import { ResultadoMasivo, paginasAlMenosUna } from '../../../domain/gestion/model/pagina';
import {
  AccionEnLote,
  ActivaUsuario,
  ActuaSobreUsuarios,
  BloqueaUsuario,
  BuscaUsuarios,
  CambiaElRol,
  CambiaElRolEnLote,
  DaDeBajaUsuario,
  DesbloqueaUsuario,
  EditaUsuario,
  InvitaUsuario,
  ReiniciaLaContrasena,
} from '../../../application/gestion/use-case/usuarios.use-case';
import { Paginacion } from '../component/paginacion';
import { UsuariosAccionesEnLote } from '../component/usuarios-acciones-en-lote';
import { UsuariosFiltros } from '../component/usuarios-filtros';
import { UsuariosModalEdicion } from '../component/usuarios-modal-edicion';
import { UsuariosModalInvitacion } from '../component/usuarios-modal-invitacion';
import { UsuariosModalRol } from '../component/usuarios-modal-rol';
import {
  CambioDeRol,
  PeticionSobreUsuario,
  UsuariosTabla,
} from '../component/usuarios-tabla';

/** Cuántas cuentas por página. Las mismas que pedía el panel anterior, para que los enlaces cuadren. */
const POR_PAGINA = 25;

/** Cuántos errores de un lote se enseñan. Más allá, la lista tapa el resumen en vez de explicarlo. */
const ERRORES_VISIBLES = 8;

/**
 * El listado de cuentas del panel.
 *
 * <p>Orquesta: pide, confirma, avisa y vuelve a leer. Las reglas —si una cuenta está bloqueada ahora, si
 * un correo tiene forma de correo— viven en el dominio, y el «qué tiene que pasar» en los casos de uso.
 *
 * <p>DAR DE BAJA NO BORRA. El backend ANONIMIZA la cuenta y le pone marca de fecha, porque los pedidos y
 * los apuntes contables que la referencian tienen que seguir existiendo. El caso de uso se llama
 * `DaDeBajaUsuario` justo para que nadie lea «borrar» y espere que algo desaparezca.
 *
 * <p>Un fallo NUNCA se queda en silencio: el mensaje que manda el backend se enseña tal cual, porque es
 * el que explica por qué —un papel que no se puede asignar, una invitación a un correo ya registrado—.
 * Sin él, quien administra cree que la acción salió y nadie vuelve a mirarlo.
 *
 * <p>MOBILE FIRST: la cabecera se envuelve en varias filas en pantalla estrecha, los filtros arrancan
 * plegados (lo hace la barra) y la tabla se desplaza dentro de su caja.
 */
@Component({
  selector: 'nx-usuarios-admin',
  imports: [
    FaIconComponent,
    Paginacion,
    UsuariosAccionesEnLote,
    UsuariosFiltros,
    UsuariosModalEdicion,
    UsuariosModalInvitacion,
    UsuariosModalRol,
    UsuariosTabla,
  ],
  template: `
    <div class="space-y-5">
      <header class="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1>{{ t('admin.users.title') }}</h1>
          <p class="text-sm text-ink-500 mt-1">{{ t('admin.users.subtitle') }}</p>
        </div>
        <div class="flex items-center gap-2 flex-wrap">
          <nx-usuarios-acciones-en-lote
            [cuantos]="marcados().size"
            [ocupado]="enLote()"
            [roles]="opcionesDeRol()"
            [(rol)]="rolDelLote"
            (pide)="aplicaEnLote($event)"
            (aplicaRol)="aplicaRolEnLote()"
          />
          <button type="button" (click)="invitando.set(true)" class="btn btn-primary text-[12px]">
            <fa-icon [icon]="iconoInvita" /> {{ t('admin.users.actions.invite') }}
          </button>
        </div>
      </header>

      <nx-usuarios-filtros
        [(texto)]="texto"
        [(rol)]="rol"
        [(pais)]="pais"
        [roles]="opcionesDeRol()"
        [paises]="opcionesDePais()"
        [visibles]="usuarios().length"
        [total]="total()"
      />

      <nx-usuarios-tabla
        [usuarios]="usuarios()"
        [marcados]="marcados()"
        [roles]="opcionesDeRol()"
        (alterna)="alterna($event)"
        (alternaTodos)="alternaTodos()"
        (pide)="aplicaAUno($event)"
        (cambiaRol)="pideCambioDeRol($event)"
      />

      <nx-paginacion [pagina]="pagina()" [paginas]="paginas()" (cambia)="pagina.set($event)" />

      @if (cambioDeRol(); as cambio) {
        <nx-usuarios-modal-rol
          [cambio]="cambio"
          [roles]="opcionesDeRol()"
          (cierra)="cambioDeRol.set(null)"
          (confirma)="confirmaElRol(cambio)"
        />
      }

      @if (invitando()) {
        <nx-usuarios-modal-invitacion
          [enviando]="invitandoEnCurso()"
          (cierra)="invitando.set(false)"
          (invita)="invita($event)"
        />
      }

      @if (editando(); as cuenta) {
        <nx-usuarios-modal-edicion
          [usuario]="cuenta"
          [guardando]="guardando()"
          (cierra)="editando.set(null)"
          (guarda)="guardaLaEdicion(cuenta, $event)"
        />
      }
    </div>
  `,
})
export class UsuariosPage {
  protected readonly iconoInvita = faUserPlus;

  private readonly traduccion = inject(TraduccionService);
  protected readonly t = this.traduccion.t;
  protected readonly tCon = this.traduccion.tCon;

  private readonly buscador = inject(BuscaUsuarios);
  private readonly cambiaRol = inject(CambiaElRol);
  private readonly bloqueador = inject(BloqueaUsuario);
  private readonly desbloqueador = inject(DesbloqueaUsuario);
  private readonly activador = inject(ActivaUsuario);
  private readonly editor = inject(EditaUsuario);
  private readonly reinicio = inject(ReiniciaLaContrasena);
  private readonly baja = inject(DaDeBajaUsuario);
  private readonly invitacion = inject(InvitaUsuario);
  private readonly lote = inject(ActuaSobreUsuarios);
  private readonly rolEnLote = inject(CambiaElRolEnLote);
  private readonly dialogo = inject(DialogoStore);
  private readonly avisos = inject(AvisosStore);

  protected readonly rol = signal<string | null>(null);
  protected readonly pais = signal<string | null>(null);
  protected readonly texto = signal('');

  /**
   * Al tocar un filtro se vuelve a la primera página.
   *
   * <p>Con `linkedSignal` la página se reinicia sola cuando cambia el criterio, en vez de tener que
   * acordarse en los cinco sitios que escriben un filtro. Sin eso, filtrar estando en la página 7 pedía
   * la página 7 de un resultado que ya solo tenía dos, y la tabla salía vacía sin explicar por qué.
   */
  protected readonly pagina = linkedSignal<string, number>({
    source: () => `${this.rol()}|${this.pais()}|${this.texto()}`,
    computation: () => 0,
  });

  protected readonly usuarios = signal<readonly UsuarioGestionado[]>([]);
  protected readonly total = signal(0);
  protected readonly paginas = signal(1);

  /**
   * Lo marcado es un conjunto de identificadores y no de filas: al releer la página, las filas son
   * objetos nuevos y una selección guardada por referencia se habría vaciado sola.
   */
  protected readonly marcados = signal<ReadonlySet<string>>(new Set<string>());
  protected readonly enLote = signal(false);
  protected readonly rolDelLote = signal('USER');

  protected readonly cambioDeRol = signal<CambioDeRol | null>(null);
  protected readonly editando = signal<UsuarioGestionado | null>(null);
  protected readonly guardando = signal(false);
  protected readonly invitando = signal(false);
  protected readonly invitandoEnCurso = signal(false);

  protected readonly opcionesDeRol = computed<readonly OpcionFiltro[]>(() =>
    ROLES.map((r) => ({ value: r, label: this.etiquetaDeRol(r) })),
  );

  /** Los países salen de la página que se está mirando: filtrar por ellos no cuesta otra petición. */
  protected readonly opcionesDePais = computed<readonly OpcionFiltro[]>(() =>
    paisesPresentes(this.usuarios()).map((p) => ({ value: p, label: p })),
  );

  /** Lo que se le pide al servidor. Se compone UNA vez: el efecto y la relectura miran el mismo sitio. */
  private readonly criterio = computed<FiltroDeUsuarios>(() => ({
    ...(this.rol() ? { rol: this.rol() as string } : {}),
    ...(this.pais() ? { pais: this.pais() as string } : {}),
    ...(this.texto() ? { texto: this.texto() } : {}),
    pagina: this.pagina(),
    tamano: POR_PAGINA,
  }));

  constructor() {
    effect(() => {
      void this.pide(this.criterio());
    });
  }

  /**
   * El nombre del papel, con respaldo al código.
   *
   * <p>`t()` devuelve la CLAVE cuando falta la traducción, así que sin esta comprobación un papel nuevo
   * se enseñaría como `admin.users.role.RESELLER` en mitad del desplegable.
   */
  protected etiquetaDeRol(rol: string): string {
    const clave = `admin.users.role.${rol}`;
    const texto = this.t(clave);
    return texto === clave ? rol : texto;
  }

  protected alterna(id: string): void {
    this.marcados.update((actuales) => {
      const nuevos = new Set(actuales);
      if (!nuevos.delete(id)) {
        nuevos.add(id);
      }
      return nuevos;
    });
  }

  /** «Todos» son los de esta PÁGINA: es lo que espera quien pulsa la casilla de la cabecera. */
  protected alternaTodos(): void {
    const ids = this.usuarios().map((u) => u.id);
    const marcados = this.marcados();
    const todos = ids.length > 0 && ids.every((id) => marcados.has(id));
    this.marcados.update((actuales) => {
      const nuevos = new Set(actuales);
      for (const id of ids) {
        if (todos) {
          nuevos.delete(id);
        } else {
          nuevos.add(id);
        }
      }
      return nuevos;
    });
  }

  protected pideCambioDeRol(cambio: CambioDeRol): void {
    this.cambioDeRol.set(cambio);
  }

  protected async confirmaElRol(cambio: CambioDeRol): Promise<void> {
    this.cambioDeRol.set(null);
    await this.ejecuta(() => this.cambiaRol.ejecuta(cambio.usuario.id, cambio.rol));
  }

  protected async aplicaAUno({ usuario, accion }: PeticionSobreUsuario): Promise<void> {
    switch (accion) {
      case 'activa':
        await this.ejecuta(() => this.activador.ejecuta(usuario.id));
        return;
      case 'bloquea':
        await this.ejecuta(() => this.bloqueador.ejecuta(usuario.id));
        return;
      case 'desbloquea':
        await this.ejecuta(() => this.desbloqueador.ejecuta(usuario.id));
        return;
      case 'edita':
        this.editando.set(usuario);
        return;
      case 'reinicia':
        await this.reiniciaLaContrasena(usuario);
        return;
      case 'borra':
        await this.daDeBaja(usuario);
        return;
    }
  }

  private async reiniciaLaContrasena(usuario: UsuarioGestionado): Promise<void> {
    const confirmado = await this.dialogo.confirma(
      this.tCon('admin.users.actions.reset_confirm', { email: usuario.email }),
    );
    if (!confirmado) {
      return;
    }
    const resultado = await this.reinicio.ejecuta(usuario.id);
    if (!resultado.ok) {
      this.avisos.error(resultado.error.mensaje || this.t('admin.users.actions.action_error'));
      return;
    }
    this.avisos.exito(this.tCon('admin.users.actions.reset_sent', { email: usuario.email }));
  }

  /**
   * Da de baja UNA cuenta.
   *
   * <p>El texto de la confirmación es el que ya usaba el panel y habla de «eliminar», porque es lo que
   * quien administra cree que hace. Lo que ocurre de verdad es una anonimización con marca de fecha: los
   * pedidos y los apuntes contables de esa persona siguen existiendo, sin sus datos personales.
   */
  private async daDeBaja(usuario: UsuarioGestionado): Promise<void> {
    const confirmado = await this.dialogo.confirma(
      this.tCon('admin.users.actions.delete_confirm', { email: usuario.email }),
      this.t('admin.users.actions.delete'),
    );
    if (!confirmado) {
      return;
    }
    const resultado = await this.baja.ejecuta(usuario.id);
    if (!resultado.ok) {
      this.avisos.error(resultado.error.mensaje || this.t('admin.users.actions.action_error'));
      return;
    }
    this.avisos.exito(this.tCon('admin.users.actions.delete_done', { email: usuario.email }));
    this.recarga();
  }

  protected async guardaLaEdicion(
    usuario: UsuarioGestionado,
    cambios: CambiosDeUsuario,
  ): Promise<void> {
    this.guardando.set(true);
    try {
      const resultado = await this.editor.ejecuta(usuario.id, cambios);
      if (!resultado.ok) {
        this.avisos.error(resultado.error.mensaje || this.t('admin.users.actions.action_error'));
        return;
      }
      this.editando.set(null);
      this.recarga();
    } finally {
      this.guardando.set(false);
    }
  }

  protected async invita(email: string): Promise<void> {
    this.invitandoEnCurso.set(true);
    try {
      const resultado = await this.invitacion.ejecuta(email);
      if (!resultado.ok) {
        this.avisos.error(resultado.error.mensaje || this.t('admin.users.actions.action_error'));
        return;
      }
      this.invitando.set(false);
      this.avisos.exito(this.tCon('admin.users.actions.invite_sent', { email }));
      this.recarga();
    } finally {
      this.invitandoEnCurso.set(false);
    }
  }

  protected async aplicaEnLote(accion: AccionEnLote): Promise<void> {
    if (accion === 'borra') {
      const confirmado = await this.dialogo.confirma(
        this.tCon('admin.bulk.delete_confirm', { n: this.marcados().size }),
        this.t('admin.users.actions.delete'),
      );
      if (!confirmado) {
        return;
      }
    }
    await this.enLoteCon((ids) => this.lote.ejecuta(accion, ids));
  }

  protected async aplicaRolEnLote(): Promise<void> {
    const rol = this.rolDelLote();
    const confirmado = await this.dialogo.confirma(
      this.tCon('admin.bulk.role_confirm', {
        n: this.marcados().size,
        role: this.etiquetaDeRol(rol),
      }),
      this.t('admin.bulk.role'),
    );
    if (!confirmado) {
      return;
    }
    await this.enLoteCon((ids) => this.rolEnLote.ejecuta(ids, rol));
  }

  /**
   * El armazón común de las acciones sobre la selección.
   *
   * <p>El parte se enseña SIEMPRE con las dos cifras: el backend recorre los identificadores uno a uno y
   * no aborta el lote cuando uno falla, así que decir solo «hecho» escondería que la mitad no se hizo y
   * nadie volvería a mirarlo.
   */
  private async enLoteCon(
    accion: (ids: readonly string[]) => Promise<Result<ResultadoMasivo, AppError>>,
  ): Promise<void> {
    const ids = [...this.marcados()];
    if (ids.length === 0) {
      return;
    }
    this.enLote.set(true);
    try {
      const resultado = await accion(ids);
      if (!resultado.ok) {
        this.avisos.error(resultado.error.mensaje || this.t('admin.users.actions.action_error'));
        return;
      }
      this.marcados.set(new Set());
      this.recarga();
      this.anunciaElLote(resultado.valor);
    } finally {
      this.enLote.set(false);
    }
  }

  private anunciaElLote(parte: ResultadoMasivo): void {
    const resumen = this.tCon('admin.bulk.done', { ok: parte.correctos, fail: parte.fallidos });
    this.avisos.muestra({
      tipo: parte.fallidos ? 'warning' : 'success',
      mensaje: parte.fallidos
        ? `${resumen}\n${parte.errores.slice(0, ERRORES_VISIBLES).join('\n')}`
        : resumen,
    });
  }

  /** Una acción sobre una cuenta que no necesita confirmación: se hace, se avisa si falla, y se relee. */
  private async ejecuta(accion: () => Promise<Result<void, AppError>>): Promise<void> {
    const resultado = await accion();
    if (!resultado.ok) {
      this.avisos.error(resultado.error.mensaje || this.t('admin.users.actions.action_error'));
      return;
    }
    this.recarga();
  }

  protected recarga(): void {
    void this.pide(this.criterio());
  }

  private async pide(criterio: FiltroDeUsuarios): Promise<void> {
    const resultado = await this.buscador.ejecuta(criterio);
    if (!resultado.ok) {
      this.avisos.error(resultado.error.mensaje || this.t('errors.generic'));
      return;
    }
    this.usuarios.set(resultado.valor.elementos);
    this.total.set(resultado.valor.total);
    this.paginas.set(paginasAlMenosUna(resultado.valor.paginas));
  }
}
