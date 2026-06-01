#!/bin/bash
set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${CYAN}========================================${NC}"
echo -e "${CYAN}    VixFlix - Installation Wizard       ${NC}"
echo -e "${CYAN}========================================${NC}"
echo ""

# --- Step 1: Check Node.js ---
echo -e "${YELLOW}[1/5] Checking Node.js...${NC}"
if command -v node &>/dev/null; then
  NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
  if [ "$NODE_VERSION" -ge 22 ]; then
    echo -e "  ${GREEN}Node.js $(node -v) found${NC}"
  else
    echo -e "  ${RED}Node.js $(node -v) is too old (need 22+).${NC}"
    read -p "  Install Node.js 22? (y/n) " yn
    if [ "$yn" = "y" ]; then
      curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
      sudo apt install -y nodejs
    else
      echo -e "${RED}Aborted.${NC}"; exit 1
    fi
  fi
else
  echo -e "  ${RED}Node.js not found.${NC}"
  read -p "  Install Node.js 22? (y/n) " yn
  if [ "$yn" = "y" ]; then
    curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
    sudo apt install -y nodejs
  else
    echo -e "${RED}Aborted.${NC}"; exit 1
  fi
fi

# --- Step 2: Check npm ---
echo -e "${YELLOW}[2/5] Checking npm...${NC}"
if command -v npm &>/dev/null; then
  echo -e "  ${GREEN}npm $(npm -v) found${NC}"
else
  echo -e "  ${RED}npm not found. Please install Node.js first.${NC}"
  exit 1
fi

# --- Step 3: TMDB API Key ---
echo ""
echo -e "${YELLOW}[3/5] TMDB API Key${NC}"
echo -e "  Get your free key at: https://www.themoviedb.org/settings/api"
echo -e "  Use an Access Token (v4), not an API key (v3)."
echo ""
read -p "  Paste your TMDB Access Token: " TMDB_KEY
if [ -z "$TMDB_KEY" ]; then
  echo -e "${RED}  No key provided. You can add it later in backend/.env${NC}"
  TMDB_KEY=""
fi

# --- Step 4: Install dependencies ---
echo ""
echo -e "${YELLOW}[4/5] Installing dependencies...${NC}"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

npm install
echo -e "  ${GREEN}Root dependencies installed${NC}"

cd backend && npm install && cd ..
echo -e "  ${GREEN}Backend dependencies installed${NC}"

cd frontend && npm install && cd ..
echo -e "  ${GREEN}Frontend dependencies installed${NC}"

# --- Step 4b: Write .env ---
if [ -n "$TMDB_KEY" ]; then
  cat > backend/.env << EOF
PORT=3000
JWT_SECRET=$(openssl rand -hex 16)
DATABASE_URL=./sqlite.db
TMDB_API_KEY=$TMDB_KEY
EOF
  echo -e "  ${GREEN}backend/.env created${NC}"
else
  cat > backend/.env << EOF
PORT=3000
JWT_SECRET=$(openssl rand -hex 16)
DATABASE_URL=./sqlite.db
TMDB_API_KEY=
EOF
  echo -e "  ${YELLOW}backend/.env created (edit to add TMDB_API_KEY)${NC}"
fi

# --- Step 5: Start ---
echo ""
echo -e "${YELLOW}[5/5] Ready!${NC}"
read -p "  Start VixFlix now? (y/n) " yn
if [ "$yn" = "y" ]; then
  echo -e "${GREEN}Starting VixFlix...${NC}"
  npm run dev
else
  echo -e "  Run ${CYAN}./start.sh${NC} to start later."
fi
