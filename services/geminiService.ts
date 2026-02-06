
import { GoogleGenAI, Type } from "@google/genai";
import { PipelineParams } from "../types";

const API_KEY = process.env.API_KEY || '';
const ai = API_KEY ? new GoogleGenAI({ apiKey: API_KEY }) : null;

export const generateSmartPipelineExplanation = async (params: PipelineParams) => {
  // 如果没有配置 API Key，返回默认消息
  if (!ai) {
    console.warn("Gemini API Key not configured. AI features are disabled.");
    return "AI analysis is not available. Please configure GEMINI_API_KEY in .env.local to enable smart pipeline explanations.";
  }

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
