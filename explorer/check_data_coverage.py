#!/usr/bin/env python3
"""
Check if all GraphQL data fields are displayed in the explorer web interface
"""

import requests
import json
from datetime import datetime

GRAPHQL_URL = "http://localhost:8080/v1/graphql"
HEADERS = {
    'Content-Type': 'application/json',
    'x-hasura-admin-secret': 'myadminsecretkey'
}

def get_table_fields(table_name):
    """Get all fields for a specific table"""
    query = f"""
    {{
        __type(name: "{table_name}") {{
            fields {{
                name
            }}
        }}
    }}
    """
    
    response = requests.post(GRAPHQL_URL, 
                            json={'query': query}, 
                            headers=HEADERS, 
                            timeout=10)
    
    if response.status_code == 200:
        data = response.json()
        if data['data']['__type'] and data['data']['__type']['fields']:
            return [field['name'] for field in data['data']['__type']['fields']]
    return []

def get_sample_data_for_table(table_name):
    """Get sample data from a table"""
    
    # Get all fields first
    fields = get_table_fields(table_name)
    
    # Filter out aggregate and relationship fields
    scalar_fields = [f for f in fields if not f.endswith('_aggregate') and f not in 
                    ['deployments', 'validator_bonds', 'balance_states', 'block_validators']]
    
    # Build query with available fields
    if scalar_fields:
        fields_str = '\n                '.join(scalar_fields)
        query = f"""
        {{
            {table_name}(limit: 1, order_by: {{created_at: desc}}) {{
                {fields_str}
            }}
        }}
        """
        
        response = requests.post(GRAPHQL_URL,
                                json={'query': query},
                                headers=HEADERS,
                                timeout=5)
        
        if response.status_code == 200:
            resp_json = response.json()
            if 'data' in resp_json and resp_json['data'][table_name]:
                return resp_json['data'][table_name][0] if resp_json['data'][table_name] else {}
    
    return {}

def analyze_ui_coverage():
    """Analyze what fields are shown in the UI based on source code - UPDATED WITH ALL FIELDS"""
    
    tables_to_check = ['blocks', 'deployments', 'transfers', 'validators', 
                       'validator_bonds', 'network_stats', 'indexer_state']
    
    ui_coverage = {
        'blocks': [
            'block_number', 'block_hash', 'proposer', 'timestamp',
            'parent_hash', 'state_hash', 'pre_state_hash', 'state_root_hash',
            'bonds_map', 'fault_tolerance', 'finalization_status', 'justifications',
            'seq_num', 'shard_id', 'sig', 'sig_algorithm', 'version', 'extra_bytes',
            'deployment_count', 'validator_bonds'
        ],
        'deployments': [
            'deploy_id', 'deployer', 'term', 'timestamp', 'deployment_type',
            'phlo_cost', 'phlo_price', 'phlo_limit', 'valid_after_block_number',
            'status', 'block_number', 'block_hash', 'seq_num', 'shard_id',
            'sig', 'sig_algorithm', 'errored', 'error_message'
        ],
        'transfers': [
            'id', 'deploy_id', 'from_address', 'to_address', 'amount_rev', 
            'amount_dust', 'status', 'error_message', 'block_number'
        ],
        'validators': [
            'public_key', 'name', 'status', 'total_stake', 
            'first_seen_block', 'last_seen_block'
        ],
        'validator_bonds': [
            'id', 'validator_public_key', 'stake', 'block_number', 'block_hash'
        ],
        'network_stats': [
            'id', 'total_validators', 'active_validators', 'validators_in_quarantine',
            'total_rev_staked', 'avg_block_time_seconds', 'consensus_status', 
            'consensus_participation', 'block_number', 'timestamp'
        ],
        'indexer_state': [
            'key', 'value', 'updated_at'
        ]
    }
    
    return ui_coverage

