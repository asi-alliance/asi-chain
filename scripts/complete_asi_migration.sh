#!/bin/bash

###############################################################################
# Complete ASI Migration Script for F1R3FLY/RChain Blockchain
# This script performs the complete migration from REV to ASI ticker
###############################################################################

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_DIR="${1:-./f1r3fly}"
BACKUP_DIR="backup_$(date +%Y%m%d_%H%M%S)"
LOG_FILE="asi_migration_$(date +%Y%m%d_%H%M%S).log"
VALIDATION_REPORT="asi_migration_validation_report.md"
DRY_RUN="${2:-false}"

# Function to print colored output
print_info() {
    echo -e "${BLUE}[INFO]${NC} $1" | tee -a "$LOG_FILE"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1" | tee -a "$LOG_FILE"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1" | tee -a "$LOG_FILE"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1" | tee -a "$LOG_FILE"
}

# Function to create backup
create_backup() {
    print_info "Creating backup of project directory..."
    if [ -d "$PROJECT_DIR" ]; then
        cp -r "$PROJECT_DIR" "$BACKUP_DIR"
        print_success "Backup created: $BACKUP_DIR"
    else
        print_error "Project directory not found: $PROJECT_DIR"
        exit 1
    fi
}

# Function to perform main REV to ASI replacements
perform_main_replacements() {
    print_info "Starting main REV to ASI replacements..."
    
    cd "$PROJECT_DIR" || exit 1
    
    # Define all replacements
    declare -A REPLACEMENTS=(
        ["REV tokens"]="ASI tokens"
        ["REV token"]="ASI token"
        ["REV address"]="ASI address"
        ["REV addresses"]="ASI addresses"
        ["REV wallet"]="ASI wallet"
        ["REV balance"]="ASI balance"
        ["REV transfer"]="ASI transfer"
        ["REV vault"]="ASI vault"
        ["RevVault"]="AsiVault"
        ["RevAddress"]="AsiAddress"
        ["revVault"]="asiVault"
        ["revAddress"]="asiAddress"
        ["MultiSigRevVault"]="MultiSigAsiVault"
        ["multiSigRevVault"]="multiSigAsiVault"
        ["MultiSigRev"]="MultiSigAsi"
        ["RevGenerator"]="AsiGenerator"
        ["RevIssuanceTest"]="AsiIssuanceTest"
        ["RevVaultSpec"]="AsiVaultSpec"
        ["RevAddressSpec"]="AsiAddressSpec"
        ["RevVaultTest"]="AsiVaultTest"
        ["RevAddressTest"]="AsiAddressTest"
        ["rho:rchain:revVault"]="rho:rchain:asiVault"
        ["rho:rchain:multiSigRevVault"]="rho:rchain:multiSigAsiVault"
        ["rho:rev:address"]="rho:asi:address"
        ["\"REV\""]="\"ASI\""
        ["'REV'"]="'ASI'"
    )
    
    # Counter for replacements
    local total_replacements=0
    
    # Perform replacements
    for search in "${!REPLACEMENTS[@]}"; do
        replace="${REPLACEMENTS[$search]}"
        print_info "Replacing: '$search' with '$replace'"
        
        if [ "$DRY_RUN" = "true" ]; then
            count=$(grep -r "$search" . \
                --exclude-dir=.git \
                --exclude-dir=node_modules \
                --exclude-dir=target \
                --exclude-dir=build \
                --exclude="*.bak" \
                --exclude="*.log" 2>/dev/null | wc -l)
            print_info "[DRY RUN] Would replace $count occurrences"
        else
            # Use grep to find files and sed to replace
            files=$(grep -rl "$search" . \
                --exclude-dir=.git \
                --exclude-dir=node_modules \
                --exclude-dir=target \
                --exclude-dir=build \
                --exclude="*.bak" \
                --exclude="*.log" 2>/dev/null || true)
            
            if [ -n "$files" ]; then
                echo "$files" | while read -r file; do
                    # Create backup
                    cp "$file" "$file.bak"
                    # Perform replacement
                    sed -i "s|$search|$replace|g" "$file"
                    ((total_replacements++))
                done
                count=$(echo "$files" | wc -l)
                print_success "Replaced in $count files"
            fi
        fi
    done
    
    print_success "Main replacements completed"
}

