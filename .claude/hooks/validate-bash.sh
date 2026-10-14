#!/usr/bin/env bash
# Para en seco las órdenes que no se recuperan, y una que falla siempre.
#
# Se ejecuta ANTES de cada Bash: lee la orden del JSON del evento y, si encaja, devuelve `deny` con
# el motivo. En cualquier otro caso calla y deja pasar.
#
# No es una barrera de seguridad —quien quiera saltársela, puede—, sino un seguro contra el
# descuido. Lo que de verdad protege son los permisos de settings.json.
set -uo pipefail

# Necesita `jq`. Si no está instalado, esto DEJA PASAR en vez de bloquearlo todo: un seguro contra
# el descuido que se convierte en un muro al clonar en una máquina sin jq sería peor que no tenerlo.
orden=$(jq -r '.tool_input.command // empty' 2>/dev/null) || exit 0
[ -n "$orden" ] || exit 0

niega() {
  jq -n --arg r "$1" '{hookSpecificOutput: {hookEventName: "PreToolUse",
                       permissionDecision: "deny", permissionDecisionReason: $r}}'
  exit 0
}

case "$orden" in
  *"rm -rf /"*|*"rm -fr /"*)        niega "borrado recursivo desde la raíz" ;;
  *"git reset --hard"*)             niega "git reset --hard tira el trabajo sin commitear, que no está en ningún otro sitio" ;;
  *"git clean -fd"*|*"git clean -fx"*) niega "git clean borra ficheros sin seguimiento sin pasar por la papelera" ;;
  *"git push --force"*|*"git push -f"*) niega "un push forzado reescribe la historia compartida; si de verdad hace falta, lánzalo tú" ;;
  # Esta no es destructiva: es que NO FUNCIONA, y se tarda un buen rato en descubrir por qué.
  *"vitest run"*|*"npx vitest"*)
    niega "lanzar vitest a pelo rompe 397 de 421 ficheros con «Need to call TestBed.initTestEnvironment() first»: el entorno de Angular lo monta el constructor de ng test. Usa «npm test», o «npm test -- --include <fichero>» para uno solo" ;;
esac
exit 0
