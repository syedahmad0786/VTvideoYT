#!/usr/bin/env bash
# ============================================================
# OpenClaw FULL Auto-Install for DigitalOcean Droplet
# $16/mo plan — 2 vCPUs, 4GB RAM, 80GB SSD
# Installs: OpenClaw + Docker + Ollama + Nginx
# Just run: bash install-openclaw.sh
# ============================================================
set -euo pipefail

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
BLUE='\033[0;34m'; CYAN='\033[0;36m'; NC='\033[0m'

log()  { echo -e "${GREEN}[OK]${NC} $1"; }
warn() { echo -e "${YELLOW}[!!]${NC} $1"; }
info() { echo -e "${BLUE}[>>]${NC} $1"; }
step() { echo -e "\n${CYAN}=== $1 ===${NC}\n"; }

# ── Must be root ────────────────────────────────────────────
if [ "$(id -u)" -ne 0 ]; then
    echo -e "${RED}Run as root: sudo bash install-openclaw.sh${NC}"
    exit 1
fi

SERVER_IP=$(hostname -I | awk '{print $1}')

echo ""
echo -e "${CYAN}╔══════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║   OpenClaw Auto-Installer (DigitalOcean)     ║${NC}"
echo -e "${CYAN}║   Server: ${SERVER_IP}                       ║${NC}"
echo -e "${CYAN}╚══════════════════════════════════════════════╝${NC}"
echo ""

# ── Step 1: Swap ────────────────────────────────────────────
step "1/9 — Creating 3GB swap"
if [ ! -f /swapfile ]; then
    fallocate -l 3G /swapfile
    chmod 600 /swapfile
    mkswap /swapfile
    swapon /swapfile
    echo '/swapfile none swap sw 0 0' >> /etc/fstab
    sysctl vm.swappiness=60
    echo 'vm.swappiness=60' >> /etc/sysctl.conf
    log "3GB swap created (4GB RAM + 3GB swap = 7GB total)"
else
    log "Swap already exists"
fi
free -h

# ── Step 2: System packages ────────────────────────────────
step "2/9 — Updating system"
export DEBIAN_FRONTEND=noninteractive
apt update -y
apt upgrade -y
apt install -y curl git wget unzip ufw fail2ban nginx certbot python3-certbot-nginx
log "System packages installed"

# ── Step 3: Node.js 22 ─────────────────────────────────────
step "3/9 — Installing Node.js 22"
if command -v node &>/dev/null && node -v | grep -q 'v22'; then
    log "Node.js already installed: $(node -v)"
else
    curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
    apt install -y nodejs
    log "Node.js installed: $(node -v)"
fi

# ── Step 4: Docker ──────────────────────────────────────────
step "4/9 — Installing Docker"
if command -v docker &>/dev/null; then
    log "Docker already installed: $(docker --version)"
else
    curl -fsSL https://get.docker.com | sh
    systemctl enable docker
    systemctl start docker
    log "Docker installed: $(docker --version)"
fi

# ── Step 5: Firewall ───────────────────────────────────────
step "5/9 — Configuring firewall"
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable
log "Firewall enabled (ports: 22, 80, 443)"

# Fail2Ban
if [ ! -f /etc/fail2ban/jail.local ]; then
    cat > /etc/fail2ban/jail.local <<'F2B'
[DEFAULT]
bantime  = 3600
findtime = 600
maxretry = 5
[sshd]
enabled = true
port    = ssh
logpath = /var/log/auth.log
F2B
    systemctl enable fail2ban
    systemctl restart fail2ban
    log "Fail2Ban active"
fi

# ── Step 6: Ollama (Local AI Models) ───────────────────────
step "6/9 — Installing Ollama via Docker"
docker run -d \
    --name ollama \
    --restart unless-stopped \
    -p 127.0.0.1:11434:11434 \
    -v ollama_data:/root/.ollama \
    -e OLLAMA_HOST=0.0.0.0:11434 \
    -e OLLAMA_FLASH_ATTENTION=1 \
    --memory=2g \
    ollama/ollama:latest 2>/dev/null || log "Ollama container already exists"
log "Ollama running on port 11434"

info "Pulling llama3.2:3b model (1.9GB — fits in 4GB RAM)..."
docker exec ollama ollama pull llama3.2:3b &
PULL_PID=$!
info "Model downloading in background (PID: $PULL_PID)..."

# ── Step 7: Install OpenClaw ───────────────────────────────
step "7/9 — Installing OpenClaw"
npm install -g openclaw@latest
log "OpenClaw installed"

# Generate auth token
GATEWAY_TOKEN=$(openssl rand -hex 24)

# Create config
OPENCLAW_HOME="/root/.openclaw"
mkdir -p "$OPENCLAW_HOME"

