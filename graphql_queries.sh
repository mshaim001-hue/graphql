#!/bin/bash

# GraphQL API endpoint
API_URL="https://01.tomorrow-school.ai/api/graphql-engine/v1/graphql"

# You need to replace YOUR_JWT_TOKEN with your actual JWT token
JWT_TOKEN="YOUR_JWT_TOKEN"

echo "=== GraphQL Direct Queries for Tomorrow School ==="
echo "API Endpoint: $API_URL"
echo ""

# Function to make GraphQL request
make_graphql_request() {
    local query="$1"
    local description="$2"
    
    echo "=== $description ==="
    echo "Query: $query"
    echo ""
    
    curl -X POST \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $JWT_TOKEN" \
        --data "{\"query\": \"$query\"}" \
        "$API_URL" | jq '.'
    
    echo ""
    echo "---"
    echo ""
}

# 1. Get user info
make_graphql_request \
    "query { user { id login profile attrs createdAt campus } }" \
    "Get User Information"

# 2. Get audit data with result information
make_graphql_request \
    "query { audit(limit: 5) { id grade createdAt resultId result { id userId objectId object { id name type authorId } user { id login } } } }" \
    "Get Audit Data with Result Information"

# 3. Get result data directly
make_graphql_request \
    "query { result(limit: 5) { id userId objectId grade object { id name type authorId } user { id login } } }" \
    "Get Result Data Directly"

# 4. Get progress data
make_graphql_request \
    "query { progress(limit: 5) { id userId objectId grade object { id name type authorId } user { id login } } }" \
    "Get Progress Data"

# 5. Get object data
make_graphql_request \
    "query { object(limit: 10) { id name type authorId attrs } }" \
    "Get Object Data"

echo "=== Instructions ==="
echo "1. Replace YOUR_JWT_TOKEN with your actual JWT token"
echo "2. Make sure you have 'jq' installed for JSON formatting"
echo "3. Run: chmod +x graphql_queries.sh && ./graphql_queries.sh"
echo ""
echo "To get your JWT token:"
echo "1. Open your app in browser"
echo "2. Open Developer Tools (F12)"
echo "3. Go to Application/Storage tab"
echo "4. Look for 'jwt' in localStorage"
echo "5. Copy the token value"
