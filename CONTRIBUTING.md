# Contributing to MCP Boilerplate

Thank you for your interest in contributing to the MCP Boilerplate project! This document provides guidelines and information for contributors.

## 🤝 How to Contribute

### Reporting Bugs

1. **Check existing issues** first to avoid duplicates
2. **Use the bug report template** when creating new issues
3. **Include as much detail as possible**:
   - Operating system and version
   - Programming language and version
   - Steps to reproduce
   - Expected vs actual behavior
   - Error messages or logs

### Suggesting Features

1. **Check if the feature already exists** or is planned
2. **Open a feature request issue** with:
   - Clear description of the feature
   - Use case and benefits
   - Possible implementation approach
   - Any alternatives you've considered

### Submitting Code Changes

1. **Fork the repository**
2. **Create a feature branch** from `develop`:
   ```bash
   git checkout develop
   git checkout -b feature/your-feature-name
   ```
3. **Make your changes** following our coding standards
4. **Add tests** for new functionality
5. **Update documentation** if needed
6. **Run the test suite** to ensure everything works
7. **Commit with clear messages** following conventional commits
8. **Push to your fork** and create a pull request

## 📝 Coding Standards

### General Guidelines

- **Follow existing patterns** in the codebase
- **Write clear, self-documenting code**
- **Add comments for complex logic**
- **Keep functions small and focused**
- **Use meaningful variable and function names**

### Python (python-server/)

- Follow **PEP 8** style guide
- Use **type hints** for all functions
- Maximum line length: **88 characters** (Black formatter)
- Use **async/await** for asynchronous operations
- Add **docstrings** for all public functions
- Use **Pydantic** for data validation

Example:
```python
async def calculate_sum(a: float, b: float) -> float:
    """Calculate the sum of two numbers.
    
    Args:
        a: First number
        b: Second number
        
    Returns:
        The sum of a and b
    """
    return a + b
```

### TypeScript (typescript-server/)

- Follow **ESLint** configuration
- Use **strict TypeScript** settings
- Prefer **const** over **let**
- Use **async/await** over Promises
- Add **JSDoc comments** for public functions
- Use **Zod** for runtime validation

Example:
```typescript
/**
 * Calculate the sum of two numbers
 * @param a - First number
 * @param b - Second number
 * @returns The sum of a and b
 */
async function calculateSum(a: number, b: number): Promise<number> {
  return a + b;
}
```

### Java (java-server/)

- Follow **Google Java Style Guide**
- Use **Lombok** for reducing boilerplate
- Add **Javadoc** for public methods
- Use **Spring annotations** appropriately
- Follow **RESTful** API conventions

Example:
```java
/**
 * Calculate the sum of two numbers.
 *
 * @param a the first number
 * @param b the second number
 * @return the sum of a and b
 */
public double calculateSum(double a, double b) {
    return a + b;
}
```

## 🧪 Testing

### Running Tests

```bash
# Python tests
cd python-server
python -m pytest tests/ -v

# TypeScript tests
cd typescript-server
npm test

# Java tests
cd java-server
./mvnw test

# All tests
./scripts/test-servers.sh
```

### Writing Tests

- **Write tests for all new features**
- **Test edge cases and error conditions**
- **Use descriptive test names**
- **Keep tests isolated and independent**
- **Mock external dependencies**

### Test Coverage

- Aim for **90%+ code coverage**
- Focus on **critical business logic**
- Don't test framework code or simple getters/setters

## 📋 Pull Request Process

1. **Update the README.md** if needed
2. **Update the CHANGELOG.md** with your changes
3. **Ensure all tests pass** and coverage is maintained
4. **Request review** from maintainers
5. **Address feedback** promptly and professionally
6. **Squash commits** if requested before merging

### Pull Request Template

```markdown
## Description
Brief description of the changes

## Type of Change
- [ ] Bug fix (non-breaking change)
- [ ] New feature (non-breaking change)
- [ ] Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] Documentation update

## Testing
- [ ] I have added tests that prove my fix is effective or that my feature works
- [ ] New and existing unit tests pass locally with my changes

## Checklist
- [ ] My code follows the style guidelines of this project
- [ ] I have performed a self-review of my own code
- [ ] I have commented my code, particularly in hard-to-understand areas
- [ ] I have made corresponding changes to the documentation
- [ ] My changes generate no new warnings
```

## 🔄 Development Workflow

### Branch Structure

- **`main`** - Production-ready code
- **`develop`** - Integration branch for new features
- **`feature/*`** - Individual feature branches
- **`bugfix/*`** - Bug fix branches
- **`hotfix/*`** - Emergency fixes for production

### Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

Types:
- **feat**: A new feature
- **fix**: A bug fix
- **docs**: Documentation only changes
- **style**: Changes that do not affect the meaning of the code
- **refactor**: A code change that neither fixes a bug nor adds a feature
- **perf**: A code change that improves performance
- **test**: Adding missing tests or correcting existing tests
- **chore**: Changes to the build process or auxiliary tools

Examples:
```
feat(python): add rate limiting to calculator tool
fix(typescript): handle division by zero properly
docs: update installation instructions
```

## 🏗️ Adding New Tools

When contributing new MCP tools:

1. **Implement in all three languages** (Python, TypeScript, Java)
2. **Follow the established patterns**:
   - Input validation with schemas
   - Proper error handling
   - Consistent output format
   - Security considerations

3. **Add comprehensive tests**
4. **Update documentation**:
   - Tool description in README
   - Usage examples in EXAMPLES.md
   - API documentation

5. **Consider security implications**:
   - Input sanitization
   - Authorization requirements
   - Rate limiting needs

## 🌟 Recognition

Contributors will be:
- **Listed in the README** contributors section
- **Mentioned in release notes** for significant contributions
- **Invited to be maintainers** for sustained quality contributions

## 📞 Getting Help

- **GitHub Discussions** for questions and ideas
- **GitHub Issues** for bugs and feature requests
- **Discord/Slack** (if available) for real-time chat

## 📄 License

By contributing, you agree that your contributions will be licensed under the same license as the project (MIT License).

---

Thank you for helping make MCP Boilerplate better! 🚀 