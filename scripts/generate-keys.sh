#!/bin/bash
echo "JWT_SECRET=$(openssl rand -base64 32)"
echo "SYSTEM_CONFIG_AES_KEY=$(openssl rand -hex 32)"
