import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.XAI_API_KEY,
  baseURL: "https://api.x.ai/v1",
});

export async function scheduleBooking(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const bookingData = req.body;

  try {
    const completion = await client.chat.completions.create({
      model: "grok-4-latest",
      temperature: 0.7,
      messages: [
        {
          role: "system",
          content: `
You are the autonomous booking administrator for Infamous-EV (redlineevrs.com).

Rules:
- Primary service: BNA airport pickups/drop-offs
- Estimate 1–1.5 hour drive
- Add 45–60 min buffer after flight landing
- Max 4–6 jobs per day
- Validate all fields
- Approve if available, otherwise suggest alternatives

Respond ONLY in JSON:
{
  "status": "approved|rejected|adjusted",
  "message": "user-facing response",
  "suggested_time": "optional"
}
          `,
        },
        {
          role: "user",
          content: `New booking request:\n${JSON.stringify(bookingData, null, 2)}`,
        },
      ],
    });

    const result = completion.choices[0].message.content;
    res.json({ success: true, aiResponse: result });
  } catch (err) {
    console.error("AI scheduling error:", err);
    res.status(500).json({ error: "AI scheduling failed" });
  }
}
