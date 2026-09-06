import { Injectable, computed, signal } from '@angular/core';
import { CobroIniciado, MetodoGuardado } from '../../domain/model/pago';
import { DireccionDeEnvio, DireccionGuardada, MetodoDePago } from '../../domain/model/pedido';
import { SaldoDeCartera } from '../../domain/port/cartera.port';

/** Marca de «voy a escribir una dirección nueva» frente a elegir una de las guardadas. */
export const DIRECCION_NUEVA = 'NUEVA';

export const DIRECCION_VACIA: DireccionDeEnvio = {
  nombreCompleto: '',
  linea1: '',
  linea2: '',
  ciudad: '',
  provincia: '',
  codigoPostal: '',
  pais: '',
  telefono: '',
};

/**
 * Lo que se lleva decidido de la compra.
 *
 * <p>SOLO GUARDA. Ni pide datos ni cobra: eso son casos de uso. Aquí está lo que se ha elegido —dirección,
 * cupón, forma de envío, método de pago— y lo que se ha traído para poder elegirlo.
 *
 * <p>El destino se DERIVA de la dirección elegida y no se guarda aparte. Tenerlo dos veces era garantía de
 * que un día se cotizara para un país y se cobrara para otro.
 */
@Injectable()
export class CompraStore {
  // ── Lo que se ha traído ──────────────────────────────────────────────────────────────────────
  private readonly _direcciones = signal<readonly DireccionGuardada[]>([]);
  private readonly _direccionesResueltas = signal(false);
  private readonly _saldo = signal<SaldoDeCartera | null>(null);
  private readonly _metodosGuardados = signal<readonly MetodoGuardado[]>([]);
  private readonly _clavePublicaDePasarela = signal('');

  readonly direcciones = this._direcciones.asReadonly();
  /** Si ya se sabe qué direcciones hay. Distinto de «no hay»: al arrancar todavía no se sabe. */
  readonly direccionesResueltas = this._direccionesResueltas.asReadonly();
  readonly saldo = this._saldo.asReadonly();
  readonly metodosGuardados = this._metodosGuardados.asReadonly();
  readonly clavePublicaDePasarela = this._clavePublicaDePasarela.asReadonly();

  // ── Lo que se ha elegido ─────────────────────────────────────────────────────────────────────
  private readonly _direccionElegida = signal<string | null>(null);
  private readonly _direccionNueva = signal<DireccionDeEnvio>(DIRECCION_VACIA);
  private readonly _guardaLaDireccion = signal(true);
  private readonly _cupon = signal('');
  private readonly _opcionDeEnvio = signal<string | undefined>(undefined);
  private readonly _notas = signal('');
  private readonly _metodoDePago = signal<MetodoDePago>('CARD');
  private readonly _claveDelMetodo = signal('new-card');
  private readonly _tarjetaGuardada = signal<string | null>(null);

  readonly direccionElegida = this._direccionElegida.asReadonly();
  readonly direccionNueva = this._direccionNueva.asReadonly();
  readonly guardaLaDireccion = this._guardaLaDireccion.asReadonly();
  readonly cupon = this._cupon.asReadonly();
  readonly opcionDeEnvio = this._opcionDeEnvio.asReadonly();
  readonly notas = this._notas.asReadonly();
  readonly metodoDePago = this._metodoDePago.asReadonly();
  readonly claveDelMetodo = this._claveDelMetodo.asReadonly();
  readonly tarjetaGuardada = this._tarjetaGuardada.asReadonly();

  // ── Cómo va el cobro ─────────────────────────────────────────────────────────────────────────
  private readonly _error = signal<string | null>(null);
  private readonly _cobrando = signal(false);
  private readonly _depositoEnCripto = signal<CobroIniciado | null>(null);

  readonly error = this._error.asReadonly();
  readonly cobrando = this._cobrando.asReadonly();
  readonly depositoEnCripto = this._depositoEnCripto.asReadonly();

  // ── Derivados ────────────────────────────────────────────────────────────────────────────────
  readonly escribeDireccionNueva = computed(() => this._direccionElegida() === DIRECCION_NUEVA);

  /** La dirección con la que se va a enviar, venga de la lista o del formulario. */
  readonly direccionDeEnvio = computed<DireccionDeEnvio | null>(() => {
    if (this.escribeDireccionNueva()) {
      return this._direccionNueva();
    }
    const elegida = this._direccionElegida();
    return this._direcciones().find((d) => d.id === elegida) ?? null;
  });

  readonly paisDeEnvio = computed(() => this.direccionDeEnvio()?.pais ?? '');
  /** La provincia entra en la cotización porque el impuesto se calcula por región en varios países. */
  readonly regionDeEnvio = computed(() => this.direccionDeEnvio()?.provincia ?? '');

  // ── Escrituras ───────────────────────────────────────────────────────────────────────────────
  fijaDirecciones(direcciones: readonly DireccionGuardada[]): void {
    this._direcciones.set(direcciones);
    this._direccionesResueltas.set(true);
  }

  fijaSaldo(saldo: SaldoDeCartera | null): void {
    this._saldo.set(saldo);
  }

  fijaMetodosGuardados(metodos: readonly MetodoGuardado[]): void {
    this._metodosGuardados.set(metodos);
  }

  fijaClaveDePasarela(clave: string): void {
    this._clavePublicaDePasarela.set(clave);
  }

  eligeDireccion(id: string): void {
    this._direccionElegida.set(id);
  }

  escribeDireccion(direccion: DireccionDeEnvio): void {
    this._direccionNueva.set(direccion);
  }

  fijaGuardarDireccion(guarda: boolean): void {
    this._guardaLaDireccion.set(guarda);
  }

  /** El cupón solo viaja al pulsar «aplicar»: validarlo por pulsación dispararía una cotización por letra. */
  aplicaCupon(codigo: string): void {
    this._cupon.set(codigo.trim().toUpperCase());
  }

  eligeOpcionDeEnvio(codigo: string): void {
    this._opcionDeEnvio.set(codigo);
  }

  escribeNotas(notas: string): void {
    this._notas.set(notas);
  }

  /**
   * Elige método de pago. La clave de la interfaz y el método del negocio son cosas distintas: dos
   * tarjetas guardadas son dos claves y un solo método.
   */
  eligeMetodo(clave: string, metodo: MetodoDePago, idDeTarjeta: string | null): void {
    this._claveDelMetodo.set(clave);
    this._metodoDePago.set(metodo);
    this._tarjetaGuardada.set(idDeTarjeta);
  }

  fijaError(mensaje: string | null): void {
    this._error.set(mensaje);
  }

  marcaCobrando(cobrando: boolean): void {
    this._cobrando.set(cobrando);
  }

  fijaDepositoEnCripto(cobro: CobroIniciado | null): void {
    this._depositoEnCripto.set(cobro);
  }
}
