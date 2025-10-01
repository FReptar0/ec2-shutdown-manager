#!/bin/bash

# EC2 Shutdown Manager - Docker Setup Script

echo "[INFO] Building Docker image..."
docker build -t ec2-shutdown-manager .

echo ""
echo "[INFO] Stopping and removing existing container (if any)..."
docker stop ec2-manager 2>/dev/null || true
docker rm ec2-manager 2>/dev/null || true

echo ""
echo "[INFO] Starting container..."
docker run -d \
  --name ec2-manager \
  --env-file .env \
  -v "$(pwd)/src/config.json:/app/src/config.json:ro" \
  ec2-shutdown-manager

echo ""
echo "[SUCCESS] Container started successfully!"
echo ""
echo "Next steps:"
echo "1. Test the container manually:"
echo "   docker exec ec2-manager node /app/src/index.js --status"
echo ""
echo "2. Add cron job to your host machine:"
echo "   crontab -e"
echo ""
echo "   Then add this line (runs at 10 PM daily):"
echo "   0 22 * * * docker exec ec2-manager node /app/src/index.js >> /tmp/ec2-shutdown.log 2>&1"
echo ""
echo "3. Verify cron job:"
echo "   crontab -l"
echo ""
echo "Container logs:"
echo "   docker logs ec2-manager"
