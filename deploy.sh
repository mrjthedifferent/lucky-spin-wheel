#!/bin/bash

echo "🚀 Starting deployment process for Lucky Spin Wheel..."

# Check if PM2 is installed globally
if ! command -v pm2 &> /dev/null; then
    echo "🔧 Installing PM2 globally..."
    npm install -g pm2
fi

# Install dependencies if not already installed
echo "📦 Installing dependencies..."
npm install

# Rebuild SQLite3 for the current environment to prevent ELF header issues
echo "🔄 Rebuilding SQLite3 for this environment..."
npm rebuild sqlite3

# Build minified assets
echo "🔧 Building minified assets..."
npm run build

# Update HTML to use minified files
echo "🔄 Updating HTML to use minified files..."
# Use double quotes for sed pattern to allow proper handling of special characters
sed -i.bak "s/<!-- <link rel=\"stylesheet\" href=\"style.min.css\"> -->/<link rel=\"stylesheet\" href=\"style.min.css\">/" index.html
sed -i.bak "s/<link rel=\"stylesheet\" href=\"style.css\">/<!-- <link rel=\"stylesheet\" href=\"style.css\"> -->/" index.html
sed -i.bak "s/<!-- <script src=\"script.min.js\"><\/script> -->/<script src=\"script.min.js\"><\/script>/" index.html
sed -i.bak "s/<script src=\"script.js\">/<!-- <script src=\"script.js\"> -->/" index.html

# Remove backup files
rm index.html.bak

# Update production mode flag in server.js
echo "🔒 Setting production mode flags..."
sed -i.bak 's/const PRODUCTION_MODE = false;/const PRODUCTION_MODE = true;/' server.js
rm server.js.bak

# Set production mode in script.js if not already set
if grep -q "PRODUCTION_MODE = false" script.js; then
    sed -i.bak 's/PRODUCTION_MODE = false/PRODUCTION_MODE = true/' script.js
    rm script.js.bak
fi

# Start or reload the application with PM2
if pm2 list | grep -q "lucky-spin-wheel"; then
    echo "🔄 Reloading application with PM2..."
    pm2 reload lucky-spin-wheel
else
    echo "▶️ Starting application with PM2..."
    pm2 start ecosystem.config.js --env production
fi

echo "📊 PM2 process status:"
pm2 status

echo "✅ Deployment complete! The application is running with PM2."
echo "🔍 Monitor your application with: pm2 monit"
echo "📜 View logs with: pm2 logs lucky-spin-wheel" 