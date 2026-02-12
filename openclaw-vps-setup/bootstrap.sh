#!/usr/bin/env bash
# ============================================================
# OpenClaw One-Line Bootstrap
# Usage: curl -fsSL https://raw.githubusercontent.com/syedahmad0786/VTvideoYT/main/openclaw-vps-setup/bootstrap.sh | sudo bash
# ============================================================
set -euo pipefail

echo ""
echo "============================================"
echo "  OpenClaw Quick Installer for Ubuntu VPS"
echo "============================================"
echo ""

# Clone repo and run main setup
apt update -y && apt install -y git
git clone https://github.com/syedahmad0786/VTvideoYT.git /opt/VTvideoYT 2>/dev/null || {
    cd /opt/VTvideoYT && git pull origin main
}
cd /opt/VTvideoYT/openclaw-vps-setup
chmod +x setup.sh
exec ./setup.sh
