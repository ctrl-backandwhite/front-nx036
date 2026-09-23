import { Injectable, computed, inject, signal } from '@angular/core';
import { PreferenciasService } from '@core/preferences/preferencias';
import {
  ConsultaElPrecioPorCantidad,
  SeleccionACotizar,
} from '../application/use-case/consulta-el-precio-por-cantidad.use-case';
import { FichaDeProducto, VarianteDeProducto } from '../domain/model/producto';
import {
  ImpedimentoParaAnadir,
  PrecioDestacado,
  ejeDeTalla,
  ejePrincipal,
  etiquetaDeValor,
  existenciasDe,
  impedimentoParaAnadir,
  minimoDelSelector,
  precioDestacado,
  reajustaAlCambiarDeColor,
  tramoAplicable,
  unidadesQueFaltan,
  varianteQueCasa,
} from '../domain/model/seleccion-de-variante';

/** Una línea lista para meter en la cesta: qué variante y cuántas unidades. */
export interface LineaSeleccionada {
  readonly variante: VarianteDeProducto | undefined;
  readonly cantidad: number;
}

/**
 * Lo que quien mira ha ELEGIDO en la ficha: color, tallas y cantidad, con el precio y los impedimentos
 * ya resueltos.
 *
 * <p>Vive aparte de la pantalla porque la ficha se partió en dos —la pública y el editor del
 * administrador— y las dos miran la misma selección. Las REGLAS no están aquí: están en el dominio,
 * probadas sin Angular. Esto solo guarda lo elegido y las encadena.
 *
 * <p>Se provee EN LA PANTALLA, no en la raíz: cada ficha empieza con su selección en blanco, y una
 * instancia global arrastraría la talla elegida de un producto al siguiente.
 */
@Injectable()
export class SeleccionDeLaFicha {
  private readonly preferencias = inject(PreferenciasService);

  private readonly _ficha = signal<FichaDeProducto | null>(null);
  private readonly _color = signal<string | null>(null);
  private readonly _unidadesPorTalla = signal<Readonly<Record<string, number>>>({});
  private readonly _cantidad = signal(1);
  private readonly _fotoDelColor = signal<string | null>(null);
  /** Lo que ya lleva de este producto en la cesta: el mínimo se cumple sumando, no por tanda. */
  private readonly _yaEnLaCesta = signal(0);

  readonly color = this._color.asReadonly();
  readonly unidadesPorTalla = this._unidadesPorTalla.asReadonly();
  readonly cantidad = this._cantidad.asReadonly();
  readonly fotoDelColor = this._fotoDelColor.asReadonly();

  /**
   * El eje de color, SIN los valores que no tienen ninguna variante detrás.
   *
   * <p>Los ejes vienen del proveedor y declaran más valores de los que llegaron a existir como SKU. Un
   * caso real: una ficha ofrecía «Negro» y «Blanco» y solo había variante blanca; al abrirla arrancaba
   * en negro, no encontraba variante, y un producto con casi cien mil unidades se anunciaba «sin
   * stock». Ofrecer un color que no se puede comprar no es informar de nada: es perder la venta y
   * hacer creer que el catálogo está vacío.
   *
   * <p>Se compara contra las variantes ACTIVAS: una variante retirada tampoco se puede comprar.
   */
  readonly ejeDeColor = computed(() => {
    const eje = ejePrincipal(this._ficha()?.ejesDeVariante ?? []);
    if (!eje) {
      return eje;
    }
    const conVariante = new Set(
      this.variantes()
        .filter((variante) => variante.activa)
        .flatMap((variante) => Object.values(variante.opciones ?? {})),
    );
    const valores = eje.valores.filter((valor) => conVariante.has(valor.valorZh));
    if (valores.length > 0) {
      return { ...eje, valores };
    }
    // Si NINGUNO casa habiendo variantes, se devuelve el eje entero: es señal de que las claves no
    // cuadran entre ejes y variantes, y quedarse sin selector sería peor que enseñar uno de más.
    //
    // Pero sin NINGUNA variante esa salida de emergencia hacía daño: ofrecía cuatro colores de un
    // producto que no tiene ni un SKU detrás, y quien elegía uno se llevaba al carrito algo que no
    // existe. Sin variantes no hay nada que ofrecer, y el aviso correcto es el de «sin stock».
    return this.variantes().length > 0 ? eje : undefined;
  });
  readonly ejeDeTalla = computed(() => ejeDeTalla(this._ficha()?.ejesDeVariante ?? []));

