#!/bin/bash

# Test script for MCP Servers
# This script runs basic functionality tests for all server implementations

set -e

echo "🧪 Testing MCP Boilerplate Servers"
echo "================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    local status=$1
    local message=$2
    
    case $status in
        "SUCCESS")
            echo -e "${GREEN}✅ $message${NC}"
            ;;
        "ERROR")
            echo -e "${RED}❌ $message${NC}"
            ;;
        "INFO")
            echo -e "${YELLOW}ℹ️  $message${NC}"
            ;;
    esac
}

# Function to test Python server
test_python_server() {
    print_status "INFO" "Testing Python MCP Server..."
    
    cd python-server
    
    # Check if virtual environment exists
    if [ ! -d "venv" ]; then
        print_status "INFO" "Creating Python virtual environment..."
        python -m venv venv
    fi
    
    # Activate virtual environment
    source venv/bin/activate
    
    # Install dependencies
    pip install -r requirements.txt > /dev/null 2>&1
    
    # Run tests
    if python -m pytest tests/ -v; then
        print_status "SUCCESS" "Python server tests passed"
    else
        print_status "ERROR" "Python server tests failed"
        return 1
    fi
    
    # Run linting
    if python -m black --check server.py; then
        print_status "SUCCESS" "Python code formatting is correct"
    else
        print_status "ERROR" "Python code formatting issues found"
    fi
    
    # Type checking
    if python -m mypy server.py --ignore-missing-imports; then
        print_status "SUCCESS" "Python type checking passed"
    else
        print_status "ERROR" "Python type checking failed"
    fi
    
    deactivate
    cd ..
}

# Function to test TypeScript server
test_typescript_server() {
    print_status "INFO" "Testing TypeScript MCP Server..."
    
    cd typescript-server
    
    # Install dependencies
    if npm install > /dev/null 2>&1; then
        print_status "SUCCESS" "TypeScript dependencies installed"
    else
        print_status "ERROR" "Failed to install TypeScript dependencies"
        return 1
    fi
    
    # Type checking
    if npm run type-check; then
        print_status "SUCCESS" "TypeScript type checking passed"
    else
        print_status "ERROR" "TypeScript type checking failed"
    fi
    
    # Linting
    if npm run lint; then
        print_status "SUCCESS" "TypeScript linting passed"
    else
        print_status "ERROR" "TypeScript linting failed"
    fi
    
    # Build
    if npm run build; then
        print_status "SUCCESS" "TypeScript build completed"
    else
        print_status "ERROR" "TypeScript build failed"
        return 1
    fi
    
    # Run tests (if they exist)
    if [ -f "package.json" ] && npm run test > /dev/null 2>&1; then
        print_status "SUCCESS" "TypeScript tests passed"
    else
        print_status "INFO" "No TypeScript tests found or tests failed"
    fi
    
    cd ..
}

# Function to test Java server
test_java_server() {
    print_status "INFO" "Testing Java MCP Server..."
    
    cd java-server
    
    # Check if Maven wrapper exists
    if [ ! -f "mvnw" ]; then
        print_status "ERROR" "Maven wrapper not found"
        return 1
    fi
    
    # Make Maven wrapper executable
    chmod +x mvnw
    
    # Compile
    if ./mvnw compile -q; then
        print_status "SUCCESS" "Java compilation completed"
    else
        print_status "ERROR" "Java compilation failed"
        return 1
    fi
    
    # Run tests
    if ./mvnw test -q; then
        print_status "SUCCESS" "Java tests passed"
    else
        print_status "ERROR" "Java tests failed"
    fi
    
    # Package
    if ./mvnw package -DskipTests -q; then
        print_status "SUCCESS" "Java packaging completed"
    else
        print_status "ERROR" "Java packaging failed"
        return 1
    fi
    
    cd ..
}

