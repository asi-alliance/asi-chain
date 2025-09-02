#!/bin/bash
# Fix MDX parsing issues in documentation

# Fix files with < character issues
sed -i '' 's/<node_name>/\&lt;node_name\&gt;/g' docs/tools/operational-scripts.md
sed -i '' 's/<3ms/\&lt;3ms/g' docs/operations/runbook.md
sed -i '' 's/<99%/\&lt;99%/g' docs/performance/benchmarks.md
sed -i '' 's/<32GB/\&lt;32GB/g' docs/performance/tuning-guide.md
sed -i '' 's/<1% CPU/\&lt;1% CPU/g' docs/tools/rust-client-tests.md
sed -i '' 's/<0.8%/\&lt;0.8%/g' docs/monitoring/stress-testing.md

echo "MDX issues fixed"