  private readonly variantes = computed(() => this._ficha()?.variantes ?? []);

  /** Unidades pedidas en total: la suma de las tallas, o la cantidad del selector simple. */
  readonly unidadesElegidas = computed(() =>
    this.ejeDeTalla()
      ? Object.values(this._unidadesPorTalla()).reduce((suma, n) => suma + n, 0)
      : this._cantidad(),
  );

  readonly varianteElegida = computed(() => {
    const ficha = this._ficha();
    if (!ficha) {
      return undefined;
    }
    // Con una sola variante no hay nada que elegir: es esa, y así el precio y el stock son los suyos
    // desde el primer momento.
    if (!this._color() && ficha.variantes.length === 1) {
      return ficha.variantes[0];
    }
    return varianteQueCasa(ficha.variantes, this._color());
  });

  readonly tramoAplicable = computed(() =>
    tramoAplicable(this._ficha()?.tramosDePrecio ?? [], this.unidadesElegidas()),
  );

  /**
   * Lo que hay que cotizar, o nada cuando no hay escalón que aplicar.
   *
   * <p>Solo se pregunta al servidor cuando la cantidad ALCANZA un tramo distinto del primero: por
   * debajo de eso el precio de la variante ya es el bueno y una petición por cada clic en «+» sería
   * ruido. Es nulo también sin ficha y sin unidades.
   */
  private readonly seleccionACotizar = computed<SeleccionACotizar | null>(() => {
    const ficha = this._ficha();
    const unidades = this.unidadesElegidas();
    const tramo = this.tramoAplicable();
    const primero = [...(ficha?.tramosDePrecio ?? [])].sort(
      (a, b) => a.cantidadMinima - b.cantidadMinima,
    )[0];
    if (!ficha || unidades <= 0 || !tramo || !primero || tramo.cantidadMinima === primero.cantidadMinima) {
      return null;
    }
    return {
      idDeProducto: ficha.id,
      idDeVariante: this.varianteElegida()?.id,
      cantidad: unidades,
    };
  });

  /** El importe que de verdad se va a cobrar por esa selección, escrito por el servidor. */
  private readonly precioCotizado = inject(ConsultaElPrecioPorCantidad).para(this.seleccionACotizar);

  /**
   * El precio grande de la ficha.
   *
   * <p>Manda el que DICE EL SERVIDOR para lo que hay elegido, porque el tramo por cantidad se aplica
   * como una proporción sobre el precio de la variante y eso no se puede componer aquí. Hasta el
   * 23-sep-2026 ganaba siempre el precio de la variante y la cantidad no se miraba: con mil unidades
   * en la cesta la ficha seguía anunciando el precio de una.
   *
   * <p>Mientras la cotización viaja —o si falla— se cae al precio de siempre: un importe de más
   * mientras carga se corrige solo, y uno inventado no.
   */
  readonly precioDestacado = computed<PrecioDestacado>(() => {
    const ficha = this._ficha();
    if (!ficha) {
      return { importe: null, divisa: 'USD' };
    }
    const base = precioDestacado(ficha, this.varianteElegida(), this.tramoAplicable());
    const cotizado = this.precioCotizado()?.unitarioFormateado;
    return cotizado ? { ...base, formateado: cotizado } : base;
  });

  readonly unidadesQueFaltan = computed(() =>
    unidadesQueFaltan(this._ficha()?.moq ?? 1, this._yaEnLaCesta(), this.unidadesElegidas()),
  );

  readonly minimoDelSelector = computed(() =>
    minimoDelSelector(this._ficha()?.moq ?? 1, this._yaEnLaCesta()),
  );

