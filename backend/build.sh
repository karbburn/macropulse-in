#!/bin/bash
set -e

# Install all dependencies except yfinance (which pulls in curl_cffi that fails to compile)
grep -v "^yfinance" requirements.txt | pip install -r /dev/stdin

# Install yfinance without curl_cffi — falls back to requests
pip install --no-deps yfinance==1.4.1
