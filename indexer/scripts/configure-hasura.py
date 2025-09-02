#!/usr/bin/env python3
"""
Hasura Configuration Script for ASI-Chain Indexer
Automatically tracks tables and sets up relationships
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

def make_request(query, variables=None):
    """Make GraphQL request to Hasura"""
    payload = {"query": query}
    if variables:
        payload["variables"] = variables
    
    response = requests.post(f"{HASURA_URL}/v1/graphql", 
                           json=payload, headers=headers)
    return response.json()

def make_metadata_request(query):
    """Make metadata API request to Hasura"""
    response = requests.post(f"{HASURA_URL}/v1/metadata", 
                           json=query, headers=headers)
    return response.json()

def track_table(table_name, schema="public"):
    """Track a table in Hasura"""
    print(f"📊 Tracking table: {table_name}")
    
    query = {
        "type": "pg_track_table",
        "args": {
            "source": "default",
            "table": {
                "name": table_name,
                "schema": schema
            }
        }
    }
    
    result = make_metadata_request(query)
    if "error" in result:
        if "already tracked" in str(result["error"]):
            print(f"  ✅ Table {table_name} already tracked")
        else:
            print(f"  ❌ Error tracking {table_name}: {result['error']}")
            return False
    else:
        print(f"  ✅ Successfully tracked {table_name}")
    return True

def create_relationship(table, relationship_name, mapping, remote_table):
    """Create a relationship between tables"""
    print(f"🔗 Creating relationship: {table}.{relationship_name} -> {remote_table}")
    
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
                "foreign_key_constraint_on": mapping
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

def create_manual_relationship(table, relationship_name, column_mapping, remote_table):
    """Create a manual relationship between tables without foreign key constraint"""
    print(f"🔗 Creating manual relationship: {table}.{relationship_name} -> {remote_table}")
    
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

def create_array_relationship(table, relationship_name, mapping, remote_table):
    """Create an array relationship between tables"""
    print(f"🔗 Creating array relationship: {table}.{relationship_name} -> {remote_table}[]")
    
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
                "foreign_key_constraint_on": {
                    "table": {
                        "name": remote_table,
                        "schema": "public"
                    },
                    "column": mapping
                }
            }
        }
    }
    
    result = make_metadata_request(query)
    if "error" in result:
        if "already exists" in str(result["error"]):
            print(f"  ✅ Array relationship {relationship_name} already exists")
        else:
            print(f"  ❌ Error creating array relationship {relationship_name}: {result['error']}")
            return False
    else:
        print(f"  ✅ Successfully created array relationship {relationship_name}")
    return True

def create_manual_array_relationship(table, relationship_name, column_mapping, remote_table):
    """Create a manual array relationship between tables without foreign key constraint"""
    print(f"🔗 Creating manual array relationship: {table}.{relationship_name} -> {remote_table}[]")
    
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
    
    result = make_metadata_request(query)
    if "error" in result:
        if "already exists" in str(result["error"]):
            print(f"  ✅ Array relationship {relationship_name} already exists")
        else:
            print(f"  ❌ Error creating array relationship {relationship_name}: {result['error']}")
            return False
    else:
        print(f"  ✅ Successfully created array relationship {relationship_name}")
    return True

def set_table_permissions(table_name, role="public"):
    """Set read permissions for public role"""
    print(f"🔒 Setting permissions for {table_name} (role: {role})")
    
    query = {
        "type": "pg_create_select_permission",
        "args": {
            "source": "default",
            "table": {
                "name": table_name,
                "schema": "public"
            },
            "role": role,
            "permission": {
                "columns": "*",
                "filter": {},
                "allow_aggregations": True
            }
        }
    }
    
    result = make_metadata_request(query)
    if "error" in result:
        if "already exists" in str(result["error"]) or "already defined" in str(result["error"]):
            print(f"  ✅ Permissions for {table_name} already exist")
        else:
            print(f"  ❌ Error setting permissions for {table_name}: {result['error']}")
            return False
    else:
        print(f"  ✅ Successfully set permissions for {table_name}")
    return True

def track_view(view_name, schema="public"):
    """Track a view in Hasura"""
    print(f"👁️  Tracking view: {view_name}")
    
    query = {
        "type": "pg_track_table",
        "args": {
            "source": "default",
            "table": {
                "name": view_name,
                "schema": schema
            }
        }
    }
    
    result = make_metadata_request(query)
    if "error" in result:
        if "already tracked" in str(result["error"]):
            print(f"  ✅ View {view_name} already tracked")
        else:
            print(f"  ❌ Error tracking {view_name}: {result['error']}")
            return False
    else:
        print(f"  ✅ Successfully tracked {view_name}")
    return True

def main():
    """Configure Hasura for ASI-Chain Indexer"""
    print("🚀 Configuring Hasura for ASI-Chain Indexer...")
    
    # Wait for Hasura to be ready
    print("⏳ Waiting for Hasura to be ready...")
    for i in range(10):
        try:
            response = requests.get(f"{HASURA_URL}/healthz")
            if response.status_code == 200:
                print("✅ Hasura is ready!")
                break
        except requests.exceptions.ConnectionError:
            pass
        time.sleep(2)
    else:
        print("❌ Hasura is not responding. Please check if it's running.")
        sys.exit(1)
    
    # Step 1: Track all tables
    print("\n📊 Step 1: Tracking Tables")
    tables = [
        "blocks",
        "deployments", 
        "transfers",
        "validators",
        "validator_bonds",
        "block_validators",
        "indexer_state",
        "balance_states",
        "epoch_transitions",
        "network_stats"
    ]
    
    for table in tables:
        track_table(table)
    
    # Step 2: Track views (if any)
    print("\n👁️  Step 2: Tracking Views")
    # Currently no views to track since network_stats is now a table
    
    # Step 3: Create relationships
    print("\n🔗 Step 3: Creating Relationships")
    
    # Deployments -> Blocks (object relationship)
    create_relationship("deployments", "block_by_hash", "block_hash", "blocks")
    create_relationship("deployments", "block_by_number", "block_number", "blocks")
    
    # Transfers -> Deployments (object relationship)
    create_relationship("transfers", "deployment", "deploy_id", "deployments")
    
    # Transfers -> Blocks (object relationship) 
    create_relationship("transfers", "block", "block_number", "blocks")
    
    # Validator Bonds -> Blocks (object relationship)
    create_relationship("validator_bonds", "block_by_hash", "block_hash", "blocks")
    create_relationship("validator_bonds", "block_by_number", "block_number", "blocks")
    
    # Validator Bonds -> Validators (manual object relationship - no FK constraint)
    create_manual_relationship("validator_bonds", "validator", {"validator_public_key": "public_key"}, "validators")
    
    # Block Validators -> Blocks (object relationship)
    create_relationship("block_validators", "block", "block_hash", "blocks")
    
    # Block Validators -> Validators (manual object relationship - no FK constraint)
    create_manual_relationship("block_validators", "validator", {"validator_public_key": "public_key"}, "validators")
    
    # Blocks -> Deployments (array relationship)
    create_array_relationship("blocks", "deployments", "block_hash", "deployments")
    
    # Blocks -> Transfers (array relationship)
    create_array_relationship("blocks", "transfers", "block_number", "transfers")
    
    # Blocks -> Validator Bonds (array relationship)
    create_array_relationship("blocks", "validator_bonds", "block_hash", "validator_bonds")
    
    # Blocks -> Block Validators (array relationship)
    create_array_relationship("blocks", "block_validators", "block_hash", "block_validators")
    
    # Deployments -> Transfers (array relationship)
    create_array_relationship("deployments", "transfers", "deploy_id", "transfers")
    
    # Validators -> Validator Bonds (manual array relationship - no FK constraint)
    create_manual_array_relationship("validators", "validator_bonds", {"public_key": "validator_public_key"}, "validator_bonds")
    
    # Validators -> Block Validators (manual array relationship - no FK constraint)
    create_manual_array_relationship("validators", "block_validators", {"public_key": "validator_public_key"}, "block_validators")
    
    # Balance States -> Blocks (object relationship)
    create_relationship("balance_states", "block", "block_number", "blocks")
    
    # Blocks -> Balance States (array relationship)
    create_array_relationship("blocks", "balance_states", "block_number", "balance_states")
    
    # Epoch Transitions relationships (no foreign keys, so no relationships needed)
    # Network Stats relationships (no foreign keys, so no relationships needed)
    
    # Step 4: Set permissions
    print("\n🔒 Step 4: Setting Permissions")
    
    for table in tables:
        set_table_permissions(table, "public")
    
    print("\n✅ Hasura configuration complete!")
    print(f"🌐 GraphQL Playground: {HASURA_URL}/console")
    print(f"🔑 Admin Secret: {ADMIN_SECRET}")
    
    # Test query
    print("\n🧪 Testing GraphQL endpoint...")
    test_query = """
    query TestQuery {
        blocks(limit: 1, order_by: {block_number: desc}) {
            block_number
            block_hash
            timestamp
            proposer
            deployments_aggregate {
                aggregate {
                    count
                }
            }
        }
    }
    """
    
    result = make_request(test_query)
    if "data" in result:
        print("✅ GraphQL endpoint working!")
        if result["data"]["blocks"]:
            block = result["data"]["blocks"][0]
            print(f"   Latest block: #{block['block_number']} with {block['deployments_aggregate']['aggregate']['count']} deployments")
        else:
            print("   No blocks found (indexer may still be syncing)")
    else:
        print("❌ GraphQL test failed:", result.get("errors", "Unknown error"))

if __name__ == "__main__":
    main()