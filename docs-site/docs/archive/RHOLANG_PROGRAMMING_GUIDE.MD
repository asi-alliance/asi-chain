# Rholang Programming Guide

## Table of Contents
1. [Introduction to Rholang](#introduction-to-rholang)
2. [Core Concepts](#core-concepts)
3. [Syntax and Semantics](#syntax-and-semantics)
4. [Channels and Communication](#channels-and-communication)
5. [Pattern Matching](#pattern-matching)
6. [Concurrency Model](#concurrency-model)
7. [Built-in Types and Operations](#built-in-types-and-operations)
8. [Smart Contract Development](#smart-contract-development)
9. [System Contracts](#system-contracts)
10. [Best Practices](#best-practices)
11. [Examples and Patterns](#examples-and-patterns)

## Introduction to Rholang

Rholang (Reflective Higher-Order Language) is a concurrent programming language designed for writing smart contracts on the F1R3FLY blockchain. Based on the ρ-calculus (rho-calculus), it provides a formally verified foundation for distributed computing.

### Key Features

- **Concurrent by Design**: All computations are inherently concurrent
- **Channel-Based Communication**: Processes communicate via named channels
- **Pattern Matching**: Sophisticated pattern matching for message handling
- **Reflectivity**: Code and data are interchangeable
- **Formal Verification**: Mathematical foundation enables proofs of correctness

### Why Rholang?

Traditional smart contract languages execute sequentially, limiting scalability. Rholang's concurrent execution model allows:

- Parallel transaction processing
- Better resource utilization
- Scalable smart contracts
- Compositional security

## Core Concepts

### Processes

Everything in Rholang is a process. Processes can:
- Send messages on channels
- Receive messages from channels
- Create new processes
- Create new channels

```rholang
// A simple process that prints a message
stdout!("Hello, Rholang!")
```

### Channels

Channels are communication endpoints. They can be:
- **Named channels**: Have explicit names
- **Unforgeable names**: Created with `new` keyword
- **Quoted processes**: Any process can become a channel via quotation

```rholang
// Named channel
@"myChannel"!("message")

// Unforgeable name
new privateChan in {
  privateChan!("secret message")
}

// Quoted process as channel
@{10 + 20}!("result")
```

### Names and Processes

Rholang has a duality between names and processes:
- **Process**: Active computation
- **Name**: Reference to a channel
- **Quote (@)**: Convert process to name
- **Dereference (*)**: Convert name to process

```rholang
// Process to name
@"hello"  // This is a name

// Name to process
*x  // If x is a name, this is a process
```

## Syntax and Semantics

### Basic Syntax

#### Send
```rholang
// Send data on a channel
channel!(data)

// Send multiple values
channel!(value1, value2, value3)

// Persistent send (remains available)
channel!!(data)
```

#### Receive
```rholang
// Receive data from a channel
for (x <- channel) {
  // Process x
}

// Receive multiple values
for (x, y, z <- channel) {
  // Process x, y, z
}

// Persistent receive (can be triggered multiple times)
for (x <= channel) {
  // Process x repeatedly
}
```

#### Parallel Composition
```rholang
// Run processes in parallel
process1 | process2 | process3
```

#### New (Unforgeable Names)
```rholang
new myPrivateChannel, anotherChannel in {
  // Use private channels here
}
```

### Complex Patterns

#### Contracts
```rholang
// Define a contract (persistent receive)
contract myContract(param1, param2, return) = {
  // Contract logic
  return!(result)
}
```

#### Joins
```rholang
// Wait for messages on multiple channels
for (x <- chan1; y <- chan2) {
  // Process when both messages arrive
}
```

#### Select
```rholang
// Non-deterministic choice
select {
  case x <- chan1 => { /* handle chan1 */ }
  case y <- chan2 => { /* handle chan2 */ }
}
```

## Channels and Communication

### Channel Types

#### 1. Public Channels
```rholang
// Anyone can send/receive
@"publicChannel"!("public data")

for (data <- @"publicChannel") {
  stdout!(["Received:", data])
}
```

#### 2. Private Channels
```rholang
new privateChannel in {
  // Only accessible within this scope
  privateChannel!("private data") |
  for (data <- privateChannel) {
    stdout!(["Private:", data])
  }
}
```

#### 3. Return Channels
```rholang
// Common pattern for getting responses
new returnChan in {
  someContract!(argument, *returnChan) |
  for (result <- returnChan) {
    stdout!(["Got result:", result])
  }
}
```

### Communication Patterns

#### Request-Response
```rholang
contract service(request, return) = {
  // Process request
  return!(response)
}

// Client code
new ack in {
  service!("my request", *ack) |
  for (response <- ack) {
    stdout!(response)
  }
}
```

#### Publish-Subscribe
```rholang
contract publisher(subscribers) = {
  new publish in {
    contract publish(message) = {
      for (subscriber <- subscribers) {
        subscriber!(message) |
        subscribers!(subscriber)  // Re-add subscriber
      }
    } |
    publish
  }
}
```

#### Pipeline
```rholang
new stage1, stage2, stage3 in {
  // Stage 1: Transform
  for (x <- stage1) {
    stage2!(x * 2)
  } |
  
  // Stage 2: Filter
  for (y <- stage2) {
    if (y > 10) {
      stage3!(y)
    }
  } |
  
  // Stage 3: Output
  for (z <- stage3) {
    stdout!(z)
  } |
  
  // Input
  stage1!(5) | stage1!(10)
}
```

## Pattern Matching

### Basic Patterns

```rholang
// Match specific values
for (42 <- channel) { /* handles only 42 */ }

// Match and bind
for (x <- channel) { /* x is bound to received value */ }

// Match structures
for ([head, ...tail] <- channel) { /* list pattern */ }
for ({"name": n, "age": a} <- channel) { /* map pattern */ }
```

### Advanced Patterns

#### Guards
```rholang
for (x <- channel) {
  if (x > 0) {
    stdout!(["Positive:", x])
  } else {
    stdout!(["Non-positive:", x])
  }
}
```

#### Logical Connectives
```rholang
// AND pattern - both must match
for (x <- chan1 & chan2) {
  // Receives same value from both channels
}

// OR pattern - either can match
for (x <- chan1 \/ chan2) {
  // Receives from either channel
}
```

#### Pattern Variables
```rholang
// Match any process and quote it
for (@process <- channel) {
  // process is bound as a name
}

// Match any name and unquote it
for (=name <- channel) {
  // name is bound as a process
}
```

## Concurrency Model

### Concurrent Execution

All sends happen concurrently:
```rholang
// These all execute in parallel
chan1!("A") |
chan2!("B") |
chan3!("C")
```

### Synchronization

#### Joins for Synchronization
```rholang
new ready1, ready2, start in {
  // Wait for both signals
  for (_ <- ready1; _ <- ready2) {
    start!(Nil)
  } |
  
  // Simulate async operations
  ready1!(Nil) |
  new delay in {
    delay!(Nil) | for (_ <- delay) {
      ready2!(Nil)
    }
  } |
  
  for (_ <- start) {
    stdout!("Both operations complete!")
  }
}
```

#### Barriers
```rholang
contract barrier(n, action) = {
  new countChan, mutex in {
    countChan!(0) |
    contract mutex(return) = {
      for (count <- countChan) {
        if (count + 1 == n) {
          action!(Nil)
        } else {
          countChan!(count + 1)
        }
      }
    }
  }
}
```

### Race Conditions and Solutions

#### Problem: Race Condition
```rholang
// WRONG: Race condition
new counter in {
  counter!(0) |
  
  // Two concurrent increments
  for (x <- counter) { counter!(x + 1) } |
  for (y <- counter) { counter!(y + 1) }
  // Result could be 1 instead of 2!
}
```

#### Solution: Serialization
```rholang
// CORRECT: Serialized access
contract counter(action, return) = {
  new state in {
    state!(0) |
    contract action("increment", ack) = {
      for (count <- state) {
        state!(count + 1) |
        ack!(count + 1)
      }
    } |
    contract action("get", ack) = {
      for (count <- state) {
        state!(count) |
        ack!(count)
      }
    } |
    return!(*action)
  }
}
```

## Built-in Types and Operations

### Primitive Types

```rholang
// Boolean
true
false

// Integer
42
-17
0

// String
"Hello, World!"
"Multi\nline\nstring"

// Byte arrays
"0x0123456789ABCDEF".hexToBytes()

// URI
`rho:id:xxx`

// Nil
Nil
```

### Collections

#### Lists
```rholang
// List creation
[1, 2, 3, 4, 5]

// List operations
myList.length()        // Get length
myList.nth(2)         // Get element at index
myList.slice(1, 3)    // Get sublist
[head, ...tail]       // Pattern match

// List methods
[1,2,3].map(x => x * 2)           // [2,4,6]
[1,2,3,4].filter(x => x > 2)      // [3,4]
[1,2,3].fold(0, (acc, x) => acc + x) // 6
```

#### Maps
```rholang
// Map creation
{"name": "Alice", "age": 30, "city": "NYC"}

// Map operations
myMap.get("name")          // Get value
myMap.set("age", 31)       // Set value
myMap.contains("city")     // Check key exists
myMap.keys()               // Get all keys
myMap.union(otherMap)      // Merge maps

// Pattern matching
{"name": n, "age": a, ...rest}
```

#### Sets
```rholang
// Set creation
Set(1, 2, 3)

// Set operations
mySet.add(4)              // Add element
mySet.delete(2)           // Remove element
mySet.contains(3)         // Check membership
mySet.union(otherSet)     // Union
mySet.diff(otherSet)      // Difference
```

### String Operations

```rholang
// Concatenation
"Hello, " ++ "World!"

// Interpolation
"Value: ${x}"

// Methods
"hello".length()          // 5
"hello".slice(1, 4)       // "ell"
"HELLO".toLowerCase()     // "hello"
"a,b,c".split(",")       // ["a", "b", "c"]
```

### Arithmetic Operations

```rholang
// Basic arithmetic
10 + 5    // 15
10 - 5    // 5
10 * 5    // 50
10 / 5    // 2
10 % 3    // 1

// Comparison
10 > 5    // true
10 <= 10  // true
10 == 10  // true
10 != 5   // true

// Logical
true and false  // false
true or false   // true
not true        // false
```

## Smart Contract Development

### Basic Contract Structure

```rholang
// Token contract example
contract TokenContract(action, return) = {
  new balances, totalSupply in {
    // Initialize state
    balances!({"creator": 1000000}) |
    totalSupply!(1000000) |
    
    // Define actions
    contract action("balance", {"address": address}, ack) = {
      for (bal <- balances) {
        ack!(bal.getOrElse(address, 0)) |
        balances!(bal)
      }
    } |
    
    contract action("transfer", {
      "from": from,
      "to": to,
      "amount": amount,
      "sig": signature
    }, ack) = {
      // Verify signature
      if (verifySignature(from, signature)) {
        for (bal <- balances) {
          val fromBal = bal.getOrElse(from, 0)
          if (fromBal >= amount) {
            val toBal = bal.getOrElse(to, 0)
            balances!(
              bal.set(from, fromBal - amount)
                 .set(to, toBal + amount)
            ) |
            ack!(true)
          } else {
            balances!(bal) |
            ack!(false)
          }
        }
      } else {
        ack!(false)
      }
    } |
    
    return!(bundle+{*action})
  }
}
```

### State Management

```rholang
// Singleton pattern for state
contract StateManager(action, return) = {
  new state, mutex in {
    // Initial state
    state!({"counter": 0, "users": []}) |
    
    // Mutex for atomic operations
    contract mutex(operation, ack) = {
      for (s <- state) {
        match operation {
          "increment" => {
            val newState = s.set("counter", s.get("counter") + 1)
            state!(newState) |
            ack!(newState.get("counter"))
          }
          "addUser": user => {
            val users = s.get("users")
            val newState = s.set("users", users ++ [user])
            state!(newState) |
            ack!(true)
          }
          _ => {
            state!(s) |
            ack!(Nil)
          }
        }
      }
    } |
    
    return!(*mutex)
  }
}
```

### Access Control

```rholang
contract AccessControlled(owner, action, return) = {
  new permissions in {
    // Initialize permissions
    permissions!({owner: ["admin", "write", "read"]}) |
    
    contract action("execute", {
      "caller": caller,
      "action": act,
      "params": params
    }, ack) = {
      for (perms <- permissions) {
        val callerPerms = perms.getOrElse(caller, [])
        
        match act {
          "admin": _ => {
            if (callerPerms.contains("admin")) {
              // Execute admin action
              permissions!(perms) |
              ack!(["success", "Admin action executed"])
            } else {
              permissions!(perms) |
              ack!(["error", "Insufficient permissions"])
            }
          }
          _ => {
            permissions!(perms) |
            ack!(["error", "Unknown action"])
          }
        }
      }
    } |
    
    return!(*action)
  }
}
```

## System Contracts

F1R3FLY provides several built-in system contracts:

### Registry

```rholang
// Register a contract
new uriChan in {
  registry!("register", {
    "name": "MyContract",
    "contract": myContract
  }, *uriChan) |
  
  for (uri <- uriChan) {
    stdout!(["Registered at:", uri])
  }
}

// Lookup a contract
new contractChan in {
  registry!("lookup", {
    "uri": `rho:id:xxx`
  }, *contractChan) |
  
  for (contract <- contractChan) {
    // Use the contract
  }
}
```

### RevVault (Token Management)

```rholang
// Check balance
new balanceChan in {
  @"RevVault"!("balance", {
    "address": myAddress
  }, *balanceChan) |
  
  for (balance <- balanceChan) {
    stdout!(["Balance:", balance])
  }
}

// Transfer tokens
new ackChan in {
  @"RevVault"!("transfer", {
    "from": myAddress,
    "to": recipientAddress,
    "amount": 1000,
    "sig": signature
  }, *ackChan) |
  
  for (result <- ackChan) {
    stdout!(["Transfer result:", result])
  }
}
```

### Deploy Management

```rholang
// Get deploy data
new deployChan in {
  @"DeployData"!("get", *deployChan) |
  
  for ({
    "deployer": deployer,
    "timestamp": timestamp,
    "sig": sig
  } <- deployChan) {
    stdout!([
      "Deployed by:", deployer,
      "at:", timestamp
    ])
  }
}
```

## Best Practices

### 1. Use Unforgeable Names for Security

```rholang
// GOOD: Private channel
new privateData in {
  privateData!(sensitiveInfo)
}

// BAD: Public channel
@"privateData"!(sensitiveInfo)  // Anyone can access!
```

### 2. Implement Proper Error Handling

```rholang
contract safeOperation(params, return) = {
  match params {
    {"valid": data} => {
      // Process valid data
      return!(["success", processedData])
    }
    _ => {
      // Handle invalid input
      return!(["error", "Invalid parameters"])
    }
  }
}
```

### 3. Avoid Infinite Loops

```rholang
// GOOD: Bounded recursion
contract countdown(n, return) = {
  if (n > 0) {
    stdout!(n) |
    countdown!(n - 1, *return)
  } else {
    return!(Nil)
  }
}

// BAD: Infinite loop
contract infinite() = {
  infinite!()  // Never terminates!
}
```

### 4. Use Peek for Non-Consuming Reads

```rholang
// Peek at value without consuming
for (value <<- channel) {
  // value is available but not consumed
  stdout!(["Peeked:", value])
}
```

### 5. Implement Timeouts

```rholang
contract withTimeout(operation, timeout, return) = {
  new timeoutChan, resultChan in {
    // Start operation
    operation!(*resultChan) |
    
    // Start timeout
    timeout!(timeout, *timeoutChan) |
    
    // Race between result and timeout
    select {
      result <- resultChan => {
        return!(["success", result])
      }
      _ <- timeoutChan => {
        return!(["timeout", Nil])
      }
    }
  }
}
```

## Examples and Patterns

### Multi-signature Wallet

```rholang
contract MultiSigWallet(owners, threshold, action, return) = {
  new proposals, votes in {
    proposals!({}) |
    votes!({}) |
    
    contract action("propose", {
      "proposer": proposer,
      "transaction": tx
    }, ack) = {
      if (owners.contains(proposer)) {
        new proposalId in {
          for (props <- proposals; v <- votes) {
            proposals!(props.set(*proposalId, tx)) |
            votes!(v.set(*proposalId, [proposer])) |
            ack!(["success", *proposalId])
          }
        }
      } else {
        ack!(["error", "Not an owner"])
      }
    } |
    
    contract action("approve", {
      "approver": approver,
      "proposalId": id
    }, ack) = {
      if (owners.contains(approver)) {
        for (v <- votes; props <- proposals) {
          val currentVotes = v.getOrElse(id, [])
          if (not currentVotes.contains(approver)) {
            val newVotes = currentVotes ++ [approver]
            if (newVotes.length() >= threshold) {
              // Execute transaction
              val tx = props.get(id)
              executeTx!(tx) |
              proposals!(props.delete(id)) |
              votes!(v.delete(id)) |
              ack!(["executed", tx])
            } else {
              proposals!(props) |
              votes!(v.set(id, newVotes)) |
              ack!(["approved", newVotes.length()])
            }
          } else {
            proposals!(props) |
            votes!(v) |
            ack!(["error", "Already voted"])
          }
        }
      } else {
        ack!(["error", "Not an owner"])
      }
    } |
    
    return!(*action)
  }
}
```

### Auction Contract

```rholang
contract Auction(item, startPrice, duration, action, return) = {
  new highestBid, highestBidder, endTime, ended in {
    highestBid!(startPrice) |
    highestBidder!(Nil) |
    endTime!(getCurrentTime() + duration) |
    ended!(false) |
    
    contract action("bid", {
      "bidder": bidder,
      "amount": amount
    }, ack) = {
      for (e <- ended; time <- endTime) {
        if (not e and getCurrentTime() < time) {
          for (currentBid <- highestBid; currentBidder <- highestBidder) {
            if (amount > currentBid) {
              // Refund previous bidder
              if (currentBidder != Nil) {
                refund!(currentBidder, currentBid)
              } |
              highestBid!(amount) |
              highestBidder!(bidder) |
              ended!(false) |
              endTime!(time) |
              ack!(["success", "You are the highest bidder"])
            } else {
              highestBid!(currentBid) |
              highestBidder!(currentBidder) |
              ended!(false) |
              endTime!(time) |
              ack!(["error", "Bid too low"])
            }
          }
        } else {
          ended!(e) |
          endTime!(time) |
          ack!(["error", "Auction ended"])
        }
      }
    } |
    
    contract action("finalize", _, ack) = {
      for (e <- ended; time <- endTime) {
        if (not e and getCurrentTime() >= time) {
          for (winner <- highestBidder; amount <- highestBid) {
            ended!(true) |
            endTime!(time) |
            highestBidder!(winner) |
            highestBid!(amount) |
            transferItem!(item, winner) |
            ack!(["finalized", {"winner": winner, "amount": amount}])
          }
        } else {
          ended!(e) |
          endTime!(time) |
          ack!(["error", "Cannot finalize"])
        }
      }
    } |
    
    return!(*action)
  }
}
```

### Oracle Pattern

```rholang
contract Oracle(dataSource, action, return) = {
  new cache, updateLock in {
    cache!({}) |
    
    contract action("get", {"key": key}, ack) = {
      for (c <- cache) {
        match c.get(key) {
          {"value": v, "timestamp": t} => {
            if (getCurrentTime() - t < 3600) {  // 1 hour cache
              cache!(c) |
              ack!(v)
            } else {
              // Fetch fresh data
              fetchData!(dataSource, key, *updateLock) |
              for (newValue <- updateLock) {
                cache!(c.set(key, {
                  "value": newValue,
                  "timestamp": getCurrentTime()
                })) |
                ack!(newValue)
              }
            }
          }
          Nil => {
            // Fetch new data
            fetchData!(dataSource, key, *updateLock) |
            for (newValue <- updateLock) {
              cache!(c.set(key, {
                "value": newValue,
                "timestamp": getCurrentTime()
              })) |
              ack!(newValue)
            }
          }
        }
      }
    } |
    
    return!(*action)
  }
}
```

## Debugging and Testing

### Debug Output

```rholang
contract debug(label, value, return) = {
  stdout!([label, value]) |
  return!(value)
}

// Usage
new result in {
  debug!("Input", inputValue, *result) |
  for (v <- result) {
    process!(v) |
    debug!("After process", v, *result)
  }
}
```

### Unit Testing Pattern

```rholang
contract testRunner(tests, return) = {
  new results in {
    results!([]) |
    
    for (test <- tests) {
      match test {
        {"name": name, "test": testFn, "expected": expected} => {
          new actual in {
            testFn!(*actual) |
            for (a <- actual; r <- results) {
              if (a == expected) {
                results!(r ++ [{"test": name, "result": "PASS"}])
              } else {
                results!(r ++ [{
                  "test": name,
                  "result": "FAIL",
                  "expected": expected,
                  "actual": a
                }])
              }
            }
          }
        }
      }
    } |
    
    for (finalResults <- results) {
      return!(finalResults)
    }
  }
}
```

## Performance Considerations

### 1. Minimize Channel Creation

```rholang
// INEFFICIENT: Creates new channel each iteration
for (i <- iterator) {
  new tempChan in {
    tempChan!(i * 2) |
    for (result <- tempChan) {
      stdout!(result)
    }
  }
}

// EFFICIENT: Reuses channel
new tempChan in {
  for (i <- iterator) {
    tempChan!(i * 2) |
    for (result <- tempChan) {
      stdout!(result)
    }
  }
}
```

### 2. Use Persistent Operations Wisely

```rholang
// Persistent operations stay in tuplespace
contract service(request) <= {
  // This pattern remains active
}

// vs. Linear operations that are consumed
for (request <- channel) {
  // This pattern is consumed after matching
}
```

### 3. Optimize Pattern Matching

```rholang
// INEFFICIENT: Complex nested pattern
for ({
  "user": {"name": n, "age": a, "address": {"city": c}}
} <- channel) {
  // Process
}

// EFFICIENT: Simple pattern with processing
for (data <- channel) {
  val name = data.get("user").get("name")
  val age = data.get("user").get("age")
  val city = data.get("user").get("address").get("city")
  // Process
}
```

## Conclusion

Rholang represents a paradigm shift in smart contract programming, bringing true concurrency and formal verification to blockchain development. Its process calculus foundation provides powerful abstractions for building complex, scalable, and secure decentralized applications. While the learning curve is steep, mastering Rholang opens up new possibilities for concurrent and distributed programming on the blockchain.

---

*Last Updated: 2025*  
*Part of the [Artificial Superintelligence Alliance](https://superintelligence.io)*
