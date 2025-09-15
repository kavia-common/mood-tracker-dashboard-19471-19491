#!/bin/bash
cd /home/kavia/workspace/code-generation/mood-tracker-dashboard-19471-19491/frontend_react
npm run build
EXIT_CODE=$?
if [ $EXIT_CODE -ne 0 ]; then
   exit 1
fi

