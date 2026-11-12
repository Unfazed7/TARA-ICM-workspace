#!/usr/bin/env bash
# Usage: ./make-admin.sh user@example.com   (run in /opt/tara on the server)
# Promotes a registered user to the admin role. Registration only creates analysts.
set -euo pipefail
[ $# -eq 1 ] || { echo "usage: $0 <email>"; exit 1; }
cd /opt/tara
docker compose exec -T -e TARGET="$1" api python -c "
import os
from checkpoint_api.database import SessionLocal
from checkpoint_api.models import User
db = SessionLocal()
u = db.query(User).filter(User.email == os.environ['TARGET']).first()
if not u: raise SystemExit('no such user: ' + os.environ['TARGET'])
u.role = 'admin'; db.commit(); print('admin:', u.email)"
