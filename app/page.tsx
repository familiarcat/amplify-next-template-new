"use client";

import { useState, useEffect } from "react";
import { generateClient } from "aws-amplify/data";
import { Amplify } from 'aws-amplify';
import type { Schema } from "@/amplify/data/resource";
import "./../app/app.css";
import "@aws-amplify/ui-react/styles.css";

// Configure Amplify at the root of your app
Amplify.configure({
  // Minimal configuration for client-side only
  API: {
    GraphQL: {
      endpoint: process.env.NEXT_PUBLIC_GRAPHQL_ENDPOINT || '',
      region: process.env.NEXT_PUBLIC_AWS_REGION || 'us-east-1',
      defaultAuthMode: 'userPool'
    }
  },
  Auth: {
    Cognito: {
      userPoolId: process.env.NEXT_PUBLIC_USER_POOL_ID || '',
      userPoolClientId: process.env.NEXT_PUBLIC_USER_POOL_CLIENT_ID || '',
      identityPoolId: process.env.NEXT_PUBLIC_IDENTITY_POOL_ID || '',
    }
  }
}, { ssr: true });

const client = generateClient<Schema>();

type Todo = Schema["Todo"]["type"];

export default function App() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const subscription = client.models.Todo.observeQuery().subscribe({
      next: ({ items }) => {
        setTodos(items);
        setLoading(false);
      },
      error: (error) => {
        console.error("Subscription error:", error);
        setError("Failed to load todos");
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  async function createTodo() {
    try {
      const content = window.prompt("Todo content");
      if (!content) return;

      await client.models.Todo.create({
        content,
        status: 'PENDING',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        owner: 'current-user', // This would normally be the authenticated user's ID
      });
    } catch (err) {
      console.error("Create error:", err);
      setError("Failed to create todo");
    }
  }

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <main>
      <h1>My todos</h1>
      <button onClick={createTodo}>+ new</button>
      <ul>
        {todos.map((todo) => (
          <li key={todo.id}>
            {todo.content} - {todo.status}
          </li>
        ))}
      </ul>
      <div>
        🥳 App successfully hosted. Try creating a new todo.
        <br />
        <a href="https://docs.amplify.aws/gen2/start/quickstart/">
          Review Gen 2 documentation
        </a>
      </div>
    </main>
  );
}
