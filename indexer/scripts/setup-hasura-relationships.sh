#!/bin/bash

# Complete Hasura Relationship Setup for ASI-Chain Indexer
# This script creates all necessary relationships between tables

set -e

HASURA_URL="${HASURA_URL:-http://localhost:8080}"
ADMIN_SECRET="${HASURA_ADMIN_SECRET:-myadminsecretkey}"

echo "🔧 Setting up Hasura relationships for ASI-Chain Indexer"
echo "   URL: $HASURA_URL"
echo ""

# Function to make Hasura metadata API calls
hasura_metadata() {
    local query=$1
    curl -s -X POST "$HASURA_URL/v1/metadata" \
        -H "Content-Type: application/json" \
        -H "x-hasura-admin-secret: $ADMIN_SECRET" \
        -d "$query" 2>/dev/null
}

# Function to create object relationship
create_object_relationship() {
    local table=$1
    local name=$2
    local column=$3
    local remote_table=$4
    local remote_column=$5
    
    echo "  Creating object relationship: $table.$name -> $remote_table"
    
    local query="{
        \"type\": \"pg_create_object_relationship\",
        \"args\": {
            \"source\": \"default\",
            \"table\": {
                \"name\": \"$table\",
                \"schema\": \"public\"
            },
            \"name\": \"$name\",
            \"using\": {
                \"manual_configuration\": {
                    \"remote_table\": {
                        \"name\": \"$remote_table\",
                        \"schema\": \"public\"
                    },
                    \"column_mapping\": {
                        \"$column\": \"$remote_column\"
                    }
                }
            }
        }
    }"
    
    response=$(hasura_metadata "$query")
    if echo "$response" | grep -q "already exists"; then
        echo "    ✓ Already exists"
    elif echo "$response" | grep -q "error"; then
        echo "    ✗ Error: $response"
    else
        echo "    ✓ Created successfully"
    fi
}

# Function to create array relationship
create_array_relationship() {
    local table=$1
    local name=$2
    local column=$3
    local remote_table=$4
    local remote_column=$5
    
    echo "  Creating array relationship: $table.$name -> $remote_table[]"
    
    local query="{
        \"type\": \"pg_create_array_relationship\",
        \"args\": {
            \"source\": \"default\",
            \"table\": {
                \"name\": \"$table\",
                \"schema\": \"public\"
            },
            \"name\": \"$name\",
            \"using\": {
                \"manual_configuration\": {
                    \"remote_table\": {
                        \"name\": \"$remote_table\",
                        \"schema\": \"public\"
                    },
                    \"column_mapping\": {
                        \"$column\": \"$remote_column\"
                    }
                }
            }
        }
    }"
    
    response=$(hasura_metadata "$query")
    if echo "$response" | grep -q "already exists"; then
        echo "    ✓ Already exists"
    elif echo "$response" | grep -q "error"; then
        echo "    ✗ Error: $response"
    else
        echo "    ✓ Created successfully"
    fi
}

# Wait for Hasura to be ready
echo "⏳ Waiting for Hasura to be ready..."
for i in {1..30}; do
    if curl -s "$HASURA_URL/healthz" > /dev/null 2>&1; then
        echo "✅ Hasura is ready!"
        echo ""
        break
    fi
    if [ $i -eq 30 ]; then
        echo "❌ Timeout waiting for Hasura"
        exit 1
    fi
    sleep 2
done

# Track all tables first
echo "📊 Tracking tables..."
TABLES=("blocks" "deployments" "transfers" "validators" "validator_bonds" "balance_states" "network_stats" "epoch_transitions")

