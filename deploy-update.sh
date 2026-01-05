#!/bin/bash
# Script de déploiement de la mise à jour invoice counter

echo "📦 Copie du fichier modifié vers le VPS..."
scp app/api/generate-invoice/route.ts max@34.155.142.195:~/gestion-heures-app/app/api/generate-invoice/

echo "🔄 Redémarrage du container Docker..."
ssh max@34.155.142.195 << 'ENDSSH'
cd ~/gestion-heures-app
docker stop gestion-heures-app
docker rm gestion-heures-app
docker build -t gestion-heures-app .
docker run -d --name gestion-heures-app -p 3000:3000 \
  -e NEXT_PUBLIC_SUPABASE_URL=https://nlbwixesclswvjpjsqyp.supabase.co \
  -e NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5sYndpeGVzY2xzd3ZqcGpzcXlwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mjk1MTc0NDIsImV4cCI6MjA0NTA5MzQ0Mn0.KcjJx7vLlEp_cVmP7L7G8yyO5oeQj3lZ7z_u01Zfkl0 \
  --restart unless-stopped \
  gestion-heures-app

echo "✅ Container démarré!"
docker logs --tail 20 gestion-heures-app
ENDSSH

echo "🎉 Déploiement terminé!"
