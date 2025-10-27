import "dotenv/config";
import express from "express";
import cors from "cors";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import { GoogleGenAI } from "@google/genai";

const app = express();

//security middleware

app.use(helmet());
app.use(
    cors({
        origin : process.env.FRONTEND_URL || "http://localhost:3000",
        credentials : true,
    })
);

const limiter = rateLimit({
    windowMs : 15 * 60 * 1000,
    max : 100,
    message : "Too many requests from this IP, please try again after sometime"
})

app.use(limiter);

app.use(express.json({limit : "10mb"}));

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

const client = new GoogleGenAI({apiKey : GEMINI_API_KEY});

//Get gemini models

// app.get("/api/list-models", async (req, res) => {
//     try {
//         const models = await client.models.list();
//         res.json(models);
//     } catch (err) {
//         console.error("Error listing models:", err);
//         res.status(500).json({error: err.message});
//     }
// });

app.post("/api/explain-code", async (req, res) => {

    try {
        const {code, language} = req.body;

        if(!code){
            return res.status(400).json({error : "Code is required"});
        }

        const contents = [
            {
                role : "user",
                parts: [
                    {
                        text: `Please explain this ${
                            language || ""
                        } code in simple terms: \n\n\`\`\`${language || ""}\n${code}\n\`\`\``
                    }
                ]
            },
        ];

        const result = await client.models.generateContent({
            model : "gemini-2.5-flash",
            contents,
            generationConfig: {
                temperature : 0.3,
                maxOutputTokens : 800,
            }
        });
        
        // console.log("response", result);
        
        const explanation = result.candidates?.[0]?.content?.parts?.[0]?.text;
        
        if(!explanation){
            return res.status(500).json({error : "Failed to explain code"});
        }
        
        res.json({explanation, language : language || "Unknown"});

    } catch (err) {
        console.error("Code explain API error: ", err);
        
        if (!res.headersSent) {
            res.status(500).json({error: "server error", details : err.message});
        }
    }
});

const PORT = process.env.PORT || 3002;

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});