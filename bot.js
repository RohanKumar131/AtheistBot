const fs = require("fs");
require("dotenv").config();
const TelegramBot = require("node-telegram-bot-api");
const ModelClient = require("@azure-rest/ai-inference").default;
const { AzureKeyCredential } = require("@azure/core-auth");
const { isUnexpected } = require("@azure-rest/ai-inference");
const express = require("express");
const path = require("path");
const app = express();
const PORT = 3000;

// Env tokens
const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;

// AI Config
const endpoint = "https://models.github.ai/inference";
const model = "openai/gpt-4.1";

// Prompt personality
const BASE_PROMPT = `Use simple, punchy English. Be a cold, sarcastic atheist bot with zero mercy 😈. 
Wreck any religious claim using brutal logic, hard science, and dark humor 🧠🔬💥. 
Mock faith-based arguments like they’re bad conspiracy theories 🛸🤡. 
Hit with facts, roast like hell 🔥, and make them question their whole belief system 🪞💣. 
No sugarcoating, no “respecting opinions” — just drop truth bombs 💀📉.
Use Gen-Z slang, ruthless wit, and savage comebacks 😏🧃.
Keep replies short-to-medium for Telegram chats. Use emojis to punch up the tone 🎯📱☠️.
`;

// Init Telegram
const bot = new TelegramBot(TELEGRAM_TOKEN, { polling: true });

// Plaintext and JSON logging
function logToFile(source, user, input, output) {
  const timestamp = new Date().toISOString();

  // Append to log.txt (human-readable)
  //const textLog = `[${timestamp}] [${source}] ${user}: "${input}"\nAI: ${output}\n\n`;
  //fs.appendFileSync("log.txt", textLog);

  // Append to log.json (machine-readable)
  const logJsonPath = "/public/log.json";
  let existingLogs = [];
  if (fs.existsSync(logJsonPath)) {
    try {
      existingLogs = JSON.parse(fs.readFileSync(logJsonPath, "utf-8"));
    } catch (e) {
      console.error("⚠️ Failed to parse log.json. Creating a new one.");
    }
  }

  const newLog = {
    timestamp,
    source,
    user,
    question: input,
    reply: output,
  };

  existingLogs.push(newLog);
  fs.writeFileSync(logJsonPath, JSON.stringify(existingLogs, null, 2));
}

// Ask GPT
async function askGPT41(userInput) {
  try {
    const client = ModelClient(endpoint, new AzureKeyCredential(GITHUB_TOKEN));
    const response = await client.path("/chat/completions").post({
      body: {
        model,
        messages: [
          { role: "system", content: BASE_PROMPT },
          { role: "user", content: `Theist's statement: "${userInput}"\nAI Reply:` },
        ],
        temperature: 0.9,
        top_p: 0.95,
        max_tokens: 2048,
      },
    });

    if (isUnexpected(response)) {
      console.error("API Error:", response.body.error);
      return "Error from GPT-4.1 API.";
    }

    const reply = response.body.choices?.[0]?.message?.content || "No response from the model.";
    //console.log(`[GPT-4.1 REPLY]: ${reply}`);
    return reply;
  } catch (err) {
    console.error("GPT-4.1 Exception:", err);
    return "Error: Failed to connect to GPT-4.1 API.";
  }
}

// Handle private and mentioned messages
bot.on("message", async (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text;
  const chatType = msg.chat.type;
  const botUsername = (await bot.getMe()).username;
  const mentionPattern = new RegExp(`^@${botUsername}\\s+(.+)$`, "i");

  const isGroup = chatType === "group" || chatType === "supergroup";
  const isMentioned = isGroup && mentionPattern.test(text || "");
  const isPrivate = chatType === "private";

  if (!text) return;

  let question = null;

  if (isPrivate) {
    question = text;
    //console.log(`[PRIVATE] ${msg.from.first_name}: ${question}`);
  } else if (isMentioned) {
    question = text.match(mentionPattern)[1].trim();
    //console.log(`[GROUP][Mentioned] ${msg.from.first_name}: ${question}`);
  }

  if (question) {
    const reply = await askGPT41(question);
    bot.sendMessage(chatId, reply, {
      reply_to_message_id: msg.message_id,
    });
    logToFile(isPrivate ? "PRIVATE" : "GROUP", msg.from.first_name, question, reply);
  }
});

// /roast command
bot.onText(/\/roast/, async (msg) => {
  const chatId = msg.chat.id;
  const roastPrompt = "Roast religion like it’s the worst idea ever.";
  const reply = await askGPT41(roastPrompt);
  bot.sendMessage(chatId, reply, { reply_to_message_id: msg.message_id });
  console.log(`[COMMAND: /roast] ${msg.from.first_name}`);
  logToFile("COMMAND:/roast", msg.from.first_name, roastPrompt, reply);
});

// /atheistfact command
bot.onText(/\/atheistfact/, async (msg) => {
  const chatId = msg.chat.id;
  const factPrompt = "Give a scientific fact that makes religious beliefs look outdated.";
  const reply = await askGPT41(factPrompt);
  bot.sendMessage(chatId, reply, { reply_to_message_id: msg.message_id });
  console.log(`[COMMAND: /atheistfact] ${msg.from.first_name}`);
  logToFile("COMMAND:/atheistfact", msg.from.first_name, factPrompt, reply);
});


// for webssite
// CORS (optional, for frontend fetch)
// app.use((req, res, next) => {
//   res.header("Access-Control-Allow-Origin", "*");
//   next();
// });

// // Serve frontend files from /public
// app.use(express.static(path.join(__dirname, "public")));

// // Serve log.json
// app.get("/public/log.json", (req, res) => {
//   res.sendFile(path.join(__dirname, "log.json"));
// });

// app.listen(PORT, () => {
//   console.log(`🚀 Server running at port:${PORT}`);
// });
