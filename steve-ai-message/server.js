require("dotenv").config();

const express = require("express");
const cors = require("cors");
const { GoogleGenAI } = require("@google/genai");

const app = express();

app.use(cors());
app.use(express.json({ limit: "1mb" }));

const PORT = process.env.PORT || 3000;
const MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash-lite";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

const ai = GEMINI_API_KEY
  ? new GoogleGenAI({
      apiKey: GEMINI_API_KEY
    })
  : null;

const STEVE_INSTRUCTIONS = `
Tu es Steve, l'assistant IA de l'application STEVE IA Message.

Ta mission est d'aider l'utilisateur à rédiger des réponses naturelles
à des conversations personnelles.

Règles :

- Comprends le contexte de la conversation.
- Propose une réponse naturelle et courte.
- La réponse doit être prête à envoyer.
- Propose exactement deux alternatives.
- Propose une relance naturelle.
- Respecte le ton demandé.
- Respecte la langue demandée.
- Pour une conversation romantique ou de flirt :
  reste léger, respectueux, authentique et sans pression.
- Ne manipule pas.
- N'encourage pas le harcèlement.
- Ne pousse jamais quelqu'un à répondre.
- Respecte les refus et les limites.
- Ne prétends pas être l'utilisateur.
- Évite les réponses artificielles ou trop longues.

Retourne UNIQUEMENT un objet JSON valide.

Format obligatoire :

{
  "reply": "réponse prête à envoyer",
  "alternatives": [
    "alternative 1",
    "alternative 2"
  ],
  "followUp": "relance naturelle",
  "reason": "courte explication"
}
`;

function cleanJson(value) {
  let text = String(value || "").trim();

  if (text.startsWith("```")) {
    text = text
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();
  }

  return text;
}

function fallbackReply({ conversation, goal, tone, language }) {
  const lang = String(language || "français").toLowerCase();

  if (lang.includes("anglais") || lang.includes("english")) {
    return {
      reply: "Hey, ça va bien 😊 Et toi, comment vas-tu ?",
      alternatives: [
        "Salut 😊 Je vais bien, merci. Et toi ?",
        "Hey ! Ça va bien de mon côté. Comment se passe ta journée ?"
      ],
      followUp: "Et sinon, quoi de neuf de ton côté ?",
      reason: "Réponse locale de secours."
    };
  }

  return {
    reply: "Salut 😊 Ça va bien, merci ! Et toi, comment vas-tu ?",
    alternatives: [
      "Coucou 😊 Je vais bien, merci. Et toi ?",
      "Salut ! Ça va bien de mon côté. Comment se passe ta journée ?"
    ],
    followUp: "Et sinon, quoi de neuf de ton côté ?",
    reason: "Réponse locale de secours."
  };
}

async function generateReply({
  conversation,
  goal,
  tone,
  language
}) {
  /*
   * Si Gemini n'est pas configuré, le serveur ne plante pas.
   * Il utilise une réponse locale de secours.
   */
  if (!ai) {
    console.warn(
      "GEMINI_API_KEY absente : utilisation du mode local de secours."
    );

    const data = fallbackReply({
      conversation,
      goal,
      tone,
      language
    });

    return {
      text: JSON.stringify(data),
      data,
      responseId: null,
      model: "local-fallback"
    };
  }

  const prompt = `
${STEVE_INSTRUCTIONS}

CONTEXTE DE LA CONVERSATION :
${conversation}

OBJECTIF :
${goal || "répondre naturellement"}

TON :
${tone || "naturel"}

LANGUE :
${language || "français"}

Génère maintenant uniquement le JSON demandé.
`;

  try {
    const response = await ai.models.generateContent({
      model: MODEL,
      contents: prompt
    });

    const outputText = response.text || "";

    if (!outputText.trim()) {
      throw new Error("Gemini returned an empty response");
    }

    let data;

    try {
      data = JSON.parse(cleanJson(outputText));
    } catch (parseError) {
      console.warn(
        "Réponse Gemini non JSON, conversion en réponse simple."
      );

      data = {
        reply: outputText.trim(),
        alternatives: [],
        followUp: "",
        reason: "Réponse générée par Gemini."
      };
    }

    return {
      text: JSON.stringify(data),
      data,
      responseId: null,
      model: MODEL
    };

  } catch (error) {
    console.error("Gemini error:", error.message);

    /*
     * Si Gemini atteint une limite gratuite ou rencontre
     * une erreur réseau, Steve continue à fonctionner.
     */
    const data = fallbackReply({
      conversation,
      goal,
      tone,
      language
    });

    return {
      text: JSON.stringify(data),
      data,
      responseId: null,
      model: "local-fallback"
    };
  }
}

/* =========================
   HEALTH
========================= */

app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    service: "Steve IA Message",
    version: "2.0.0",
    ai: ai ? "Google Gemini" : "Local fallback",
    model: ai ? MODEL : "local-fallback"
  });
});

/* =========================
   CONNECTORS
========================= */

app.get("/api/connectors", (req, res) => {
  res.json({
    connectors: [
      {
        id: "whatsapp",
        name: "WhatsApp",
        mode: "official-api-when-available"
      },
      {
        id: "messenger",
        name: "Facebook Messenger",
        mode: "official-api-when-available"
      },
      {
        id: "instagram",
        name: "Instagram",
        mode: "official-api-when-available"
      },
      {
        id: "telegram",
        name: "Telegram",
        mode: "official-api-when-available"
      }
    ]
  });
});

/* =========================
   AI SUGGESTIONS
========================= */

app.post("/api/ai/suggestions", async (req, res) => {
  try {
    const {
      conversation,
      goal,
      tone,
      language
    } = req.body || {};

    if (!conversation) {
      return res.status(400).json({
        error: "conversation is required"
      });
    }

    const result = await generateReply({
      conversation,
      goal,
      tone,
      language
    });

    res.json({
      success: true,
      mode: "suggestions",
      provider: result.model === "local-fallback"
        ? "local"
        : "gemini",
      ...result
    });

  } catch (error) {
    console.error(error);

    res.status(500).json({
      error: "AI suggestion generation failed",
      details: error.message
    });
  }
});

/* =========================
   AI REPLY
========================= */

app.post("/api/ai/reply", async (req, res) => {
  try {
    const {
      conversation,
      goal,
      tone,
      language,
      connector,
      autoSend = false
    } = req.body || {};

    if (!conversation) {
      return res.status(400).json({
        error: "conversation is required"
      });
    }

    const result = await generateReply({
      conversation,
      goal,
      tone,
      language
    });

    res.json({
      success: true,
      mode: autoSend
        ? "automatic-requested"
        : "suggestion",

      connector: connector || null,

      /*
       * Important :
       * le backend ne prétend pas avoir envoyé le message.
       */
      sendStatus: "not-sent",

      provider: result.model === "local-fallback"
        ? "local"
        : "gemini",

      ...result
    });

  } catch (error) {
    console.error(error);

    res.status(500).json({
      error: "AI reply generation failed",
      details: error.message
    });
  }
});

/* =========================
   SERVER
========================= */

app.listen(PORT, "0.0.0.0", () => {
  console.log(
    `Steve IA Message server listening on port ${PORT}`
  );

  console.log(
    `AI provider: ${
      ai ? "Google Gemini" : "Local fallback"
    }`
  );

  console.log(
    `AI model: ${
      ai ? MODEL : "local-fallback"
    }`
  );
});
