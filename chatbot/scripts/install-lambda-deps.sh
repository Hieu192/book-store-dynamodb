#!/bin/bash
# ============================================================================
# Install Lambda Dependencies
# ============================================================================
# Run this before terraform apply to install node_modules for each function

set -e

echo "📦 Installing Lambda dependencies..."

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Base directory
BASE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LAMBDA_DIR="$BASE_DIR/lambda"

# Install dependencies for each function
for func in connect disconnect send-message upload-document; do
    echo -e "${BLUE}Installing dependencies for $func...${NC}"
    cd "$LAMBDA_DIR/$func"
    
    if [ -f "package.json" ]; then
        npm install --production
        echo -e "${GREEN}✅ $func dependencies installed${NC}"
    else
        echo "⚠️  No package.json found for $func"
    fi
done

echo -e "${GREEN}✅ All Lambda dependencies installed!${NC}"
echo ""
echo "Next steps:"
echo "1. cd ../../infrastructure/terraform"
echo "2. terraform init"
echo "3. terraform plan"
echo "4. terraform apply"
