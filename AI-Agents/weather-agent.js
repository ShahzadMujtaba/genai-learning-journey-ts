import { Agent, run, tool } from "@openai/agents";
import { z } from "zod";
import axios from "axios";
import dotenv from "dotenv";
dotenv.config({
  path: "../.env",
  quiet: true,
});
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

// -------------------------
// Email function
// -------------------------

async function sendEmailWebHook({ toEmail, subject, body }) {
  const { data, error } = await resend.emails.send({
    from: "Acme <onboarding@resend.dev>",
    to: [toEmail],
    subject,
    html: `<p>${body}</p>`,
  });

  if (error) {
    throw new Error(`Failed to send email: ${error.message}`);
  }

  return `Email successfully sent to ${toEmail}`;
}
// -------------------------
// Validate Email
// -------------------------
function validateEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!emailRegex.test(email)) {
    throw new Error("Invalid email address");
  }
}
// -------------------------
// Structured AI Output
// -------------------------
const GetWeatherResultSchema = z.object({
  weather: z.array(
    z.object({
      city: z.string().describe("name of the city"),
      degree_c: z.number().describe("the degree celcius of the temp"),
      condition: z.string().optional().describe("condition of the weather"),
    }),
  ),
});

// -------------------------
// Weather tool
// -------------------------

const getWeatherTool = tool({
  name: "get_weather",

  description: "Returns the current weather information for the given city",

  parameters: z.object({
    city: z.string().describe("Name of the city"),
  }),

  execute: async function ({ city }) {
    const url = `https://wttr.in/${encodeURIComponent(city)}?format=%C+%t`;

    const response = await axios.get(url, {
      responseType: "text",
    });

    return `The weather of ${city} is ${response.data}`;
  },
});

// -------------------------
// Send email tool
// -------------------------

const sendEmailTool = tool({
  name: "send_email",

  description: "Sends an email to the specified email address",
  parameters: z.object({
    toEmail: z.string().describe("Email address to send the email to"),

    subject: z.string().describe("Subject of the email"),

    body: z.string().describe("Body of the email"),
  }),

  execute: async function ({ toEmail, subject, body }) {
    validateEmail(toEmail);
    return await sendEmailWebHook({
      toEmail,
      subject,
      body,
    });
  },
});

// -------------------------
// Agent
// -------------------------

const agent = new Agent({
  name: "weather agent",

  instructions: `
    You are an expert weather agent.

    Help the user get weather reports.

    When the user asks for weather for multiple cities,
    get the weather for each city.

    Address the user by their name when it is provided.
  `,

  tools: [getWeatherTool, sendEmailTool],
  outputType: GetWeatherResultSchema,
});

// -------------------------
// Run agent
// -------------------------

async function main(query = "") {
  try {
    const result = await run(agent, query);
    console.log("Result:", result.finalOutput);
  } catch (error) {
    console.error("FULL ERROR:");
    console.error(error);
  }
}

main(`
  Get the weather for Bengaluru, Goa and Delhi.
  Send the weather report to toEmail: delivered@resend.dev.
`);
