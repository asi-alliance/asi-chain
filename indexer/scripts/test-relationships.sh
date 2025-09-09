#!/bin/bash

# Quick test script for Hasura GraphQL relationships
# This script can be used to verify that relationships are working correctly

set -e

HASURA_URL="${HASURA_URL:-http://localhost:8080}"
ADMIN_SECRET="${HASURA_ADMIN_SECRET:-myadminsecretkey}"

echo "🧪 Testing Hasura GraphQL relationships..."
echo "   URL: $HASURA_URL"
echo ""

# Test basic connectivity
echo "1. Testing basic GraphQL connectivity..."
basic_test=$(curl -s -X POST "$HASURA_URL/v1/graphql" \
    -H "Content-Type: application/json" \
    -H "x-hasura-admin-secret: $ADMIN_SECRET" \
    -d '{"query": "{ __typename }"}' 2>/dev/null)

if echo "$basic_test" | grep -q '"query_root"'; then
    echo "   ✅ Basic GraphQL connectivity working"
else
    echo "   ❌ Basic GraphQL connectivity failed"
    echo "   Response: $basic_test"
    exit 1
fi

# Test table access
echo "2. Testing table access..."
table_test=$(curl -s -X POST "$HASURA_URL/v1/graphql" \
    -H "Content-Type: application/json" \
    -H "x-hasura-admin-secret: $ADMIN_SECRET" \
    -d '{"query": "{ blocks(limit: 1) { block_number } }"}' 2>/dev/null)

if echo "$table_test" | grep -q '"data"'; then
    echo "   ✅ Table access working"
else
    echo "   ❌ Table access failed"
    echo "   Response: $table_test"
    exit 1
fi

# Test relationships
echo "3. Testing nested relationships..."
relationship_test=$(curl -s -X POST "$HASURA_URL/v1/graphql" \
    -H "Content-Type: application/json" \
    -H "x-hasura-admin-secret: $ADMIN_SECRET" \
    -d '{"query": "{ blocks(limit: 1) { block_number deployments { deploy_id } } }"}' 2>/dev/null)

if echo "$relationship_test" | grep -q '"deployments"'; then
    echo "   ✅ Nested relationships working"
    
    # Extract deployment count for the test block
    deploy_count=$(echo "$relationship_test" | grep -o '"deploy_id"' | wc -l | tr -d ' ')
    echo "   📊 Found block with $deploy_count deployments"
else
    echo "   ❌ Nested relationships failed"
    echo "   Response: $relationship_test"
    
    # Check if it's just empty data vs broken relationships
    if echo "$relationship_test" | grep -q '"data"'; then
        echo "   ℹ️  GraphQL working but relationships may not be configured"
        echo "   💡 Try running: ./scripts/setup-hasura-relationships.sh"
    fi
    exit 1
fi

# Test bidirectional relationships
echo "4. Testing bidirectional relationships..."
bidirectional_test=$(curl -s -X POST "$HASURA_URL/v1/graphql" \
    -H "Content-Type: application/json" \
    -H "x-hasura-admin-secret: $ADMIN_SECRET" \
    -d '{"query": "{ deployments(limit: 1) { deploy_id block { block_number } } }"}' 2>/dev/null)

if echo "$bidirectional_test" | grep -q '"block"'; then
    echo "   ✅ Bidirectional relationships working"
else
    echo "   ⚠️  Bidirectional relationships may have issues"
    echo "   Response: $bidirectional_test"
fi

echo ""
echo "✅ Relationship testing complete!"
echo ""
echo "💡 Example queries you can now run:"
echo '   { blocks(limit: 5) { block_number deployments { deploy_id deployment_type } } }'
echo '   { validators { public_key name validator_bonds { stake } } }'
echo '   { transfers { amount_rev deployment { deploy_id } block { block_number } } }'
echo ""
echo "🌐 GraphQL Console: $HASURA_URL/console"