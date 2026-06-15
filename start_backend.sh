#!/bin/bash
cd /home/ryanrenjr/AI-Workspace/app/backend
exec /home/ryanrenjr/miniconda3/bin/python -m uvicorn main:app --host 127.0.0.1 --port 8008
