#!/bin/bash
set -e

# Install all dependencies (yfinance removed from requirements.txt)
pip install -r requirements.txt

# Install yfinance without curl_cffi — falls back to requests
pip install --no-deps yfinance==1.4.1

# Force websockets>=13 (yfinance needs it, supabase's realtime pins <13)
pip install "websockets>=13.0" --force-reinstall --no-deps
