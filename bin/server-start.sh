#!/bin/bash
set -ex

npm run drizzle:apply
node ./dist/app.js