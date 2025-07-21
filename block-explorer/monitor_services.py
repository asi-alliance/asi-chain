#!/usr/bin/env python3
"""
Monitor and auto-restart ASI-Chain services for the block explorer.
Ensures both the readonly node and parser stay running.
"""

import subprocess
import time
import psutil
import docker
from datetime import datetime

# Configuration
READONLY_CONTAINER = "rnode.readonly"
PARSER_PROCESS_NAME = "log_parser.py"
WEB_APP_PROCESS_NAME = "app.py"
CHECK_INTERVAL = 30  # seconds
MEMORY_THRESHOLD_GB = 3.0

def check_container_status(container_name):
    """Check if a Docker container is running."""
    try:
        client = docker.from_env()
        container = client.containers.get(container_name)
        return container.status == "running", container
    except docker.errors.NotFound:
        return False, None
    except Exception as e:
        print(f"Error checking container {container_name}: {e}")
        return False, None

def get_container_memory_gb(container):
    """Get container memory usage in GB."""
    try:
        stats = container.stats(stream=False)
        memory_bytes = stats['memory_stats']['usage']
        return memory_bytes / (1024**3)  # Convert to GB
    except Exception as e:
        print(f"Error getting memory stats: {e}")
        return 0

def restart_container(container_name):
    """Restart a Docker container."""
    try:
        client = docker.from_env()
        container = client.containers.get(container_name)
        print(f"{datetime.now()}: Restarting {container_name}...")
        container.restart()
        time.sleep(10)  # Wait for container to stabilize
        return True
    except Exception as e:
        print(f"Error restarting {container_name}: {e}")
        return False

def check_process_running(process_name):
    """Check if a process is running by name."""
    for process in psutil.process_iter(['pid', 'name', 'cmdline']):
        try:
            cmdline = ' '.join(process.info['cmdline'] or [])
            if process_name in cmdline:
                return True, process.info['pid']
        except (psutil.NoSuchProcess, psutil.AccessDenied):
            continue
    return False, None

def start_parser():
    """Start the log parser process."""
    try:
        print(f"{datetime.now()}: Starting log parser...")
        subprocess.Popen(
            ["python", "parser/log_parser.py"],
            stdout=open("parser.log", "a"),
            stderr=subprocess.STDOUT,
            cwd="/Users//Documents/Code/asi-chain/block-explorer"
        )
        time.sleep(5)
        return True
    except Exception as e:
        print(f"Error starting parser: {e}")
        return False

def main():
    """Main monitoring loop."""
    print(f"Block Explorer Monitor Started - {datetime.now()}")
    print(f"Monitoring interval: {CHECK_INTERVAL} seconds")
    print(f"Memory threshold: {MEMORY_THRESHOLD_GB} GB\n")
    
    while True:
        try:
            # Check readonly node
            is_running, container = check_container_status(READONLY_CONTAINER)
            
            if not is_running:
                print(f"{datetime.now()}: ⚠️  {READONLY_CONTAINER} is not running!")
                restart_container(READONLY_CONTAINER)
            else:
                # Check memory usage
                memory_gb = get_container_memory_gb(container)
                print(f"{datetime.now()}: {READONLY_CONTAINER} - Running (Memory: {memory_gb:.2f} GB)")
                
                if memory_gb > MEMORY_THRESHOLD_GB:
                    print(f"{datetime.now()}: 🚨 Memory threshold exceeded! Restarting {READONLY_CONTAINER}...")
                    restart_container(READONLY_CONTAINER)
            
            # Check parser process
            parser_running, parser_pid = check_process_running(PARSER_PROCESS_NAME)
            if not parser_running:
                print(f"{datetime.now()}: ⚠️  Parser is not running! Starting it...")
                start_parser()
            else:
                print(f"{datetime.now()}: Parser - Running (PID: {parser_pid})")
            
            # Check web app
            web_running, web_pid = check_process_running(WEB_APP_PROCESS_NAME)
            if web_running:
                print(f"{datetime.now()}: Web App - Running (PID: {web_pid})")
            else:
                print(f"{datetime.now()}: ⚠️  Web App is not running!")
            
            print("-" * 60)
            time.sleep(CHECK_INTERVAL)
            
        except KeyboardInterrupt:
            print("\nMonitor stopped by user.")
            break
        except Exception as e:
            print(f"Monitor error: {e}")
            time.sleep(CHECK_INTERVAL)

if __name__ == "__main__":
    main()