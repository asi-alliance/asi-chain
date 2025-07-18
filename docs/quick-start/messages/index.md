# Message Exchange Scenarios

## Expected Node Connection Messages

When connecting a new node to the ASI:Chain network, monitor logs for these message patterns to verify successful connection.

## Observer Node Messages

### Successful Connection Indicators

**Genesis State Restoration**:
```
rnode.readonly | Approved state for block Block #0 (b22fa19038...) with empty parents (supposedly genesis) is successfully restored.
```
✅ **Meaning**: Node has successfully loaded the correct blockchain state

**Peer Communication**:
```
rnode.readonly | Received ForkChoiceTipRequest from rnode.validator2
rnode.readonly | Sending tips [b22fa19038...] to rnode.validator2
rnode.readonly | Received ForkChoiceTipRequest from rnode.bootstrap
rnode.readonly | Sending tips [b22fa19038...] to rnode.bootstrap
```
✅ **Meaning**: Observer is actively communicating with other network nodes

**Network Connectivity**:
```
rnode.readonly | Received ForkChoiceTipRequest from rnode.validator1
rnode.readonly | Sending tips [b22fa19038...] to rnode.validator1
rnode.readonly | Received ForkChoiceTipRequest from rnode.validator3
rnode.readonly | Sending tips [b22fa19038...] to rnode.validator3
```
✅ **Meaning**: Node is fully connected to the network

## Validator Node Messages

### After Bonding

**Peer Discovery**:
```
Creating new channel to peer rnode://...
Responded to protocol handshake request from rnode://...
```
✅ **Meaning**: Validator found and connected to other peers

**Network Participation**:
```
Peers: 4 or more
```
✅ **Meaning**: Validator has sufficient peer connections

## Success Checklist

Monitor logs for these indicators:

1. **Genesis State**: ✅ "Approved state for block Block #0... successfully restored"
2. **Tip Exchange**: ✅ "ForkChoiceTipRequest" and "Sending tips" messages
3. **Peer Count**: ✅ "Peers: 4 or more"
4. **Network Handshake**: ✅ "Responded to protocol handshake request"

## Troubleshooting

### Missing Messages

**If "Peers" remains below 2**:
- Check firewall/NAT configuration
- Verify bootstrap node connectivity
- Confirm port accessibility

**If no "ForkChoiceTipRequest" messages**:
- Indicates synchronization failure
- Check network connectivity
- Verify configuration parameters

**If "genesis" messages missing**:
- Node may not be properly connecting to network
- Verify bootstrap configuration
- Check network ID settings

## Connection Verification

Use these commands to verify successful connection:

```bash
# Check container logs
sudo docker logs validator -f --tail 20

# Look for success patterns
sudo docker logs validator 2>&1 | grep -E "(Approved state|ForkChoiceTipRequest|Sending tips)"

# Monitor peer connections
sudo docker logs validator 2>&1 | grep "Peers:"
```
