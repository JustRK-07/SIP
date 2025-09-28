#!/bin/bash

echo "Testing Agents API..."
echo "=============================="

# Step 1: Login
echo -e "\n1. Getting authentication token..."
RESPONSE=$(curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"qateam@ytel.com","password":"test123"}' -s)

TOKEN=$(echo $RESPONSE | jq -r .accessToken)

if [ "$TOKEN" != "null" ] && [ ! -z "$TOKEN" ]; then
  echo "✓ Login successful!"
else
  echo "✗ Login failed!"
  echo "Response: $RESPONSE"
  exit 1
fi

# Step 2: Test fetching agent templates
echo -e "\n2. Fetching agent templates..."
TEMPLATES=$(curl -X GET http://localhost:3000/api/agents/templates \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" -s)

if echo "$TEMPLATES" | jq -e '.templates' > /dev/null 2>&1; then
  echo "✓ Templates fetched successfully!"
  COUNT=$(echo "$TEMPLATES" | jq '.templates | length')
  echo "  Found $COUNT templates"

  # Show template names
  echo "  Templates:"
  echo "$TEMPLATES" | jq -r '.templates[] | "    - \(.name) (\(.category))"'
else
  echo "✗ Failed to fetch templates!"
  echo "Response: $TEMPLATES"
fi

# Step 3: Test fetching agents
echo -e "\n3. Fetching agents..."
AGENTS=$(curl -X GET http://localhost:3000/api/agents \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" -s)

if echo "$AGENTS" | jq -e '.agents' > /dev/null 2>&1; then
  echo "✓ Agents fetched successfully!"
  COUNT=$(echo "$AGENTS" | jq '.agents | length')
  echo "  Found $COUNT agents"

  # Show agent names
  echo "  Agents:"
  echo "$AGENTS" | jq -r '.agents[] | "    - \(.name) (\(.status))"'
else
  echo "✗ Failed to fetch agents!"
  echo "Response: $AGENTS"
fi

# Step 4: Test creating a new agent from template
echo -e "\n4. Testing agent creation from template..."
NEW_AGENT=$(curl -X POST http://localhost:3000/api/agents/from-template \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "templateId": "customer-service",
    "name": "Test Support Agent - '"$(date +%s)"'",
    "customizations": {
      "description": "Test agent created via API"
    }
  }' -s)

if echo "$NEW_AGENT" | jq -e '.agent.id' > /dev/null 2>&1; then
  echo "✓ Agent created successfully!"
  AGENT_ID=$(echo "$NEW_AGENT" | jq -r '.agent.id')
  AGENT_NAME=$(echo "$NEW_AGENT" | jq -r '.agent.name')
  echo "  Created: $AGENT_NAME (ID: $AGENT_ID)"

  # Step 5: Test updating the agent
  echo -e "\n5. Testing agent update..."
  UPDATE_RESULT=$(curl -X PUT "http://localhost:3000/api/agents/$AGENT_ID" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d '{
      "description": "Updated description",
      "temperature": 0.8
    }' -s)

  if echo "$UPDATE_RESULT" | jq -e '.agent.id' > /dev/null 2>&1; then
    echo "✓ Agent updated successfully!"
    TEMPERATURE=$(echo "$UPDATE_RESULT" | jq -r '.agent.temperature')
    echo "  New temperature: $TEMPERATURE"
  else
    echo "✗ Failed to update agent!"
    echo "Response: $UPDATE_RESULT"
  fi

  # Step 6: Test deleting the agent
  echo -e "\n6. Testing agent deletion..."
  DELETE_RESULT=$(curl -X DELETE "http://localhost:3000/api/agents/$AGENT_ID" \
    -H "Authorization: Bearer $TOKEN" -s -w "\nHTTP_CODE:%{http_code}")

  HTTP_CODE=$(echo "$DELETE_RESULT" | grep "HTTP_CODE:" | cut -d':' -f2)

  if [ "$HTTP_CODE" == "200" ]; then
    echo "✓ Agent deleted successfully!"
  else
    echo "✗ Failed to delete agent!"
    echo "Response: $DELETE_RESULT"
  fi
else
  echo "✗ Failed to create agent!"
  echo "Response: $NEW_AGENT"
fi

echo -e "\n=============================="
echo "Agent API Test Complete!"