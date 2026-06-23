#!/bin/bash
set -e

# Install all dependencies (yfinance removed from requirements.txt)
pip install -r requirements.txt

# Install yfinance without curl_cffi — falls back to requests
pip install --no-deps yfinance==1.4.1
