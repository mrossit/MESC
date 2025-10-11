#!/bin/bash
# MESC Refactoring Automation Tools
# Usage: bash scripts/refactoring-tools.sh [command]

set -e

BLUE='\033[0;34m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Function to print colored output
print_step() {
    echo -e "${BLUE}==>${NC} $1"
}

print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

# 1. Remove console.log statements (except console.error)
remove_console_logs() {
    print_step "Removing console.log statements..."

    # Backup first
    mkdir -p backups
    tar -czf "backups/pre-cleanup-$(date +%Y%m%d-%H%M%S).tar.gz" client/src

    # Remove console.log but keep console.error and console.warn
    find client/src -type f \( -name "*.tsx" -o -name "*.ts" \) \
        -exec sed -i '/console\.log(/d' {} \;

    print_success "Console.log statements removed"
}

# 2. Find unused components
find_unused_components() {
    print_step "Scanning for potentially unused components..."

    # Get all component files
    components=$(find client/src/components -type f \( -name "*.tsx" -o -name "*.ts" \) | xargs -I {} basename {} .tsx | sed 's/\.ts$//')

    echo "Checking usage of ${#components[@]} components..."

    unused=()
    for component in $components; do
        # Search for imports of this component
        count=$(grep -r "import.*$component" client/src --include="*.tsx" --include="*.ts" | wc -l)

        if [ "$count" -eq "0" ]; then
            unused+=("$component")
        fi
    done

    if [ ${#unused[@]} -eq 0 ]; then
        print_success "No unused components found"
    else
        print_warning "Potentially unused components:"
        printf '%s\n' "${unused[@]}"
        echo "Review these manually before deleting!"
    fi
}

# 3. Find unused imports (requires eslint)
fix_unused_imports() {
    print_step "Fixing unused imports with ESLint..."

    if ! command -v npx &> /dev/null; then
        print_error "npx not found. Install Node.js first."
        exit 1
    fi

    npx eslint client/src --fix --ext .ts,.tsx 2>/dev/null || {
        print_warning "ESLint found issues. Check output above."
    }

    print_success "ESLint autofix completed"
}

# 4. Find large files that need optimization
find_large_files() {
    print_step "Finding large files (>500 lines)..."

    find client/src -type f \( -name "*.tsx" -o -name "*.ts" \) -exec wc -l {} \; | \
        awk '$1 > 500 {print $1, $2}' | \
        sort -rn | \
        head -20

    print_success "Large files listed above (consider splitting)"
}

# 5. Count dead code
count_commented_code() {
    print_step "Counting commented-out code..."

    total_lines=$(find client/src -type f \( -name "*.tsx" -o -name "*.ts" \) -exec cat {} \; | wc -l)
    comment_lines=$(find client/src -type f \( -name "*.tsx" -o -name "*.ts" \) -exec grep -E '^\s*//' {} \; | wc -l)

    echo "Total lines: $total_lines"
    echo "Comment lines: $comment_lines"
    echo "Comment ratio: $(echo "scale=2; $comment_lines * 100 / $total_lines" | bc)%"

    print_success "Comment analysis complete"
}

# 6. Bundle size analysis
analyze_bundle() {
    print_step "Analyzing bundle size..."

    npm run build 2>&1 | tee build-output.txt

    # Extract bundle sizes
    grep -E "\.(js|css)" build-output.txt | grep -E "[0-9]+\.[0-9]+ (kB|MB)"

    print_success "Bundle analysis complete"
}

# 7. Find duplicate code
find_duplicates() {
    print_step "Searching for potential duplicate code..."

    # Find files with similar names (might be duplicates)
    find client/src -type f \( -name "*.tsx" -o -name "*.ts" \) | \
        sed 's/.*\///' | \
        sort | \
        uniq -d

    print_success "Duplicate file name check complete"
}

# 8. Check for missing prop types
check_proptypes() {
    print_step "Checking for components without prop types..."

    # Find function components without props interface
    grep -r "export.*function\|export.*const.*=" client/src/components --include="*.tsx" | \
        grep -v "interface.*Props" | \
        head -20

    print_success "PropTypes check complete"
}

# 9. Full cleanup run
full_cleanup() {
    print_step "Running full cleanup sequence..."

    remove_console_logs
    fix_unused_imports
    find_unused_components
    find_large_files
    count_commented_code
    analyze_bundle

    print_success "Full cleanup complete!"
    print_warning "Review changes before committing"
}

# 10. Generate report
generate_report() {
    print_step "Generating refactoring report..."

    {
        echo "# MESC Refactoring Report"
        echo "Generated: $(date)"
        echo ""
        echo "## File Statistics"
        echo "- Total TS/TSX files: $(find client/src -type f \( -name "*.tsx" -o -name "*.ts" \) | wc -l)"
        echo "- Total lines: $(find client/src -type f \( -name "*.tsx" -o -name "*.ts" \) -exec cat {} \; | wc -l)"
        echo "- Total components: $(find client/src/components -type f -name "*.tsx" | wc -l)"
        echo ""
        echo "## Code Quality"
        echo "- Console.logs: $(grep -r "console\.log" client/src --include="*.tsx" --include="*.ts" | wc -l)"
        echo "- TODO comments: $(grep -r "TODO\|FIXME" client/src --include="*.tsx" --include="*.ts" | wc -l)"
        echo ""
        echo "## Bundle Size"
        npm run build 2>&1 | grep -E "\.(js|css)" | grep -E "[0-9]+\.[0-9]+ (kB|MB)"
    } > REFACTORING_REPORT.md

    print_success "Report generated: REFACTORING_REPORT.md"
}

# Main menu
case "${1:-help}" in
    console-logs)
        remove_console_logs
        ;;
    unused-components)
        find_unused_components
        ;;
    unused-imports)
        fix_unused_imports
        ;;
    large-files)
        find_large_files
        ;;
    commented-code)
        count_commented_code
        ;;
    bundle)
        analyze_bundle
        ;;
    duplicates)
        find_duplicates
        ;;
    proptypes)
        check_proptypes
        ;;
    full)
        full_cleanup
        ;;
    report)
        generate_report
        ;;
    help|*)
        echo "MESC Refactoring Tools"
        echo ""
        echo "Usage: bash scripts/refactoring-tools.sh [command]"
        echo ""
        echo "Commands:"
        echo "  console-logs        Remove console.log statements"
        echo "  unused-components   Find potentially unused components"
        echo "  unused-imports      Fix unused imports with ESLint"
        echo "  large-files         Find files >500 lines"
        echo "  commented-code      Count commented code"
        echo "  bundle              Analyze bundle size"
        echo "  duplicates          Find duplicate filenames"
        echo "  proptypes           Check missing prop types"
        echo "  full                Run full cleanup"
        echo "  report              Generate refactoring report"
        echo "  help                Show this help"
        ;;
esac
