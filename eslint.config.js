// @ts-check
const eslint = require('@eslint/js');
const { defineConfig } = require('eslint/config');
const tseslint = require('typescript-eslint');
const angular = require('angular-eslint');
const boundaries = require('eslint-plugin-boundaries');

/**
 * La regla de dependencia de la arquitectura hexagonal se verifica AQUÍ, no en una revisión de código:
 * si una capa importa de otra que tiene prohibida, el lint falla y el build de integración continua
 * con él. Una arquitectura que solo vive en un documento se erosiona en la primera semana con prisa.
 *
 * El hexágono, de dentro afuera:
 *
 *   domain          Modelos, reglas y PUERTOS (interfaces). No conoce Angular, ni HTTP, ni el navegador.
 *   application     Casos de uso y estado con signals. Habla con el dominio a través de sus puertos.
 *   infrastructure  ADAPTADORES: implementan los puertos contra el backend, el almacenamiento, Stripe...
 *   presentation    Componentes y páginas. Solo conocen casos de uso y modelos.
 *   composition     La raíz de composición: el ÚNICO sitio que ata cada puerto con su adaptador.
 *
 * La prohibición que de verdad sostiene el diseño es `presentation ✗ infrastructure`: una pantalla no
 * puede llamar al backend por su cuenta. Si pudiera, el hexágono sería decorativo — la lógica se
 * escaparía a las plantillas y cambiar de proveedor obligaría a tocar la interfaz de usuario.
 */
