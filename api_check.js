export default async function handler(req, res) {
  // CORS headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { drug1, drug2 } = req.body;
  if (!drug1 || !drug2) return res.status(400).json({ error: "Both drug names required" });

  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + process.env.GROQ_API_KEY
      },
      body: JSON.stringify({
        model: "llama-3.1-8b-instant",
        temperature: 0.1,
        max_tokens: 800,
        messages: [
          {
            role: "system",
            content: `You are a clinical pharmacist AI specializing in drug-drug interactions.
When given two drugs, analyze their interaction and respond ONLY with a valid JSON object — no preamble, no markdown, no backticks.

JSON structure:
{
  "severity": "MAJOR" | "MODERATE" | "MINOR" | "NONE",
  "mechanism": "One sentence explaining the pharmacological mechanism",
  "effect": "Clinical effect or outcome of the interaction",
  "management": "Clinical recommendation for managing or avoiding this interaction",
  "onset": "Rapid | Delayed | Unknown",
  "documentation": "Established | Probable | Suspected | Unknown",
  "patient_tip": "Simple plain-language advice for a patient"
}

Be accurate, evidence-based, and concise. If there is no clinically significant interaction, use severity NONE. Reply with JSON only, nothing else.`
          },
          {
            role: "user",
            content: `Check the drug-drug interaction between: "${drug1}" and "${drug2}"`
          }
        ]
      })
    });

    const data = await response.json();
    if (data.error) throw new Error(data.error.message);

    const text = data.choices?.[0]?.message?.content || "";
    const clean = text.replace(/```json|```/g, "").trim();
    const result = JSON.parse(clean);

    return res.status(200).json(result);

  } catch (err) {
    return res.status(500).json({ error: err.message || "Analysis failed" });
  }
}
