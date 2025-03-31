#!/bin/bash

echo "Setting up Nginx as a reverse proxy for Lucky Spin Wheel..."

# Check if running as root
if [ "$EUID" -ne 0 ]; then
  echo "Please run this script as root or with sudo"
  exit 1
fi

# Install Nginx if not already installed
if ! command -v nginx &> /dev/null; then
    echo "Installing Nginx..."
    apt-get update
    apt-get install -y nginx
else
    echo "Nginx is already installed"
fi

# Get the domain name
read -p "Enter your domain name (e.g., example.com): " DOMAIN_NAME

# Create Nginx configuration
echo "Creating Nginx configuration..."
cat > /etc/nginx/sites-available/lucky-wheel <<EOF
server {
    listen 80;
    server_name ${DOMAIN_NAME} www.${DOMAIN_NAME};

    access_log /var/log/nginx/lucky-wheel-access.log;
    error_log /var/log/nginx/lucky-wheel-error.log;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }

    # Enable gzip compression to improve performance
    gzip on;
    gzip_comp_level 5;
    gzip_min_length 256;
    gzip_proxied any;
    gzip_vary on;
    gzip_types
        application/javascript
        application/json
        application/x-javascript
        application/xml
        application/xml+rss
        image/svg+xml
        text/css
        text/javascript
        text/plain
        text/xml;

    # Configure caching for static assets
    location ~* \\.(jpg|jpeg|png|gif|ico|css|js|woff|woff2|ttf|svg)\$ {
        proxy_pass http://localhost:3000;
        expires 30d;
        add_header Cache-Control "public, no-transform";
    }
}
EOF

# Enable the site by creating a symbolic link
echo "Enabling the site..."
ln -sf /etc/nginx/sites-available/lucky-wheel /etc/nginx/sites-enabled/

# Remove default site if it exists
if [ -f /etc/nginx/sites-enabled/default ]; then
    echo "Removing default site..."
    rm /etc/nginx/sites-enabled/default
fi

# Test Nginx configuration
echo "Testing Nginx configuration..."
nginx -t

if [ $? -eq 0 ]; then
    # Restart Nginx to apply changes
    echo "Restarting Nginx..."
    systemctl restart nginx
    
    echo "✅ Nginx setup complete!"
    echo "Your Lucky Spin Wheel application should now be accessible at http://${DOMAIN_NAME}"
    
    # Offer to set up SSL with Certbot
    read -p "Do you want to set up SSL with Let's Encrypt? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        # Install Certbot
        echo "Installing Certbot..."
        apt-get install -y certbot python3-certbot-nginx
        
        # Run Certbot to obtain certificate and update Nginx config
        echo "Obtaining SSL certificate..."
        certbot --nginx -d ${DOMAIN_NAME} -d www.${DOMAIN_NAME}
        
        echo "✅ SSL setup complete!"
        echo "Your Lucky Spin Wheel application should now be accessible at https://${DOMAIN_NAME}"
    fi
else
    echo "❌ Nginx configuration test failed. Please check the error messages above."
fi 