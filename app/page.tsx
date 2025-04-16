"use client";

import { TodoList } from "./_components/TodoList";
import { Flex, Heading, View, useTheme } from "@aws-amplify/ui-react";
import "@aws-amplify/ui-react/styles.css";

export default function Home() {
  const { tokens } = useTheme();

  return (
    <View padding={tokens.space.large}>
      <Flex direction="column" gap={tokens.space.medium}>
        <Heading level={1}>AWS Amplify Gen2 Todo App</Heading>
        <TodoList />
      </Flex>
    </View>
  );
}
