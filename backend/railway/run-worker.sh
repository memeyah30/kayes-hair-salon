#!/usr/bin/env bash

set -euo pipefail

php artisan queue:work --verbose --tries=3 --timeout=120 --sleep=3 --max-time=3600
