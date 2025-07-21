# ASI-Chain Repository Operations & Maintenance SOP

**Version:** 1.0  
**Status:** Adopted  
**Last Updated:** 2025-07-13

This document provides a Standard Operating Procedure (SOP) for all development, maintenance, and community operations related to the ASI-Chain repository. Its purpose is to ensure consistency, quality, and security as the project grows and transitions to a public, open-source model.

## 1. Guiding Principles

All contributions and maintenance activities must adhere to the following core principles:

-   **Security First**: The security of the blockchain, the wallet, and user assets is paramount. All changes must be evaluated for security implications.
-   **Open and Transparent**: Development and decision-making processes should be public and accessible to the community.
-   **High-Quality Code**: Code must be clean, well-tested, maintainable, and adhere to the established coding standards.
-   **Comprehensive Documentation**: All features, APIs, and architectural decisions must be thoroughly documented.
-   **Community-Driven**: The project values community contributions and will foster a welcoming and collaborative environment.

## 2. Repository Structure

The `asi-chain` workspace is a monorepo containing several key components:

-   `contracts/`: Rholang smart contracts for the blockchain.
-   `node/`: The Scala-based F1R3FLY node software (cloned from external repo during deployment).
-   `cli/`: The Rust-based `node-cli` tool for network interaction (cloned from external repo during deployment).
-   `asi_wallet_v2/`: The React-based, static client-side wallet application.
-   `block-explorer/`: Python-based blockchain explorer with web interface.
-   `finalizer-bot/`: Python-based automated block production bot.
-   `scripts/`: Automation scripts for deployment and maintenance.
-   `patches/`: Git patches for fixing upstream issues.
-   `docs/`: All project documentation, including this SOP and the project roadmap.

## 3. Development Workflow

### 3.1. Branching Strategy

This repository follows a GitFlow-like branching model:

-   `main`: The `main` branch represents the latest stable, production-ready release. Direct commits are forbidden. Merges are done only from `release` branches.
-   `develop`: The `develop` branch is the primary branch for ongoing development. It contains the latest delivered development changes for the next release.
-   `feature/<feature-name>`: Feature branches are for developing new functionality. They must branch from `develop` and be merged back into `develop` via a pull request.
-   `fix/<issue-number>`: Fix branches are for addressing bugs. They should branch from `develop` and be merged back into `develop`.
-   `release/<version>`: Release branches are for preparing a new production release. They branch from `develop` and are used for final testing, version bumping, and documentation updates. Once ready, they are merged into `main` and `develop`.

### 3.2. Commit Message Guidelines

We follow the [Conventional Commits](https://www.conventionalcommits.org/) specification to ensure a clean and descriptive commit history. Every commit message should be in the format:

```
<type>(<scope>): <subject>
```

-   **Types**: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `chore`.
-   **Scope**: The part of the codebase affected (e.g., `wallet`, `node`, `cli`, `security`).

**Example:** `feat(wallet): add multi-account support`

### 3.3. Pull Request (PR) Process

1.  **Create PR**: Open a pull request from your `feature` or `fix` branch into the `develop` branch.
2.  **Use Template**: Fill out the PR template completely, detailing the changes, motivation, and how to test them.
3.  **Link Issues**: Link any relevant GitHub issues that the PR resolves.
4.  **CI Checks**: Ensure all automated checks (linting, tests, build) pass.
5.  **Review**: At least one other core contributor must review and approve the PR. A security-focused review is required for changes affecting sensitive areas (e.g., cryptography, authentication).
6.  **Merge**: Once approved and all checks pass, the PR can be squashed and merged into `develop`.

## 4. Release Management

### 4.1. Versioning

The project adheres strictly to [Semantic Versioning (SemVer)](https://semver.org/). All releases will be tagged with a `vX.Y.Z` version number.

### 4.2. Changelog

All user-facing changes **must** be documented in the relevant `CHANGELOG.md` file (`wallet/CHANGELOG.md`, etc.) before a release is finalized. The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

### 4.3. Release Process

1.  **Create Release Branch**: From `develop`, create a `release/vX.Y.Z` branch.
2.  **Finalize Changes**: Perform final testing. Only bug fixes are allowed on this branch.
3.  **Update Version & Changelog**: Update the `package.json` version number and finalize the `CHANGELOG.md`.
4.  **Merge**:
    -   Merge the release branch into `main`.
    -   Tag the `main` branch with the version number (e.g., `git tag -a vX.Y.Z -m "Release vX.Y.Z"`).
    -   Merge the release branch back into `develop` to incorporate the version updates.
5.  **GitHub Release**: Create a new release on GitHub from the tag, including the changelog notes.

## 5. Security Policy

### 5.1. Vulnerability Reporting

-   **DO NOT** open a public GitHub issue for security vulnerabilities.
-   Please report suspected vulnerabilities privately through [GitHub Security Advisories](https://github.com/F1R3FLY-io/f1r3fly/security/advisories) or contact the maintainers directly through GitHub.
-   We will aim to acknowledge the report within 48 hours and provide a timeline for a fix.

### 5.2. Dependency Management

-   Dependencies will be regularly scanned for vulnerabilities using tools like `npm audit` and Dependabot.
-   Critical vulnerabilities must be patched immediately.
-   All dependencies will be reviewed quarterly to remove unused packages and update outdated ones.

## 6. Documentation Standards

-   **Docs as Code**: All documentation is maintained in Markdown files within the `/docs` directories.
-   **Mandatory Documentation**: All new features, API changes, and significant architectural modifications must be accompanied by documentation.
-   **Clarity and Examples**: Documentation should be clear, concise, and include code examples where appropriate. Outdated documentation must be flagged or updated.

## 7. Issue Management

-   **Triage**: New issues will be triaged by a core contributor within 3 business days. They will be labeled with `bug`, `enhancement`, `documentation`, etc., and assigned a priority.
-   **Stale Issues**: Issues with no activity for more than 90 days will be marked as `stale` and may be closed if no further discussion occurs within 14 days.

## 8. Deployment

-   **Wallet & dApp**: The `wallet` and `test-dapp-rchain` applications are deployed automatically via GitHub Actions upon pushes to the `main` branch. The primary hosting targets are GitHub Pages and IPFS.
-   **Blockchain Network**: The test network is deployed manually using the `scripts/deploy.sh` script, which orchestrates the Docker Compose setup for the nodes and observers.

This SOP is a living document and will be updated as the project's needs evolve.