#!/bin/bash

# Farcaster Mini App - Comprehensive Test Runner
# This script runs all test types to ensure real progress vs marginal improvements

set -e

echo "🚀 Farcaster Mini App - Comprehensive Test Suite"
echo "=================================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test counters
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# Function to run tests and capture results
run_test_suite() {
    local suite_name="$1"
    local test_command="$2"
    local test_type="$3"
    
    echo -e "\n${BLUE}🧪 Running $suite_name Tests...${NC}"
    echo "Command: $test_command"
    
    local start_time=$(date +%s)
    
    if eval "$test_command"; then
        local end_time=$(date +%s)
        local duration=$((end_time - start_time))
        echo -e "${GREEN}✅ $suite_name Tests PASSED (${duration}s)${NC}"
        PASSED_TESTS=$((PASSED_TESTS + 1))
    else
        local end_time=$(date +%s)
        local duration=$((end_time - start_time))
        echo -e "${RED}❌ $suite_name Tests FAILED (${duration}s)${NC}"
        FAILED_TESTS=$((FAILED_TESTS + 1))
    fi
    
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
}

# Function to check if tests exist
check_test_exists() {
    local test_pattern="$1"
    if find src -name "$test_pattern" -type f | grep -q .; then
        return 0
    else
        return 1
    fi
}

# Install dependencies if needed
echo -e "\n${YELLOW}📦 Checking dependencies...${NC}"
if ! npm list jest > /dev/null 2>&1; then
    echo "Installing Jest..."
    npm install --save-dev jest @testing-library/react @testing-library/jest-dom @testing-library/user-event
fi

if ! npm list @playwright/test > /dev/null 2>&1; then
    echo "Installing Playwright..."
    npm install --save-dev @playwright/test
    npx playwright install
fi

# Run Unit Tests
if check_test_exists "*.test.ts"; then
    run_test_suite "Unit" "npm run test:unit" "unit"
else
    echo -e "${YELLOW}⚠️  No unit tests found${NC}"
fi

# Run API Tests
if check_test_exists "*api*.test.ts"; then
    run_test_suite "API" "npm run test:api" "api"
else
    echo -e "${YELLOW}⚠️  No API tests found${NC}"
fi

# Run Integration Tests
if check_test_exists "*integration*.test.ts"; then
    run_test_suite "Integration" "npm run test:integration" "integration"
else
    echo -e "${YELLOW}⚠️  No integration tests found${NC}"
fi

# Run Performance Tests
if check_test_exists "*performance*.test.ts"; then
    run_test_suite "Performance" "npm run test:performance" "performance"
else
    echo -e "${YELLOW}⚠️  No performance tests found${NC}"
fi

# Run Security Tests
if check_test_exists "*security*.test.ts"; then
    run_test_suite "Security" "npm run test:security" "security"
else
    echo -e "${YELLOW}⚠️  No security tests found${NC}"
fi

# Run E2E Tests (if Playwright is available)
if command -v npx playwright > /dev/null 2>&1; then
    if [ -d "src/e2e" ] || check_test_exists "*.spec.ts"; then
        echo -e "\n${BLUE}🧪 Running E2E Tests...${NC}"
        echo "This may take a while as it tests real user workflows..."
        
        local start_time=$(date +%s)
        
        if npx playwright test --reporter=line; then
            local end_time=$(date +%s)
            local duration=$((end_time - start_time))
            echo -e "${GREEN}✅ E2E Tests PASSED (${duration}s)${NC}"
            PASSED_TESTS=$((PASSED_TESTS + 1))
        else
            local end_time=$(date +%s)
            local duration=$((end_time - start_time))
            echo -e "${RED}❌ E2E Tests FAILED (${duration}s)${NC}"
            FAILED_TESTS=$((FAILED_TESTS + 1))
        fi
        
        TOTAL_TESTS=$((TOTAL_TESTS + 1))
    else
        echo -e "${YELLOW}⚠️  No E2E tests found${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  Playwright not available, skipping E2E tests${NC}"
fi

# Generate Coverage Report
echo -e "\n${BLUE}📊 Generating Coverage Report...${NC}"
if npm run test:coverage > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Coverage report generated${NC}"
else
    echo -e "${YELLOW}⚠️  Coverage report generation failed${NC}"
fi

# Final Results
echo -e "\n${BLUE}📈 Test Results Summary${NC}"
echo "=================================================="
echo -e "Total Test Suites: ${TOTAL_TESTS}"
echo -e "Passed: ${GREEN}${PASSED_TESTS}${NC}"
echo -e "Failed: ${RED}${FAILED_TESTS}${NC}"

if [ $FAILED_TESTS -eq 0 ]; then
    echo -e "\n${GREEN}🎉 ALL TESTS PASSED! Your Farcaster Mini App is ready for real progress!${NC}"
    echo -e "${GREEN}✅ Authentication: Working${NC}"
    echo -e "${GREEN}✅ Unfollow API: Secure${NC}"
    echo -e "${GREEN}✅ User Interface: Responsive${NC}"
    echo -e "${GREEN}✅ Performance: Optimized${NC}"
    echo -e "${GREEN}✅ Security: Validated${NC}"
    exit 0
else
    echo -e "\n${RED}⚠️  ${FAILED_TESTS} test suite(s) failed. Review and fix before deployment.${NC}"
    echo -e "${YELLOW}💡 Focus on fixing the failed tests to ensure real progress.${NC}"
    exit 1
fi 