#!/bin/bash

echo "Starting Trading Bot Proxy Servers..."
echo

echo "Starting Binance Proxy Server..."
gnome-terminal --title="Binance Proxy" -- bash -c "node binance-proxy.js; exec bash" &
sleep 2

echo "Starting Kraken Proxy Server..."
gnome-terminal --title="Kraken Proxy" -- bash -c "node kraken-proxy.js; exec bash" &
sleep 2

echo
echo "Both proxy servers are starting..."
echo
echo "Binance Proxy: http://localhost:3001"
echo "Kraken Proxy: http://localhost:3002"
echo
echo "Starting Python HTTP Server..."
gnome-terminal --title="Web Server" -- bash -c "python3 -m http.server 8000; exec bash" &

echo
echo "All servers started! Open http://localhost:8000 in your browser"
echo
read -p "Press Enter to continue..." 