# Function to rename files and directories
rename_files_and_directories() {
    print_info "Renaming files and directories..."
    
    cd "$PROJECT_DIR" || exit 1
    
    # Files to rename
    declare -a FILES_TO_RENAME=(
        "rholang/src/main/scala/coop/rchain/rholang/interpreter/util/RevAddress.scala:AsiAddress.scala"
        "rholang/src/test/scala/coop/rchain/rholang/interpreter/util/RevAddressSpec.scala:AsiAddressSpec.scala"
        "casper/src/main/scala/coop/rchain/casper/genesis/contracts/RevGenerator.scala:AsiGenerator.scala"
        "casper/src/main/resources/RevVault.rho:AsiVault.rho"
        "casper/src/main/resources/MultiSigRevVault.rho:MultiSigAsiVault.rho"
        "casper/src/test/scala/coop/rchain/casper/genesis/contracts/RevVaultSpec.scala:AsiVaultSpec.scala"
        "casper/src/test/scala/coop/rchain/casper/genesis/contracts/RevAddressSpec.scala:AsiAddressSpec.scala"
        "casper/src/test/scala/coop/rchain/casper/genesis/contracts/MultiSigRevVaultSpec.scala:MultiSigAsiVaultSpec.scala"
        "casper/src/test/scala/coop/rchain/casper/genesis/contracts/RevIssuanceTest.scala:AsiIssuanceTest.scala"
        "casper/src/test/resources/RevVaultTest.rho:AsiVaultTest.rho"
        "casper/src/test/resources/MultiSigRevVaultTest.rho:MultiSigAsiVaultTest.rho"
        "casper/src/test/resources/RevAddressTest.rho:AsiAddressTest.rho"
    )
    
    for rename_pair in "${FILES_TO_RENAME[@]}"; do
        old_file="${rename_pair%%:*}"
        new_file="${rename_pair##*:}"
        old_dir=$(dirname "$old_file")
        
        if [ "$DRY_RUN" = "true" ]; then
            if [ -f "$old_file" ]; then
                print_info "[DRY RUN] Would rename: $old_file -> $old_dir/$new_file"
            fi
        else
            if [ -f "$old_file" ]; then
                mv "$old_file" "$old_dir/$new_file"
                print_success "Renamed: $old_file -> $new_file"
            fi
        fi
    done
    
    # Directories to rename
    if [ "$DRY_RUN" = "true" ]; then
        if [ -d "node/src/main/scala/coop/rchain/node/revvaultexport" ]; then
            print_info "[DRY RUN] Would rename directory: revvaultexport -> asivaultexport"
        fi
    else
        if [ -d "node/src/main/scala/coop/rchain/node/revvaultexport" ]; then
            mv "node/src/main/scala/coop/rchain/node/revvaultexport" \
               "node/src/main/scala/coop/rchain/node/asivaultexport"
            print_success "Renamed directory: revvaultexport -> asivaultexport"
        fi
        
        if [ -d "node/src/test/scala/coop/rchain/node/revvaultexport" ]; then
            mv "node/src/test/scala/coop/rchain/node/revvaultexport" \
               "node/src/test/scala/coop/rchain/node/asivaultexport"
            print_success "Renamed test directory: revvaultexport -> asivaultexport"
        fi
    fi
}

# Function to fix package declarations and imports
fix_packages_and_imports() {
    print_info "Fixing package declarations and imports..."
    
    cd "$PROJECT_DIR" || exit 1
    
    # Fix package declarations
    if [ "$DRY_RUN" = "true" ]; then
        count=$(grep -r "package coop.rchain.node.revvaultexport" . --include="*.scala" 2>/dev/null | wc -l)
        print_info "[DRY RUN] Would fix $count package declarations"
    else
        find . -type f -name "*.scala" -exec grep -l "package coop.rchain.node.revvaultexport" {} \; 2>/dev/null | while read -r file; do
            sed -i 's/package coop.rchain.node.revvaultexport/package coop.rchain.node.asivaultexport/g' "$file"
        done
        print_success "Fixed package declarations"
    fi
    
    # Fix imports
    if [ "$DRY_RUN" = "true" ]; then
        count=$(grep -r "import.*revvaultexport" . --include="*.scala" 2>/dev/null | wc -l)
        print_info "[DRY RUN] Would fix $count import statements"
    else
        find . -type f -name "*.scala" -exec grep -l "import.*revvaultexport" {} \; 2>/dev/null | while read -r file; do
            sed -i 's/revvaultexport/asivaultexport/g' "$file"
        done
        print_success "Fixed import statements"
    fi
}

