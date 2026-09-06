import { Injectable, inject } from '@angular/core';
import { ALMACEN_LOCAL } from '@core/storage/almacen.port';
import { TokenStore } from '@core/auth/token-store';
import { USUARIO_ACTUAL_PORT } from '@features/auth/domain/port/autenticacion.port';
import { direccionSinReferido, seLePuedeAtribuir } from '../../domain/model/referido';
import { ATRIBUCION_DE_REFERIDO_PORT } from '../../domain/port/referido.port';

const CLAVE_REFERIDO = 'nx036-aff-ref';
const CLAVE_TESTIGO = 'nx036-aff-visitor';

/**
 * Captura el referido con el que llega una visita y lo ata a la cuenta cuando entra.
 *
 * <p>Son dos momentos separados y por eso son dos métodos: el clic se apunta al cargar CUALQUIER página
 * con `?ref=CODIGO`, y la atadura solo puede ocurrir después, cuando ya hay una cuenta. Entre los dos
 * pueden pasar días, y por eso el código se guarda en el equipo.
 *
 * <p>Del contexto de identidad solo se usa su DOMINIO —el puerto del usuario actual, que es contrato
 * público—: nunca su estado ni sus pantallas, que el aislamiento entre contextos prohíbe y con razón.
 */
@Injectable({ providedIn: 'root' })
export class CapturaReferido {
  private readonly atribucion = inject(ATRIBUCION_DE_REFERIDO_PORT);
  private readonly almacen = inject(ALMACEN_LOCAL);
  private readonly tokens = inject(TokenStore);
  private readonly usuarioActual = inject(USUARIO_ACTUAL_PORT);

  /**
   * Apunta el clic si la dirección trae un código, y devuelve la dirección ya limpia.
   *
   * <p>Se devuelve la dirección en vez de reescribirla aquí porque tocar el historial del navegador es
   * cosa de la pantalla; así este caso de uso se prueba sin navegador.
   *
   * @returns la dirección sin el parámetro, o `null` si no había nada que capturar.
   */
  async apunta(direccion: string): Promise<string | null> {
    const consulta = direccion.split('?')[1]?.split('#')[0] ?? '';
    const codigo = new URLSearchParams(consulta).get('ref');
    if (!codigo) {
      return null;
    }
    this.almacen.guarda(CLAVE_REFERIDO, codigo);
    const resultado = await this.atribucion.registra(codigo, this.testigo());
    if (resultado.ok) {
      this.almacen.guarda(CLAVE_TESTIGO, resultado.valor);
    }
    // Si el registro falla, el código queda guardado igual: la atadura posterior lo volverá a intentar.
    // Perder la atribución por un corte de red sería quitarle una venta a quien la trajo.
    return direccionSinReferido(direccion);
  }

  /**
   * Ata el testigo de la visita a la cuenta con la que se acaba de entrar.
   *
   * <p>No se pregunta por el usuario si no hay ni credencial ni referido pendiente. Esa comprobación
   * evita una llamada al backend en cada arranque de cualquier visitante anónimo, que son la mayoría.
   */
  async vincula(): Promise<void> {
    if (!this.tokens.haySesion() || !this.almacen.lee(CLAVE_REFERIDO)) {
      return;
    }
    const usuario = await this.usuarioActual.consulta();
    if (usuario.ok && usuario.valor && seLePuedeAtribuir(usuario.valor.rol)) {
      await this.atribucion.vincula(this.testigo());
    }
  }

  /**
   * El testigo de esta visita, creándolo si hace falta.
   *
   * <p>Con el almacenamiento bloqueado —navegación privada, cookies denegadas— se devuelve uno nuevo que
   * no se guarda: la atribución se pierde, pero la página funciona. Es preferible a que un almacén
   * inaccesible tumbe la portada.
   */
  private testigo(): string {
    const guardado = this.almacen.lee(CLAVE_TESTIGO);
    if (guardado) {
      return guardado;
    }
    const nuevo = crypto.randomUUID();
    this.almacen.guarda(CLAVE_TESTIGO, nuevo);
    return nuevo;
  }
}