  readonly impedimento = computed<ImpedimentoParaAnadir>(() => {
    const eje = this.ejeDeColor();
    return impedimentoParaAnadir({
      exigeColor: !!eje && eje.valores.length > 0,
      colorElegido: this._color(),
      tieneEjeDeTalla: !!this.ejeDeTalla(),
      unidadesPorTalla: Object.values(this._unidadesPorTalla()).reduce((s, n) => s + n, 0),
      varianteElegida: this.varianteElegida(),
      unidadesQueFaltan: this.unidadesQueFaltan(),
    });
  });

  /** Las líneas que hay que meter en la cesta con lo elegido ahora mismo. */
  readonly lineasAAnadir = computed<readonly LineaSeleccionada[]>(() => {
    if (!this.ejeDeTalla()) {
      return [{ variante: this.varianteElegida(), cantidad: this._cantidad() }];
    }
    return Object.entries(this._unidadesPorTalla())
      .filter(([, cantidad]) => cantidad > 0)
      .map(([talla, cantidad]) => ({
        variante: varianteQueCasa(this.variantes(), this._color(), talla),
        cantidad,
      }));
  });

  /** Se pasa como función a la tabla de tallas: el stock es por color Y talla. */
  readonly existenciasDeTalla = (talla: string): number =>
    existenciasDe(this.variantes(), this._color(), talla);

  /**
   * Y su precio, que también depende del color Y la talla: en calzado y ropa la talla grande suele
   * costar más, y el proveedor lo publica fila a fila. Se devuelve la CADENA que compuso el backend,
   * nunca un número formateado aquí: al cambiar de divisa, una ficha ya abierta seguiría enseñando
   * los importes de la anterior.
   */
  readonly precioDeTalla = (talla: string): string | undefined =>
    varianteQueCasa(this.variantes(), this._color(), talla)?.precioFormateado;

  /** Empieza de cero con la ficha recién cargada. */
  empieza(ficha: FichaDeProducto | null): void {
    this._ficha.set(ficha);
    this._color.set(null);
    this._unidadesPorTalla.set({});
    this._fotoDelColor.set(null);
    // La cantidad inicial respeta el pedido mínimo: con «pedido mín. 5» se arranca en 5, no en 1.
    this._cantidad.set(Math.max(1, ficha?.moq ?? 1));
  }

  eligeColor(etiqueta: string): void {
    this._color.set(etiqueta);
    this._unidadesPorTalla.update((unidades) =>
      reajustaAlCambiarDeColor(unidades, this.variantes(), etiqueta),
    );
  }

  fijaFotoDelColor(direccion: string): void {
    this._fotoDelColor.set(direccion);
  }

  olvidaLaFotoDelColor(): void {
    this._fotoDelColor.set(null);
  }

  fijaUnidadesDeTalla(talla: string, cantidad: number): void {
    const permitido = Math.max(0, Math.min(this.existenciasDeTalla(talla), cantidad));
    this._unidadesPorTalla.update((unidades) => ({ ...unidades, [talla]: permitido }));
  }

  fijaCantidad(cantidad: number): void {
    this._cantidad.set(Math.max(this.minimoDelSelector(), cantidad));
  }

  fijaLoQueYaLleva(unidades: number): void {
    this._yaEnLaCesta.set(unidades);
  }

  /**
   * Tras añadir se vuelve a empezar: la SIGUIENTE tanda —otro color del mismo producto— tiene que
   * partir de cero y no arrastrar lo ya añadido, que multiplicaría el pedido.
   */
  limpiaCantidades(): void {
    // Se apunta lo añadido ANTES de vaciar. Al revés, `unidadesElegidas` ya valía cero y el pedido
    // mínimo volvía a exigir el lote entero: la segunda tanda multiplicaba el pedido.
    const anadidas = this.unidadesElegidas();
    this._unidadesPorTalla.set({});
    this._yaEnLaCesta.update((llevaba) => llevaba + anadidas);
    this._cantidad.set(this.minimoDelSelector());
  }

  /** El rótulo de un valor de eje en el idioma activo. La pantalla no debe resolverlo por su cuenta. */
  etiquetaDe(valor: Parameters<typeof etiquetaDeValor>[0]): string {
    return etiquetaDeValor(valor, this.preferencias.idioma());
  }
}
