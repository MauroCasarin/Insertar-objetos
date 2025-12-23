import { GoogleGenAI } from "@google/genai";

/**
 * Sends the current canvas composition to Gemini to generate a realistic version.
 */
export const generateRealisticRender = async (imageBase64: string): Promise<string> => {
  // Initialize API with environment variable
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  // Remove data URL header if present to get raw base64
  const data = imageBase64.replace(/^data:image\/(png|jpeg|jpg);base64,/, "");

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: 'image/png',
              data: data
            }
          },
          {
            text: "Transform this rough composite image into a highly photorealistic scene. The input consists of a foreground object superimposed on a background. Your task is to: 1. Fix the lighting and shadows so the object interacts naturally with the environment. 2. Adjust color grading and white balance to match the object with the background. 3. Fix any jagged edges or artifacts from the cutout. 4. Maintain the identity of the object and the background location, but make them look like a single coherent photograph."
          }
        ]
      }
    });

    // Extract the generated image from the response
    if (response.candidates && response.candidates.length > 0) {
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData && part.inlineData.data) {
          return `data:image/png;base64,${part.inlineData.data}`;
        }
      }
    }
    
    throw new Error("No image data found in the response.");
  } catch (error) {
    console.error("AI Generation Error:", error);
    throw error;
  }
};