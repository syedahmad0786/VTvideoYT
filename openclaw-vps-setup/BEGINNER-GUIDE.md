# YOUR COMPLETE GUIDE: Get OpenClaw Running from Zero

This is your personal step-by-step guide. Follow it exactly.
You need: a phone, a computer, and 30 minutes.

---

## PART 1: Create Your Free VPS (Oracle Cloud) — 10 minutes

### Step 1: Sign up for Oracle Cloud

1. Open your browser and go to: **cloud.oracle.com**
2. Click **"Sign Up"** (top right)
3. Fill in:
   - **Country**: Your country
   - **Name**: Your real name
   - **Email**: Your email (use Gmail for easy verification)
   - **Password**: Make a strong one
4. **Verify your email** — check inbox, click the link
5. **Choose your Home Region** — pick the one closest to you:
   - Middle East: `Saudi Arabia West (Jeddah)` or `UAE East (Dubai)`
   - India: `India West (Mumbai)` or `India South (Hyderabad)`
   - US: `US East (Ashburn)` or `US West (Phoenix)`
   - Europe: `Germany Central (Frankfurt)` or `UK South (London)`
6. **Enter credit card** — You will NOT be charged. Oracle needs it for verification only.
   - They put a temporary $1 hold that disappears
   - Free tier is genuinely free forever
7. Click **"Start my free trial"**
8. Wait 2-5 minutes for your account to be ready

### Step 2: Create Your Server (Compute Instance)

1. After signup, you'll land on the **Oracle Cloud Dashboard**
2. Click the hamburger menu (☰) top left
3. Go to: **Compute** → **Instances**
4. Click **"Create Instance"**
5. Configure it like this:

| Setting | Value |
|---------|-------|
| **Name** | `openclaw-server` |
| **Image** | Click "Edit" → Select **Ubuntu 24.04** (Canonical) |
| **Shape** | Click "Change Shape" → **Ampere** tab → **VM.Standard.A1.Flex** |
| **OCPUs** | Drag slider to **4** |
| **Memory** | Drag slider to **24 GB** |
| **Boot Volume** | 100 GB (default is fine) |

6. **IMPORTANT — SSH Key**:
   - Select **"Generate a key pair"**
   - Click **"Save Private Key"** — this downloads a `.key` file
   - **SAVE THIS FILE** — you need it to connect to your server
   - Also click **"Save Public Key"** as backup

7. Under **Networking**:
   - Select "Create new virtual cloud network"
   - Select "Assign a public IPv4 address" ← CRITICAL

8. Click **"Create"**

9. **Wait 2-5 minutes** for the instance to show "RUNNING"

10. **Copy the Public IP Address** shown on the instance details page
    - It looks like: `129.154.xxx.xxx`
    - Write this down — this is your server's address

### Step 3: Open Firewall Ports in Oracle Cloud

Oracle has its OWN firewall on top of the server. You must open ports:

1. On the instance details page, click the **Subnet** link (under "Primary VNIC")
2. Click the **Default Security List**
3. Click **"Add Ingress Rules"**
4. Add these rules one by one:

| Source CIDR | Port | Description |
|-------------|------|-------------|
| `0.0.0.0/0` | `80` | HTTP |
| `0.0.0.0/0` | `443` | HTTPS |

5. Click **"Add Ingress Rules"** for each one

---

## PART 2: Connect to Your Server — 5 minutes

### On Mac/Linux:

Open Terminal and run:
```bash
# Fix the key file permissions
chmod 400 ~/Downloads/ssh-key-*.key

# Connect to your server
ssh -i ~/Downloads/ssh-key-*.key ubuntu@YOUR_IP_ADDRESS
```
Replace `YOUR_IP_ADDRESS` with the IP you copied in Step 2.10.

### On Windows:

1. Download **PuTTY** from putty.org
2. Or use **Windows Terminal** (built-in on Windows 11):
```bash
ssh -i C:\Users\YourName\Downloads\ssh-key-*.key ubuntu@YOUR_IP_ADDRESS
```

### First time connecting?
- It will ask "Are you sure you want to continue connecting?" → Type `yes`
- You should see: `ubuntu@openclaw-server:~$`
- **You're now inside your server!**

---

## PART 3: Install Everything — 10 minutes (one command)

Once you're connected to your server via SSH, run this:

```bash
# Switch to root (admin) mode
sudo -i

# Download and run the setup script
git clone https://github.com/syedahmad0786/VTvideoYT.git /opt/VTvideoYT
cd /opt/VTvideoYT/openclaw-vps-setup
chmod +x setup.sh
./setup.sh
```

### The script will ask you 4 questions:

