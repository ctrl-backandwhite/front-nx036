import { Service, computed, signal } from '@angular/core';
import { Aviso, Carpeta, Categoria, categoriasPresentes, filtraPorCategoria } from '../../domain/model/aviso';

/**
 * Lo que el buzón tiene delante ahora mismo: la carpeta abierta, el filtro por tipo, lo que hay dentro,
 * qué mensaje se está leyendo y cuáles están marcados para una acción en lote.
 *
 * <p>Solo GUARDA. No llama al backend ni decide nada: quien provoca efectos es el caso de uso. Si este
 * almacén hiciera además las llamadas, cualquier pantalla podría dispararlas desde cualquier sitio y no
 * habría un único lugar donde leer qué pasa al abrir una carpeta.
 */
@Service()
export class BuzonStore {
  private readonly _carpeta = signal<Carpeta>('inbox');
  private readonly _filtro = signal<Categoria | ''>('');
  private readonly _avisos = signal<readonly Aviso[]>([]);
  private readonly _cargando = signal(false);
  private readonly _abierto = signal<string | null>(null);
  private readonly _marcados = signal<ReadonlySet<string>>(new Set());
  private readonly _sinLeer = signal(0);

  readonly carpeta = this._carpeta.asReadonly();
  readonly filtro = this._filtro.asReadonly();
  readonly cargando = this._cargando.asReadonly();
  readonly marcados = this._marcados.asReadonly();
  readonly sinLeer = this._sinLeer.asReadonly();

  /** Lo que se enseña: la bandeja ya pasada por el filtro por tipo. */
  readonly visibles = computed(() => filtraPorCategoria(this._avisos(), this._filtro()));

  /** Solo los tipos que hay de verdad en la bandeja: ofrecer filtros que no filtran nada es ruido. */
  readonly categorias = computed(() => categoriasPresentes(this._avisos()));

  readonly abierto = computed(() => this._avisos().find((a) => a.id === this._abierto()) ?? null);

  readonly todosMarcados = computed(() => {
    const visibles = this.visibles();
    return visibles.length > 0 && visibles.every((a) => this._marcados().has(a.id));
  });

  fija(avisos: readonly Aviso[]): void {
    this._avisos.set(avisos);
  }

  marcaCargando(cargando: boolean): void {
    this._cargando.set(cargando);
  }

  fijaSinLeer(cuantos: number): void {
    this._sinLeer.set(cuantos);
  }

  /**
   * El contador a cero de golpe, al marcar TODO como leído.
   *
   * <p>Estaba el descuento de uno en uno —al abrir un aviso— pero no esto: tras «marcar todas leídas»
   * la campana conservaba el número viejo hasta que su reloj volviera a preguntar, un minuto entero.
   * Quien acababa de vaciar el buzón seguía viendo «9+», y eso no se lee como un retardo: se lee como
   * que la aplicación no se entera de lo que haces.
   */
  vaciaSinLeer(): void {
    this._sinLeer.set(0);
  }

  /**
   * Refleja que un aviso ya se ha leído SIN volver a pedir la lista: pedirla otra vez haría parpadear
   * el buzón entero por un punto azul que se apaga. Se toca la bandeja completa, no la filtrada.
   */
  marcaLeidoAqui(id: string): void {
    const ahora = new Date().toISOString();
    this._avisos.update((lista) =>
      lista.map((aviso) =>
        aviso.id === id ? { ...aviso, leidoEl: ahora, estado: aviso.estado ?? 'RECEIVED' } : aviso,
      ),
    );
    this._sinLeer.update((cuantos) => Math.max(0, cuantos - 1));
  }

  /** Saca un aviso de la bandeja que se está viendo, porque acaba de moverse a otra carpeta. */
  retira(ids: readonly string[]): void {
    const fuera = new Set(ids);
    this._avisos.update((lista) => lista.filter((aviso) => !fuera.has(aviso.id)));
    if (this._abierto() && fuera.has(this._abierto() as string)) {
      this._abierto.set(null);
    }
  }

  /** Cambiar de carpeta o de filtro reinicia la lectura y las casillas: hablaban de otra lista. */
  abreCarpeta(carpeta: Carpeta): void {
    this._carpeta.set(carpeta);
    this.reinicia();
  }

  filtraPor(categoria: Categoria | ''): void {
    this._filtro.set(categoria);
    this.reinicia();
  }

  abre(id: string | null): void {
    this._abierto.set(id);
  }

  alterna(id: string): void {
    this._marcados.update((actuales) => {
      const siguiente = new Set(actuales);
      if (!siguiente.delete(id)) {
        siguiente.add(id);
      }
      return siguiente;
    });
  }

  /** Marca o desmarca de golpe lo que se está viendo, no toda la bandeja. */
  alternaTodos(): void {
    const visibles = this.visibles();
    const todos = this.todosMarcados();
    this._marcados.update((actuales) => {
      const siguiente = new Set(actuales);
      for (const aviso of visibles) {
        if (todos) {
          siguiente.delete(aviso.id);
        } else {
          siguiente.add(aviso.id);
        }
      }
      return siguiente;
    });
  }

  limpiaMarcados(): void {
    this._marcados.set(new Set());
  }

  private reinicia(): void {
    this._abierto.set(null);
    this.limpiaMarcados();
  }
}