def main():
    print("=" * 80)
    print("DATA COVERAGE ANALYSIS: GraphQL → Explorer UI")
    print("=" * 80)
    print(f"Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
    
    tables = ['blocks', 'deployments', 'transfers', 'validators', 
              'validator_bonds', 'network_stats', 'indexer_state']
    
    ui_coverage = analyze_ui_coverage()
    
    all_missing_fields = []
    
    for table in tables:
        print(f"\n{'='*60}")
        print(f"📊 TABLE: {table.upper()}")
        print(f"{'='*60}")
        
        # Get all available fields
        all_fields = get_table_fields(table)
        
        # Get sample data
        sample_data = get_sample_data_for_table(table)
        
        # Filter out non-scalar fields
        scalar_fields = [f for f in all_fields if not f.endswith('_aggregate') 
                        and f not in ['deployments', 'validator_bonds', 'balance_states', 
                                     'block_validators', 'transfers']]
        
        # What's shown in UI
        ui_fields = ui_coverage.get(table, [])
        
        # Calculate coverage
        displayed_fields = [f for f in ui_fields if f in scalar_fields]
        missing_fields = [f for f in scalar_fields if f not in ui_fields]
        
        print(f"\n📋 Field Analysis:")
        print(f"   • Total fields in GraphQL: {len(scalar_fields)}")
        print(f"   • Fields shown in UI: {len(displayed_fields)}")
        print(f"   • Missing fields: {len(missing_fields)}")
        
        if scalar_fields:
            coverage = len(displayed_fields) / len(scalar_fields) * 100
            print(f"   • Coverage: {coverage:.1f}%")
        
        if displayed_fields:
            print(f"\n✅ Displayed in UI ({len(displayed_fields)}):")
            for field in displayed_fields[:10]:  # Show first 10
                value = sample_data.get(field, 'N/A')
                if isinstance(value, str) and len(str(value)) > 50:
                    value = str(value)[:50] + "..."
                print(f"   • {field}: {value}")
            if len(displayed_fields) > 10:
                print(f"   ... and {len(displayed_fields) - 10} more")
        
        if missing_fields:
            # Categorize missing fields
            metadata_fields = [f for f in missing_fields if f in 
                             ['created_at', 'updated_at', 'id']]
            technical_fields = [f for f in missing_fields if f in 
                              ['sig', 'sig_algorithm', 'version', 'extra_bytes', 
                               'pre_state_hash', 'state_hash', 'state_root_hash']]
            important_fields = [f for f in missing_fields 
                              if f not in metadata_fields and f not in technical_fields]
            
            if important_fields:
                print(f"\n⚠️  Important Missing Fields ({len(important_fields)}):")
                for field in important_fields:
                    value = sample_data.get(field, 'N/A')
                    if isinstance(value, str) and len(str(value)) > 30:
                        value = str(value)[:30] + "..."
                    print(f"   • {field}: {value}")
                    all_missing_fields.append(f"{table}.{field}")
            
            if technical_fields:
                print(f"\n🔧 Technical Fields Not Shown ({len(technical_fields)}):")
                print(f"   {', '.join(technical_fields)}")
            
            if metadata_fields:
                print(f"\n📝 Metadata Fields Not Shown ({len(metadata_fields)}):")
                print(f"   {', '.join(metadata_fields)}")
    
    # Final Summary
    print(f"\n{'='*80}")
    print("FINAL SUMMARY")
    print(f"{'='*80}")
    
    if all_missing_fields:
        print(f"\n⚠️  IMPORTANT DATA NOT DISPLAYED IN UI:")
        for field in all_missing_fields:
            print(f"   • {field}")
    else:
        print(f"\n✅ ALL IMPORTANT DATA IS DISPLAYED IN THE UI!")
    
    print(f"\n📊 Coverage Statistics:")
    total_important = 0
    total_displayed = 0
    
    for table in tables:
        all_fields = get_table_fields(table)
        scalar_fields = [f for f in all_fields if not f.endswith('_aggregate') 
                        and f not in ['deployments', 'validator_bonds', 'balance_states', 
                                     'block_validators', 'transfers']]
        ui_fields = ui_coverage.get(table, [])
        displayed = [f for f in ui_fields if f in scalar_fields]
        
        # Exclude metadata fields from count
        important_scalar = [f for f in scalar_fields if f not in 
                          ['created_at', 'updated_at', 'id']]
        important_displayed = [f for f in displayed if f not in 
                             ['created_at', 'updated_at', 'id']]
        
        total_important += len(important_scalar)
        total_displayed += len(important_displayed)
    
    if total_important > 0:
        overall_coverage = total_displayed / total_important * 100
        print(f"   • Important fields: {total_important}")
        print(f"   • Displayed fields: {total_displayed}")
        print(f"   • Overall coverage: {overall_coverage:.1f}%")
    
    print(f"\n💡 Notes:")
    print("   • Metadata fields (created_at, updated_at, id) are excluded from important fields")
    print("   • Technical fields (hashes, signatures) are often not user-facing")
    print("   • Aggregate and relationship fields are handled separately in the UI")

if __name__ == "__main__":
    main()