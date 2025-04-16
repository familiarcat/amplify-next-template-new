#!/bin/bash

# Generate a unique ID
ID=$(uuidgen)
CONTENT="Test Todo created at $(date -u +"%Y-%m-%dT%H:%M:%SZ")"

echo "Creating Todo with ID: $ID"
echo "Content: $CONTENT"

# Get the API endpoint and API key from the amplify_outputs.json file
API_ENDPOINT=$(cat amplify_outputs.json | jq -r '.data.url')
API_KEY=$(cat amplify_outputs.json | jq -r '.data.api_key')

echo "API Endpoint: $API_ENDPOINT"
echo "API Key: $API_KEY"

# Create the mutation
MUTATION=$(cat <<EOF
mutation CreateTodo {
  createTodo(input: {
    id: "$ID",
    content: "$CONTENT",
    completed: false
  }) {
    id
    content
    completed
    createdAt
    updatedAt
  }
}
EOF
)

# Create a temporary file with the mutation
MUTATION_FILE=$(mktemp)
echo "{\"query\": \"$(echo $MUTATION | tr -d '\n' | sed 's/"/\\"/g')\"}" > $MUTATION_FILE

# Execute the mutation
echo "Executing GraphQL mutation..."
curl -X POST \
  -H "Content-Type: application/json" \
  -H "x-api-key: $API_KEY" \
  -d @$MUTATION_FILE \
  $API_ENDPOINT

# Clean up the temporary file
rm $MUTATION_FILE
