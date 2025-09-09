#!/usr/bin/env python3
"""
Fix Hasura Relationships for ASI-Chain Indexer
Creates manual relationships without requiring foreign key constraints
"""

import requests
import json
import time
import sys

# Hasura configuration
HASURA_URL = "http://localhost:8080"
ADMIN_SECRET = "myadminsecretkey"

headers = {
    "Content-Type": "application/json",
    "X-Hasura-Admin-Secret": ADMIN_SECRET
}

def make_metadata_request(query):
    """Make metadata API request to Hasura"""
    response = requests.post(f"{HASURA_URL}/v1/metadata", 
                           json=query, headers=headers)
    return response.json()

def create_manual_relationship(table, relationship_name, column_mapping, remote_table, is_array=False):
    """Create a manual relationship between tables without foreign key constraint"""
    rel_type = "array" if is_array else "object"
    print(f"🔗 Creating manual {rel_type} relationship: {table}.{relationship_name} -> {remote_table}")
    
    if is_array:
        query = {
            "type": "pg_create_array_relationship",
            "args": {
                "source": "default",
                "table": {
                    "name": table,
                    "schema": "public"
                },
                "name": relationship_name,
                "using": {
                    "manual_configuration": {
                        "remote_table": {
                            "name": remote_table,
                            "schema": "public"
                        },
                        "column_mapping": column_mapping
                    }
                }
            }
        }
    else:
        query = {
            "type": "pg_create_object_relationship",
            "args": {
                "source": "default",
                "table": {
                    "name": table,
                    "schema": "public"
                },
                "name": relationship_name,
                "using": {
                    "manual_configuration": {
                        "remote_table": {
                            "name": remote_table,
                            "schema": "public"
                        },
                        "column_mapping": column_mapping
                    }
                }
            }
        }
    
    result = make_metadata_request(query)
    if "error" in result:
        if "already exists" in str(result["error"]):
            print(f"  ✅ Relationship {relationship_name} already exists")
        else:
            print(f"  ❌ Error creating relationship {relationship_name}: {result['error']}")
            return False
    else:
        print(f"  ✅ Successfully created relationship {relationship_name}")
    return True

def drop_relationship(table, relationship_name, is_array=False):
    """Drop an existing relationship"""
    rel_type = "array" if is_array else "object"
    
    query = {
        "type": f"pg_drop_{rel_type}_relationship",
        "args": {
            "source": "default",
            "table": {
                "name": table,
                "schema": "public"
            },
            "relationship": relationship_name
        }
    }
    
    result = make_metadata_request(query)
    if "error" in result and "does not exist" not in str(result["error"]):
        print(f"  ⚠️  Error dropping relationship {relationship_name}: {result['error']}")
    return True

def main():
    """Fix Hasura relationships using manual configuration"""
    print("🔧 Fixing Hasura Relationships for ASI-Chain Indexer...")
    
    # Check if Hasura is ready
    try:
        response = requests.get(f"{HASURA_URL}/healthz")
        if response.status_code != 200:
            print("❌ Hasura is not ready")
            sys.exit(1)
    except requests.exceptions.ConnectionError:
        print("❌ Cannot connect to Hasura")
        sys.exit(1)
    
    print("\n🔧 Fixing validator-related relationships...")
    
    # Drop existing problematic relationships
    print("\n🗑️  Dropping problematic relationships...")
    drop_relationship("validator_bonds", "validator", is_array=False)
    drop_relationship("block_validators", "validator", is_array=False)
    drop_relationship("validators", "validator_bonds", is_array=True)
    drop_relationship("validators", "block_validators", is_array=True)
    
    # Create manual relationships for validators
    print("\n✨ Creating manual relationships...")
    
    # Validator Bonds -> Validators (manual object relationship)
    create_manual_relationship(
        "validator_bonds", 
        "validator",
        {"validator_public_key": "public_key"},
        "validators",
        is_array=False
    )
    
    # Block Validators -> Validators (manual object relationship)
    create_manual_relationship(
        "block_validators",
        "validator", 
        {"validator_public_key": "public_key"},
        "validators",
        is_array=False
    )
    
    # Validators -> Validator Bonds (manual array relationship)
    create_manual_relationship(
        "validators",
        "validator_bonds",
        {"public_key": "validator_public_key"},
        "validator_bonds", 
        is_array=True
    )
    
    # Validators -> Block Validators (manual array relationship)
    create_manual_relationship(
        "validators",
        "block_validators",
        {"public_key": "validator_public_key"},
        "block_validators",
        is_array=True
    )
    
    print("\n✅ Relationship fixes complete!")
    print("🌐 You can now use the GraphQL API with all relationships working")
    
    # Test the relationships
    print("\n🧪 Testing relationships...")
    test_query = """
    query TestRelationships {
        validators(limit: 1) {
            public_key
            validator_bonds(limit: 1) {
                stake
                block_number
            }
            block_validators(limit: 1) {
                block_hash
            }
        }
        validator_bonds(limit: 1) {
            validator_public_key
            validator {
                public_key
                name
            }
        }
    }
    """
    
    response = requests.post(
        f"{HASURA_URL}/v1/graphql",
        json={"query": test_query},
        headers=headers
    )
    
    result = response.json()
    if "data" in result:
        print("✅ Relationships are working correctly!")
    else:
        print("❌ Relationship test failed:", result.get("errors", "Unknown error"))

if __name__ == "__main__":
    main()