#!/usr/bin/env bash
# ============================================================
# OpenClaw VPS Setup Script
# Installs OpenClaw + Ollama + Nginx on Ubuntu 22.04/24.04
# ============================================================
set -euo pipefail

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

log()   { echo -e "${GREEN}[✓]${NC} $1"; }
warn()  { echo -e "${YELLOW}[!]${NC} $1"; }
error() { echo -e "${RED}[✗]${NC} $1"; }
info()  { echo -e "${BLUE}[i]${NC} $1"; }
step()  { echo -e "\n${CYAN}━━━ $1 ━━━${NC}\n"; }

# ── Pre-flight checks ──────────────────────────────────────
if [ "$(id -u)" -ne 0 ]; then
    error "This script must be run as root. Use: sudo ./setup.sh"
    exit 1
fi

if ! grep -qiE 'ubuntu|debian' /etc/os-release 2>/dev/null; then
    warn "This script is designed for Ubuntu/Debian. Proceed with caution."
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# ── Configuration prompts ───────────────────────────────────
step "OpenClaw VPS Setup"
echo "This script will install:"
echo "  1. Node.js 22 LTS"
echo "  2. Docker & Docker Compose"
echo "  3. OpenClaw (latest)"
echo "  4. Ollama (local LLM - optional)"
echo "  5. Nginx reverse proxy"
echo "  6. UFW firewall rules"
echo "  7. Fail2Ban"
echo ""

read -rp "Enter your domain name (or press Enter to skip SSL): " DOMAIN
DOMAIN="${DOMAIN:-}"

read -rp "Install Ollama for local LLM? (y/N): " INSTALL_OLLAMA
INSTALL_OLLAMA="${INSTALL_OLLAMA:-n}"

read -rp "Enter your Anthropic API key (or press Enter to skip): " ANTHROPIC_KEY
ANTHROPIC_KEY="${ANTHROPIC_KEY:-}"

read -rp "Enter your Telegram bot token (or press Enter to skip): " TELEGRAM_TOKEN
TELEGRAM_TOKEN="${TELEGRAM_TOKEN:-}"

# ── Step 1: System update ──────────────────────────────────
step "Step 1/8: Updating system packages"
apt update && apt upgrade -y
apt install -y \
    curl git wget unzip \
    software-properties-common \
    apt-transport-https \
    ca-certificates \
    gnupg lsb-release \
    build-essential
log "System packages updated"

# ── Step 2: Swap (if < 8GB RAM) ────────────────────────────
step "Step 2/8: Configuring swap"
TOTAL_RAM_MB=$(free -m | awk '/Mem:/{print $2}')
if [ "$TOTAL_RAM_MB" -lt 8000 ]; then
    if [ ! -f /swapfile ]; then
        info "RAM is ${TOTAL_RAM_MB}MB - creating 4GB swap"
        fallocate -l 4G /swapfile
        chmod 600 /swapfile
        mkswap /swapfile
        swapon /swapfile
        if ! grep -q '/swapfile' /etc/fstab; then
            echo '/swapfile none swap sw 0 0' >> /etc/fstab
        fi
        log "4GB swap created and enabled"
    else
        log "Swap already exists"
    fi
else
    log "RAM is ${TOTAL_RAM_MB}MB - swap not needed"
fi

# ── Step 3: Install Node.js 22 ─────────────────────────────
step "Step 3/8: Installing Node.js 22"
if command -v node &>/dev/null && node -v | grep -q 'v22'; then
    log "Node.js 22 already installed: $(node -v)"
else
    curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
    apt install -y nodejs
    log "Node.js installed: $(node -v)"
fi
log "npm version: $(npm -v)"

# ── Step 4: Install Docker ─────────────────────────────────
step "Step 4/8: Installing Docker"
if command -v docker &>/dev/null; then
    log "Docker already installed: $(docker --version)"
