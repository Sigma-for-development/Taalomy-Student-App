#!/bin/bash

# Update IP address script for Frontend (Student App)
# Usage: ./update-ip.sh <new_ip_address>

if [ $# -eq 0 ]; then
    echo "❌ Please provide the new IP address"
    echo "Usage: ./update-ip.sh <new_ip_address>"
    echo "Example: ./update-ip.sh 192.168.100.246"
    exit 1
fi

NEW_IP=$1
CONFIG_ENV=".env"
DJANGO_SETTINGS="../Backend/AppX/AppX/settings.py"

echo "Updating IP address to: $NEW_IP"

# Update the .env file (Robustly handling protocol or existing value)
if [ -f "$CONFIG_ENV" ]; then
    # File exists, update specific lines only to preserve other secrets (like Google Keys)
    sed -i '' "s|EXPO_PUBLIC_ACCOUNTS_BASE_URL=.*|EXPO_PUBLIC_ACCOUNTS_BASE_URL=http://$NEW_IP:8000/accounts/|g" "$CONFIG_ENV"
    sed -i '' "s|EXPO_PUBLIC_CHAT_BASE_URL=.*|EXPO_PUBLIC_CHAT_BASE_URL=http://$NEW_IP:8000/|g" "$CONFIG_ENV"
else
    # File doesn't exist, create it with all required defaults
    cat > "$CONFIG_ENV" <<EOL
EXPO_PUBLIC_ACCOUNTS_BASE_URL=http://$NEW_IP:8000/accounts/
EXPO_PUBLIC_CHAT_BASE_URL=http://$NEW_IP:8000/
EXPO_PUBLIC_TIMEOUT=30000
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=304743502649-10ogp7no6nogl8m71327946pl62ca04r.apps.googleusercontent.com
EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID=304743502649-10ogp7no6nogl8m71327946pl62ca04r.apps.googleusercontent.com
EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=1036061781154-80sdsma4sl3832o25f079rmh24dg2a26.apps.googleusercontent.com
EOL
fi

# Update Django ALLOWED_HOSTS
sed -i '' "s/ALLOWED_HOSTS = .*/ALLOWED_HOSTS = ['localhost', '127.0.0.1', '$NEW_IP']/" "$DJANGO_SETTINGS" || echo "Note: Could not auto-update ALLOWED_HOSTS in settings.py (pattern match failed). Please update manually."

echo "✅ IP address updated successfully in:"
echo "   📱 Frontend config: $CONFIG_ENV"
echo "   🐍 Django settings: (Attempted update)"
echo ""
echo "📱 All API endpoints will now use: http://$NEW_IP:8000"
echo ""
echo "🔄 Please restart both Django server and React Native app for changes to take effect"
