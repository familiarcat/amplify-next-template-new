"use client";

import { useState, useEffect } from "react";
import { client, Todo } from "@/app/client";
import { Schema } from "@/amplify/data/resource";
import { Button, Flex, Heading, Text, TextField, CheckboxField, View, useTheme } from "@aws-amplify/ui-react";
import { useAuth } from "./LocalAuthProvider";
import { DataStore } from 'aws-amplify/datastore';

type TodoType = Schema["Todo"]["type"];

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
  const [todos, setTodos] = useState<TodoType[]>([]);
  const [newTodo, setNewTodo] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isMounted, setIsMounted] = useState(false);
  const { tokens } = useTheme();

  // Set up the component on mount
  useEffect(() => {
    setIsMounted(true);

    // Start DataStore and subscribe to changes
    const startDataStore = async () => {
      try {
        // Clear any existing data
        await DataStore.clear();

        // Start DataStore
        await DataStore.start();

        // Fetch initial todos
        fetchTodos();

        // Subscribe to changes
        const subscription = DataStore.observeQuery(Todo).subscribe(({ items }) => {
          console.log('DataStore subscription update:', items);
          setTodos(items as TodoType[]);
          setLoading(false);
        });

        return () => subscription.unsubscribe();
      } catch (err) {
        console.error('Error starting DataStore:', err);
        setError('Failed to initialize data synchronization. Please refresh the page.');
        setLoading(false);
      }
    };

    startDataStore();
  }, []);

  // Fetch todos from DataStore
  async function fetchTodos() {
    try {
      const todoItems = await DataStore.query(Todo);
      console.log('Fetched todos from DataStore:', todoItems);
      setTodos(todoItems as TodoType[]);
      setError(null);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching todos:', err);
      setError('Failed to fetch todos. Please try again.');
      setLoading(false);
    }
  }

  // Create a new todo
  async function createTodo(e: React.FormEvent) {
    e.preventDefault();
    if (!newTodo.trim()) return;

    try {
      // Create todo in DataStore
      const createdTodo = await DataStore.save(
        new Todo({
          content: newTodo,
          completed: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        })
      );

      console.log('Created todo in DataStore:', createdTodo);
      setNewTodo("");
      // No need to update state manually as the subscription will handle it
    } catch (err) {
      console.error("Error creating todo:", err);
      setError("Failed to create todo. Please try again.");
    }
  }

  // Toggle todo completion status
  async function toggleTodoStatus(todo: TodoType) {
    try {
      // Get the original item from DataStore
      const original = await DataStore.query(Todo, todo.id);
      if (!original) {
        console.error('Todo not found in DataStore:', todo.id);
        return;
      }

      // Update todo in DataStore
      await DataStore.save(
        Todo.copyOf(original, updated => {
          updated.completed = !todo.completed;
          updated.updatedAt = new Date().toISOString();
        })
      );

      console.log('Updated todo in DataStore:', todo.id);
      // No need to update state manually as the subscription will handle it
    } catch (err) {
      console.error("Error updating todo:", err);
      setError("Failed to update todo. Please try again.");
    }
  }

  // Delete a todo
  async function deleteTodo(id: string) {
    try {
      // Get the original item from DataStore
      const todoToDelete = await DataStore.query(Todo, id);
      if (!todoToDelete) {
        console.error('Todo not found in DataStore:', id);
        return;
      }

      // Delete todo from DataStore
      await DataStore.delete(todoToDelete);

      console.log('Deleted todo from DataStore:', id);
      // No need to update state manually as the subscription will handle it
    } catch (err) {
      console.error("Error deleting todo:", err);
      setError("Failed to delete todo. Please try again.");
    }
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

      <Flex marginBottom={tokens.space.small}>
        <Text fontSize={tokens.fontSizes.xs}>
          Mode: DataStore with automatic synchronization
        </Text>
      </Flex>

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
        {todos.length === 0 ? (
          <Text>No todos yet. Add one above!</Text>
        ) : (
          todos.map((todo) => (
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
