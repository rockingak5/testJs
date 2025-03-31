#!/bin/sh
# echo "====== run migrate ======"
# npm run db:migrate

# echo "====== run seed ======"
# npm run db:seed

# Then exec the container's main process (what's set as CMD in the Dockerfile).
exec "$@"

