import { Agent, run, tool, RunContext } from "@openai/agents";
import dotenv from "dotenv";
import z from "zod";
dotenv.config({
  path: "../.env",
  quiet: true,
});

interface MyContext {
  userId: string;
  userName: string;
}

const getUserInfo = tool({
  name: "get_user_info",
  description: "Gets the user info",
  parameters: z.object({}),
  execute: async ({}, ctx: RunContext<MyContext>): Promise<string> => {
    return `UserId=${ctx.context.userId}, UserName=${ctx.context.userName}`;
  },
});

const customerSupportAgent = new Agent<MyContext>({
  name: "Customer Support Agnet",
  instructions: ({ context }) => {
    return `You're and expert customer support agent\nContext:${JSON.stringify(context)}`;
  },
  tools: [getUserInfo],
});

async function main(query: string = "", ctx: MyContext) {
  const result = await run(customerSupportAgent, query, {
    context: ctx,
  });
  console.log(`Result: ${result.finalOutput}`);
}

main("Hey, What is my name?", { userId: "1", userName: "Shahzad" });