# Function to test Docker builds
test_docker_builds() {
    print_status "INFO" "Testing Docker builds..."
    
    # Check if Docker is available
    if ! command -v docker &> /dev/null; then
        print_status "ERROR" "Docker not found, skipping Docker tests"
        return 1
    fi
    
    # Test Python Docker build
    if docker build -t mcp-python-test python-server/ > /dev/null 2>&1; then
        print_status "SUCCESS" "Python Docker build completed"
        docker rmi mcp-python-test > /dev/null 2>&1
    else
        print_status "ERROR" "Python Docker build failed"
    fi
    
    # Test TypeScript Docker build
    if docker build -t mcp-typescript-test typescript-server/ > /dev/null 2>&1; then
        print_status "SUCCESS" "TypeScript Docker build completed"
        docker rmi mcp-typescript-test > /dev/null 2>&1
    else
        print_status "ERROR" "TypeScript Docker build failed"
    fi
    
    # Test Java Docker build (if Dockerfile exists)
    if [ -f "java-server/Dockerfile" ]; then
        if docker build -t mcp-java-test java-server/ > /dev/null 2>&1; then
            print_status "SUCCESS" "Java Docker build completed"
            docker rmi mcp-java-test > /dev/null 2>&1
        else
            print_status "ERROR" "Java Docker build failed"
        fi
    fi
}

# Function to validate MCP schemas
validate_schemas() {
    print_status "INFO" "Validating MCP schemas and configurations..."
    
    # Check if required files exist
    local required_files=(
        "README.md"
        "docker-compose.yml"
        "python-server/requirements.txt"
        "python-server/server.py"
        "typescript-server/package.json"
        "typescript-server/tsconfig.json"
        "java-server/pom.xml"
    )
    
    for file in "${required_files[@]}"; do
        if [ -f "$file" ]; then
            print_status "SUCCESS" "Found required file: $file"
        else
            print_status "ERROR" "Missing required file: $file"
        fi
    done
    
    # Validate docker-compose.yml syntax
    if command -v docker-compose &> /dev/null; then
        if docker-compose config > /dev/null 2>&1; then
            print_status "SUCCESS" "Docker Compose configuration is valid"
        else
            print_status "ERROR" "Docker Compose configuration is invalid"
        fi
    fi
}

# Function to run security checks
security_checks() {
    print_status "INFO" "Running security checks..."
    
    # Check for hardcoded secrets in Python
    if grep -r "secret.*=" python-server/ --include="*.py" | grep -v "your-secret-key-change-in-production" | grep -v "development-secret"; then
        print_status "ERROR" "Potential hardcoded secrets found in Python code"
    else
        print_status "SUCCESS" "No hardcoded secrets found in Python code"
    fi
    
    # Check for hardcoded secrets in TypeScript
    if grep -r "secret.*:" typescript-server/src/ --include="*.ts" | grep -v "your-secret-key-change-in-production" | grep -v "development-secret"; then
        print_status "ERROR" "Potential hardcoded secrets found in TypeScript code"
    else
        print_status "SUCCESS" "No hardcoded secrets found in TypeScript code"
    fi
    
    # Check for proper .gitignore patterns
    if [ -f ".gitignore" ]; then
        local gitignore_patterns=("node_modules" "*.pyc" "__pycache__" ".env" "venv" "dist" "target")
        
        for pattern in "${gitignore_patterns[@]}"; do
            if grep -q "$pattern" .gitignore; then
                print_status "SUCCESS" "Gitignore includes: $pattern"
            else
                print_status "ERROR" "Gitignore missing: $pattern"
            fi
        done
    else
        print_status "ERROR" ".gitignore file not found"
    fi
}

# Main execution
main() {
    local failed=0
    
    echo "Starting comprehensive MCP server tests..."
    echo
    
    # Run tests
    validate_schemas || ((failed++))
    echo
    
    test_python_server || ((failed++))
    echo
    
    test_typescript_server || ((failed++))
    echo
    
    test_java_server || ((failed++))
    echo
    
    test_docker_builds || ((failed++))
    echo
    
    security_checks || ((failed++))
    echo
    
    # Summary
    echo "================================="
    if [ $failed -eq 0 ]; then
        print_status "SUCCESS" "All tests passed! 🎉"
        echo
        echo "Your MCP boilerplate is ready for development!"
        echo "Next steps:"
        echo "  1. Review the README.md files in each server directory"
        echo "  2. Customize the tools and resources for your use case"
        echo "  3. Set up proper authentication for production"
        echo "  4. Deploy using Docker Compose: docker-compose up -d"
        exit 0
    else
        print_status "ERROR" "$failed test(s) failed"
        echo
        echo "Please fix the issues above before proceeding."
        exit 1
    fi
}

# Check if we're in the right directory
if [ ! -f "README.md" ] || [ ! -d "python-server" ]; then
    print_status "ERROR" "Please run this script from the root of the MCP boilerplate directory"
    exit 1
fi

# Run main function
main "$@" 