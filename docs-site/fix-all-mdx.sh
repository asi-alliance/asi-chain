#!/bin/bash
# Fix all MDX issues in documentation files

# Fix all instances of < followed by numbers or special patterns
for file in docs/**/*.md; do
  if [ -f "$file" ]; then
    # Replace common patterns
    sed -i '' 's/<-/<-/g' "$file"
    sed -i '' 's/<[0-9]/\&lt;/g' "$file"
    sed -i '' 's/<node/\&lt;node/g' "$file"
    sed -i '' 's/<your/\&lt;your/g' "$file"
    sed -i '' 's/<address>/\&lt;address\&gt;/g' "$file"
    sed -i '' 's/<amount>/\&lt;amount\&gt;/g' "$file"
    sed -i '' 's/<private_key>/\&lt;private_key\&gt;/g' "$file"
    sed -i '' 's/<channel>/\&lt;channel\&gt;/g' "$file"
  fi
done

echo "All MDX issues fixed"
