#!/bin/bash
#
# This script clears the database and logs for the ASI-Chain Block Explorer.
# It can be run from any directory.

# Get the directory where this script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
EXPLORER_DIR="$SCRIPT_DIR"

echo "Working in directory: $EXPLORER_DIR"

echo "Stopping Block Explorer services..."
pkill -f "enhanced_parser.py"
pkill -f "app.py"
sleep 2

echo "Deleting database files..."
# Check if database exists and show its size before deletion
if [ -f "$EXPLORER_DIR/data/asi-chain.db" ]; then
    echo "Found database at: $EXPLORER_DIR/data/asi-chain.db"
    ls -lh "$EXPLORER_DIR/data/asi-chain.db"
    rm -f "$EXPLORER_DIR/data/asi-chain.db"
    echo "Database deleted."
else
    echo "No database found at: $EXPLORER_DIR/data/asi-chain.db"
fi

# Remove journal file
rm -f "$EXPLORER_DIR/data/asi-chain.db-journal"

# Remove any other potential database locations
rm -f "$EXPLORER_DIR/parser/asi-chain.db"
rm -f "$EXPLORER_DIR/asi-chain.db"

echo "Clearing log files..."
rm -f "$EXPLORER_DIR"/*.log
rm -f "$EXPLORER_DIR"/parser/*.log
rm -f "$EXPLORER_DIR"/web/*.log

# Double-check that database is really gone
if [ -f "$EXPLORER_DIR/data/asi-chain.db" ]; then
    echo "WARNING: Database still exists after deletion attempt!"
else
    echo "✅ Database successfully removed."
fi

# Check if we're in a git repository and if the database is tracked
if git rev-parse --git-dir > /dev/null 2>&1; then
    if git ls-files --error-unmatch "$EXPLORER_DIR/data/asi-chain.db" >/dev/null 2>&1; then
        echo ""
        echo "⚠️  WARNING: The database file is tracked by Git!"
        echo "This means it may be restored when you switch branches or pull updates."
        echo "To prevent this, the database should be added to .gitignore."
        echo ""
        echo "Would you like to remove it from Git tracking? (y/n)"
        read -r response
        if [[ "$response" =~ ^[Yy]$ ]]; then
            git rm --cached "$EXPLORER_DIR/data/asi-chain.db" 2>/dev/null || true
            echo "Database removed from Git tracking."
            echo "Consider adding 'block-explorer/data/*.db' to .gitignore"
        fi
    fi
fi

echo ""
echo "Block Explorer database and logs have been cleared."
echo "Ready for a fresh deployment. You can now run start_explorer.sh"