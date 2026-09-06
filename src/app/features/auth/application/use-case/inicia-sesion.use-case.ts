import { Service, inject } from '@angular/core';
import { Result, fallo } from '@shared/result/result';
import { AppError } from '@shared/error/app-error';
import { Credenciales, Usuario } from '../../domain/model/usuario';
import { AUTENTICACION_PORT } from '../../domain/port/autenticacion.port';
import { TokenStore } from '@core/auth/token-store';
import { SesionStore } from '../state/sesion.store';

/**
 * Entrar en la aplicación.
 *
 * <p>Un caso de uso responde a una pregunta sola: ¿qué tiene que pasar, y en qué orden, para que alguien
 * quede dentro? Aquí son tres cosas: pedírselo al backend por el puerto, guardar las credenciales y
 * publicar quién es. Ninguna pantalla debería tener que acordarse de las tres.
 *
 * <p>El SEGUNDO FACTOR no se decide aquí: el backend rechaza el primer intento diciendo que hace falta,
 * la pantalla enseña el campo y vuelve a llamar con el código puesto. Así, activar o desactivar el doble
 * factor es cosa de la cuenta y no obliga a tocar el front.
 */
@Service()
export class IniciaSesion {
  private readonly autenticacion = inject(AUTENTICACION_PORT);
  private readonly tokens = inject(TokenStore);
  private readonly sesion = inject(SesionStore);

  async ejecuta(credenciales: Credenciales): Promise<Result<Usuario, AppError>> {
    this.sesion.marcaCargando(true);
    try {
      const resultado = await this.autenticacion.entra(credenciales);
      if (!resultado.ok) {
        return fallo(resultado.error);
      }
      const { usuario, token, tokenDeRefresco } = resultado.valor;
      this.tokens.guarda(token, tokenDeRefresco);
      this.sesion.fija(usuario);
      return { ok: true, valor: usuario };
    } finally {
      this.sesion.marcaCargando(false);
    }
  }
}
