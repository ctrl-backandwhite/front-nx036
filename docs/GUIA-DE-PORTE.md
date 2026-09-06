# Guía de porte: de React a Angular, contexto a contexto

Esto es lo que hay que hacer para trasladar un contexto acotado del frontend React
(`../frontend`) a este proyecto. Léela entera antes de escribir la primera línea, y ten a mano
`CLAUDE.md`, que es el que manda.

El contexto **`auth` ya está portado y es la plantilla**. Cuando dudes de cómo se hace algo, ábrelo:

```
src/app/features/auth/
├── domain/
│   ├── model/usuario.ts                    modelos + reglas puras (tieneRol, nombreParaSaludar)
│   └── port/autenticacion.port.ts          interfaces + InjectionToken, partidas por capacidad
│   └── port/resumen-de-almacenes.port.ts   un puerto propio para un dato de otro contexto (ver §4)
├── application/
│   ├── state/sesion.store.ts               estado con signals; SOLO guarda, no llama a nadie
│   └── use-case/inicia-sesion.use-case.ts  orquesta: puerto → credenciales → estado
├── infrastructure/
│   └── autenticacion-http.adapter.ts       traduce el JSON del backend al dominio
├── presentation/
│   ├── page/acceso.page.ts                 la pantalla
│   ├── component/panel-de-marca.ts         piezas de la pantalla
│   ├── guard/sesion.guard.ts               guardianes de ruta
│   ├── auth.routes.ts                      rutas de navegación
│   └── auth.server-routes.ts               cómo se genera su HTML (prerenderizado o cliente)
└── auth.providers.ts                       ata cada puerto con su adaptador
```

---

## 1. Antes de escribir nada

1. Lee `docs/INVENTARIO-PORTE.md` y localiza **tu** contexto: qué páginas, componentes y módulos de
   API te tocan. Es la lista cerrada de tu trabajo; ni más ni menos.
2. Abre los ficheros React de origen y **léelos enteros**. Los comentarios de ese código explican
   decisiones que costaron incidencias reales en producción; casi todos merecen viajar contigo.
3. Mira qué endpoints usa tu contexto. Serán los métodos de tus puertos.

## 2. El orden de trabajo

Siempre de dentro afuera. Si empiezas por la pantalla, acabarás metiendo negocio en ella.

**Dominio** → **puertos** → **adaptador** → **casos de uso** → **pantallas** → **rutas** → **pruebas**.

### Dominio (`domain/model/`)

Los modelos son del NEGOCIO, no del backend. Si tu modelo tiene exactamente la forma del JSON que
llega, la dependencia está invertida: renombra los campos al vocabulario del dominio y deja que el
adaptador traduzca. Las reglas que no dependen de nada externo (calcular un total, decidir si algo se
puede cancelar) son funciones puras y viven aquí, no en el componente.

### Puertos (`domain/port/`)

Una interfaz más su `InjectionToken`. **Pártelos por capacidad, no por sujeto**: `CatalogoPort` y
`FavoritosPort` separados, nunca un `ApiPort` con cuarenta métodos del que cada pantalla usa dos —
obligaría a cualquier doble de prueba a implementar los cuarenta.

Todo método devuelve `Promise<Result<T, AppError>>`. Nada lanza.

### Adaptador (`infrastructure/`)

Inyecta `ApiService` de `@core/http/api.service` (es el único sitio del proyecto autorizado a usarlo)
y traduce en las dos direcciones. Define aquí, y solo aquí, las interfaces `…Dto` con la forma del
backend. **No lleva `providedIn: 'root'`**: se registra en `<contexto>.providers.ts`.

### Casos de uso (`application/use-case/`)

Uno por acción, con un único método público `ejecuta(...)`. Responde a «¿qué tiene que pasar, y en
qué orden?». Si una pantalla tiene que acordarse de llamar a tres cosas seguidas, es que faltaba un
caso de uso.

### Estado (`application/state/`)

Signals. `signal()` para lo que se escribe, `computed()` para lo derivado, `asReadonly()` hacia fuera.
El almacén **solo guarda**: no llama al backend. Quien provoca efectos es el caso de uso.

### Pantallas (`presentation/`)

