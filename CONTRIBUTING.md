# Contributing to ASI Chain

Thank you for your interest in contributing to ASI Chain! We welcome contributions from the community and are excited to work with you.

## Code of Conduct

By participating in this project, you agree to abide by our Code of Conduct:
- Be respectful and inclusive
- Welcome newcomers and help them get started
- Focus on constructive criticism
- Accept feedback gracefully

## How to Contribute

### 1. Find an Issue

- Check our [open issues](https://github.com/asi-alliance/asi-chain/issues)
- Look for issues labeled `good first issue` for newcomers
- Comment on the issue to let others know you're working on it

### 2. Fork and Clone

```bash
# Fork the repository on GitHub, then:
git clone https://github.com/YOUR_USERNAME/asi-chain.git
cd asi-chain
git remote add upstream https://github.com/asi-alliance/asi-chain.git
```

### 3. Create a Branch

```bash
git checkout -b feature/your-feature-name
# or
git checkout -b fix/issue-number-description
```

### 4. Make Your Changes

- Follow the existing code style
- Add tests for new functionality
- Update documentation as needed
- Keep commits atomic and well-described

### 5. Test Your Changes

```bash
# For Python code (Graph RAG)
cd chat
python -m pytest test_*.py

# Run performance tests
python graph_performance_test.py

# Check code quality
black .
flake8 .
```

### 6. Submit a Pull Request

```bash
git push origin feature/your-feature-name
```

Then create a PR on GitHub with:
- Clear title describing the change
- Reference to any related issues
- Description of what changed and why
- Screenshots/demos if applicable

## Development Guidelines

### Python (Graph RAG Bot)

- Use Python 3.8+
- Follow PEP 8 style guide
- Use type hints where possible
- Add docstrings to all functions
- Keep functions focused and small

### Code Quality Standards

- No hardcoded API keys or secrets
- All user input must be validated
- SQL/Cypher queries must be parameterized
- Add error handling for external calls
- Include logging for debugging

### Testing Requirements

- New features need unit tests
- Bug fixes need regression tests
- Maintain >80% code coverage
- Performance-critical code needs benchmarks

### Documentation

- Update README.md for user-facing changes
- Add inline comments for complex logic
- Update API documentation
- Include examples for new features

## Pull Request Process

1. **Automated Checks**: Your PR will trigger automated tests
2. **Code Review**: A maintainer will review your code
3. **Feedback**: Address any requested changes
4. **Approval**: Once approved, a maintainer will merge

## Types of Contributions

### 🐛 Bug Reports

- Use the bug report template
- Include steps to reproduce
- Provide system information
- Attach relevant logs

### ✨ Feature Requests

- Use the feature request template
- Explain the use case
- Provide examples if possible
- Be open to alternative solutions

### 📖 Documentation

- Fix typos and clarify explanations
- Add examples and tutorials
- Translate documentation
- Improve code comments

### 🔬 Performance

- Optimize slow code paths
- Reduce memory usage
- Improve query performance
- Add caching strategies

## Recognition

Contributors are recognized in:
- The CONTRIBUTORS.md file
- Release notes
- Our GitHub Discussions community

## Getting Help

- Join our [GitHub Discussions](https://github.com/asi-alliance/asi-chain/discussions)
- Ask questions in the Q&A section
- Review existing documentation
- Tag @web3guru888 for Graph RAG questions

## Advanced Contributing

### Becoming a Maintainer

Active contributors may be invited to become maintainers. Maintainers can:
- Merge pull requests
- Publish releases
- Guide project direction

### Release Process

We follow semantic versioning (MAJOR.MINOR.PATCH):
- MAJOR: Breaking changes
- MINOR: New features
- PATCH: Bug fixes

## License

By contributing, you agree that your contributions will be licensed under the same license as the project (MIT).

---

Thank you for contributing to ASI Chain! Your efforts help make this project better for everyone. 🚀