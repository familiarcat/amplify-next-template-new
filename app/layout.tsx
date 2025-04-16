import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./app.css";
import { BasicLayout } from "./_components/BasicLayout";
import { ConfigureAmplifyClientSide } from "./_components/ConfigureAmplify";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "AWS Amplify Gen2 Todo App",
  description: "A simple todo app built with AWS Amplify Gen2 and Next.js",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body
        className={inter.className}
        style={{ margin: 0 }}
      >
        <ConfigureAmplifyClientSide />
        <BasicLayout>{children}</BasicLayout>
      </body>
    </html>
  );
}
