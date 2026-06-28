#!/bin/bash
cd "$(dirname "$0")"

ssh -o StrictHostKeyChecking=accept-new -o ServerAliveInterval=60 \
  -R vixflix:80:localhost:3000 serveo.net &

npm run start
