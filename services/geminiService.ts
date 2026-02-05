
import { GoogleGenAI, Type } from "@google/genai";
import { PipelineParams } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

export const generateSmartPipelineExplanation = async (params: PipelineParams) => {
  try {
    const prompt = `
      Analyze this CI/CD pipeline configuration and provide a professional summary of what it does.
      Parameters:
      - Git Repo: ${params.gitRepoUrl}
      - Branch: ${params.gitBuildRef}
      - Image Name: ${params.dockerImageName}
      - Docker Directory: ${params.dockerImageDirectory}
      
      Generate a concise technical explanation in 3-4 bullet points.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });

    return response.text;
  } catch (error) {
    console.error("Gemini Error:", error);
    return "CloudOps AI couldn't generate a summary at this time.";
  }
};
