import docker
import sqlite3
import re
import time
import os

DB_PATH = os.path.join(os.path.dirname(__file__), '..', 'data', 'asi-chain.db')
RNODE_CONTAINER_NAME = "rnode.readonly"

# Regular expressions to capture data from logs
# Using non-capturing groups (?:...) for prefixes to keep the regex clean
LOG_PATTERNS = {
    'block_processing_started': re.compile(r'Block #(\d+) \(([^)]+)\) processing started'),
    'active_validators': re.compile(r'ACTIVE VALIDATORS FOR StateHash ([0-9a-f]+):(.*)'),
    'computed_parents_post_state': re.compile(
        r'Computed parents post state for Block #(\d+) \(([0-9a-f]+)(?:\.\.\.)?\) -- '
        r'Sender ID ([0-9a-f]+)(?:\.\.\.)? -- '
        r'M Parent Hash ([0-9a-f]+)(?:\.\.\.)? -- '
        r'Contents ([0-9a-f]+)(?:\.\.\.)?\s*--'
    ),
    'block_validated': re.compile(r'Block #(\d+) \(([^)]+)\) validated: Right\(Valid\)'),
}

# --- State Management for Multi-line Parsing ---
parsing_active_validators = False
active_validator_state_hash = None
current_block_hash_for_validators = None

def setup_database(conn):
    """Creates the necessary tables in the SQLite database if they don't exist."""
    cursor = conn.cursor()
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS blocks (
            block_number        INTEGER PRIMARY KEY,
            block_hash          TEXT NOT NULL UNIQUE,
            parent_hash         TEXT NOT NULL,
            state_hash          TEXT,
            content_hash        TEXT,
            proposer_pub_key    TEXT,
            created_at          TEXT NOT NULL
        );
    ''')
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS validators (
            public_key          TEXT PRIMARY KEY,
            name                TEXT
        );
    ''')
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS block_validators (
            block_hash          TEXT NOT NULL,
            validator_pub_key   TEXT NOT NULL,
            PRIMARY KEY (block_hash, validator_pub_key),
            FOREIGN KEY (block_hash) REFERENCES blocks (block_hash),
            FOREIGN KEY (validator_pub_key) REFERENCES validators (public_key)
        );
    ''')
    conn.commit()
    print("Database setup complete.")

def parse_and_store(conn, log_line):
    """Parses a single log line and stores the data in the database."""
    global parsing_active_validators, active_validator_state_hash, current_block_hash_for_validators
    cursor = conn.cursor()

    # --- Multi-line Validator Parsing Logic ---
    if parsing_active_validators:
        # This line should be a validator key (check before checking for ***)
        key_match = re.search(r'([0-9a-f]{130})', log_line)
        if key_match and current_block_hash_for_validators:
            validator_key = key_match.group(1)
            cursor.execute("INSERT OR IGNORE INTO validators (public_key) VALUES (?)", (validator_key,))
            cursor.execute(
                "INSERT OR IGNORE INTO block_validators (block_hash, validator_pub_key) VALUES (?, ?)",
                (current_block_hash_for_validators, validator_key)
            )
            print(f"  -> Linked validator {validator_key[:10]}... to block {current_block_hash_for_validators[:10]}...")
            conn.commit()
        
        # Check for the end of the validator list after processing the line
        if '***' in log_line:
            parsing_active_validators = False
            active_validator_state_hash = None
            current_block_hash_for_validators = None
        return

    # --- Single-line Parsing Logic ---

    # Match block creation details first as it's the primary trigger
    match = LOG_PATTERNS['computed_parents_post_state'].search(log_line)
    if match:
        block_number, block_hash, proposer_pub_key, parent_hash, content_hash = match.groups()
        timestamp = log_line.split(' [')[0]

        cursor.execute("INSERT OR IGNORE INTO validators (public_key) VALUES (?)", (proposer_pub_key,))
        cursor.execute(
            """
            INSERT OR IGNORE INTO blocks (block_number, block_hash, parent_hash, content_hash, proposer_pub_key, created_at)
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            (block_number, block_hash, parent_hash, content_hash, proposer_pub_key, timestamp)
        )
        print(f"Stored Block #{block_number} ({block_hash[:10]}...)")
        conn.commit()
        # Set this as the current block to link validators to
        current_block_hash_for_validators = block_hash
        return

    # Match the start of the active validator list
    match = LOG_PATTERNS['active_validators'].search(log_line)
    if match:
        state_hash, _ = match.groups()
        # Link the state hash to the block we just processed
        if current_block_hash_for_validators:
            cursor.execute("UPDATE blocks SET state_hash = ? WHERE block_hash = ?", (state_hash, current_block_hash_for_validators))
            conn.commit()
            print(f"Found active validator set for block {current_block_hash_for_validators[:10]}...")
            parsing_active_validators = True # Start multi-line parsing mode
            active_validator_state_hash = state_hash


def main():
    """Main function to start the log parsing process."""
    # Ensure data directory exists
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)

    db_conn = sqlite3.connect(DB_PATH)
    setup_database(db_conn)

    client = docker.from_env()
    print(f"Searching for container '{RNODE_CONTAINER_NAME}'...")

    while True:
        try:
            container = client.containers.get(RNODE_CONTAINER_NAME)
            print(f"Successfully attached to container '{container.name}'. Streaming logs...")
            
            # Get logs from the point the script started
            logs = container.logs(stream=True, since=int(time.time()))
            for line in logs:
                decoded_line = line.decode('utf-8').strip()
                print(f"Log: {decoded_line}") # For debugging
                parse_and_store(db_conn, decoded_line)
                
        except docker.errors.NotFound:
            print(f"Container '{RNODE_CONTAINER_NAME}' not found. Retrying in 10 seconds...")
            time.sleep(10)
        except docker.errors.APIError as e:
            print(f"Docker API Error: {e}. Retrying in 10 seconds...")
            time.sleep(10)
        except KeyboardInterrupt:
            print("\nShutting down parser.")
            db_conn.close()
            break
        except Exception as e:
            print(f"An unexpected error occurred: {e}. Restarting log stream in 10 seconds.")
            time.sleep(10)


if __name__ == "__main__":
    main()