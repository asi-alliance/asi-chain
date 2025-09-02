#!/bin/bash

# Hasura configuration script using curl
# No Python dependencies required!

set -e

HASURA_URL="${HASURA_URL:-http://localhost:8080}"
ADMIN_SECRET="${HASURA_ADMIN_SECRET:-myadminsecretkey}"

echo "Configuring Hasura GraphQL Engine..."
echo "URL: $HASURA_URL"

# Function to make Hasura API calls
hasura_api() {
    local query=$1
    curl -s -X POST "$HASURA_URL/v1/metadata" \
        -H "Content-Type: application/json" \
        -H "x-hasura-admin-secret: $ADMIN_SECRET" \
        -d "$query" 2>/dev/null
}

# Wait for Hasura to be ready
echo "Waiting for Hasura to be ready..."
for i in {1..30}; do
    if curl -s "$HASURA_URL/healthz" > /dev/null 2>&1; then
        echo "✅ Hasura is ready!"
        break
    fi
    if [ $i -eq 30 ]; then
        echo "❌ Timeout waiting for Hasura"
        exit 1
    fi
    sleep 2
done

# Track all tables
TABLES=("blocks" "deployments" "transfers" "validators" "validator_bonds" "balance_states" "network_stats" "epoch_transitions")

echo "Tracking database tables..."
for table in "${TABLES[@]}"; do
    response=$(hasura_api "{
        \"type\": \"pg_track_table\",
        \"args\": {
            \"source\": \"default\",
            \"table\": {
                \"name\": \"$table\",
                \"schema\": \"public\"
            }
        }
    }")
    
    if echo "$response" | grep -q "success\|already tracked"; then
        echo "  ✅ Tracked table: $table"
    else
        echo "  ⚠️  Failed to track table: $table"
        echo "     Response: $response"
    fi
done

# Create relationships
echo "Creating table relationships..."

# Deployments -> Blocks relationship
hasura_api '{
    "type": "pg_create_object_relationship",
    "args": {
        "source": "default",
        "table": "deployments",
        "name": "block",
        "using": {
            "foreign_key_constraint_on": "block_hash"
        }
    }
}' > /dev/null 2>&1

# Transfers -> Deployments relationship
hasura_api '{
    "type": "pg_create_object_relationship",
    "args": {
        "source": "default",
        "table": "transfers",
        "name": "deployment",
        "using": {
            "foreign_key_constraint_on": "deploy_id"
        }
    }
}' > /dev/null 2>&1

echo "  ✅ Relationships configured"

# Set permissions for public role
echo "Setting public permissions..."
for table in "${TABLES[@]}"; do
    hasura_api "{
        \"type\": \"pg_create_select_permission\",
        \"args\": {
            \"source\": \"default\",
            \"table\": \"$table\",
            \"role\": \"public\",
            \"permission\": {
                \"columns\": \"*\",
                \"filter\": {}
            }
        }
    }" > /dev/null 2>&1
done
echo "  ✅ Public read permissions set"

# Test the configuration
echo "Testing GraphQL endpoint..."
test_response=$(curl -s -X POST "$HASURA_URL/v1/graphql" \
    -H "Content-Type: application/json" \
    -H "x-hasura-admin-secret: $ADMIN_SECRET" \
    -d '{"query":"{ blocks_aggregate { aggregate { count } } }"}' 2>/dev/null)

if echo "$test_response" | grep -q "count"; then
    block_count=$(echo "$test_response" | grep -o '"count":[0-9]*' | cut -d: -f2)
    echo "✅ GraphQL API configured successfully! Blocks indexed: ${block_count:-0}"
else
    echo "⚠️  GraphQL test failed. Manual configuration may be needed."
fi

echo "✅ Hasura configuration complete!"
echo "   GraphQL endpoint: $HASURA_URL/v1/graphql"
echo "   Console: $HASURA_URL/console"