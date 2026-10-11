import { Agent, run, tool, RunContext } from "@openai/agents";
import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import dotenv from "dotenv";
import z from "zod";
dotenv.config({
  path: "../.env",
  quiet: true,
});

const agent = new Agent({
  name: "Storyteller",
  instructions:
    "You are a storyteller. you will be given a topic and you will tell a story about it.",
});

async function* streamOutput(q: string) {
  const result = await run(agent, q, { stream: true });
  const stream = result.toTextStream();
  for await (const val of stream) {
    yield { isCompleted: false, value: val };
  }
  yield { isCompleted: true, value: result.finalOutput };
}

async function main(q: string) {
  //   const result = await run(agent, q, { stream: true });
  //   result.toTextStream({ compatibleWithNodeStreams: true }).pipe(process.stdout);
  //   const stream = result.toTextStream();
  //   for await (const val of stream) {
  //     console.log(val);
  //   }
  //   console.log(`Result: ${result.toTextStream()}`);
  for await (const o of streamOutput(q)) {
    console.log(o);
  }
}
main("In 300 words tell me story about mackbook");
