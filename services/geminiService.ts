import { GoogleGenAI, Type, Schema, Chat } from "@google/genai";
import { ThumbnailConfig, PromptConceptResponse, AspectRatio, ImageSize } from "../types";

// Initialize Gemini Client
const getAiClient = () => {
    const localKey = localStorage.getItem('gemini_api_key');
    return new GoogleGenAI({ apiKey: localKey || process.env.API_KEY });
};

/**
 * Ensures a paid API key is selected for premium features (Veo, Pro Image)
 */
const ensurePaidApiKey = async () => {
  // If user has manually entered a key, we skip the AI Studio selector check
  if (localStorage.getItem('gemini_api_key')) {
      return;
  }

  const aistudio = (window as any).aistudio;
  if (aistudio && aistudio.hasSelectedApiKey) {
    const hasKey = await aistudio.hasSelectedApiKey();
    if (!hasKey) {
      await aistudio.openSelectKey();
    }
  }
};

/**
 * Allows the user to manually select/update their API key
 */
export const updateApiKey = async () => {
    const aistudio = (window as any).aistudio;
    if (aistudio && aistudio.openSelectKey) {
        await aistudio.openSelectKey();
    } else {
        console.warn("API Key selection is not available via window.aistudio");
    }
};

/**
 * Helper to convert a File object to a Base64 string for the API
 */
const fileToPart = async (file: File) => {
  return new Promise<{ inlineData: { data: string; mimeType: string } }>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = (reader.result as string).split(',')[1];
      resolve({
        inlineData: {
          data: base64String,
          mimeType: file.type,
        },
      });
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

/**
 * Helper to convert a data URL to a part
 */
const dataUrlToPart = (dataUrl: string) => {
    const matches = dataUrl.match(/^data:(.+);base64,(.+)$/);
    if (!matches) throw new Error("Invalid data URL");
    return {
        inlineData: {
            mimeType: matches[1],
            data: matches[2]
        }
    };
};

/**
 * Step 1: Generate the prompt concept
 * Uses Gemini 3 Pro with Thinking if enabled, otherwise Gemini 2.5 Flash
 */
export const generateThumbnailConcept = async (config: ThumbnailConfig, referenceImage?: File | null): Promise<PromptConceptResponse> => {
  const ai = getAiClient();
  // If thinking is enabled, use Pro model with thinking budget.
  const useThinking = config.use_thinking;
  const modelId = useThinking ? "gemini-3-pro-preview" : "gemini-2.5-flash";

  const schema: Schema = {
    type: Type.OBJECT,
    properties: {
      background_prompt: { type: Type.STRING },
      subject_prompt: { type: Type.STRING },
      text_overlay: { type: Type.STRING },
      style: { type: Type.STRING },
      color_palette: { type: Type.STRING },
      aspect_ratio: { type: Type.STRING },
      final_prompt: { type: Type.STRING, description: "A merged prompt describing the full thumbnail for an image generation model." },
    },
    required: ["background_prompt", "subject_prompt", "text_overlay", "style", "final_prompt"],
  };

  let promptText = `
    You are an AI Thumbnail Generator.
    Using this config, create a strong thumbnail concept.

    Config:
    ${JSON.stringify({
      ...config,
      face_image: config.face_image ? "User provided an image" : "None",
      brand_logo: config.brand_logo ? "User provided a logo" : "None",
      reference_thumbnail: referenceImage ? "User provided a reference thumbnail to mimic" : "None"
    })}

    Rules:
    - If overlay_text is empty AND auto_generate_text=true → generate a catchy short title.
    - If overlay_text is provided, use it.
    - Create a 'final_prompt' that is highly descriptive for an image generation model, incorporating the style, subject, and composition.

    CRITICAL - TEXT VISIBILITY & LEGIBILITY:
    - The generated image must have text that is extremely easy to read, even at small sizes.
    - In your 'final_prompt', you MUST include specific visual instructions for the text:
      1. Contrast: Request high contrast colors (e.g., bright text on dark background or vice versa).
      2. Styling: Request "thick bold outlines", "heavy drop shadows", or "neon glow" around the text to separate it from the background.
      3. Background Shapes: If the scene is busy, explicitly ask for a "text box", "brush stroke backing", or "darkened vignette" behind the text.
      4. Typography: Specify "bold", "impactful", "sans-serif" fonts unless the style demands otherwise.
    - Example instruction in final_prompt: "...with the title text 'X' written in massive white sans-serif letters with a thick black outline and drop shadow, floating in the center with high legibility."

    ENHANCED LEGIBILITY LOGIC:
    - Analyze the chosen 'color_palette'. If it's 'Dark', force text to be 'White' or 'Neon'. If 'Pastel', force text to be 'Dark' or 'Black'.
    - AUTOMATIC BACKGROUND SHAPE: For the text element, you MUST strictly enforce a background backing in 'final_prompt' to ensure readability:
      - If 'style_preset' is 'Clean' or 'Minimal': Add a "solid sharp-edged text box" or "colored banner" behind the text.
      - If 'style_preset' is 'Cinematic': Add a "dark cinematic vignette" or "soft shadow overlay" behind the text area to darken the busy background.
      - If 'style_preset' is 'Crazy' or 'Gaming': Add a "dynamic brush stroke", "glowing neon panel", or "distorted shape" behind the text.
    - This background shape is MANDATORY if the background description is detailed.
  `;

  const requestConfig: any = {
    responseMimeType: "application/json",
    responseSchema: schema,
  };

  if (useThinking) {
      requestConfig.thinkingConfig = { thinkingBudget: 32768 };
  }

  const parts: any[] = [{ text: promptText }];

  if (referenceImage) {
      const imgPart = await fileToPart(referenceImage);
      parts.push(imgPart);
      parts[0].text += `\n\nIMPORTANT: A reference thumbnail image is attached. 
      Analyze this reference image deeply.
      Your 'style', 'color_palette', and 'composition' should be heavily inspired by this reference image.
      However, you must swap the subject and text to match the 'Config' provided above (e.g. use the user's video title and hook).
      The 'final_prompt' must describe a new image that looks like a sibling to the reference but with the new content.`;
  }

  const response = await ai.models.generateContent({
    model: modelId,
    contents: { parts },
    config: requestConfig,
  });

  if (!response.text) {
    throw new Error("Failed to generate concept JSON");
  }

  // Clean up potential markdown code blocks if the model adds them despite JSON mime type
  let cleanText = response.text.trim();
  if (cleanText.startsWith('```json')) {
      cleanText = cleanText.replace(/^```json/, '').replace(/```$/, '');
  }

  return JSON.parse(cleanText) as PromptConceptResponse;
};

/**
 * Step 2: Generate the actual image using the concept
 * Supports Nano Banana (Flash Image) and Nano Banana Pro (Pro Image)
 */
export const generateImageFromPrompt = async (
  prompt: string, 
  aspectRatio: AspectRatio,
  imageSize: ImageSize,
  usePro: boolean,
  referenceImages: File[] = []
): Promise<string> => {
  // Model selection
  // High quality -> gemini-3-pro-image-preview
  // Standard -> gemini-2.5-flash-image
  const modelId = usePro ? "gemini-3-pro-image-preview" : "gemini-2.5-flash-image";

  if (usePro) {
      await ensurePaidApiKey();
  }

  // Instantiate client AFTER potentially updating the key
  const ai = getAiClient();

  const parts: any[] = [{ text: prompt }];

  // Add reference images
  for (const file of referenceImages) {
    if (file) {
      const part = await fileToPart(file);
      parts.push(part);
    }
  }

  const imageConfig: any = {
    aspectRatio: aspectRatio,
  };

  // Image Size is only available for gemini-3-pro-image-preview
  if (usePro) {
      imageConfig.imageSize = imageSize;
  }

  const response = await ai.models.generateContent({
    model: modelId,
    contents: { parts },
    config: {
      imageConfig: imageConfig
    }
  });

  if (response.candidates && response.candidates[0].content.parts) {
    for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
            const base64EncodeString = part.inlineData.data;
            return `data:image/png;base64,${base64EncodeString}`;
        }
    }
  }
  
  throw new Error("No image generated in response");
};


