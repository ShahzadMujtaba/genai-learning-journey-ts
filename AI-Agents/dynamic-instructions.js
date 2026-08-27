import { Agent, run } from "@openai/agents";
import "dotenv/config";
const helloAgent = new Agent({
  name: "Assitent",
  instructions: function (runContext) {
    const { location } = runContext.context;
    if (location === "india") {
      return "Always say namaste and then Yor are and agent that alway says Hello World with user name";
    } else {
      return "Just Talk to the Use";
    }
  },
  model: "gpt-4o-mini",
});

const result = await run(helloAgent, "Hey There, My name is Shahzad Mujtaba", {
  context: {
    location: "india",
  },
});
console.log(result.finalOutput);
