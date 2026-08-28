import { Agent, tool, run } from "@openai/agents";
import { z } from "zod";
import fs from "node:fs/promises";
import dotenv from "dotenv";
dotenv.config({
  path: "../.env",
  quiet: true,
});

const refundSchema = z.object({
  refundRequested: z.boolean(),
  customerId: z.string(),
  planId: z.string(),
});

const fetchAvailablePlans = tool({
  name: "fetch_available_plans",
  description: "fetches the available plan from internet",
  parameters: z.object({}),
  execute: async function () {
    return [
      { plan_id: "1", price_inr: 399, speed: "30MB/s" },
      { plan_id: "2", price_inr: 999, speed: "300MB/s" },
      { plan_id: "3", price_inr: 499, speed: "200MB/s" },
    ];
  },
});
const processRefund = tool({
  name: "process_refund",
  description: " This tool process the refund for customer",
  parameters: z.object({
    customerId: z.string().describe("ID of the customer"),
    planId: z.string().describe("ID of the customer's plan"),
    reason: z.string().describe("Reason for the refund"),
  }),
  execute: async function ({ customerId, reason, planId }) {
    const newRandomFile = Math.floor(Math.random() * 100000);

    const fileName = `.refund-multi-agent-${newRandomFile}.txt`;
    await fs.appendFile(
      fileName,
      `Refund for Customer ${customerId} for Plan ${planId}. Reason: ${reason}\n`,
      "utf-8",
    );
    return {
      refundRequested: true,
      customerId,
      planId,
    };
  },
});
const refundAgent = new Agent({
  name: "Refund Agent",
  instructions: `
    You are an expert refund agent for an internet broadband company.

    Help customers with refund requests.
    Always ask for the reason of refund.
    Never invent customer IDs, plan IDs, or other information.
    If the required information is missing, ask for it.
    When all required information is available, use the process_refund tool
    to process the refund.
    After the tool succeeds, clearly tell the customer that the refund was
    processed.
  `,
  tools: [processRefund],
});

const salesAgent = new Agent({
  name: "Sales Agent",
  instructions: `
    You are an expert sales agent for an internet broadband company.

    Help users with broadband plans and general questions.

    For refund requests, delegate the request to refund_expert.
    Do not invent customer information.
  `,
  tools: [
    fetchAvailablePlans,
    refundAgent.asTool({
      name: "refund_expert",
      toolDescription: "Handles refund questions and requests",
    }),
  ],
  outputType: refundSchema,
});

async function runAgent(query = "") {
  const result = await run(salesAgent, query);
  console.log(result.finalOutput);
}

// runAgent("Hey there, I want to know the available plans");
// runAgent("I had a plan 300. I need a refund right now. my plan id os 3");
runAgent(
  "I need a refund right now. My customer ID is CUST-123 and my plan ID is 3. because i am shifting.",
);