/**
 * Edit Image / Refinement Step
 * Uses gemini-2.5-flash-image to edit an image based on a text prompt
 */
export const editImage = async (
  baseImage: string, // data url
  instruction: string
): Promise<string> => {
    const ai = getAiClient();
    const modelId = "gemini-2.5-flash-image";
    
    // Construct parts: Image + Text
    const parts = [
        dataUrlToPart(baseImage),
        { text: instruction }
    ];

    const response = await ai.models.generateContent({
        model: modelId,
        contents: { parts },
        // No special config needed for editing, generally keeps aspect ratio of input or default
    });

    if (response.candidates && response.candidates[0].content.parts) {
        for (const part of response.candidates[0].content.parts) {
            if (part.inlineData) {
                const base64EncodeString = part.inlineData.data;
                return `data:image/png;base64,${base64EncodeString}`;
            }
        }
    }
    
    throw new Error("Failed to edit image");
};

/**
 * Generate Video using Veo
 */
export const generateVeoVideo = async (
    prompt: string,
    image?: string, // Data URL
    aspectRatio: '16:9' | '9:16' = '16:9'
): Promise<string> => {
    await ensurePaidApiKey();
    // Re-instantiate to ensure key
    const ai = getAiClient();
    
    const model = 'veo-3.1-fast-generate-preview';
    
    const config: any = {
        numberOfVideos: 1,
        resolution: '720p', // Veo fast usually supports 720p or 1080p
        aspectRatio: aspectRatio
    };

    let operation;

    if (image) {
        const imgPart = dataUrlToPart(image);
        operation = await ai.models.generateVideos({
            model,
            prompt: prompt || "Animate this image",
            image: {
                imageBytes: imgPart.inlineData.data,
                mimeType: imgPart.inlineData.mimeType,
            },
            config
        });
    } else {
        operation = await ai.models.generateVideos({
            model,
            prompt,
            config
        });
    }

    // Poll for completion
    while (!operation.done) {
        await new Promise(resolve => setTimeout(resolve, 5000));
        operation = await ai.operations.getVideosOperation({ operation: operation });
    }

    const videoUri = operation.response?.generatedVideos?.[0]?.video?.uri;
    if (!videoUri) throw new Error("Video generation failed");

    // Fetch the actual video bytes
    const videoResponse = await fetch(`${videoUri}&key=${process.env.API_KEY}`);
    const blob = await videoResponse.blob();
    return URL.createObjectURL(blob);
};

/**
 * Chat with Gemini
 */
export const createChat = (systemInstruction?: string) => {
    const ai = getAiClient();
    return ai.chats.create({
        model: 'gemini-3-pro-preview',
        config: {
            systemInstruction
        }
    });
};

export const sendMessage = async (chat: Chat, message: string) => {
    const response = await chat.sendMessage({ message });
    return response.text;
};