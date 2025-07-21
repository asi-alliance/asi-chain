#!/usr/bin/env python3
import re
import sys

def fix_file(filepath, fixes):
    """Apply a list of regex fixes to a file"""
    with open(filepath, 'r') as f:
        content = f.read()
    
    for pattern, replacement in fixes:
        content = re.sub(pattern, replacement, content, flags=re.MULTILINE | re.DOTALL)
    
    with open(filepath, 'w') as f:
        f.write(content)
    print(f"Fixed {filepath}")

# Fix f1r3fly_api.rs
f1r3fly_fixes = [
    # Fix build_deploy_msg call
    (r'self\.build_deploy_msg\(rho_code\.to_string\(\), phlo_limit, language\.to_string\(\)\);',
     r'self.build_deploy_msg(rho_code.to_string(), phlo_limit, language.to_string(), valid_after_block_number);'),
    
    # Fix full_deploy signature - add valid_after_block_number parameter
    (r'(pub async fn full_deploy\([^)]+language: &str),?\s*\)',
     r'\1,\n        valid_after_block_number: i64,\n    )'),
    
    # Fix deploy call in full_deploy method
    (r'self\.deploy\(rho_code, use_bigger_phlo_price, language\)\s*$',
     r'self.deploy(rho_code, use_bigger_phlo_price, language, valid_after_block_number)'),
]

# Fix commands/network.rs
network_fixes = [
    # Fix deploy calls
    (r'\.deploy\(&rholang_code, args\.bigger_phlo, "rholang"\)',
     r'.deploy(&rholang_code, args.bigger_phlo, "rholang", args.valid_after_block_number)'),
    
    # Fix full_deploy calls
    (r'\.full_deploy\(&rholang_code, args\.bigger_phlo, "rholang"\)',
     r'.full_deploy(&rholang_code, args.bigger_phlo, "rholang", args.valid_after_block_number)'),
    
    # Fix bonding deploy
    (r'\.deploy\(&bonding_code, true, "rholang"\)',
     r'.deploy(&bonding_code, true, "rholang", 0)'),
]

# Fix args.rs - add valid_after_block_number field
def fix_args():
    with open('node-cli/src/args.rs', 'r') as f:
        content = f.read()
    
    if 'valid_after_block_number' not in content:
        # Find the bigger_phlo field and add our field after it
        pattern = r'(pub bigger_phlo: bool,)'
        replacement = r'\1\n\n    /// Valid after block number\n    #[arg(long, default_value_t = 0)]\n    pub valid_after_block_number: i64,'
        content = re.sub(pattern, replacement, content)
        
        with open('node-cli/src/args.rs', 'w') as f:
            f.write(content)
        print("Added valid_after_block_number to args.rs")

# Apply fixes
print("=== Applying VABN fixes ===")
fix_file('node-cli/src/f1r3fly_api.rs', f1r3fly_fixes)
fix_file('node-cli/src/commands/network.rs', network_fixes)
fix_args()
print("=== VABN fixes complete ===")