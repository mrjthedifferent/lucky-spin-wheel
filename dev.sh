#!/bin/bash

echo "🚀 Reverting to development mode for Lucky Spin Wheel..."

# Stop PM2 process if running
if command -v pm2 &> /dev/null && pm2 list | grep -q "lucky-spin-wheel"; then
    echo "🛑 Stopping PM2 process..."
    pm2 stop lucky-spin-wheel
    
    read -p "Do you want to delete the PM2 process completely? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        pm2 delete lucky-spin-wheel
        echo "✅ PM2 process deleted."
    fi
fi

# Update HTML to use non-minified files
echo "🔄 Updating HTML to use non-minified files..."
# Create a new index.html with the correct file references
cat index.html | 
  awk '{
    if ($0 ~ /<link rel="stylesheet" href="style.min.css">/) {
      print "<!-- <link rel=\"stylesheet\" href=\"style.min.css\"> -->"
    } 
    else if ($0 ~ /<!-- <link rel="stylesheet" href="style.css">/) {
      print "<link rel=\"stylesheet\" href=\"style.css\">"
    }
    else if ($0 ~ /<script src="script.min.js">/) {
      print "<!-- <script src=\"script.min.js\"></script> -->"
    }
    else if ($0 ~ /<!-- <script src="script.js">/) {
      print "<script src=\"script.js\"></script>"
    }
    else {
      print $0
    }
  }' > index.html.new

# Replace the original file with the new one
mv index.html.new index.html

# Update production mode flag in server.js
echo "🔓 Setting development mode flags..."
sed -i.bak 's/const PRODUCTION_MODE = true;/const PRODUCTION_MODE = false;/' server.js
sed -i.bak 's/const PRODUCTION_MODE = process.env.NODE_ENV === .production. || true;/const PRODUCTION_MODE = false;/' server.js
rm server.js.bak

# Set development mode in script.js if not already set
if grep -q "PRODUCTION_MODE = true" script.js; then
    sed -i.bak 's/PRODUCTION_MODE = true/PRODUCTION_MODE = false/' script.js
    rm script.js.bak
fi

echo "✅ Development mode restored!"
echo "🛠️ You can now run: npm run dev" 