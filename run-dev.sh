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
echo "🚀 Booting RevAudit Architecture (FastAPI + GitHub Ingestion + UI)"
echo "===================================================================="

# 1. Start FastAPI audit service (Port 8000)
echo "⚙️  [1/2] Launching FastAPI audit service on http://localhost:8000 ..."
(
  cd backend || exit 1
  if [ -f "../.venv/bin/activate" ]; then
    source ../.venv/bin/activate
  elif [ -f ".venv/bin/activate" ]; then
    source .venv/bin/activate
  fi
  exec uvicorn main:app --port 8000 --host 0.0.0.0 --reload
) &

sleep 2

# 2. Start the documented React frontend (Port 5173)
echo "🎨 [2/2] Launching React Frontend Dashboard on http://localhost:5173 ..."
(
  cd frontend || exit 1
  exec npm run dev
)

wait