else
    curl -fsSL https://get.docker.com | sh
    systemctl enable docker
    systemctl start docker
    log "Docker installed: $(docker --version)"
fi

# ── Step 5: Firewall + Fail2Ban ─────────────────────────────
step "Step 5/8: Configuring firewall & security"
apt install -y ufw fail2ban

ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable
log "UFW firewall enabled (ports 22, 80, 443)"

# Configure Fail2Ban
if [ ! -f /etc/fail2ban/jail.local ]; then
    cat > /etc/fail2ban/jail.local <<'JAIL'
[DEFAULT]
bantime  = 3600
findtime = 600
maxretry = 5

[sshd]
enabled = true
port    = ssh
logpath = /var/log/auth.log
JAIL
    systemctl enable fail2ban
    systemctl restart fail2ban
    log "Fail2Ban configured and started"
else
    log "Fail2Ban already configured"
fi

# Disable password authentication for SSH
if grep -q "^PasswordAuthentication yes" /etc/ssh/sshd_config 2>/dev/null; then
    warn "Consider disabling SSH password auth: set PasswordAuthentication to 'no' in /etc/ssh/sshd_config"
fi

# ── Step 6: Install OpenClaw ───────────────────────────────
step "Step 6/8: Installing OpenClaw"
npm install -g openclaw@latest
log "OpenClaw installed: $(openclaw --version 2>/dev/null || echo 'latest')"

# Generate a secure auth token
GATEWAY_TOKEN=$(openssl rand -base64 32)
info "Generated gateway auth token"

# Create OpenClaw config directory
OPENCLAW_HOME="${HOME}/.openclaw"
mkdir -p "$OPENCLAW_HOME"

# Build the config
AGENT_MODEL="anthropic/claude-opus-4-6"
FALLBACK_MODELS='"anthropic/claude-sonnet-4-20250514"'

if [ "${INSTALL_OLLAMA,,}" = "y" ]; then
    FALLBACK_MODELS='"anthropic/claude-sonnet-4-20250514", "ollama/llama3.1:8b"'
fi

cat > "$OPENCLAW_HOME/openclaw.json" <<OCCONFIG
{
  "agent": {
    "model": "${AGENT_MODEL}",
    "fallbackModels": [${FALLBACK_MODELS}]
  },
  "gateway": {
    "bind": "loopback",
    "port": 3000,
    "auth": {
      "token": "${GATEWAY_TOKEN}"
    }
  },
  "channels": {
    "telegram": {
      "botToken": "${TELEGRAM_TOKEN}"
    }
  },
  "keys": {
    "ANTHROPIC_API_KEY": "${ANTHROPIC_KEY}"
  }
}
OCCONFIG
log "OpenClaw config written to ${OPENCLAW_HOME}/openclaw.json"

# Install OpenClaw daemon
openclaw onboard --install-daemon --non-interactive 2>/dev/null || {
    warn "Daemon install requires interactive onboarding. Run 'openclaw onboard --install-daemon' manually."
}

# ── Step 7: Docker Compose (Ollama) ────────────────────────
step "Step 7/8: Setting up Docker Compose services"
if [ "${INSTALL_OLLAMA,,}" = "y" ]; then
    cp "${SCRIPT_DIR}/docker-compose.yml" /opt/openclaw-docker-compose.yml 2>/dev/null || true
    if [ -f /opt/openclaw-docker-compose.yml ]; then
        cd /opt
        docker compose -f openclaw-docker-compose.yml up -d
        log "Ollama container started"

        info "Pulling llama3.2:3b model (lightweight starter)..."
        docker exec ollama ollama pull llama3.2:3b &
        PULL_PID=$!

        info "Model download running in background (PID: $PULL_PID)"
    else
        warn "docker-compose.yml not found. Skipping Ollama container setup."
    fi
else
    info "Skipping Ollama installation"
fi

# ── Step 8: Nginx reverse proxy ────────────────────────────
step "Step 8/8: Setting up Nginx"
apt install -y nginx

