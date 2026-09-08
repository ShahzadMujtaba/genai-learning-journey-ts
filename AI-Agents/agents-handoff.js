import { Agent, run, tool } from "@openai/agents";
import { RECOMMENDED_PROMPT_PREFIX } from "@openai/agents-core/extensions";
import { z } from "zod";
import dotenv from "dotenv";
import fs from "node:fs/promises";

dotenv.config({
  path: "../.env",
  quiet: true,
});

// ============================================================
// SCHEMAS
// ============================================================

const refundSchema = z.object({
  type: z.literal("refund"),
  message: z.string(),
  refundRequested: z.boolean(),
  customerId: z.string(),
  planId: z.string(),
});

const salesSchema = z.object({
  type: z.literal("sales"),
  message: z.string(),
});

const responseSchema = z.discriminatedUnion("type", [
  salesSchema,
  refundSchema,
]);

// ============================================================
// TOOLS
// ============================================================

// -------------------------
// Fetch available plans
// -------------------------

const fetchAvailablePlans = tool({
  name: "fetch_available_plans",

  description: "Fetches the available broadband plans.",

  parameters: z.object({}),

  execute: async function () {
    return [
      {
        plan_id: "1",
        price_inr: 399,
        speed: "30MB/s",
      },
      {
        plan_id: "2",
        price_inr: 999,
        speed: "300MB/s",
      },
      {
        plan_id: "3",
        price_inr: 499,
        speed: "200MB/s",
      },
    ];
  },
});

// -------------------------
// Process refund
// -------------------------

const processRefund = tool({
  name: "process_refund",

  description: "Processes a customer refund and creates a refund handoff file.",

  parameters: z.object({
    customerId: z.string().describe("ID of the customer"),
    planId: z.string().describe("ID of the customer's plan"),
    reason: z.string().describe("Reason for the refund"),
  }),

  execute: async function ({ customerId, planId, reason }) {
    const randomId = Math.floor(Math.random() * 100000);

    const fileName = `.refund-handoff-${randomId}.txt`;

    await fs.appendFile(
      fileName,
      `Refund for Customer ${customerId} for Plan ${planId}. Reason: ${reason}\n`,
      "utf-8",
    );

    return {
      refundRequested: true,
      customerId,
      planId,
      fileName,
    };
  },
});

// ============================================================
// REFUND AGENT
// ============================================================

const refundAgent = new Agent({
  name: "Refund Agent",

  instructions: `
    You are an expert refund agent for an internet broadband company.

    You handle customer refund requests.

    You MUST collect these three pieces of information:
    - customerId
    - planId
    - reason

    Never invent customer information.

    If customerId is missing, ask the customer for it.

    If planId is missing, ask the customer for it.

    If reason is missing, ask the customer for it.

    Once customerId, planId, and reason are available,
    you MUST call the process_refund tool.

    Only after process_refund succeeds, return a structured
    refund response.

    The final response must contain:
    - type: "refund"
    - message
    - refundRequested
    - customerId
    - planId

    Do not claim that the refund was processed unless
    process_refund successfully completes.
  `,

  tools: [processRefund],

  outputType: refundSchema,
});

// ============================================================
// SALES AGENT
// ============================================================

const salesAgent = new Agent({
  name: "Sales Agent",

  instructions: `
    You are an expert sales agent for an internet broadband company.

    Help customers with:
    - broadband plans
    - pricing
    - speeds
    - choosing a plan
    - general sales questions

    Use fetch_available_plans when the customer needs
    current plan information.

    Do not handle refunds.

    Your final response must contain:
    - type: "sales"
    - message
  `,

  tools: [fetchAvailablePlans],

  outputType: salesSchema,
});

// ============================================================
// RECEPTION AGENT
// ============================================================

const receptionAgent = new Agent({
  name: "Reception Agent",

  instructions: `
    ${RECOMMENDED_PROMPT_PREFIX}

    You are the reception agent for an internet broadband company.

    Your job is to understand what the customer needs and
    hand off the request to the correct specialist.

    HANDOFF TO SALES AGENT FOR:
    - broadband plans
    - pricing
    - speeds
    - choosing a plan
    - general sales questions

    HANDOFF TO REFUND AGENT FOR:
    - refunds
    - cancelling a plan and getting a refund
    - refund status
    - existing-customer refund issues

    Do not process refunds yourself.

    Do not answer sales questions yourself.

    Always hand off to the appropriate specialist.
  `,

  handoffDescription: `
    Available specialists:

    Sales Agent:
    Handles broadband plans, pricing, speeds, plan selection,
    and general sales questions.

    Refund Agent:
    Handles customer refunds, cancellations involving refunds,
    refund status, and existing-customer refund issues.
  `,

  handoffs: [salesAgent, refundAgent],
});

// ============================================================
// RUN
// ============================================================

async function main(query = "") {
  try {
    const result = await run(receptionAgent, query);

    console.log("\n========== FINAL OUTPUT ==========\n");

    console.dir(result.finalOutput, {
      depth: null,
    });

    console.log("\n========== OUTPUT TYPE ==========\n");

    console.log(typeof result.finalOutput);
  } catch (error) {
    console.error("\n========== ERROR ==========\n");

    console.error(error);
  }
}

// ============================================================
// TEST
// ============================================================

main(
  `
  Hey there, I am a customer.
  My customer ID is cust_234.
  My plan ID is 3.
  I want a refund because of slow internet speed.
  `,
);
