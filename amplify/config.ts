import { ResourceConfig } from '@aws-amplify/backend';
import { createAmplifyConfig } from 'aws-amplify';

export const config = createAmplifyConfig({
  name: 'todo-app',
  appId: process.env.NEXT_PUBLIC_AMPLIFY_APP_ID,
  backend: {
    sandbox: {
      port: 20002,
    },
    data: {
      schema: './data/resource.ts',
    },
    auth: {
      userPool: {
        signUp: {
          autoConfirm: true,
        },
      },
    },
  },
});

export type AmplifyConfig = ResourceConfig<typeof config>;