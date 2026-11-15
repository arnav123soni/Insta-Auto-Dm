#!/bin/bash
# ==============================================================================
# OpenReply (Insta AutoDm) - Fresh Oracle Cloud VM Initializer
# Run this script on a newly created Ubuntu / Debian Oracle Cloud VM
# Usage: curl -sSL <raw-url> | bash   OR   bash scripts/init-fresh-vm.sh
# ==============================================================================

set -e

echo "=========================================================="
echo "  Preparing Fresh Oracle Cloud VM for Insta AutoDm"
echo "=========================================================="

# 1. Update OS Packages
echo "==> [1/5] Updating system packages..."
sudo apt-get update -y && sudo apt-get upgrade -y

# 2. Setup 4GB Swapfile (Prevents Out-Of-Memory during Next.js build)
echo "==> [2/5] Configuring 4GB Swap space..."
if [ ! -f /swapfile ]; then
  sudo fallocate -l 4G /swapfile
  sudo chmod 600 /swapfile
  sudo mkswap /swapfile
  sudo swapon /swapfile
  echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
  echo "Swapfile created and activated successfully."
else
  echo "Swapfile already exists."
fi

# 3. Open Firewall Ports (80, 443, 3000)
echo "==> [3/5] Configuring firewall rules (IPTables & UFW)..."
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 80 -j ACCEPT || true
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 443 -j ACCEPT || true
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 3000 -j ACCEPT || true
if command -v netfilter-persistent &> /dev/null; then
  sudo netfilter-persistent save || true
fi
if command -v ufw &> /dev/null; then
  sudo ufw allow 80/tcp || true
  sudo ufw allow 443/tcp || true
  sudo ufw allow 3000/tcp || true
fi

# 4. Install Docker & Docker Compose
echo "==> [4/5] Installing Docker Engine & Docker Compose..."
if ! command -v docker &> /dev/null; then
  sudo apt-get install -y ca-certificates curl gnupg lsb-release git nginx certbot python3-certbot-nginx
  sudo install -m 0755 -d /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
  sudo chmod a+r /etc/apt/keyrings/docker.gpg
  echo \
    "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
    $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
  sudo apt-get update -y
  sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
  sudo usermod -aG docker $USER
  echo "Docker installed successfully."
else
  echo "Docker is already installed."
fi

# 5. Clone Repository
echo "==> [5/5] Cloning Insta AutoDm..."
mkdir -p ~/apps
cd ~/apps
if [ ! -d "Insta-Auto-Dm" ]; then
  git clone https://github.com/arnav123soni/Insta-Auto-Dm.git
fi
cd Insta-Auto-Dm

if [ ! -f .env ]; then
  cp .env.example .env
  # Generate random production secrets
  RAND_SECRET=$(openssl rand -hex 32)
  RAND_ENC=$(openssl rand -hex 32)
  sed -i "s/replace-with-a-strong-random-secret/$RAND_SECRET/g" .env
  sed -i "s/0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef/$RAND_ENC/g" .env
  echo "Created .env with auto-generated NEXTAUTH_SECRET and ENCRYPTION_KEY."
fi

echo "=========================================================="
echo "  Setup Complete! Next Steps:"
echo "=========================================================="
echo "1. cd ~/apps/Insta-Auto-Dm"
echo "2. Edit .env with your domain & Meta credentials: nano .env"
echo "3. Start the containers:"
echo "   docker compose up -d --build"
echo "=========================================================="
