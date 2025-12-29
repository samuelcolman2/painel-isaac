
import { GoogleGenAI, Type } from "@google/genai";
import { BillingRow, AIInsight } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const analyzeBillingData = async (data: BillingRow[]): Promise<AIInsight> => {
  // Sample data to keep payload reasonable
  const sampleData = data.slice(0, 50).map(row => ({
    name: row['Nome do aluno'],
    billed: row['Valor da cobrança com bolsas'],
    min: row['Valor mínimo da cobrança'],
    diff: row.diff_abs
  }));

  const prompt = `
    Analyze the following student billing data from an educational institution. 
    The data includes the student name, the billed amount (with scholarships), the minimum required amount, and the difference.
    
    Data Context:
    - Total students analyzed: ${data.length}
    - Samples provided: ${JSON.stringify(sampleData)}

    Provide a professional financial analysis in Portuguese. Focus on:
    1. A summary of the overall financial health regarding scholarships.
    2. Any suspicious anomalies (e.g., extremely high differences or negative values).
    3. Actionable recommendations for the financial department.
    4. A brief comment on the trend of scholarship impacts.
  `;

  try {
    // Upgraded to gemini-3-pro-preview for superior analysis of financial anomalies and strategic recommendations.
    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            summary: { type: Type.STRING, description: "Resumo da saúde financeira." },
            anomalies: { 
              type: Type.ARRAY, 
              items: { type: Type.STRING },
              description: "Lista de anomalias encontradas."
            },
            recommendations: { 
              type: Type.ARRAY, 
              items: { type: Type.STRING },
              description: "Recomendações estratégicas."
            },
            financialTrend: { type: Type.STRING, description: "Tendência financeira observada." }
          },
          required: ["summary", "anomalies", "recommendations", "financialTrend"]
        }
      }
    });

    // Accessing .text property as per guidelines, ensuring it's treated as a string before parsing.
    const jsonStr = response.text || "{}";
    return JSON.parse(jsonStr);
  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    throw new Error("Falha ao gerar insights da IA.");
  }
};
