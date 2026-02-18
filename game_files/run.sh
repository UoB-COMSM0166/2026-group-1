#!/bin/bash


# Check if we're in the correct directory
if [ ! -f "index.html" ]; then
    echo -e "${RED}Error: index.html not found. Please run this script from the game_files directory.${NC}"
    exit 1
fi

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Try to start a local server
echo -e "${YELLOW}Starting local development server...${NC}\n"

# Option 1: Try python3
if command_exists python3; then
    echo -e "${GREEN}✓ Using Python 3 http.server${NC}"
    echo -e "${YELLOW}Game running at: http://localhost:8000${NC}\n"
    echo -e "Press ${GREEN}Ctrl+C${NC} to stop the server\n"
    python3 -m http.server 8000

# Option 2: Try python (Python 2)
elif command_exists python; then
    echo -e "${GREEN}✓ Using Python 2 SimpleHTTPServer${NC}"
    echo -e "${YELLOW}Game running at: http://localhost:8000${NC}\n"
    echo -e "Press ${GREEN}Ctrl+C${NC} to stop the server\n"
    python -m SimpleHTTPServer 8000

else
    echo -e "${RED}Error: No suitable HTTP server found!${NC}"
    echo -e "\nPlease install one of the following:"
    echo -e "  • Python 3: ${YELLOW}brew install python3${NC}"
    echo -e "  • Node.js: ${YELLOW}brew install node${NC}"
    echo -e "  • PHP: ${YELLOW}brew install php${NC}"
    exit 1
fi