import { Agent, run, tool, RunContext } from "@openai/agents";
import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import dotenv from "dotenv";
import z from "zod";
dotenv.config({
  path: "../.env",
  quiet: true,
});

interface MyContext {
  userId: string;
  userName: string;
  fetchUserInfoFromDB: () => Promise<string>;
}
const UserResponseSchema = z.object({
  userId: z.string(),
  userName: z.string(),
  message: z.string(),
});
const getUserInfo = tool({
  name: "get_user_info",
  description: "Gets the user info",
  parameters: z.object({ name: z.string(), id: z.string() }),
  execute: async (
    _args,
    ctx?: RunContext<MyContext>,
  ): Promise<string | undefined> => {
    // return `UserId=${ctx?.context.userId}, UserName=${ctx?.context.userName}`;
    const result = await ctx?.context.fetchUserInfoFromDB();
    return result;
  },
});

const customerSupportAgent = new Agent<MyContext, typeof UserResponseSchema>({
  name: "Customer Support Agent",
  instructions: ({ context }) => {
    return `
    You are an expert customer support agent.

    The current user's name is ${context.userName}.
    The current user's ID is ${context.userId}.

    Follow these rules:
    1. Greet the user by name when they say hello.
    2. When greeting the user, say:
       "Hey ${context.userName}! How may I help you today?"
    3. When the user asks for their information,
       provide both their user ID and name.
    4. Be friendly, professional, and helpful.
    5. Assist the user with their tasks.
  `;
  },
  tools: [getUserInfo],
  outputType: UserResponseSchema,
});

// accepts input from commadline
async function main() {
  const r1 = createInterface({ input, output });
  try {
    const userName = (await r1.question("Entyer your name: ")).trim();
    const userId = (await r1.question("Enter your user ID: ")).trim();
    if (!userName || !userId) {
      console.log("Name and user ID are required.");
      return;
    }
    // const ctx: MyContext = { userId, userName };
    const ctx: MyContext = {
      userId,
      userName,
      fetchUserInfoFromDB: async () => {
        return JSON.stringify({ userId, userName });
      },
    };
    console.log(`\nWelcome, ${userName}!`);
    console.log("Type 'exit' or 'quit' to stop.\n");
    while (true) {
      const query = (await r1.question("You: ")).trim();
      if (!query) continue;
      if (["exit", "quit"].includes(query.toLowerCase())) {
        console.log(`Goodbye, ${userName}!`);
        break;
      }
      try {
        const result = await run(customerSupportAgent, query, {
          context: ctx,
        });

        console.log("Result:", JSON.stringify(result.finalOutput, null, 2));
      } catch (error) {
        console.error("Sorry, something went wrong:", error);
      }
    }
  } catch (error) {}
}
// hard coded
// async function main(query: string = "", ctx: MyContext) {
//   const result = await run(customerSupportAgent, query, {
//     context: ctx,
//   });
//   // console.log(`Result: ${result.finalOutput}`);
//   console.log("Result:", JSON.stringify(result.finalOutput, null, 2));
// }

// main("What is my name and user ID?", {
//   userId: "1",
//   userName: "Shahzad Mujtaba",
// });

main().catch(console.error);
