#!/bin/bash

# 🎨 Migration Script for Row Background Colors
# This script adds rowBackgroundColor field to all products in MongoDB

echo "🚀 Starting Row Background Color Migration..."
echo "================================================"

# Change to the API directory
cd /var/www/Bukowski_app_API/Bukowski_app_API/backend/api

# Check if the migration file exists
if [ ! -f "migrate_add_row_colors.js" ]; then
    echo "❌ Migration file not found: migrate_add_row_colors.js"
    echo "Make sure the file is uploaded to the server first!"
    exit 1
fi

# Show current directory and migration file
echo "📂 Current directory: $(pwd)"
echo "📄 Migration file: $(ls -la migrate_add_row_colors.js)"

# Run the migration
echo ""
echo "🔄 Running migration..."
echo "================================================"
node migrate_add_row_colors.js

# Check the exit status
if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Migration completed successfully!"
    echo "🎨 All products now have rowBackgroundColor field"
    echo "📊 You can now use color pickers in the SearchEngine table"
else
    echo ""
    echo "❌ Migration failed!"
    echo "Check the error messages above"
    exit 1
fi

echo ""
echo "🏁 Migration script finished"
echo "================================================"