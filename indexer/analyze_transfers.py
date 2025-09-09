#!/usr/bin/env python3
"""Analyze all REV transfers via GraphQL."""

import json
import requests
from collections import defaultdict

# GraphQL endpoint
url = "http://localhost:8080/v1/graphql"
headers = {
    "Content-Type": "application/json",
    "x-hasura-admin-secret": "myadminsecretkey"
}

# Fetch all transfers
query = """
{
  transfers(order_by: {block_number: asc}) {
    deploy_id
    block_number
    from_address
    to_address
    amount_dust
    amount_rev
    status
  }
  transfers_aggregate {
    aggregate {
      count
      sum { amount_rev }
    }
  }
}
"""

response = requests.post(url, json={"query": query}, headers=headers)
data = response.json()["data"]

transfers = data["transfers"]
aggregate = data["transfers_aggregate"]["aggregate"]

print("=" * 80)
print("ASI-CHAIN REV TRANSFER ANALYSIS - COMPLETE REPORT")
print("=" * 80)
print()

# Summary
print("📊 OVERALL STATISTICS:")
print(f"  • Total Transfers: {aggregate['count']}")
print(f"  • Total REV Moved: {float(aggregate['sum']['amount_rev']):,.2f} REV")
print()

# Separate by type
genesis_transfers = [t for t in transfers if t["block_number"] == "0"]
user_transfers = [t for t in transfers if t["block_number"] != "0"]

print("🏛️ GENESIS TRANSFERS (Validator Bonds):")
print(f"  • Count: {len(genesis_transfers)}")
genesis_total = sum(float(t["amount_rev"]) for t in genesis_transfers)
print(f"  • Total: {genesis_total:,.0f} REV")
for i, t in enumerate(genesis_transfers, 1):
    print(f"    {i}. {t['from_address'][:20]}... → PoS Vault: {float(t['amount_rev']):,.0f} REV")
print()

print("💸 USER TRANSFERS:")
print(f"  • Count: {len(user_transfers)}")
user_total = sum(float(t["amount_rev"]) for t in user_transfers)
print(f"  • Total: {user_total:,.0f} REV")
print()

print("  Details:")
for t in user_transfers:
    from_addr = t['from_address'][:30] + "..." if len(t['from_address']) > 33 else t['from_address']
    to_addr = t['to_address'][:30] + "..." if len(t['to_address']) > 33 else t['to_address']
    print(f"    Block {t['block_number']:>3}: {float(t['amount_rev']):>10,.0f} REV")
    print(f"             From: {from_addr}")
    print(f"             To:   {to_addr}")
    print()

# Address analysis
print("📍 ADDRESS ANALYSIS (User Transfers Only):")
addresses = set()
for t in user_transfers:
    addresses.add(t['from_address'])
    addresses.add(t['to_address'])

print(f"  • Unique addresses: {len(addresses)}")
print()

# Calculate net flows
flows = defaultdict(float)
sent_count = defaultdict(int)
received_count = defaultdict(int)

for t in user_transfers:
    flows[t['from_address']] -= float(t['amount_rev'])
    flows[t['to_address']] += float(t['amount_rev'])
    sent_count[t['from_address']] += 1
    received_count[t['to_address']] += 1

print("  Net Balance Changes:")
for addr in sorted(addresses):
    display = addr[:35] + "..." if len(addr) > 38 else addr
    net = flows[addr]
    sent = sent_count[addr]
    received = received_count[addr]
    print(f"    {display}")
    print(f"      Sent: {sent} tx(s) | Received: {received} tx(s) | Net: {net:+,.0f} REV")
print()

# Transfer patterns
print("🔄 TRANSFER PATTERNS:")
print(f"  • Blocks with transfers: {len(set(t['block_number'] for t in user_transfers))}")
print(f"  • Average user transfer: {user_total/len(user_transfers):,.2f} REV")
print(f"  • Largest user transfer: {max(float(t['amount_rev']) for t in user_transfers):,.0f} REV")
print(f"  • Smallest user transfer: {min(float(t['amount_rev']) for t in user_transfers):,.0f} REV")

print()
print("=" * 80)
print("Report generated from ASI-Chain Indexer GraphQL API")
print("=" * 80)