# Function to perform comprehensive validation
perform_validation() {
    print_info "Performing comprehensive validation..."
    
    cd "$PROJECT_DIR" || exit 1
    
    # Initialize report
    cat > "$VALIDATION_REPORT" << EOF
# ASI Migration Validation Report
Generated: $(date)

## Migration Summary
- Project Directory: $PROJECT_DIR
- Backup Directory: $BACKUP_DIR
- Dry Run: $DRY_RUN

## Validation Results

EOF
    
    # Check for remaining REV references
    print_info "Checking for remaining REV references..."
    
    REV_COUNT=$(grep -r "\bREV\b" . \
        --exclude-dir=.git \
        --exclude-dir=node_modules \
        --exclude-dir=target \
        --exclude-dir=build \
        --exclude="*.bak" \
        --exclude="*.log" 2>/dev/null | \
        grep -v "git rev-" | \
        grep -v "PREV" | \
        grep -v "REVERT" | \
        grep -v "REVERSE" | \
        wc -l)
    
    echo "### REV References" >> "$VALIDATION_REPORT"
    if [ "$REV_COUNT" -eq 0 ]; then
        echo "✅ **No REV references found**" >> "$VALIDATION_REPORT"
        print_success "No REV references found"
    else
        echo "⚠️ Found $REV_COUNT REV references" >> "$VALIDATION_REPORT"
        print_warning "Found $REV_COUNT REV references"
    fi
    echo "" >> "$VALIDATION_REPORT"
    
    # Check for ASI references
    print_info "Checking for ASI references..."
    
    ASI_COUNT=$(grep -r "ASI\|Asi\|asi" . \
        --exclude-dir=.git \
        --exclude-dir=node_modules \
        --exclude-dir=target \
        --exclude="*.bak" \
        --exclude="*.log" 2>/dev/null | wc -l)
    
    echo "### ASI References" >> "$VALIDATION_REPORT"
    echo "✅ **Found $ASI_COUNT ASI references**" >> "$VALIDATION_REPORT"
    print_success "Found $ASI_COUNT ASI references"
    echo "" >> "$VALIDATION_REPORT"
    
    # Check renamed files
    echo "### File Renames" >> "$VALIDATION_REPORT"
    
    if [ -f "casper/src/main/resources/AsiVault.rho" ]; then
        echo "✅ AsiVault.rho exists" >> "$VALIDATION_REPORT"
    else
        echo "❌ AsiVault.rho not found" >> "$VALIDATION_REPORT"
    fi
    
    if [ -f "rholang/src/main/scala/coop/rchain/rholang/interpreter/util/AsiAddress.scala" ]; then
        echo "✅ AsiAddress.scala exists" >> "$VALIDATION_REPORT"
    else
        echo "❌ AsiAddress.scala not found" >> "$VALIDATION_REPORT"
    fi
    
    if [ -d "node/src/main/scala/coop/rchain/node/asivaultexport" ]; then
        echo "✅ asivaultexport directory exists" >> "$VALIDATION_REPORT"
    else
        echo "❌ asivaultexport directory not found" >> "$VALIDATION_REPORT"
    fi
    echo "" >> "$VALIDATION_REPORT"
    
    # Final summary
    echo "## Summary" >> "$VALIDATION_REPORT"
    if [ "$REV_COUNT" -eq 0 ] && [ "$ASI_COUNT" -gt 0 ]; then
        echo "### ✅ Migration Successful!" >> "$VALIDATION_REPORT"
        echo "- All REV references have been replaced with ASI" >> "$VALIDATION_REPORT"
        echo "- Total ASI references: $ASI_COUNT" >> "$VALIDATION_REPORT"
        print_success "Migration validation PASSED!"
    else
        echo "### ⚠️ Migration Needs Review" >> "$VALIDATION_REPORT"
        echo "- Remaining REV references: $REV_COUNT" >> "$VALIDATION_REPORT"
        echo "- ASI references found: $ASI_COUNT" >> "$VALIDATION_REPORT"
        print_warning "Migration needs review - check $VALIDATION_REPORT"
    fi
    
    print_success "Validation report saved to: $VALIDATION_REPORT"
}

# Function to clean up backup files
cleanup_backup_files() {
    print_info "Cleaning up backup files..."
    
    if [ "$DRY_RUN" = "false" ]; then
        cd "$PROJECT_DIR" || exit 1
        find . -name "*.bak" -type f -delete
        print_success "Backup files cleaned up"
    else
        print_info "[DRY RUN] Would clean up .bak files"
    fi
}

# Main execution
main() {
    echo "==========================================="
    echo "Complete ASI Migration Script"
    echo "==========================================="
    echo "Project Directory: $PROJECT_DIR"
    echo "Dry Run: $DRY_RUN"
    echo "Log File: $LOG_FILE"
    echo "==========================================="
    echo ""
    
    # Check if project directory exists
    if [ ! -d "$PROJECT_DIR" ]; then
        print_error "Project directory not found: $PROJECT_DIR"
        print_info "Usage: $0 [project_directory] [true|false for dry run]"
        exit 1
    fi
    
    # Create backup (skip in dry run)
    if [ "$DRY_RUN" = "false" ]; then
        create_backup
    else
        print_info "[DRY RUN] Skipping backup creation"
    fi
    
    # Perform migration steps
    perform_main_replacements
    rename_files_and_directories
    fix_packages_and_imports
    
    # Validation
    perform_validation
    
    # Cleanup (optional)
    if [ "$DRY_RUN" = "false" ]; then
        read -p "Do you want to clean up .bak files? (y/n): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            cleanup_backup_files
        fi
    fi
    
    echo ""
    echo "==========================================="
    print_success "Migration script completed!"
    echo "Log file: $LOG_FILE"
    echo "Validation report: $VALIDATION_REPORT"
    if [ "$DRY_RUN" = "false" ]; then
        echo "Backup directory: $BACKUP_DIR"
    fi
    echo "==========================================="
}

# Run main function
main "$@"