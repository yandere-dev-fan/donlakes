#!/usr/bin/env bash
# Устойчивый запуск dev-сервера «Донские озёра».
# Держит astro dev независимо от терминала/Claude: nohup + отвязка от сессии.
# Запуск:   ./start-dev.sh          (поднять/перезапустить)
# Логи:     tail -f dev.log
# Стоп:     ./start-dev.sh stop
set -euo pipefail
cd "$(dirname "$0")"

PORT=4321
LOG="dev.log"

free_port() {
  # снять всё, что слушает порт
  local pids
  pids=$(lsof -nP -iTCP:"$PORT" -sTCP:LISTEN -t 2>/dev/null || true)
  if [ -n "$pids" ]; then
    echo "Останавливаю процесс(ы) на порту $PORT: $pids"
    kill $pids 2>/dev/null || true
    sleep 1
    pids=$(lsof -nP -iTCP:"$PORT" -sTCP:LISTEN -t 2>/dev/null || true)
    [ -n "$pids" ] && kill -9 $pids 2>/dev/null || true
  fi
}

if [ "${1:-}" = "stop" ]; then
  free_port
  echo "Остановлено."
  exit 0
fi

[ -d node_modules ] || { echo "Ставлю зависимости…"; npm install; }

free_port

echo "Запускаю astro dev на :$PORT (detached)…"
# </dev/null и nohup — чтобы процесс пережил закрытие терминала/сессии
nohup npm run dev -- --port "$PORT" </dev/null >"$LOG" 2>&1 &
disown || true

# ждём готовности до 20с
for i in $(seq 1 40); do
  if curl -s -o /dev/null "http://localhost:$PORT/"; then
    echo "✅ Готово: http://localhost:$PORT/"
    exit 0
  fi
  sleep 0.5
done

echo "⚠️ Сервер не ответил за 20с. Последние строки $LOG:"
tail -20 "$LOG" || true
exit 1