for table in "${TABLES[@]}"; do
    response=$(hasura_metadata "{
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
        echo "  ✓ $table"
    else
        echo "  ⚠ $table: $response"
    fi
done
echo ""

# BLOCKS RELATIONSHIPS
echo "🔗 Setting up BLOCKS relationships..."
create_array_relationship "blocks" "deployments" "block_number" "deployments" "block_number"
create_array_relationship "blocks" "transfers" "block_number" "transfers" "block_number"
create_array_relationship "blocks" "validator_bonds" "block_number" "validator_bonds" "block_number"
echo ""

# DEPLOYMENTS RELATIONSHIPS
echo "🔗 Setting up DEPLOYMENTS relationships..."
create_object_relationship "deployments" "block" "block_number" "blocks" "block_number"
create_array_relationship "deployments" "transfers" "deploy_id" "transfers" "deploy_id"
echo ""

# TRANSFERS RELATIONSHIPS
echo "🔗 Setting up TRANSFERS relationships..."
create_object_relationship "transfers" "block" "block_number" "blocks" "block_number"
create_object_relationship "transfers" "deployment" "deploy_id" "deployments" "deploy_id"
echo ""

# VALIDATORS RELATIONSHIPS
echo "🔗 Setting up VALIDATORS relationships..."
create_array_relationship "validators" "validator_bonds" "public_key" "validator_bonds" "validator_public_key"
echo ""

# VALIDATOR_BONDS RELATIONSHIPS
echo "🔗 Setting up VALIDATOR_BONDS relationships..."
create_object_relationship "validator_bonds" "block" "block_number" "blocks" "block_number"
create_object_relationship "validator_bonds" "validator" "validator_public_key" "validators" "public_key"
echo ""

# BALANCE_STATES RELATIONSHIPS
echo "🔗 Setting up BALANCE_STATES relationships..."
create_object_relationship "balance_states" "block" "block_number" "blocks" "block_number"
create_array_relationship "blocks" "balance_states" "block_number" "balance_states" "block_number"
echo ""

# Set public permissions
echo "🔒 Setting public permissions..."
for table in "${TABLES[@]}"; do
    hasura_metadata "{
        \"type\": \"pg_create_select_permission\",
        \"args\": {
            \"source\": \"default\",
            \"table\": \"$table\",
            \"role\": \"public\",
            \"permission\": {
                \"columns\": \"*\",
                \"filter\": {},
                \"allow_aggregations\": true
            }
        }
    }" > /dev/null 2>&1
done
echo "  ✓ Public read permissions set"
echo ""

# Test the relationships
echo "🧪 Testing relationships..."
test_response=$(curl -s -X POST "$HASURA_URL/v1/graphql" \
    -H "Content-Type: application/json" \
    -H "x-hasura-admin-secret: $ADMIN_SECRET" \
    -d '{"query": "{ blocks(limit: 1, order_by: {block_number: desc}) { block_number deployments { deploy_id } transfers { id } } transfers(limit: 1) { id block { block_number } deployment { deploy_id } } }"}' 2>/dev/null)

if echo "$test_response" | grep -q '"data"'; then
    echo "✅ Relationships are working!"
    
    # Extract some stats with better error handling
    blocks_count=$(curl -s -X POST "$HASURA_URL/v1/graphql" \
        -H "Content-Type: application/json" \
        -H "x-hasura-admin-secret: $ADMIN_SECRET" \
        -d '{"query":"{ blocks_aggregate { aggregate { count } } }"}' 2>/dev/null | \
        grep -o '"count":[0-9]*' | cut -d: -f2 || echo "0")
    
    transfers_count=$(curl -s -X POST "$HASURA_URL/v1/graphql" \
        -H "Content-Type: application/json" \
        -H "x-hasura-admin-secret: $ADMIN_SECRET" \
        -d '{"query":"{ transfers_aggregate { aggregate { count } } }"}' 2>/dev/null | \
        grep -o '"count":[0-9]*' | cut -d: -f2 || echo "0")
    
    echo ""
    echo "📊 Current statistics:"
    echo "   Blocks indexed: ${blocks_count:-0}"
    echo "   Transfers tracked: ${transfers_count:-0}"
else
    echo "⚠️  Some relationships may not be working correctly"
    echo "Response: $test_response"
fi

echo ""
echo "✅ Hasura relationship setup complete!"
echo "   GraphQL endpoint: $HASURA_URL/v1/graphql"
echo "   Console: $HASURA_URL/console"
echo ""
echo "You can now run queries like:"
echo '  { blocks { deployments { deploy_id } transfers { amount_rev } } }'