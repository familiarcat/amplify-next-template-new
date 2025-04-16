"use client";

import { useState, useEffect } from "react";
import { client } from "@/app/client";
import { Schema } from "@/amplify/data/resource";
import { Button, Flex, Heading, Text, TextField, CheckboxField, View, useTheme } from "@aws-amplify/ui-react";
import { useAuth } from "./LocalAuthProvider";

type Todo = Schema["Todo"]["type"];

// Safely access localStorage
const getLocalStorage = () => {
  if (typeof window !== 'undefined') {
    return window.localStorage;
  }
  return null;
};

// Function to check if we're in a local environment
const getIsLocal = () => {
  return typeof window !== 'undefined' && window.location.hostname === 'localhost';
};

export function TodoList() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [localTodos, setLocalTodos] = useState<Todo[]>([]);
  const [newTodo, setNewTodo] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isLocal, setIsLocal] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const { tokens } = useTheme();

  // Get auth context if in local mode
  let auth: any = null;
  try {
    auth = useAuth();
  } catch (err) {
    // This will throw an error if not used within LocalAuthProvider
    // We'll just ignore it since we're checking isLocal anyway
  }

  // Set up the component on mount
  useEffect(() => {
    setIsLocal(getIsLocal());
    setIsMounted(true);
  }, []);

  // Determine which todos to display
  const displayTodos = isLocal && !isConnected ? localTodos : todos;

  // Load local todos from localStorage
  useEffect(() => {
    if (isLocal && isMounted) {
      const storage = getLocalStorage();
      if (!storage) return;

      const storedTodos = storage.getItem('localTodos');
      if (storedTodos) {
        try {
          setLocalTodos(JSON.parse(storedTodos));
        } catch (err) {
          console.error('Error parsing stored todos:', err);
        }
      }
    }
  }, [isLocal, isMounted]);

  // Save local todos to localStorage when they change
  useEffect(() => {
    if (isLocal && isMounted && localTodos.length > 0) {
      const storage = getLocalStorage();
      if (!storage) return;

      storage.setItem('localTodos', JSON.stringify(localTodos));
    }
  }, [localTodos, isLocal, isMounted]);

  // Try to connect to the backend and fetch todos
  useEffect(() => {
    // Only run this effect if the component is mounted
    if (!isMounted) return;

    async function checkConnectionAndFetchTodos() {
      try {
        // Check if we can connect to the backend
        const { data } = await client.models.Todo.list();
        setTodos(data);
        setIsConnected(true);
        setError(null);
        console.log('Connected to backend successfully');
      } catch (err) {
        console.error('Error connecting to backend:', err);
        setIsConnected(false);
        if (isLocal) {
          // In local mode, we'll use localStorage instead
          console.log('Using local storage for todos');
        } else {
          setError('Failed to connect to backend. Please try again later.');
        }
      } finally {
        setLoading(false);
      }
    }

    checkConnectionAndFetchTodos();
  }, [isMounted, isLocal]);

  // Create a new todo
  async function createTodo(e: React.FormEvent) {
    e.preventDefault();
    if (!newTodo.trim()) return;

    try {
      if (isLocal && !isConnected) {
        // Create todo locally
        const newTodoItem: Todo = {
          id: Date.now().toString(),
          content: newTodo,
          completed: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          owner: auth?.user?.username || 'local-user',
        } as Todo;

        setLocalTodos([newTodoItem, ...localTodos]);
      } else {
        // Create todo in the backend
        const { data: createdTodo } = await client.models.Todo.create({
          content: newTodo,
          completed: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });

        if (createdTodo) {
          setTodos([createdTodo, ...todos]);
        }
      }

      setNewTodo("");
    } catch (err) {
      console.error("Error creating todo:", err);
      setError("Failed to create todo. Please try again.");
    }
  }

  // Toggle todo completion status
  async function toggleTodoStatus(todo: Todo) {
    try {
      if (isLocal && !isConnected) {
        // Update todo locally
        const updatedTodo = {
          ...todo,
          completed: !todo.completed,
          updatedAt: new Date().toISOString(),
        };

        setLocalTodos(localTodos.map(t => t.id === todo.id ? updatedTodo : t));
      } else {
        // Update todo in the backend
        const { data: updatedTodo } = await client.models.Todo.update({
          id: todo.id,
          completed: !todo.completed,
          updatedAt: new Date().toISOString(),
        });

        if (updatedTodo) {
          setTodos(todos.map(t => t.id === updatedTodo.id ? updatedTodo : t));
        }
      }
    } catch (err) {
      console.error("Error updating todo:", err);
      setError("Failed to update todo. Please try again.");
    }
  }

  // Delete a todo
  async function deleteTodo(id: string) {
    try {
      if (isLocal && !isConnected) {
        // Delete todo locally
        setLocalTodos(localTodos.filter(todo => todo.id !== id));
      } else {
        // Delete todo in the backend
        await client.models.Todo.delete({ id });
        setTodos(todos.filter(todo => todo.id !== id));
      }
    } catch (err) {
      console.error("Error deleting todo:", err);
      setError("Failed to delete todo. Please try again.");
    }
  }

  // Toggle between local and connected mode (for testing)
  function toggleMode() {
    setIsConnected(!isConnected);
  }

  // Don't render anything until the component is mounted
  // This prevents hydration errors
  if (!isMounted) {
    return null;
  }

  if (loading) {
    return <Text>Loading todos...</Text>;
  }

  return (
    <View padding={tokens.space.medium}>
      <Heading level={2}>My Todo List</Heading>

      {error && <Text color="red">{error}</Text>}

      {isLocal && (
        <Flex marginBottom={tokens.space.small}>
          <Text fontSize={tokens.fontSizes.xs}>
            Mode: {isConnected ? 'Connected to backend' : 'Using local storage'}
          </Text>
          <Button
            size="small"
            variation="link"
            onClick={toggleMode}
            marginLeft={tokens.space.xs}
          >
            Switch to {isConnected ? 'Local' : 'Connected'} Mode
          </Button>
        </Flex>
      )}

      <form onSubmit={createTodo}>
        <Flex direction="row" alignItems="center">
          <TextField
            label="New Todo"
            labelHidden
            placeholder="What needs to be done?"
            value={newTodo}
            onChange={(e) => setNewTodo(e.target.value)}
            flex="1"
          />
          <Button type="submit" variation="primary" marginLeft={tokens.space.small}>
            Add
          </Button>
        </Flex>
      </form>

      <View marginTop={tokens.space.medium}>
        {displayTodos.length === 0 ? (
          <Text>No todos yet. Add one above!</Text>
        ) : (
          displayTodos.map((todo) => (
            <Flex
              key={todo.id}
              direction="row"
              alignItems="center"
              padding={tokens.space.small}
              backgroundColor={tokens.colors.background.secondary}
              marginBottom={tokens.space.xs}
              borderRadius={tokens.radii.small}
            >
              <CheckboxField
                label=""
                name={`todo-${todo.id}`}
                value={todo.id}
                checked={todo.completed === true}
                onChange={() => toggleTodoStatus(todo)}
              />
              <Text
                flex="1"
                marginLeft={tokens.space.xs}
                textDecoration={todo.completed ? "line-through" : "none"}
                color={todo.completed ? tokens.colors.font.tertiary : tokens.colors.font.primary}
              >
                {todo.content}
              </Text>
              <Button
                size="small"
                variation="link"
                onClick={() => deleteTodo(todo.id)}
              >
                Delete
              </Button>
            </Flex>
          ))
        )}
      </View>
    </View>
  );
}