1. **"Enter your domain name"** → Just press Enter to skip (you can add a domain later)
2. **"Install Ollama for local LLM?"** → Type `y` and press Enter (free local AI!)
3. **"Enter your Anthropic API key"** → Paste your key if you have one, or press Enter to skip
4. **"Enter your Telegram bot token"** → Press Enter for now (we'll set this up next)

### Then sit back and wait ~5 minutes. The script installs everything automatically.

When done, you'll see:
```
━━━ OpenClaw VPS Setup Complete! ━━━

  Gateway Token:  abc123... (SAVE THIS!)
  Web Access:     http://129.154.xxx.xxx
```

**Save the Gateway Token!** You'll need it.

---

## PART 4: Set Up Telegram Bot — 5 minutes

This lets you talk to your AI from Telegram on your phone.

### Step 1: Create a Telegram Bot

1. Open **Telegram** on your phone
2. Search for **@BotFather** (the official bot maker)
3. Send: `/newbot`
4. Give it a name: `My OpenClaw AI` (or whatever you want)
5. Give it a username: `myopenclaw_bot` (must end in `bot`)
6. **BotFather gives you a token** like: `7123456789:AAF...`
7. **Copy this token**

### Step 2: Add the Token to OpenClaw

Back in your server SSH terminal:
```bash
# Edit the config
nano ~/.openclaw/openclaw.json
```

Find the `"telegram"` section and paste your token:
```json
"telegram": {
    "botToken": "7123456789:AAF..."
}
```

Save the file: Press `Ctrl+O`, then `Enter`, then `Ctrl+X`

### Step 3: Restart OpenClaw

```bash
openclaw restart
```

### Step 4: Test It!

1. Open Telegram
2. Search for your bot by its username (e.g., `@myopenclaw_bot`)
3. Send: `Hello!`
4. Your AI should respond!

---

## PART 5: How It All Works

### What you just built:

```
YOUR PHONE (Telegram)
    │
    │  sends "What's the weather?"
    ▼
YOUR VPS (Oracle Cloud - 129.154.xxx.xxx)
    │
    ├── OpenClaw (receives your message)
    │       │
    │       ├── Sends to Claude API (if you added API key)
    │       │   OR
    │       ├── Sends to Ollama (local AI on your server, FREE)
    │       │
    │       └── Gets response, sends back to Telegram
    │
    ├── Ollama (runs AI models locally for free)
    │
    └── Nginx (handles web traffic securely)
```

### Web Interface

Open your browser and go to: `http://YOUR_IP_ADDRESS`
This is OpenClaw's web UI where you can also chat with your AI.

### What you can do with it:

| Feature | How |
|---------|-----|
| **Chat on Telegram** | Message your bot |
| **Chat on Web** | Go to `http://YOUR_IP_ADDRESS` |
| **Browse the web** | Ask "search for ..." and it can browse |
| **Schedule tasks** | Set up cron jobs via chat |
| **File management** | Upload/download files via chat |
| **Multiple users** | Share your bot with friends (they get pairing codes) |
| **Add more chat apps** | Slack, Discord, WhatsApp — add tokens to config |

### Useful Commands (run on your server via SSH):

```bash
# Check if everything is running
openclaw status

# See live logs (what your AI is doing)
openclaw logs --follow

# Restart if something breaks
openclaw restart

# See what AI models are installed
docker exec ollama ollama list

# Install a smarter model (8GB RAM needed)
docker exec ollama ollama pull llama3.1:8b

# Reboot the server safely
openclaw stop && docker compose -f /opt/openclaw-docker-compose.yml down
sudo reboot
```

---

## PART 6: Optional Upgrades

### Add a Custom Domain (free SSL)

1. Buy a domain (Namecheap, Cloudflare, GoDaddy etc.)
2. Point an A record to your VPS IP: `YOUR_IP_ADDRESS`
3. Run on your server:
```bash
sudo certbot --nginx -d yourdomain.com
```
Now access via `https://yourdomain.com`

### Add WhatsApp

Requires WhatsApp Business API setup. Add to `~/.openclaw/openclaw.json`:
```json
"channels": {
    "whatsapp": {
        "phoneNumberId": "YOUR_PHONE_ID",
        "accessToken": "YOUR_TOKEN"
    }
}
```

### Add Discord

1. Create a bot at discord.com/developers
2. Add to config:
```json
"channels": {
    "discord": {
        "botToken": "YOUR_DISCORD_BOT_TOKEN"
    }
}
```

### Make it Smarter (use Claude)

1. Get an API key at console.anthropic.com
2. Edit config:
```json
"keys": {
    "ANTHROPIC_API_KEY": "sk-ant-your-key-here"
}
```
3. `openclaw restart`

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| Can't SSH to server | Check your key file path, make sure IP is correct |
| "Connection refused" | Wait 5 min after creating instance, try again |
| Website doesn't load | Check Oracle ingress rules (Part 1, Step 3) |
| Telegram bot silent | Check `openclaw logs --follow` for errors |
| "Out of memory" | Use smaller models: `llama3.2:3b` instead of `8b` |
| Everything crashed | `sudo reboot`, then `openclaw start` |

---

## Monthly Cost: $0

- Oracle Cloud Free Tier: **$0/month** (forever)
- Ollama (local AI): **$0** (runs on your server)
- Telegram bot: **$0**
- Optional: Claude API: **~$10-30/month** (pay per use, much smarter)

---

## Summary

You now have:
- A free server running 24/7 in the cloud
- An AI assistant you can message from Telegram
- A web interface to chat with
- Local AI models running for free (Ollama)
- The option to connect Claude/GPT for smarter responses
- Full control — all data stays on YOUR server
