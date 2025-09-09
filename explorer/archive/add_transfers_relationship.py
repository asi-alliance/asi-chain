#!/usr/bin/env python3
"""
Add the missing transfers relationship to deployments table
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
    print("Adding transfers relationship to deployments table...")
    
    # Create array relationship: deployments → transfers
    payload = {
        "type": "pg_create_array_relationship",
        "args": {
            "source": "default",
            "table": {
                "schema": "public",
                "name": "deployments"
            },
            "name": "transfers",
            "using": {
                "manual_configuration": {
                    "remote_table": {
                        "schema": "public",
                        "name": "transfers"
                    },
                    "column_mapping": {
                        "deploy_id": "deploy_id"
                    }
                }
            }
        }
    }
    
    result = make_hasura_request("/v1/metadata", payload)
    
    if 'error' in result:
        if "already exists" in str(result['error']):
            print("⚠️  Relationship already exists")
        else:
            print(f"❌ Error: {result['error']}")
    else:
        print("✅ Relationship created successfully")
    
    # Test the relationship
    print("\nTesting the relationship...")
    test_query = """
    {
        deployments(limit: 1) {
            deploy_id
            transfers {
                id
                amount_rev
            }
        }
    }
    """
    
    headers = {
        'Content-Type': 'application/json',
        'x-hasura-admin-secret': ADMIN_SECRET
    }
    
    response = requests.post(f"{HASURA_URL}/v1/graphql",
                            json={'query': test_query},
                            headers=headers)
    
    result = response.json()
    if 'data' in result:
        print("✅ Relationship working! Deployments can now access their transfers.")
        if result['data']['deployments']:
            deployment = result['data']['deployments'][0]
            transfer_count = len(deployment['transfers']) if deployment['transfers'] else 0
            print(f"   First deployment has {transfer_count} transfers")
    else:
        print(f"❌ Test failed: {result.get('errors', 'Unknown error')}")

if __name__ == "__main__":
    main()