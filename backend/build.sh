#!/bin/bash
set -e

# Install all dependencies except yfinance (which pulls in curl_cffi that fails to compile)
grep -v "^yfinance" requirements.txt > /tmp/reqs.txt
pip install -r /tmp/reqs.txt

# Install yfinance without curl_cffi — falls back to requests
pip install --no-deps yfinance==1.4.1
