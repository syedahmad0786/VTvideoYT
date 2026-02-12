# OpenClaw VPS Setup Guide

Complete guide to install and run **OpenClaw** (v2026.2.9) on a VPS alongside the Malik Zaid agent.

## What is OpenClaw?

OpenClaw is an open-source, self-hosted personal AI assistant that:
- Runs on your own infrastructure (VPS, cloud, or local machine)
- Connects to messaging apps: WhatsApp, Telegram, Slack, Discord, Signal, iMessage, Teams
- Supports any LLM: Claude, GPT, Llama, Qwen, Gemma (local via Ollama or hosted APIs)
- Provides a web UI, voice mode, browser control, cron jobs, and webhooks
- Has a skill/plugin system for extensibility

## Architecture Overview

```
┌─────────────────────────────────────────────────────┐
│                      YOUR VPS                        │
│                                                      │
│  ┌──────────┐    ┌──────────┐    ┌───────────────┐  │
│  │  Nginx   │───▶│ OpenClaw │───▶│  Ollama       │  │
│  │ (HTTPS)  │    │ Gateway  │    │ (Local LLM)   │  │
│  │ :80/:443 │    │  :3000   │    │  :11434       │  │
│  └──────────┘    └──────────┘    └───────────────┘  │
│       │                │                             │
│       │          ┌─────┴──────┐                      │
│       │          │  Channels  │                      │
│       │          │ Telegram   │                      │
│       │          │ WhatsApp   │                      │
│       │          │ Discord    │                      │
│       │          │ Slack      │                      │
│       │          └────────────┘                      │
│       │                                              │
│  ┌────┴─────┐    ┌────────────┐                      │
│  │  Malik   │───▶│  Turso/    │                      │
│  │  Agent   │    │  SQLite    │                      │
│  │  :3100   │    │  Database  │                      │
│  └──────────┘    └────────────┘                      │
│                                                      │
└─────────────────────────────────────────────────────┘
```

## System Requirements

| Resource | Minimum | Recommended |
|----------|---------|-------------|
| CPU      | 2 cores | 4+ cores (ARM or x86) |
| RAM      | 4 GB    | 8-16 GB (24 GB if running local LLMs) |
| Storage  | 20 GB   | 50-100 GB |
| OS       | Ubuntu 22.04+ | Ubuntu 24.04 LTS |
| Node.js  | v22+    | v22 LTS |

## Quick Start (5 minutes)

```bash
# 1. SSH into your VPS
ssh root@your-vps-ip

# 2. Clone this repo and run the setup script
git clone https://github.com/syedahmad0786/VTvideoYT.git
cd VTvideoYT/openclaw-vps-setup

# 3. Run the automated setup
chmod +x setup.sh
./setup.sh
```

The script will:
1. Update system packages
2. Install Node.js 22, Docker, Docker Compose, Nginx
3. Configure firewall (UFW)
4. Install OpenClaw globally
5. Set up Docker Compose with Ollama (optional local LLM)
6. Configure Nginx reverse proxy with SSL
7. Pull a starter AI model
8. Start all services

## Manual Setup (Step by Step)

### Step 1: Server Preparation

```bash
# Update system
apt update && apt upgrade -y

# Install essentials
apt install -y curl git wget unzip software-properties-common

# Set up swap (if < 8GB RAM)
fallocate -l 4G /swapfile
chmod 600 /swapfile
mkswap /swapfile
swapon /swapfile
echo '/swapfile none swap sw 0 0' >> /etc/fstab
```

### Step 2: Install Node.js 22

```bash
curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
apt install -y nodejs
node -v  # Should show v22.x
```

### Step 3: Install Docker & Docker Compose

```bash
# Docker
curl -fsSL https://get.docker.com | sh
systemctl enable docker
systemctl start docker

# Verify
docker --version
docker compose version
```

### Step 4: Configure Firewall

```bash
ufw allow 22/tcp    # SSH
ufw allow 80/tcp    # HTTP
ufw allow 443/tcp   # HTTPS
ufw --force enable
ufw status
```

### Step 5: Install OpenClaw

```bash
npm install -g openclaw@latest
openclaw onboard --install-daemon
```

This launches the onboarding wizard which will:
- Create `~/.openclaw/openclaw.json` config
- Set up the Gateway daemon (systemd service)
- Prompt you for your LLM provider choice

### Step 6: Configure OpenClaw

Edit `~/.openclaw/openclaw.json`:

```json
{
  "agent": {
    "model": "anthropic/claude-opus-4-6",
    "fallbackModels": ["anthropic/claude-sonnet-4-20250514", "ollama/llama3.1:8b"]
  },
  "gateway": {
    "bind": "loopback",
    "port": 3000,
    "auth": {
      "token": "YOUR_SECURE_TOKEN_HERE"
    }
  },
  "channels": {
    "telegram": {
      "botToken": "YOUR_TELEGRAM_BOT_TOKEN"
    }
  },
  "keys": {
    "ANTHROPIC_API_KEY": "sk-ant-xxxxx"
  }
}
```

### Step 7: Docker Compose (Optional - for Ollama local LLM)