# Copy and configure nginx
if [ -f "${SCRIPT_DIR}/nginx.conf" ]; then
    cp "${SCRIPT_DIR}/nginx.conf" /etc/nginx/sites-available/openclaw

    if [ -n "$DOMAIN" ]; then
        sed -i "s/YOUR_DOMAIN/${DOMAIN}/g" /etc/nginx/sites-available/openclaw
    else
        # Use server IP for non-domain setups
        SERVER_IP=$(hostname -I | awk '{print $1}')
        sed -i "s/YOUR_DOMAIN/${SERVER_IP}/g" /etc/nginx/sites-available/openclaw
    fi

    ln -sf /etc/nginx/sites-available/openclaw /etc/nginx/sites-enabled/openclaw
    rm -f /etc/nginx/sites-enabled/default

    nginx -t && systemctl reload nginx
    log "Nginx configured and running"

    # SSL with Let's Encrypt
    if [ -n "$DOMAIN" ]; then
        apt install -y certbot python3-certbot-nginx
        info "Requesting SSL certificate for ${DOMAIN}..."
        certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos --email "admin@${DOMAIN}" || {
            warn "SSL setup failed. Run manually: certbot --nginx -d ${DOMAIN}"
        }
    else
        info "No domain provided - skipping SSL. Access via http://${SERVER_IP}"
    fi
else
    warn "nginx.conf not found in ${SCRIPT_DIR}. Skipping Nginx setup."
fi

# ── Start OpenClaw ──────────────────────────────────────────
step "Starting OpenClaw"
openclaw start 2>/dev/null || warn "Start OpenClaw manually: openclaw start"

# ── Summary ─────────────────────────────────────────────────
echo ""
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}  OpenClaw VPS Setup Complete!${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "  ${BLUE}Gateway Token:${NC}  ${GATEWAY_TOKEN}"
echo -e "  ${BLUE}Config File:${NC}    ${OPENCLAW_HOME}/openclaw.json"
echo ""
if [ -n "$DOMAIN" ]; then
    echo -e "  ${BLUE}Web Access:${NC}     https://${DOMAIN}"
else
    SERVER_IP=$(hostname -I | awk '{print $1}')
    echo -e "  ${BLUE}Web Access:${NC}     http://${SERVER_IP}"
fi
echo ""
echo -e "  ${BLUE}OpenClaw:${NC}       Port 3000 (internal)"
echo -e "  ${BLUE}Malik Agent:${NC}    Port 3100"
echo ""
echo -e "  ${YELLOW}Next Steps:${NC}"
echo -e "    1. Save your gateway token above"
echo -e "    2. Run ${CYAN}openclaw status${NC} to verify"
echo -e "    3. Set up Telegram: talk to @BotFather, get token, add to config"
echo -e "    4. Install Malik: cd /home/user/VTvideoYT && npm install && npm start"
echo ""
echo -e "  ${YELLOW}Useful Commands:${NC}"
echo -e "    openclaw status          # Check status"
echo -e "    openclaw logs --follow   # Follow logs"
echo -e "    openclaw config          # Edit config"
echo -e "    openclaw restart         # Restart daemon"
echo ""
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

# Save credentials to a file for reference
cat > "${OPENCLAW_HOME}/setup-credentials.txt" <<CREDS
OpenClaw Setup Credentials
Generated: $(date -u +"%Y-%m-%d %H:%M:%S UTC")
===================================
Gateway Token: ${GATEWAY_TOKEN}
Config: ${OPENCLAW_HOME}/openclaw.json
Domain: ${DOMAIN:-none}
Ollama: ${INSTALL_OLLAMA}
===================================
KEEP THIS FILE SECURE - DELETE AFTER SAVING CREDENTIALS
CREDS
chmod 600 "${OPENCLAW_HOME}/setup-credentials.txt"
info "Credentials saved to ${OPENCLAW_HOME}/setup-credentials.txt"