Ver §3. Y recuerda: **una pantalla no puede importar un adaptador**. El lint lo impide.

### Rutas

`<contexto>.routes.ts` para navegar y `<contexto>.server-routes.ts` para decir cómo se genera el HTML.
Lo público se prerenderiza; **todo lo que dependa de quién mira lleva `RenderMode.Client`**, o su
esqueleto acabaría cacheado en el borde. Los proveedores del contexto se declaran en la propia ruta
(`providers: [proveeMiContexto()]`) para que no pesen en el arranque.

## 3. Cómo se escribe una pantalla

- **Mobile first, obligatorio.** Clases sin prefijo para el móvil; `sm:`/`md:`/`lg:` para ampliar. Si
  el original usaba `max-*`, se invierte al portarlo comprobando que se ve igual en las dos anchuras.
- **Mismo marcado y mismas clases** que el React: el diseño no puede cambiar.
- **Ningún estilo en el componente.** Ni `styles`, ni `styleUrl`, ni `styleUrls`. Todo en
  `src/styles.css`.
- Angular 22: `input()`, `output()`, `model()`, `computed()`, `inject()`, `@if`/`@for`/`@switch`,
  `host: {...}`. Nunca `@Input`, `@ViewChild`, `@HostListener`, `*ngIf`, `ngClass` ni `ngStyle`.
- **Formularios con Signal Forms**: `form(signal({...}), (ruta) => { required(ruta.campo); … })`, la
  directiva `FormField` con `[formField]="formulario.campo"`, y `submit()`. Está en `acceso.page.ts`.
- **Textos con `t('clave')`** del `TraduccionService`. Cero literales en las plantillas. Las claves ya
  existen en los ocho idiomas: son las mismas que usa el React.
- **Divide.** El lint avisa a las 400 líneas. Una página de 900 líneas del React casi siempre son
  cuatro componentes que nadie separó; sepáralos.
- **Accesibilidad**: cada campo con su `<label for>`, los botones de icono con `aria-label`, y los
  avisos con `role="alert"`. Es requisito, no adorno.

## 4. Cuando necesitas algo de otro contexto

No puedes importar sus casos de uso, sus adaptadores ni sus pantallas: el lint lo impide, y con razón.
Tienes tres salidas, en este orden:

1. **Su dominio sí es visible**: modelos y puertos son contrato público. Si te basta con un tipo, úsalo.
2. **Declara un puerto propio con lo que de verdad necesitas.** Es lo que hace `auth` con los
   almacenes: no quiere el catálogo de almacenes, quiere dos números para una frase, así que define
   `ResumenDeAlmacenesPort` con un método y su adaptador llama al mismo endpoint. Poca duplicación,
   cero acoplamiento.
3. **Si es de verdad común**, su sitio es `shared/`, `core/` o `design-system/`. Avisa antes de
   moverlo ahí: hay más equipos trabajando en paralelo.

## 5. Pruebas

Norma del proyecto: **90 %**. Cada cosa se prueba donde le toca:

- **Dominio y casos de uso: sin Angular.** Son clases y funciones puras con un doble del puerto. Si
  para probar una regla de negocio necesitas montar un componente, la regla está en el sitio malo.
- **Adaptadores**: con `provideHttpClientTesting`, comprobando la traducción en las dos direcciones y
  qué `AppError` sale de cada fallo.
- **Pantallas**: con `@testing-library/angular`, por lo que ve quien usa la aplicación (texto, papel
  accesible), no por sus detalles internos.
- Cubre siempre el **camino de error**, no solo el feliz: es donde están los fallos que llegan a
  producción.

## 6. Antes de dar nada por terminado

```bash
npx tsc --noEmit -p tsconfig.app.json          # tipos
npx eslint src/app/features/<tu-contexto>      # arquitectura y estilo
npx ng test                                     # pruebas
```

**No ejecutes `ng build`**: hay varios equipos trabajando a la vez y la caché de compilación es
compartida. Del build integrador se encarga quien coordina.

Si `eslint` te acusa de cruzar una frontera, **es un error de diseño tuyo, no del lint**. Arréglalo
moviendo la pieza a su capa; nunca silenciando la regla.