```bash
cd /home/user/VTvideoYT/openclaw-vps-setup
docker compose up -d
```

### Step 8: Nginx + SSL

```bash
apt install -y nginx certbot python3-certbot-nginx

# Copy nginx config
cp nginx.conf /etc/nginx/sites-available/openclaw
ln -s /etc/nginx/sites-available/openclaw /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# Edit the config - replace YOUR_DOMAIN with your actual domain
sed -i 's/YOUR_DOMAIN/yourdomain.com/g' /etc/nginx/sites-available/openclaw

# Test & reload
nginx -t
systemctl reload nginx

# Get SSL certificate
certbot --nginx -d yourdomain.com
```

### Step 9: Pull AI Models (if using Ollama)

```bash
# Lightweight model for testing
docker exec ollama ollama pull llama3.2:3b

# Recommended general-purpose model
docker exec ollama ollama pull llama3.1:8b

# Multilingual model
docker exec ollama ollama pull qwen2.5:7b
```

### Step 10: Start Everything

```bash
# Start OpenClaw daemon
openclaw start

# Check status
openclaw status

# View logs
openclaw logs --follow
```

## How OpenClaw Works

### Communication Flow

```
User sends message on Telegram/WhatsApp/Discord
        │
        ▼
┌─────────────────┐
│ OpenClaw Gateway │  ← Receives message via channel plugin
│   (Port 3000)   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   Agent Engine   │  ← Processes with context, memory, tools
│                  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   LLM Provider   │  ← Claude API / Ollama / OpenAI
│                  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Tool Execution  │  ← Browser, files, cron, webhooks, skills
│                  │
└────────┬────────┘
         │
         ▼
Response sent back to user on the same channel
```

### Key Features in Action

1. **Multi-Channel Messaging**: Talk to your AI through WhatsApp, Telegram, Slack, Discord, or the web UI
2. **Voice Mode**: Speak to it with wake words (uses ElevenLabs for TTS)
3. **Browser Control**: It can browse the web, fill forms, take screenshots
4. **File Management**: Upload, download, organize files on your VPS
5. **Cron Jobs**: Schedule recurring tasks (e.g., daily summaries, email checks)
6. **Webhooks**: Trigger actions from external services
7. **Skills/Plugins**: Install community skills from ClawHub or write your own

### Chat Commands

| Command | Description |
|---------|-------------|
| `/status` | Show agent status and uptime |
| `/reset` | Reset conversation context |
| `/think` | Toggle chain-of-thought visibility |
| `/verbose` | Toggle verbose logging |
| `/usage` | Show token usage stats |
| `/pair` | Pair a new device |

### Security Model

- **DM Protection**: Unknown senders get pairing codes before they can interact
- **Sandbox Mode**: Non-main sessions run in Docker containers
- **Gateway Auth**: Token or password authentication for API access
- **Loopback Binding**: Default binds to localhost only - access via SSH tunnel or Tailscale

## Integrating with Malik Agent

Both OpenClaw and Malik can run on the same VPS. OpenClaw handles the messaging channels and AI interactions, while Malik handles executive assistant workflows.

**Ports:**
- OpenClaw Gateway: `3000`
- Malik API: `3100`
- Malik Portal: `5173` (dev) or served via Malik API in production
- Ollama: `11434` (internal only)
- Nginx: `80/443` (public)

## Troubleshooting

| Issue | Solution |
|-------|----------|
| `openclaw: command not found` | Run `npm install -g openclaw@latest` again |
| Port 3000 already in use | Check with `lsof -i :3000` and kill the process |
| Ollama out of memory | Use smaller models (`llama3.2:3b`) or add more swap |
| SSL certificate errors | Run `certbot renew` or check domain DNS |
| Telegram bot not responding | Verify bot token in `openclaw.json` |
| Gateway unreachable | Check `ufw status` and ensure ports are open |

## Useful Commands

```bash
# OpenClaw
openclaw start              # Start daemon
openclaw stop               # Stop daemon
openclaw restart             # Restart daemon
openclaw status              # Check status
openclaw logs --follow       # Follow logs
openclaw config              # Edit config interactively

# Docker (Ollama)
docker compose logs -f       # Follow all container logs
docker exec ollama ollama list     # List installed models
docker exec ollama ollama pull MODEL  # Download a model
docker compose restart       # Restart containers

# Nginx
nginx -t                     # Test config
systemctl reload nginx       # Apply config changes
certbot renew               # Renew SSL certificates
```

## Sources & References

- [OpenClaw Official Docs](https://docs.openclaw.ai/vps)
- [OpenClaw GitHub](https://github.com/openclaw/openclaw)
- [Self-Host Guide (Cognio Labs)](https://cognio.so/clawdbot/self-hosting)
- [5-Minute Setup Guide](https://openclawagi.com/install-openclaw-in-5-minutes-fast-secure-setup-guide-2026/)
- [Hostinger VPS Guide](https://www.hostinger.com/support/how-to-install-openclaw-on-hostinger-vps/)
- [DigitalOcean Guide](https://www.digitalocean.com/community/tutorials/how-to-run-openclaw)
