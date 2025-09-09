# F1R3FLY Patches

This directory contains patches for the F1R3FLY submodule that fix compatibility issues without modifying the submodule directly.

## Available Patches

### f1r3fly-docker-compose-env-fix.patch
**Purpose**: Fixes Docker Compose environment variable syntax compatibility issue  
**Issue**: Original syntax `${VAR:default}` causes errors in some Docker Compose versions  
**Fix**: Changes to standard syntax `${VAR:-default}`  

## Usage

### Apply All Patches
```bash
# From repository root
./scripts/apply-f1r3fly-patches.sh
```

### Apply Manually
```bash
# From repository root
cd f1r3fly
git apply ../patches/f1r3fly-docker-compose-env-fix.patch
```

### Revert Patches
```bash
# From repository root
cd f1r3fly
git checkout -- .
```

## When to Apply Patches

Apply patches when:
- Running Docker Compose deployment: `docker-compose -f shard-with-autopropose.yml up`
- Building Docker images locally
- Testing F1R3FLY functionality

You do NOT need patches for:
- Kubernetes deployment (uses pre-built images)
- Using the automated deployment script

## Creating New Patches

If you need to create a new patch:

1. Make your changes in the F1R3FLY submodule
2. Create the patch:
   ```bash
   cd f1r3fly
   git diff > ../patches/f1r3fly-your-fix-name.patch
   ```
3. Revert the changes:
   ```bash
   git checkout -- .
   ```
4. Update this README with patch details

## Important Notes

- Patches are applied locally only and are NOT committed to the submodule
- The deployment script handles these patches automatically when needed
- Always revert patches before committing to avoid submodule changes