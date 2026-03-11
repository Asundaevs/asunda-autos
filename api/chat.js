import { GoogleGenerativeAI } from '@google/generative-ai';
import multiparty from 'multiparty';
import fs from 'fs';

// Initialize Gemini API
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export const config = {
    api: {
        bodyParser: false, // Disallow Next.js default body parser to handle file uploads
    },
};

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const form = new multiparty.Form();

    form.parse(req, async (err, fields, files) => {
        if (err) {
            console.error("Form parsing error:", err);
            return res.status(500).json({ error: "Failed to process the request." });
        }

        try {
            // Extract text fields
            const userName = fields.userName[0];
            const plate = fields.plateNumber[0];
            const makeModel = fields.makeModelYear[0];
            const bodyType = fields.bodyType[0];
            const fuelType = fields.fuelType[0];
            const trans = fields.transmission[0];
            const cc = fields.engineCC[0];
            const drive = fields.driveType[0];
            const mileage = fields.mileage[0];
            const engineNum = fields.engineNumber[0] || 'Not provided';
            const tier = fields.tier[0];
            const issue = fields.customIssue[0] || 'General diagnostic check';

            // The Johnte Persona System Instruction
            const systemPrompt = `You are Johnte, a legendary mechanic born and bred in the garage environment. You are the digital mechanic for "Asunda Autos: East African digital garage."
            Speak directly to the user by their name (${userName}). Use a warm, authentic, and tech-savvy East African tone (weave in friendly East African English and a touch of Sheng like "sawa", "pole sana", "kama kawa").
            You are analyzing the following vehicle:
            - Plate: ${plate}
            - Make/Model/Year: ${makeModel}
            - Body: ${bodyType}
            - Fuel: ${fuelType}
            - Transmission: ${trans}
            - Engine CC: ${cc}
            - Drive Type: ${drive}
            - Mileage: ${mileage} km
            - Engine Number: ${engineNum}
            - Service Tier Selected: ${tier}
            - User's Custom Issue: ${issue}
            
            Provide a clear, actionable diagnostic report. If an engine number was not provided, briefly remind them why it's useful for next time. End by reminding them to screenshot the report because you auto-delete data for privacy.`;

            // Setup Gemini 2.5 Model
            // Using gemini-2.5-flash as the fast, multimodal default
            const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
            
            let promptParts = [systemPrompt];

            // Handle Media Uploads (Multimodal)
            if (files.media && files.media.length > 0) {
                const file = files.media[0];
                const fileData = fs.readFileSync(file.path);
                const mimeType = file.headers['content-type'];
                
                promptParts.push({
                    inlineData: {
                        data: Buffer.from(fileData).toString("base64"),
                        mimeType: mimeType
                    }
                });
                promptParts.push("Please factor the attached media (photo/audio/video) into your diagnosis.");
            }

            // Generate Content
            const result = await model.generateContent(promptParts);
            const responseText = result.response.text();

            // Format response nicely in HTML
            const htmlFormattedReply = responseText.replace(/\n/g, '<br>');

            res.status(200).json({ reply: htmlFormattedReply });

        } catch (error) {
            console.error("Gemini API Error details:", error);
            // This error logs on Vercel backend so you can see it, while user gets generic error from script.js
            res.status(500).json({ error: "Johnte is attending other vehicles." });
        }
    });
            }
