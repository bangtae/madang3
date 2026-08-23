#!/bin/bash
echo "Installing dependencies and updating PORTAL BANG..."
apt-get update -y
apt-get install -y unzip nodejs npm curl iptables

# Redirect standard HTTP port 80 to Node.js 8080 port
iptables -t nat -A PREROUTING -p tcp --dport 80 -j REDIRECT --to-port 8080 || true

mkdir -p /var/www/portal_bang
gsutil cp gs://madang2-trans-portal-storage/portal_bang_deploy.zip /tmp/portal_bang_deploy.zip
unzip -o /tmp/portal_bang_deploy.zip -d /var/www/portal_bang/
cd /var/www/portal_bang
npm install --only=production
npm install -g pm2
pm2 stop all || true
pm2 start server.js --name portal-bang
pm2 save
