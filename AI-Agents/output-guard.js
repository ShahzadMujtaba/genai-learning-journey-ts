import dotenv from "dotenv";
import { Agent, run } from "@openai/agents";
import z from "zod";
dotenv.config({
  path: "../.env",
  quiet: true,
});

const sqlOutPutGuardRailAgent = new Agent({
  name: "SQL Output Guardrail Agent",
  instructions: `
  Check if query is safe to execute. The query shoud be read only and do not modify , delete or drop any tavle
  `,
  outputType: z.object({
    reason: z.string().optional().describe("reason if the query is unsafe"),
    isSafe: z.boolean().describe("if query is safe to execute"),
  }),
});
const sqlGuardRail = {
  name: "SQL Guard",
  execute: async ({ agentOutput }) => {
    const sql = agentOutput?.sqlQuery ?? "";
    const result = await run(sqlOutPutGuardRailAgent, sql);
    return {
      outputInfo: result.finalOutput.reason,
      tripwireTriggered: !result.finalOutput.isSafe,
    };
  },
};

const sqlAgent = new Agent({
  name: "SQL Expert Agent",
  instructions: `
        You are an expert SQL Agent that is specialized in generating SQL queries as per user request.

        Postgres Schema:
    -- users table
    CREATE TABLE users (
      id SERIAL PRIMARY KEY,
      username VARCHAR(50) UNIQUE NOT NULL,
      email VARCHAR(100) UNIQUE NOT NULL,
      created_at TIMESTAMP DEFAULT NOW()
    );

    -- comments table
    CREATE TABLE comments (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id),
      comment_text TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT NOW()
    );
    `,
  outputType: z.object({
    sqlQuery: z.string().optional().describe("sql query"),
  }),
  outputGuardrails: [sqlGuardRail],
});
async function main(q = "") {
  try {
    const result = await run(sqlAgent, q);
    console.log(`Result: ${result.finalOutput.sqlQuery}`);
  } catch (error) {
    console.log(`Error: ${error}`);
  }
}
main("Delete all the comments");

// main("Show all comments");
// main("How many users are there?");
// main("List the usernames and emails of all users");
// main("Show the latest 10 comments");
