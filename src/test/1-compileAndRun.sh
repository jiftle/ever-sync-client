#!/bin/bash
# -----------------------------------------------------------------
# FileName: 1-compileAndRun.sh
# Date: 2020-10-29
# Author: jiftle
# Description: 
# -----------------------------------------------------------------
rm index.js

tsc index.ts

ls  -lh |grep .js
node index.js
