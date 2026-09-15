#!/bin/bash
# ==============================================================================
# RevAudit Unified Orchestration Script
# UCS503 Software Engineering Lab, TIET | Advisor: Dr. Sukhpal Singh
# Team ArchCoders (Dheeraj Kumar, Vaibhav Goyal, Adityaraj Singh, Sparsh Khandelwal)
# ==============================================================================

export PATH="/home/epsilon/node/bin:$PATH"

cleanup() {
    echo ""
    echo "🛑 Shutting down RevAudit services..."
    kill $(jobs -p) 2>/dev/null
    exit
}
trap cleanup SIGINT SIGTERM

echo "===================================================================="
echo "🚀 Booting RevAudit Architecture (Statistical Engine + Gateway + UI)"
echo "===================================================================="

# 1. Start Python Statistical Engine (Port 8000)
echo "⚙️  [1/3] Launching Python Statistical Microservice on http://localhost:8000 ..."
(
  cd revaudit-engine || exit 1
  if [ -d "../.venv" ]; then
    source ../.venv/bin/activate
  elif [ -d ".venv" ]; then
    source .venv/bin/activate
  fi
  exec uvicorn api.main:app --port 8000 --host 0.0.0.0
) &

sleep 2

# 2. Start Node.js Express Gateway Backend (Port 4000)
echo "🌐 [2/3] Launching Node.js Express Gateway API on http://localhost:4000 ..."
(
  cd backend || exit 1
  exec node server.js
) &

sleep 1

# 3. Start React Frontend UI (Port 3000)
echo "🎨 [3/3] Launching React Frontend Dashboard on http://localhost:3000 ..."
(
  cd frontend || cd revaudit-frontend || exit 1
  exec npm run dev
)

wait
