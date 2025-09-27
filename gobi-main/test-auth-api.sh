#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color

BASE_URL="http://localhost:3000/api/auth"

echo "Testing Authentication API Endpoints"
echo "===================================="

# 1. Test Registration
echo -e "\n${GREEN}1. Testing Registration${NC}"
curl -X POST ${BASE_URL}/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "newuser@example.com",
    "password": "Password123!",
    "firstName": "Test",
    "lastName": "User"
  }' \
  --silent | python3 -m json.tool

# 2. Test Login
echo -e "\n${GREEN}2. Testing Login${NC}"
RESPONSE=$(curl -X POST ${BASE_URL}/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "qateam@ytel.com",
    "password": "password123"
  }' \
  --silent)

echo "$RESPONSE" | python3 -m json.tool

# Extract access token
ACCESS_TOKEN=$(echo "$RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin)['accessToken'])" 2>/dev/null)

if [ -z "$ACCESS_TOKEN" ]; then
  echo -e "${RED}Failed to get access token${NC}"
  exit 1
fi

echo -e "\n${GREEN}Access token obtained successfully${NC}"

# 3. Test Profile Retrieval
echo -e "\n${GREEN}3. Testing Get Profile${NC}"
curl -X GET ${BASE_URL}/profile \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  --silent | python3 -m json.tool

# 4. Test Profile Update
echo -e "\n${GREEN}4. Testing Update Profile${NC}"
curl -X PUT ${BASE_URL}/profile \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "QA Updated",
    "lastName": "Team Updated"
  }' \
  --silent | python3 -m json.tool

# 5. Test Forgot Password
echo -e "\n${GREEN}5. Testing Forgot Password${NC}"
curl -X POST ${BASE_URL}/forgot-password \
  -H "Content-Type: application/json" \
  -d '{
    "email": "qateam@ytel.com"
  }' \
  --silent | python3 -m json.tool

# 6. Test Token Validation
echo -e "\n${GREEN}6. Testing Token Validation${NC}"
curl -X GET ${BASE_URL}/validate \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  --silent | python3 -m json.tool

# 7. Test Rate Limiting (should fail after 5 attempts)
echo -e "\n${GREEN}7. Testing Rate Limiting${NC}"
echo "Making 6 login attempts (should fail on 6th)..."
for i in {1..6}; do
  echo -n "Attempt $i: "
  STATUS=$(curl -X POST ${BASE_URL}/login \
    -H "Content-Type: application/json" \
    -d '{
      "username": "wronguser@example.com",
      "password": "wrongpassword"
    }' \
    --silent -w "%{http_code}" -o /dev/null)
  echo "HTTP Status: $STATUS"
  if [ $STATUS -eq 429 ]; then
    echo -e "${GREEN}Rate limiting is working!${NC}"
    break
  fi
done

echo -e "\n${GREEN}All tests completed!${NC}"