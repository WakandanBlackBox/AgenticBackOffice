#!/bin/bash
# Milestone + Client Portal Integration Tests
# Run with: bash test-milestones.sh

BASE="http://localhost:3000/api"
PASS=0
FAIL=0

check() {
  local name="$1" expected="$2" actual="$3"
  if echo "$actual" | grep -q "$expected"; then
    echo "  PASS: $name"
    ((PASS++))
  else
    echo "  FAIL: $name (expected '$expected', got '$actual')"
    ((FAIL++))
  fi
}

echo "=== Milestone + Portal Test Suite ==="
echo ""

# 1. Auth
echo "[1] Authentication"
LOGIN=$(curl -s $BASE/auth/login -H 'Content-Type: application/json' -d '{"email":"demo@backoffice.ai","password":"password123"}')
TOKEN=$(echo "$LOGIN" | python3 -c "import sys,json; print(json.load(sys.stdin).get('token',''))" 2>/dev/null)
check "Login returns token" "eyJ" "$TOKEN"

AUTH="Authorization: Bearer $TOKEN"

# 2. Create test project
echo "[2] Project Setup"
PROJ=$(curl -s $BASE/projects -H "$AUTH" -H 'Content-Type: application/json' -X POST \
  -d '{"name":"Test Milestone Project","description":"Integration test","budget_cents":1000000}')
PID=$(echo "$PROJ" | python3 -c "import sys,json; print(json.load(sys.stdin)['project']['id'])" 2>/dev/null)
check "Create project" "Test Milestone Project" "$PROJ"

# 3. Milestone CRUD
echo "[3] Milestone CRUD"
M1=$(curl -s $BASE/milestones -H "$AUTH" -H 'Content-Type: application/json' -X POST \
  -d "{\"project_id\":\"$PID\",\"title\":\"Discovery\",\"description\":\"Requirements gathering\",\"amount_cents\":200000,\"position\":0}")
M1_ID=$(echo "$M1" | python3 -c "import sys,json; print(json.load(sys.stdin)['milestone']['id'])" 2>/dev/null)
check "Create milestone 1" "Discovery" "$M1"

M2=$(curl -s $BASE/milestones -H "$AUTH" -H 'Content-Type: application/json' -X POST \
  -d "{\"project_id\":\"$PID\",\"title\":\"Design\",\"description\":\"UI mockups\",\"amount_cents\":300000,\"position\":1}")
M2_ID=$(echo "$M2" | python3 -c "import sys,json; print(json.load(sys.stdin)['milestone']['id'])" 2>/dev/null)
check "Create milestone 2" "Design" "$M2"

M3=$(curl -s $BASE/milestones -H "$AUTH" -H 'Content-Type: application/json' -X POST \
  -d "{\"project_id\":\"$PID\",\"title\":\"Development\",\"description\":\"Build it\",\"amount_cents\":500000,\"position\":2}")
M3_ID=$(echo "$M3" | python3 -c "import sys,json; print(json.load(sys.stdin)['milestone']['id'])" 2>/dev/null)
check "Create milestone 3" "Development" "$M3"

LIST=$(curl -s "$BASE/milestones?project_id=$PID" -H "$AUTH")
COUNT=$(echo "$LIST" | python3 -c "import sys,json; print(len(json.load(sys.stdin)['milestones']))" 2>/dev/null)
check "List returns 3 milestones" "3" "$COUNT"

# 4. Update milestone
echo "[4] Milestone Update"
UPD=$(curl -s "$BASE/milestones/$M1_ID" -H "$AUTH" -H 'Content-Type: application/json' -X PATCH \
  -d '{"title":"Discovery & Research"}')
check "Update title" "Discovery & Research" "$UPD"

# 5. Status transitions
echo "[5] Status Machine"
ACT=$(curl -s "$BASE/milestones/$M1_ID/activate" -H "$AUTH" -X POST)
check "Activate milestone 1" '"status":"active"' "$ACT"

# Try completing milestone 2 before 1 is approved (should fail)
SKIP=$(curl -s "$BASE/milestones/$M2_ID/complete" -H "$AUTH" -X POST)
check "Block out-of-order completion" "must be" "$SKIP"

