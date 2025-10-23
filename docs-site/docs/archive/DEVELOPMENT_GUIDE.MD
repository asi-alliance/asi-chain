# F1R3FLY Development Guide

## Table of Contents
1. [Development Environment Setup](#development-environment-setup)
2. [Building from Source](#building-from-source)
3. [Project Structure](#project-structure)
4. [Development Workflow](#development-workflow)
5. [Testing Strategy](#testing-strategy)
6. [Debugging Techniques](#debugging-techniques)
7. [Performance Profiling](#performance-profiling)
8. [Contributing Guidelines](#contributing-guidelines)
9. [Advanced Development](#advanced-development)

## Development Environment Setup

### Prerequisites

#### System Requirements
- **CPU**: 4+ cores recommended
- **RAM**: 8 GB minimum, 16 GB recommended
- **Storage**: 50 GB free space
- **OS**: Linux (Ubuntu 20.04+), macOS 11+, Windows with WSL2

#### Required Software

##### Java Development Kit
```bash
# Ubuntu/Debian
sudo apt update
sudo apt install openjdk-11-jdk

# macOS
brew install openjdk@11

# Verify installation
java -version  # Should show version 11.x
```

##### Scala Build Tool (SBT)
```bash
# Ubuntu/Debian
echo "deb https://repo.scala-sbt.org/scalasbt/debian all main" | sudo tee /etc/apt/sources.list.d/sbt.list
curl -sL "https://keyserver.ubuntu.com/pks/lookup?op=get&search=0x2EE0EA64E40A89B84B2DF73499E82A75642AC823" | sudo apt-key add
sudo apt update
sudo apt install sbt

# macOS
brew install sbt

# Verify
sbt --version
```

##### Additional Tools for Rholang
```bash
# BNFC (BNF Converter)
# Ubuntu/Debian
sudo apt install cabal-install
cabal update
cabal install BNFC

# macOS
brew install cabal-install
cabal update
cabal install BNFC

# JFlex
# Ubuntu/Debian
sudo apt install jflex

# macOS
brew install jflex
```

##### Docker (for integration testing)
```bash
# Follow official Docker installation for your platform
# https://docs.docker.com/get-docker/

# Verify
docker --version
docker-compose --version
```

### IDE Setup

#### IntelliJ IDEA

1. Install IntelliJ IDEA (Community or Ultimate)
2. Install Scala plugin
3. Import project as SBT project
4. Configure JDK 11
5. Enable annotation processing

**Recommended plugins**:
- Scala
- SBT
- Docker
- Protocol Buffers

#### Visual Studio Code

1. Install VS Code
2. Install extensions:
   - Metals (Scala Language Server)
   - Scala Syntax
   - Docker
   - Protocol Buffer Editor

**Setup Metals**:
```bash
# In project root
sbt bloopInstall
# Then open VS Code and import build
```

### Environment Configuration

Create development environment file:

```bash
# .env.development
export SBT_OPTS="-Xmx4g -Xss2m -Dsbt.supershell=false"
export JAVA_OPTS="-Xmx4g -Xms2g"
export _JAVA_OPTIONS="-Xmx4g -Xms2g"

# Development paths
export RNODE_DATA_DIR="$HOME/.rnode-dev"
export RNODE_CONFIG="$HOME/.rnode-dev/rnode.conf"

# Logging
export RNODE_LOG_LEVEL="DEBUG"
export LOGBACK_CONFIGURATIONFILE="logback-dev.xml"

# Source the file
source .env.development
```

## Building from Source

### Full Build

```bash
# Clone repository
git clone https://github.com/F1R3FLY-io/f1r3fly.git
cd f1r3fly

# Clean build
sbt clean compile

# Build with tests
sbt clean compile test:compile

# Create executable
sbt stage

# Build Docker image
sbt docker:publishLocal
```

### Incremental Build

```bash
# Compile only changed files
sbt compile

# Continuous compilation
sbt ~compile

# Compile specific module
sbt "project casper" compile
```

### Build Optimization

```bash
# Parallel compilation
sbt 'set Global / parallelExecution := true' compile

# Skip tests for faster build
sbt 'set test in assembly := {}' assembly

# Use build cache
export SBT_OPTS="$SBT_OPTS -Dsbt.cached.resolution=true"
```

## Project Structure

### Module Organization

```
f1r3fly/
├── node/                 # Main node application
│   ├── src/
│   │   ├── main/
│   │   │   ├── scala/    # Node runtime code
│   │   │   ├── resources/ # Configuration files
│   │   │   └── protobuf/ # Protocol definitions
│   │   └── test/         # Node tests
│   └── target/           # Build output
│
├── casper/              # Consensus implementation
│   ├── src/
│   │   ├── main/
│   │   │   ├── scala/    # Casper consensus code
│   │   │   └── resources/ # Rholang system contracts
│   │   └── test/         # Consensus tests
│   └── target/
│
├── rholang/             # Smart contract language
│   ├── src/
│   │   ├── main/
│   │   │   ├── bnfc/     # Grammar definitions
│   │   │   ├── scala/    # Interpreter code
│   │   │   └── java/     # Generated parser
│   │   └── test/         # Language tests
│   └── examples/         # Example contracts
│
├── rspace/              # Tuple space implementation
│   ├── src/
│   │   ├── main/scala/   # RSpace core
│   │   └── test/         # RSpace tests
│   └── target/
│
├── comm/                # P2P networking
│   ├── src/
│   │   ├── main/
│   │   │   ├── scala/    # Network code
│   │   │   └── protobuf/ # Network protocols
│   │   └── test/
│   └── target/
│
├── crypto/              # Cryptographic utilities
│   ├── src/
│   │   ├── main/scala/   # Crypto implementations
│   │   └── test/
│   └── target/
│
├── models/              # Shared data models
│   ├── src/
│   │   ├── main/
│   │   │   ├── scala/    # Model classes
│   │   │   └── protobuf/ # Proto definitions
│   │   └── test/
│   └── target/
│
├── block-storage/       # Blockchain storage
│   ├── src/
│   │   ├── main/scala/   # Storage implementations
│   │   └── test/
│   └── target/
│
├── shared/              # Shared utilities
│   ├── src/
│   │   ├── main/scala/   # Common code
│   │   └── test/
│   └── target/
│
├── integration-tests/   # Integration test suite
│   ├── test/            # Python test files
│   ├── resources/       # Test resources
│   └── docker/          # Test containers
│
├── project/             # SBT build configuration
│   ├── Dependencies.scala
│   ├── plugins.sbt
│   └── build.properties
│
├── docker/              # Docker configurations
│   ├── Dockerfile
│   └── docker-compose files
│
└── scripts/             # Utility scripts
    ├── ci/              # CI/CD scripts
    └── tools/           # Development tools
```

### Key Files

#### Build Configuration
- `build.sbt` - Main build file
- `project/Dependencies.scala` - Dependency management
- `project/plugins.sbt` - SBT plugins
- `version.sbt` - Version management

#### Configuration
- `node/src/main/resources/defaults.conf` - Default configuration
- `node/src/main/resources/logback.xml` - Logging configuration
- `docker/.env` - Docker environment variables

## Development Workflow

### Feature Development

#### 1. Create Feature Branch
```bash
git checkout -b feature/my-feature
```

#### 2. Development Cycle
```bash
# Make changes
vim src/main/scala/MyClass.scala

# Run tests
sbt test

# Format code
sbt scalafmt

# Check for issues
sbt compile
sbt scalafmtCheck
```

#### 3. Run Local Node
```bash
# Build
sbt stage

# Run node
./node/target/universal/stage/bin/rnode \
  --data-dir /tmp/rnode \
  --allow-private-addresses \
  --standalone
```

#### 4. Test with REPL
```bash
./node/target/universal/stage/bin/rnode repl

# In REPL
rholang> @"hello"!("world")
rholang> for (x <- @"hello") { stdout!(*x) }
```

### Code Style

#### Scala Style Guide
```scala
// Package organization
package coop.rchain.casper

// Import grouping
import cats.effect._
import cats.implicits._

import coop.rchain.casper._
import coop.rchain.models._

import scala.concurrent.duration._

// Class definition
final class MyService[F[_]: Sync: Log] private (
  config: Config,
  storage: Storage[F]
) {
  // Public methods first
  def publicMethod(): F[Unit] = ???
  
  // Private methods after
  private def helperMethod(): F[Unit] = ???
}

object MyService {
  // Constructors in companion
  def apply[F[_]: Sync: Log](
    config: Config,
    storage: Storage[F]
  ): F[MyService[F]] = 
    Sync[F].delay(new MyService(config, storage))
}
```

#### Format Configuration
```scala
// .scalafmt.conf
version = "2.7.5"
maxColumn = 120
align.preset = more
newlines.afterCurlyLambda = preserve
```

### Git Workflow

#### Commit Messages
```bash
# Format: <type>(<scope>): <subject>

# Examples:
git commit -m "feat(casper): add block merge functionality"
git commit -m "fix(rspace): resolve memory leak in hot store"
git commit -m "docs(api): update gRPC endpoint documentation"
git commit -m "test(rholang): add pattern matching test cases"
git commit -m "perf(comm): optimize message serialization"
```

#### Types:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation
- `style`: Code style
- `refactor`: Refactoring
- `perf`: Performance
- `test`: Testing
- `chore`: Maintenance

## Testing Strategy

### Unit Testing

#### ScalaTest Example
```scala
import org.scalatest.flatspec.AnyFlatSpec
import org.scalatest.matchers.should.Matchers

class MyServiceSpec extends AnyFlatSpec with Matchers {
  
  "MyService" should "process data correctly" in {
    val service = MyService[IO](config, storage).unsafeRunSync()
    val result = service.process(input).unsafeRunSync()
    
    result shouldBe expected
  }
  
  it should "handle errors gracefully" in {
    val service = MyService[IO](config, storage).unsafeRunSync()
    
    assertThrows[IllegalArgumentException] {
      service.process(invalidInput).unsafeRunSync()
    }
  }
}
```

#### Property-Based Testing
```scala
import org.scalacheck.Properties
import org.scalacheck.Prop.forAll

object MyServiceProperties extends Properties("MyService") {
  
  property("commutative operation") = forAll { (a: Int, b: Int) =>
    MyService.combine(a, b) == MyService.combine(b, a)
  }
  
  property("identity element") = forAll { (a: Int) =>
    MyService.combine(a, MyService.identity) == a
  }
}
```

### Integration Testing

#### Docker-Based Tests
```python
# integration-tests/test/test_deployment.py
import pytest
from rnode import RNode

@pytest.fixture
def node():
    node = RNode.start_standalone()
    yield node
    node.stop()

def test_deploy_contract(node):
    # Deploy contract
    deploy_id = node.deploy(
        term='new x in { x!(42) }',
        phlo_limit=100000
    )
    
    # Propose block
    block = node.propose()
    
    # Verify deployment
    assert deploy_id in block.deploys
    assert node.get_deploy(deploy_id).status == 'processed'
```

### Performance Testing

#### JMH Benchmarks
```scala
import org.openjdk.jmh.annotations._

@State(Scope.Thread)
@BenchmarkMode(Array(Mode.Throughput))
class MyBenchmark {
  
  var data: List[Int] = _
  
  @Setup
  def setup(): Unit = {
    data = (1 to 1000).toList
  }
  
  @Benchmark
  def measureProcessing(): Unit = {
    MyService.process(data)
  }
}

// Run: sbt "jmh:run MyBenchmark"
```

### Test Coverage

```bash
# Generate coverage report
sbt clean coverage test coverageReport

# View report
open target/scala-2.12/scoverage-report/index.html

# Coverage goals:
# - Unit tests: >80%
# - Integration tests: >60%
# - Critical paths: 100%
```

## Debugging Techniques

### Local Debugging

#### IntelliJ IDEA
1. Set breakpoints in code
2. Run configuration: `Debug 'RNode'`
3. Use debugger console for evaluation

#### Command Line
```bash
# Enable debug output
export RNODE_LOG_LEVEL=DEBUG

# Run with debug agent
java -agentlib:jdwp=transport=dt_socket,server=y,suspend=n,address=5005 \
  -jar node/target/universal/stage/lib/rnode.jar

# Connect debugger to port 5005
```

### Remote Debugging

```bash
# On remote server
./rnode --debug-port 5005

# Local port forwarding
ssh -L 5005:localhost:5005 user@remote-server

# Connect IDE to localhost:5005
```

### Logging

#### Configure Logging
```xml
<!-- logback.xml -->
<configuration>
  <appender name="STDOUT" class="ch.qos.logback.core.ConsoleAppender">
    <encoder>
      <pattern>%d{HH:mm:ss.SSS} [%thread] %-5level %logger{36} - %msg%n</pattern>
    </encoder>
  </appender>
  
  <!-- Set specific logger levels -->
  <logger name="coop.rchain.casper" level="DEBUG"/>
  <logger name="coop.rchain.rspace" level="TRACE"/>
  
  <root level="INFO">
    <appender-ref ref="STDOUT"/>
  </root>
</configuration>
```

#### Add Debug Logging
```scala
import coop.rchain.shared.Log

class MyService[F[_]: Sync: Log] {
  
  def process(data: Data): F[Result] = {
    for {
      _ <- Log[F].debug(s"Processing data: $data")
      result <- doProcess(data)
      _ <- Log[F].info(s"Processed successfully: $result")
    } yield result
  }
}
```

### Troubleshooting Common Issues

#### Out of Memory
```bash
# Increase heap size
export SBT_OPTS="-Xmx8g -Xms4g"
export _JAVA_OPTIONS="-Xmx8g -Xms4g"

# Enable heap dump on OOM
java -XX:+HeapDumpOnOutOfMemoryError \
     -XX:HeapDumpPath=/tmp/heap.dump \
     -jar rnode.jar
```

#### Stack Overflow
```bash
# Increase stack size
export SBT_OPTS="$SBT_OPTS -Xss4m"
```

#### Slow Compilation
```bash
# Use incremental compilation
sbt incremental

# Clear cache if corrupted
rm -rf ~/.sbt/1.0/zinc/
sbt clean compile
```

## Performance Profiling

### JVM Profiling

#### YourKit Profiler
```bash
# Download YourKit
wget https://www.yourkit.com/download/YourKit-JavaProfiler.zip

# Run with profiler
java -agentpath:/path/to/libyjpagent.so \
  -jar rnode.jar

# Connect YourKit UI to application
```

#### JProfiler
```bash
# Run with JProfiler agent
java -agentpath:/path/to/libjprofilerti.so=port=8849 \
  -jar rnode.jar
```

### Metrics Collection

#### Prometheus Metrics
```scala
import kamon.Kamon
import kamon.prometheus.PrometheusReporter

// Initialize
Kamon.init()
Kamon.addReporter(new PrometheusReporter())

// Add metrics
val processTimer = Kamon.timer("process.time")
val processCounter = Kamon.counter("process.count")

def process(data: Data): F[Result] = {
  processTimer.withTimer {
    processCounter.increment()
    // Process data
  }
}
```

#### Custom Metrics
```scala
import coop.rchain.metrics.Metrics

class MyService[F[_]: Sync: Metrics] {
  
  private val processingTime = Metrics[F].histogram("processing_time")
  private val errorRate = Metrics[F].counter("error_rate")
  
  def process(data: Data): F[Result] = {
    processingTime.time {
      doProcess(data).handleErrorWith { error =>
        errorRate.increment() >> 
        Sync[F].raiseError(error)
      }
    }
  }
}
```

### Memory Profiling

```bash
# Heap dump analysis
jmap -dump:live,format=b,file=heap.dump <pid>
jhat heap.dump

# Memory usage
jmap -histo <pid>

# GC analysis
java -XX:+PrintGCDetails \
     -XX:+PrintGCTimeStamps \
     -Xloggc:gc.log \
     -jar rnode.jar
```

## Contributing Guidelines

### Code Review Checklist

- [ ] Code follows style guidelines
- [ ] Tests added/updated
- [ ] Documentation updated
- [ ] No compiler warnings
- [ ] Performance impact considered
- [ ] Security implications reviewed
- [ ] Backward compatibility maintained

### Pull Request Process

1. **Create PR**
```bash
git push origin feature/my-feature
# Create PR on GitHub
```

2. **PR Description Template**
```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] Manual testing completed

## Checklist
- [ ] Code follows style guidelines
- [ ] Self-review completed
- [ ] Documentation updated
- [ ] No new warnings
```

3. **Review Process**
- Automated CI checks
- Code review by 2+ maintainers
- Performance testing if needed
- Security review for sensitive changes

## Advanced Development

### Custom Validators

```scala
class MyValidator[F[_]: Sync] extends Validator[F] {
  
  override def validate(block: Block): F[ValidationResult] = {
    for {
      formatValid <- validateFormat(block)
      semanticValid <- validateSemantics(block)
      stateValid <- validateState(block)
    } yield ValidationResult.combine(
      formatValid,
      semanticValid,
      stateValid
    )
  }
}
```

### Protocol Extensions

```protobuf
// models/src/main/protobuf/MyExtension.proto
syntax = "proto3";

message MyExtension {
  string feature = 1;
  bytes data = 2;
  int64 version = 3;
}

// Extend existing messages
extend BlockMessage {
  MyExtension extension = 1000;
}
```

### Storage Backend

```scala
trait MyStorageBackend[F[_]] extends StorageBackend[F] {
  
  def put(key: Key, value: Value): F[Unit]
  def get(key: Key): F[Option[Value]]
  def delete(key: Key): F[Unit]
  def iterate(prefix: Key): F[Iterator[(Key, Value)]]
  
  // Custom operations
  def bulkInsert(items: Map[Key, Value]): F[Unit]
  def snapshot(): F[SnapshotId]
  def restore(id: SnapshotId): F[Unit]
}
```

### Performance Optimizations

```scala
// Parallel execution
import cats.implicits._
import cats.effect.IO

def processParallel(items: List[Item]): IO[List[Result]] = {
  items.parTraverse(process)
}

// Caching
import scalacache._
import scalacache.caffeine._

implicit val cache: Cache[String] = CaffeineCache[String]

def cachedOperation(key: String): F[Result] = {
  cachingF(key)(ttl = Some(5.minutes)) {
    expensiveOperation(key)
  }
}

// Resource pooling
import cats.effect.Resource

def pooledResource[F[_]: Concurrent]: Resource[F, Pool[Connection]] = {
  Resource.make(
    createPool(maxSize = 10)
  )(
    pool => pool.close()
  )
}
```

## Conclusion

This guide provides comprehensive information for developing on the F1R3FLY blockchain platform. Key takeaways:

1. **Environment Setup**: Proper tooling and configuration are essential
2. **Build System**: Master SBT for efficient development
3. **Testing**: Comprehensive testing ensures reliability
4. **Debugging**: Use appropriate tools for different scenarios
5. **Performance**: Profile and optimize critical paths
6. **Collaboration**: Follow guidelines for smooth teamwork

For additional resources:
- [Scala Documentation](https://docs.scala-lang.org/)
- [Cats Effect Guide](https://typelevel.org/cats-effect/)
- [SBT Reference](https://www.scala-sbt.org/documentation.html)
- [Protocol Buffers](https://developers.google.com/protocol-buffers)

---

*Last Updated: 2025*  
*Part of the [Artificial Superintelligence Alliance](https://superintelligence.io)*
