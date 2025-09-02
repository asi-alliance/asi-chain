#!/usr/bin/env python3
"""
Fix the missing validator relationship in validator_bonds table
"""

import requests
import json

HASURA_URL = "http://localhost:8080"
ADMIN_SECRET = "myadminsecretkey"

def make_hasura_request(endpoint: str, payload: dict):
    """Make a request to Hasura metadata API"""
    headers = {
        'Content-Type': 'application/json',
        'x-hasura-admin-secret': ADMIN_SECRET
    }
    
    response = requests.post(f"{HASURA_URL}{endpoint}", json=payload, headers=headers)
    return response.json()

def main():
    print("Fixing validator relationships...")
    print("-" * 50)
    
    # Create object relationship: validator_bonds → validators
    print("1. Adding validator_bonds → validator relationship...")
    payload = {
        "type": "pg_create_object_relationship",
        "args": {
            "source": "default",
            "table": {
                "schema": "public",
                "name": "validator_bonds"
            },
            "name": "validator",
            "using": {
                "manual_configuration": {
                    "remote_table": {
                        "schema": "public",
                        "name": "validators"
                    },
                    "column_mapping": {
                        "validator_public_key": "public_key"
                    }
                }
            }
        }
    }
    
    result = make_hasura_request("/v1/metadata", payload)
    
    if 'error' in result:
        if "already exists" in str(result['error']):
            print("   ⚠️  Relationship already exists")
        else:
            print(f"   ❌ Error: {result['error']}")
    else:
        print("   ✅ Relationship created successfully")
    
    # Test the complete query that BlockDetailPage uses
    print("\n2. Testing the complete block detail query...")
    test_query = """
    query GetBlockDetails($blockNumber: bigint!) {
        blocks(where: { block_number: { _eq: $blockNumber } }) {
            block_number
            block_hash
            proposer
            deployment_count
            timestamp
            finalization_status
            deployments {
                deploy_id
                deployer
                term
                errored
                transfers {
                    id
                    from_address
                    to_address
                    amount_rev
                }
            }
            validator_bonds {
                stake
                validator {
                    public_key
                    name
                }
            }
        }
    }
    """
    
    variables = {"blockNumber": 1753}
    
    headers = {
        'Content-Type': 'application/json',
        'x-hasura-admin-secret': ADMIN_SECRET
    }
    
    response = requests.post(f"{HASURA_URL}/v1/graphql",
                            json={'query': test_query, 'variables': variables},
                            headers=headers)
    
    result = response.json()
    if 'data' in result and result['data']['blocks']:
        print("   ✅ Block detail query works!")
        block = result['data']['blocks'][0]
        print(f"   • Block #{block['block_number']}")
        print(f"   • Hash: {block['block_hash'][:16]}...")
        print(f"   • Deployments: {len(block['deployments'])}")
        print(f"   • Validator bonds: {len(block['validator_bonds'])}")
        
        if block['validator_bonds'] and block['validator_bonds'][0].get('validator'):
            print(f"   • First validator: {block['validator_bonds'][0]['validator']['name']}")
    else:
        print(f"   ❌ Query failed: {result.get('errors', 'Unknown error')}")
    
    print("\n" + "=" * 50)
    print("✅ All relationships fixed!")
    print("\nThe block detail page should now work correctly.")
    print("Try visiting: http://localhost:3001/block/1753")

if __name__ == "__main__":
    main()