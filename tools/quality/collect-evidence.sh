#!/bin/bash
# LA HORDA — recolecta la EVIDENCIA de la tarjeta de calidad (tools/quality/scorecard.js) corriendo las herramientas
# reales del repo y guardando su salida cruda en docs/quality/evidence/. No inventa números: si una herramienta falla,
# su log lo dice y la tarjeta lo cuenta como FAIL.
# Uso:  bash tools/quality/collect-evidence.sh [solo]     (solo = lista separada por comas: hud,audio,perf,modes,play)
#   Variables: CHROMIUM_PATH, PLAYWRIGHT_MODULE (como el resto de las herramientas).
# Las partidas simuladas (play: 10 arenas × 3 perfiles, ~1 h) y el rendimiento conviene correrlos con la máquina libre.
cd "$(dirname "$0")/../.." || exit 1
EV=docs/quality/evidence; mkdir -p "$EV"
ONLY=",${1:-hud,audio,perf,modes,play,bible},"
want(){ [[ "$ONLY" == *",$1,"* ]]; }
python3 -m http.server 8771 --bind 127.0.0.1 >/dev/null 2>&1 & S1=$!
python3 -m http.server 8783 --bind 127.0.0.1 >/dev/null 2>&1 & S2=$!
trap 'kill $S1 $S2 2>/dev/null' EXIT
sleep 1
run(){ local n=$1; shift; local t0=$(date +%s); timeout 2400 "$@" > "$EV/$n.log" 2>&1; local c=$?; echo "exit=$c secs=$(( $(date +%s)-t0 ))" >> "$EV/$n.log"; echo "$n exit=$c"; }
if want hud; then
  run ui_layout node tools/audit/ui_layout.js /tmp/ui_layout
  SE_BASE_URL=http://127.0.0.1:8783 run center_text node tools/audit/center_text.js /tmp/center_text
  run menu_taps node tools/audit/menu_taps.js
  run touch_targets node tools/ux/test-touch-targets.js
  run text_overflow node tools/ux/test-text-overflow.js
  run functional node tools/ux/functional.js
fi
if want audio; then
  run audio_mix node tools/audio/t_audio_mix.js
  run audio_levels node tools/audit/audio_levels.js
fi
if want perf; then
  run fps_infernal node tools/audit/fps.js infernal 4
  run fps_ciudad node tools/audit/fps.js ciudad 4
  run fps_micelial node tools/audit/fps.js micelial 4
  run loadtime node tools/audit/loadtime.js /tmp/loadtime
fi
if want modes; then
  run crystal_sim node tools/crystal-wars/test-simulation.js
  run crystal_hub node tools/crystal-wars/hub-integration.js
  SE_BASE_URL=http://127.0.0.1:8771 run endless node tools/items/t_endless.js
  run online node tools/ux/online.js
  run projectiles node tools/quality/test-projectile-identity.js
fi
if want bible; then
  run boss_validator node tools/bible/boss-validator.js
  run arena_validator node tools/bible/arena-validator.js
  run champion_validator node tools/bible/champion-validator.js
  run boss_hooks node tools/bosses/t_boss_arena_hooks.js
fi
if want play; then
  run playtest node tools/ux/playtest.js score
fi
node tools/quality/scorecard.js
