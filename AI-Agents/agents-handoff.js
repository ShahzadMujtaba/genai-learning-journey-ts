import { Agent, run, tool } from "@openai/agents";
import { z } from "zod";
import dotenv from "dotenv";
import fs from "node:fs/promises";
dotenv.config({
  path: "../.env",
  quiet: true,
});
const refundSchema = z.object({
  refundRequested: z.boolean(),
  customerId: z.string(),
  planId: z.string(),
});
const responseSchema = z.object({
  type: z.enum(["sales", "refund"]),
  message: z.string(),
  refundRequested: z.boolean(),
  customerId: z.string().optional(),
  planId: z.string().optional(),
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

    const fileName = `.refund-handoff-${newRandomFile}.txt`;
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

// const refundAgent = new Agent({
//   name: "Refund Agent",
//   instructions: `
//     You are an expert in processing customer refunds.

//     Before processing a refund, make sure you have:
//     - customerId
//     - planId
//     - reason for the refund

//     Never invent customer information.
//     If required information is missing, ask the customer for it.
//     Only call process_refund when all required information is available.
//   `,
//   tools: [processRefund],
// });
const refundAgent = new Agent({
  name: "Refund Agent",

  instructions: `
    You are an expert in processing customer refunds.

    You MUST collect these three pieces of information:
    - customerId
    - planId
    - reason

    Never invent customer information.

    If any required information is missing, ask the customer for it.

    If customerId, planId, and reason are available,
    you MUST call the process_refund tool.

    Do not claim that the refund system is unavailable unless
    the process_refund tool actually returns an error indicating
    that the system is unavailable.
  `,

  tools: [processRefund],
});

// const salesAgent = new Agent({
//   name: "Sales Agent",
//   instructions: `
//     You are an expert sales agent for an internet broadband company.

//     Help users with broadband plans and general questions.

//     For refund requests, delegate the request to refund_expert.
//     Do not invent customer information.
//   `,
//   tools: [
//     fetchAvailablePlans,
//     refundAgent.asTool({
//       name: "refund_expert",
//       toolDescription: "Handles refund questions and requests",
//     }),
//   ],
//   //   outputType: refundSchema,
// });

// const receptionAgent = new Agent({
//   name: "Reception Agent",
//   instructions: `
//     You are the reception agent for an internet broadband company.

//     Determine what the customer needs and route them to the appropriate agent.

//     Route customers asking about:
//     - broadband plans
//     - pricing
//     - speed
//     - choosing a plan
//     - general sales questions

//     to the Sales Agent.

//     Route customers asking about:
//     - refunds
//     - cancelling a plan and getting a refund
//     - refund status
//     - existing-customer refund issues

//     to the Refund Agent.

//     Do not attempt to answer the customer's question yourself when
//     one of the specialist agents is appropriate.
//   `,
//   handoffDescription: `
//     Available agents:

//     - Sales Agent: Handles broadband plans, pricing, speeds, and
//       recommendations for customers.

//     - Refund Agent: Handles existing-customer refunds and refund
//       requests.
//   `,
//   handoffs: [salesAgent, refundAgent],
//   outputType: responseSchema,
// });

const salesAgent = new Agent({
  name: "Sales Agent",
  instructions: `
    You are an expert sales agent for an internet broadband company.

    Help users with:
    - broadband plans
    - pricing
    - speeds
    - choosing a plan
    - general sales questions

    Do not handle refunds.
  `,
  tools: [fetchAvailablePlans],
});

const receptionAgent = new Agent({
  name: "Reception Agent",
  instructions: `
    You are the reception agent for an internet broadband company.

    Determine what the customer needs and route them to the appropriate agent.

    For:
    - broadband plans
    - pricing
    - speed
    - choosing a plan
    - general sales questions

    hand off to the Sales Agent.

    For:
    - refunds
    - cancelling a plan and getting a refund
    - refund status
    - existing-customer refund issues

    hand off to the Refund Agent.

    Do not attempt to process refunds yourself.
  `,
  handoffs: [salesAgent, refundAgent],
});

async function main(query = "") {
  const result = await run(receptionAgent, query);
  console.log("Result", result.finalOutput);
  //   console.log(`History`, result.history);
}
main(
  "Hey there, i am cumtomer having plan_id is 3 cust_234 and i want to have a refund due to slow internet speed",
);
