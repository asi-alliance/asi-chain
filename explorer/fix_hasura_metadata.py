#!/usr/bin/env python3
"""
Fix Hasura metadata to expose all tables and configure relationships
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

def track_table(table_name: str):
    """Track a table in Hasura"""
    print(f"Tracking table: {table_name}")
    
    payload = {
        "type": "pg_track_table",
        "args": {
            "source": "default",
            "table": {
                "schema": "public",
                "name": table_name
            }
        }
    }
    
    result = make_hasura_request("/v1/metadata", payload)
    if 'error' in result:
        print(f"  Error: {result['error']}")
    else:
        print(f"  ✅ Table {table_name} tracked successfully")
    return result

def create_object_relationship(table: str, rel_name: str, column: str, remote_table: str):
    """Create an object relationship (many-to-one)"""
    print(f"Creating relationship: {table}.{rel_name} → {remote_table}")
    
    payload = {
        "type": "pg_create_object_relationship",
        "args": {
            "source": "default",
            "table": {
                "schema": "public",
                "name": table
            },
            "name": rel_name,
            "using": {
                "foreign_key_constraint_on": column
            }
        }
    }
    
    result = make_hasura_request("/v1/metadata", payload)
    if 'error' in result:
        # Try manual mapping if foreign key doesn't exist
        payload = {
            "type": "pg_create_object_relationship",
            "args": {
                "source": "default",
                "table": {
                    "schema": "public",
                    "name": table
                },
                "name": rel_name,
                "using": {
                    "manual_configuration": {
                        "remote_table": {
                            "schema": "public",
                            "name": remote_table
                        },
                        "column_mapping": {
                            column: "block_number" if remote_table == "blocks" else "id"
                        }
                    }
                }
            }
        }
        result = make_hasura_request("/v1/metadata", payload)
        
    if 'error' in result:
        print(f"  ❌ Error: {result['error']}")
    else:
        print(f"  ✅ Relationship created")
    return result

def create_array_relationship(table: str, rel_name: str, column: str, remote_table: str, remote_column: str):
    """Create an array relationship (one-to-many)"""
    print(f"Creating array relationship: {table}.{rel_name} → {remote_table}")
    
    payload = {
        "type": "pg_create_array_relationship",
        "args": {
            "source": "default",
            "table": {
                "schema": "public",
                "name": table
            },
            "name": rel_name,
            "using": {
                "manual_configuration": {
                    "remote_table": {
                        "schema": "public",
                        "name": remote_table
                    },
                    "column_mapping": {
                        column: remote_column
                    }
                }
            }
        }
    }
    
    result = make_hasura_request("/v1/metadata", payload)
    if 'error' in result:
        print(f"  ❌ Error: {result['error']}")
    else:
        print(f"  ✅ Array relationship created")
    return result

def main():
    print("🔧 Fixing Hasura Metadata Configuration")
    print("="*50)
    
    # Step 1: Track missing tables
    print("\n📊 Step 1: Tracking Missing Tables")
    print("-"*40)
    track_table("block_validators")
    track_table("indexer_state")
    
    # Step 2: Create missing object relationships
    print("\n🔗 Step 2: Creating Object Relationships")
    print("-"*40)
    
    # transfers → blocks
    create_object_relationship("transfers", "block", "block_number", "blocks")
    
    # validator_bonds → blocks
    create_object_relationship("validator_bonds", "block", "block_number", "blocks")
    
    # balance_states → blocks
    create_object_relationship("balance_states", "block", "block_number", "blocks")
    
    # block_validators → blocks (using block_hash)
    payload = {
        "type": "pg_create_object_relationship",
        "args": {
            "source": "default",
            "table": {
                "schema": "public",
                "name": "block_validators"
            },
            "name": "block",
            "using": {
                "manual_configuration": {
                    "remote_table": {
                        "schema": "public",
                        "name": "blocks"
                    },
                    "column_mapping": {
                        "block_hash": "block_hash"
                    }
                }
            }
        }
    }
    result = make_hasura_request("/v1/metadata", payload)
    if 'error' in result:
        print(f"  ❌ Error creating block_validators.block: {result['error']}")
    else:
        print(f"  ✅ Relationship block_validators.block created")
    
    # block_validators → validators (using validator_public_key)
    payload = {
        "type": "pg_create_object_relationship",
        "args": {
            "source": "default",
            "table": {
                "schema": "public",
                "name": "block_validators"
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
        print(f"  ❌ Error creating block_validators.validator: {result['error']}")
    else:
        print(f"  ✅ Relationship block_validators.validator created")
    
    # Step 3: Create missing array relationships
    print("\n📚 Step 3: Creating Array Relationships")
    print("-"*40)
    
    # blocks → deployments
    create_array_relationship("blocks", "deployments", "block_number", "deployments", "block_number")
    
    # blocks → validator_bonds
    create_array_relationship("blocks", "validator_bonds", "block_number", "validator_bonds", "block_number")
    
    # blocks → balance_states
    create_array_relationship("blocks", "balance_states", "block_number", "balance_states", "block_number")
    
    # blocks → block_validators (using block_hash)
    create_array_relationship("blocks", "block_validators", "block_hash", "block_validators", "block_hash")
    
    # validators → validator_bonds
    create_array_relationship("validators", "validator_bonds", "public_key", "validator_bonds", "validator_public_key")
    
    # validators → blocks (proposed)
    create_array_relationship("validators", "proposed_blocks", "public_key", "blocks", "proposer")
    
    # validators → block_validators
    create_array_relationship("validators", "block_participations", "public_key", "block_validators", "validator_public_key")
    
    print("\n✅ Metadata configuration complete!")
    print("\nYou can now run the test script again to verify all tables and relationships are working.")

if __name__ == "__main__":
    main()