cat > "$OPENCLAW_HOME/openclaw.json" <<OCJSON
{
  "agent": {
    "model": "anthropic/claude-sonnet-4-20250514",
    "fallbackModels": ["ollama/llama3.2:3b"]
  },
  "gateway": {
    "bind": "127.0.0.1",
    "port": 3000,
    "auth": {
      "token": "${GATEWAY_TOKEN}"
    }
  },
  "channels": {
    "webchat": {
      "enabled": true
    },
    "telegram": {
      "botToken": ""
    }
  },
  "keys": {
    "ANTHROPIC_API_KEY": ""
  }
}
OCJSON
log "OpenClaw config created at ${OPENCLAW_HOME}/openclaw.json"

# Create systemd service for OpenClaw
cat > /etc/systemd/system/openclaw.service <<'SVC'
[Unit]
Description=OpenClaw AI Gateway
After=network.target docker.service
Requires=docker.service

[Service]
Type=simple
User=root
WorkingDirectory=/root
ExecStart=/usr/bin/env openclaw start --foreground
Restart=on-failure
RestartSec=5
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
SVC
systemctl daemon-reload
systemctl enable openclaw
log "OpenClaw systemd service created"

# ── Step 8: Nginx reverse proxy ────────────────────────────
step "8/9 — Setting up Nginx"
cat > /etc/nginx/sites-available/openclaw <<NGINX
# Rate limiting
limit_req_zone \$binary_remote_addr zone=api:10m rate=30r/m;

server {
    listen 80;
    server_name ${SERVER_IP};

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    client_max_body_size 20M;

    # OpenClaw Web UI
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_buffering off;
        proxy_cache off;
        proxy_read_timeout 600s;
        proxy_send_timeout 600s;
        proxy_connect_timeout 60s;
    }

    location /health {
        access_log off;
        return 200 'ok';
        add_header Content-Type text/plain;
    }
}
NGINX

ln -sf /etc/nginx/sites-available/openclaw /etc/nginx/sites-enabled/openclaw
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx
log "Nginx running on port 80"

# ── Step 9: Start OpenClaw ─────────────────────────────────
step "9/9 — Starting OpenClaw"
systemctl start openclaw 2>/dev/null || warn "Start manually after adding API key"

# Wait for model download if still running
if kill -0 $PULL_PID 2>/dev/null; then
    info "Waiting for llama3.2:3b model download to finish..."
    wait $PULL_PID 2>/dev/null && log "Model downloaded!" || warn "Model download may still be running"
fi

# ── DONE ───────────────────────────────────────────────────
echo ""
echo -e "${CYAN}╔══════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║          OPENCLAW INSTALLED SUCCESSFULLY!            ║${NC}"
echo -e "${CYAN}╠══════════════════════════════════════════════════════╣${NC}"
echo -e "${CYAN}║                                                      ║${NC}"
echo -e "${CYAN}║${NC}  Server IP:      ${GREEN}${SERVER_IP}${NC}"
echo -e "${CYAN}║${NC}  Web Access:     ${GREEN}http://${SERVER_IP}${NC}"
echo -e "${CYAN}║${NC}  Gateway Token:  ${GREEN}${GATEWAY_TOKEN}${NC}"
echo -e "${CYAN}║${NC}  Config File:    ${GREEN}${OPENCLAW_HOME}/openclaw.json${NC}"
echo -e "${CYAN}║${NC}  Local AI:       ${GREEN}Ollama + llama3.2:3b (FREE)${NC}"
echo -e "${CYAN}║                                                      ║${NC}"
echo -e "${CYAN}╠══════════════════════════════════════════════════════╣${NC}"
echo -e "${YELLOW}║  NEXT: Add your API key to unlock Claude!            ║${NC}"
echo -e "${CYAN}╚══════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${YELLOW}Run these commands to finish setup:${NC}"
echo ""
echo -e "  ${CYAN}1. Add your Anthropic API key:${NC}"
echo -e "     nano ~/.openclaw/openclaw.json"
echo -e "     (find ANTHROPIC_API_KEY and paste your key)"
echo ""
echo -e "  ${CYAN}2. (Optional) Add Telegram bot token:${NC}"
echo -e "     In same config file, find botToken and paste your token"
echo ""
echo -e "  ${CYAN}3. Restart OpenClaw:${NC}"
echo -e "     systemctl restart openclaw"
echo ""
echo -e "  ${CYAN}4. Check status:${NC}"
echo -e "     systemctl status openclaw"
echo -e "     docker exec ollama ollama list"
echo ""
echo -e "${GREEN}Then open http://${SERVER_IP} in your browser!${NC}"
echo -e "${GREEN}(works right now with local AI even without API key)${NC}"
echo ""

# Save credentials
cat > "${OPENCLAW_HOME}/credentials.txt" <<CREDS
=== OpenClaw Setup Credentials ===
Date: $(date -u)
Server: ${SERVER_IP}
Gateway Token: ${GATEWAY_TOKEN}
Config: ${OPENCLAW_HOME}/openclaw.json
Web UI: http://${SERVER_IP}
===================================
DELETE THIS FILE AFTER SAVING CREDS
CREDS
chmod 600 "${OPENCLAW_HOME}/credentials.txt"