COMP=$(curl -s "$BASE/milestones/$M1_ID/complete" -H "$AUTH" -X POST)
check "Complete milestone 1" '"status":"completed"' "$COMP"

# 6. Share token
echo "[6] Share Token"
SHARE=$(curl -s $BASE/milestones/share -H "$AUTH" -H 'Content-Type: application/json' -X POST \
  -d "{\"project_id\":\"$PID\",\"client_name\":\"Test Client\"}")
PORTAL_TOKEN=$(echo "$SHARE" | python3 -c "import sys,json; print(json.load(sys.stdin)['share_token']['token'])" 2>/dev/null)
check "Create share token" "/portal/" "$SHARE"
check "Token is 64 hex chars" "64" "$(echo -n $PORTAL_TOKEN | wc -c | tr -d ' ')"

TOKENS_LIST=$(curl -s "$BASE/milestones/share?project_id=$PID" -H "$AUTH")
check "List share tokens" "Test Client" "$TOKENS_LIST"

# 7. Client portal (no auth)
echo "[7] Client Portal (Public)"
PORTAL=$(curl -s "$BASE/portal/$PORTAL_TOKEN")
check "Portal returns project name" "Test Milestone Project" "$PORTAL"
check "Portal returns freelancer" "Alex Rivera" "$PORTAL"
check "Portal returns client name" "Test Client" "$PORTAL"
check "Portal shows 3 milestones" '"total":3' "$PORTAL"

# 8. Client approves via portal
echo "[8] Client Approval Flow"
APPROVE=$(curl -s "$BASE/portal/$PORTAL_TOKEN/milestones/$M1_ID/approve" -X POST -H 'Content-Type: application/json')
check "Client approves milestone 1" '"status":"approved"' "$APPROVE"

# Verify next milestone auto-activated
PORTAL2=$(curl -s "$BASE/portal/$PORTAL_TOKEN")
M2_STATUS=$(echo "$PORTAL2" | python3 -c "import sys,json; ms=json.load(sys.stdin)['milestones']; print([m['status'] for m in ms if m['title']=='Design'][0])" 2>/dev/null)
check "Next milestone auto-activated" "active" "$M2_STATUS"
check "Progress updated" '"approved":1' "$PORTAL2"

# 9. Client rejection flow
echo "[9] Client Rejection Flow"
# Complete milestone 2 first
curl -s "$BASE/milestones/$M2_ID/complete" -H "$AUTH" -X POST > /dev/null
REJECT=$(curl -s "$BASE/portal/$PORTAL_TOKEN/milestones/$M2_ID/reject" -X POST \
  -H 'Content-Type: application/json' -d '{"reason":"Colors need revision"}')
check "Client rejects milestone" '"status":"active"' "$REJECT"
check "Rejection reason saved" "Colors need revision" "$REJECT"

# 10. Invalid portal token
echo "[10] Security"
BAD=$(curl -s "$BASE/portal/invalidtoken123")
check "Invalid token returns 404" "Invalid or expired" "$BAD"

WRONG_M=$(curl -s "$BASE/portal/$PORTAL_TOKEN/milestones/00000000-0000-0000-0000-000000000000/approve" -X POST -H 'Content-Type: application/json')
check "Wrong milestone returns 404" "not found" "$WRONG_M"

# 11. Project detail includes milestones
echo "[11] Project Detail Integration"
DETAIL=$(curl -s "$BASE/projects/$PID" -H "$AUTH")
check "Project detail has milestones" '"milestones"' "$DETAIL"

# 12. Delete pending milestone
echo "[12] Delete"
DEL=$(curl -s "$BASE/milestones/$M3_ID" -H "$AUTH" -X DELETE)
check "Delete pending milestone" "deleted" "$DEL"

DEL_ACTIVE=$(curl -s "$BASE/milestones/$M2_ID" -H "$AUTH" -X DELETE)
check "Cannot delete active milestone" "not found" "$DEL_ACTIVE"

# Cleanup
curl -s "$BASE/projects/$PID" -H "$AUTH" -X PATCH -H 'Content-Type: application/json' -d '{"status":"cancelled"}' > /dev/null

echo ""
echo "=== Results: $PASS passed, $FAIL failed ==="
[ $FAIL -eq 0 ] && echo "All tests passed!" || echo "Some tests failed."