module.exports = defineConfig([
  {
    ignores: ['dist/**', 'node_modules/**', 'coverage/**', '.angular/**'],
  },
  {
    files: ['**/*.ts'],
    extends: [
      eslint.configs.recommended,
      tseslint.configs.recommended,
      tseslint.configs.stylistic,
      angular.configs.tsRecommended,
    ],
    processor: angular.processInlineTemplates,
    rules: {
      '@angular-eslint/directive-selector': [
        'error',
        { type: 'attribute', prefix: 'nx', style: 'camelCase' },
      ],
      '@angular-eslint/component-selector': [
        'error',
        { type: 'element', prefix: 'nx', style: 'kebab-case' },
      ],

      // El tipo `any` desactiva justo la barrera que sostiene el contrato entre capas.
      '@typescript-eslint/no-explicit-any': 'error',

      // Nada de decoradores heredados ni de APIs retiradas: el proyecto nace en Angular 22 y no
      // arrastra el estilo de las versiones anteriores.
      '@angular-eslint/prefer-standalone': 'error',
      '@angular-eslint/prefer-signals': 'error',
      '@angular-eslint/prefer-output-emitter-ref': 'error',
      '@angular-eslint/no-input-rename': 'error',
      '@angular-eslint/no-output-native': 'error',
      '@angular-eslint/use-lifecycle-interface': 'error',
      '@angular-eslint/no-attribute-decorator': 'error',
      '@angular-eslint/no-host-metadata-property': 'off',

      // Una clase con demasiadas responsabilidades se detecta antes por su tamaño que leyéndola.
      // (Principio de responsabilidad única: si un componente no cabe, es que hace dos cosas.)
      'max-lines': ['warn', { max: 400, skipBlankLines: true, skipComments: true }],
      complexity: ['warn', 12],

      /* El CSS del proyecto está CENTRALIZADO en `src/styles/`. Un componente no declara estilo propio:
       * ni `styles`, ni `styleUrl`, ni `styleUrls`.
       *
       * El motivo es que el diseño se hereda de un sistema de utilidades (Tailwind + daisyUI) con un
       * tema —NX036— del que salen todos los colores, radios y sombras. En cuanto una pantalla escribe
       * su propio CSS, esa regla deja de pasar por el tema: no cambia al cambiar de tema claro a oscuro,
       * no se ve al buscar de dónde sale un color, y la siguiente pantalla la copia. El estilo repetido
       * se convierte en una utilidad de `src/styles/`, que es donde se puede corregir UNA vez. */
      'no-restricted-syntax': [
        'error',
        {
          selector: "Decorator[expression.callee.name='Component'] Property[key.name='styles']",
          message: 'El CSS va centralizado en src/styles/, no dentro del componente.',
        },
        {
          selector: "Decorator[expression.callee.name='Component'] Property[key.name='styleUrl']",
          message: 'El CSS va centralizado en src/styles/, no dentro del componente.',
        },
        {
          selector: "Decorator[expression.callee.name='Component'] Property[key.name='styleUrls']",
          message: 'El CSS va centralizado en src/styles/, no dentro del componente.',
        },
      ],
    },
  },

  // ── La regla de dependencia ────────────────────────────────────────────────────────────────
  {
    files: ['src/**/*.ts'],
    plugins: { boundaries },
    settings: {
      // Cada patrón captura el CONTEXTO en `${contexto}`: es lo que permite después distinguir «el
      // dominio de mi propio contexto» de «el dominio del contexto de al lado».
      'boundaries/elements': [
        { type: 'composition', pattern: 'src/app/composition' },
        { type: 'core', pattern: 'src/app/core' },
        { type: 'shared', pattern: 'src/app/shared' },
        { type: 'ds', pattern: 'src/app/design-system' },
        { type: 'layout', pattern: 'src/app/layout' },
        {
          type: 'domain',
         
          pattern: 'src/app/features/*/domain',
          capture: ['contexto'],
        },
        {
          type: 'application',
         
          pattern: 'src/app/features/*/application',
          capture: ['contexto'],
        },
        {
          type: 'infrastructure',
         
          pattern: 'src/app/features/*/infrastructure',
          capture: ['contexto'],
        },
        {
          type: 'presentation',
         
          pattern: 'src/app/features/*/presentation',
          capture: ['contexto'],
        },
      ],
      'boundaries/ignore': ['**/*.spec.ts', 'src/test-setup.ts'],

      /* Sin esto la regla no vigila NADA y no se nota: el resolvedor por defecto solo entiende
       * JavaScript, así que toda importación de un `.ts` —o cualquiera escrita con un alias como
       * `@core/...`— se clasificaba como «destino desconocido» y la política ni se llegaba a evaluar.
       * El lint pasaba en verde con violaciones flagrantes delante. Se descubrió metiendo dos a
       * propósito y viendo que no saltaban. */
      'import/resolver': {
        typescript: { project: './tsconfig.json' },
      },
    },
    rules: {
      'boundaries/dependencies': [
        'error',
        {
          default: 'disallow',
          policies: [
            // El centro del hexágono no depende de nadie: ni de Angular, ni de la red, ni de una
            // pantalla. Solo de tipos y datos puros.
            {
              from: { element: { type: 'domain' } },
              allow: { to: { element: { types: { anyOf: ['domain', 'shared'] } } } },
            },
            {
              from: { element: { type: 'application' } },
              allow: {
                to: { element: { types: { anyOf: ['application', 'domain', 'shared', 'core'] } } },
              },
            },
            // Los adaptadores conocen el puerto que implementan y la plataforma a la que traducen.
            {
              from: { element: { type: 'infrastructure' } },
              allow: {
                to: {
                  element: { types: { anyOf: ['infrastructure', 'domain', 'shared', 'core'] } },
                },
              },
            },
            // Una pantalla NO puede importar un adaptador. Pide un caso de uso y ya está. Es la
            // prohibición que sostiene el diseño entero.
            {
              from: { element: { type: 'presentation' } },
              allow: {
                to: {
                  element: {
                    types: {
                      anyOf: ['presentation', 'application', 'domain', 'ds', 'shared', 'core'],
                    },
                  },
                },
              },
            },
            {
              from: { element: { type: 'ds' } },
              allow: { to: { element: { types: { anyOf: ['ds', 'shared', 'core'] } } } },
            },
            {
              from: { element: { type: 'shared' } },
              allow: { to: { element: { type: 'shared' } } },
            },
            {
              from: { element: { type: 'core' } },
              allow: { to: { element: { types: { anyOf: ['core', 'shared'] } } } },
            },
            // Los marcos de página ensamblan piezas de varios contextos: es su trabajo, igual que el de
            // la raíz de composición.
            {
              from: { element: { types: { anyOf: ['layout', 'composition'] } } },
              allow: { to: { element: { type: '*' } } },
            },

            // Un contexto acotado no entra en las TRIPAS de otro. Puede usar su dominio —los modelos y
            // los puertos son el contrato público—, pero no su aplicación, su infraestructura ni sus
            // pantallas. Si hace falta algo de eso, es que ese algo era compartido, y su sitio es
            // `shared`, `core` o el sistema de diseño.
            {
              from: {
                element: {
                  types: { anyOf: ['domain', 'application', 'infrastructure', 'presentation'] },
                },
              },
              disallow: {
                to: {
                  element: {
                    types: { anyOf: ['application', 'infrastructure', 'presentation'] },
                    capture: { contexto: '!{{from.element.capture.contexto}}' },
                  },
                },
              },
            },
          ],
        },
      ],
    },
  },

  {
    // Datos, no código: un diccionario de ocho idiomas mide lo que mide y partirlo no lo mejora.
    files: ['src/app/shared/i18n/**/*.ts', 'src/app/shared/data/**/*.ts', 'src/app/shared/content/**/*.ts'],
    rules: { 'max-lines': 'off' },
  },

  {
    files: ['**/*.spec.ts'],
    rules: {
      'max-lines': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },

  {
    files: ['**/*.html'],
    extends: [angular.configs.templateRecommended, angular.configs.templateAccessibility],
    rules: {},
  },
]);
