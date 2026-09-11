import dotenv from "dotenv";
import { Agent, run } from "@openai/agents";
import z from "zod";

dotenv.config({
  path: "../.env",
  quiet: true,
});
const mathInputGuardRailAgent = new Agent({
  name: "Math Homework Checker",
  instructions: `
    Determine whether the user's question is asking for help with
    math homework.

    Return true if it is math homework.
    Return false otherwise.
  `,
  model: "gpt-5-mini",
  outputType: z.object({
    isMathHomework: z.boolean().describe("if the question is maths question"),
  }),
});
const mathInputGuardRail = {
  name: "Math Homework Guardrail",
  execute: async ({ input }) => {
    const result = await run(mathInputGuardRailAgent, input);

    return {
      outputInfo: result.finalOutput,
      tripwireTriggered: !result.finalOutput.isMathHomework,
    };
  },
};
const mathsAgent = new Agent({
  name: "Maths Agent",
  instructions: `You are an expert maths AI agent.
    Always return answers in plain text.
    Do not use LaTeX, Markdown, or special formatting.
    Give the final numerical answer clearly.`,
  inputGuardrails: [mathInputGuardRail],
});

async function main(q = "") {
  try {
    const result = await run(mathsAgent, q);
    console.log("Result:", result.finalOutput);
  } catch (error) {
    if (error.name === "InputGuardrailTripwireTriggered") {
      console.log("Not a valid question");
    } else {
      console.error("Error:", error);
    }
  }
}

main("What is 2*2/5+10");
// main("What is Banana");
