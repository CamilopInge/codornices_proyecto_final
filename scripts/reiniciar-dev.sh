#!/usr/bin/env bash
# Reinicia el servidor de desarrollo en Windows.
# pkill no coincide con los procesos de Node aqui, asi que se busca por puerto.
PUERTO="${1:-3000}"
PID=$(netstat -ano 2>/dev/null | grep ":${PUERTO}" | grep LISTENING | awk '{print $5}' | head -1)
if [ -n "$PID" ]; then
  taskkill //F //PID "$PID" > /dev/null 2>&1 && echo "Detenido el proceso $PID en el puerto $PUERTO"
  sleep 2
fi
node api/server.js > /tmp/evalcodorniz.log 2>&1 &
sleep 4
head -3 /tmp/evalcodorniz.log
