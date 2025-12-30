import { GoogleGenAI, Type } from "@google/genai";
import { ResumeAnalysis } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const analyzeResume = async (resumeText: string): Promise<ResumeAnalysis> => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `You are an expert technical recruiter and career coach. 
      Analyze the following resume text and provide a structured assessment.
      
      Resume Text:
      "${resumeText.substring(0, 10000)}" 
      
      Provide a rating out of 100, a short summary, 3 key strengths, 3 weaknesses, and 3 actionable improvements.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            score: { type: Type.INTEGER, description: "A score from 0 to 100" },
            summary: { type: Type.STRING, description: "A brief 2-3 sentence summary of the candidate's profile" },
            strengths: { 
              type: Type.ARRAY, 
              items: { type: Type.STRING },
              description: "List of 3 strong points" 
            },
            weaknesses: { 
              type: Type.ARRAY, 
              items: { type: Type.STRING },
              description: "List of 3 weak points or gaps" 
            },
            improvements: { 
              type: Type.ARRAY, 
              items: { type: Type.STRING },
              description: "List of 3 specific actionable tips to improve the resume" 
            }
          },
          required: ["score", "summary", "strengths", "weaknesses", "improvements"]
        }
      }
    });

    const jsonText = response.text;
    if (!jsonText) throw new Error("No data returned from AI");
    
    return JSON.parse(jsonText) as ResumeAnalysis;
  } catch (error) {
    console.error("Error analyzing resume:", error);
    throw error;
  }
};