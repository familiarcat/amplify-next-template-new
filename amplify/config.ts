// Configuration for Amplify Gen2

export const config = {
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
  }
};

export type AmplifyConfig = typeof config;