import OpenAI from 'openai';

// Initialize the Gemini API client
// The API key is automatically injected by AI Studio into process.env.GEMINI_API_KEY
const ai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY, dangerouslyAllowBrowser: true });

export async function makePromptSafe(originalPrompt: string): Promise<string> {
  const systemInstruction = `You are an expert AI prompt engineer. The user will provide an image generation prompt that might trigger safety filters (due to violence, explicit content, gore, etc.). 
Your task is to rewrite the prompt to be completely safe while preserving the EXACT artistic style, composition, color palette, typography, and overall vibe.
- Replace unsafe elements (weapons, blood, explicit nudity, extreme violence) with safe, thematic, or metaphorical equivalents (e.g., glowing energy, abstract paint splatters, dramatic posing, futuristic tools, elegant clothing).
- Keep the structure of the prompt intact.
- Do not include any markdown formatting blocks like \`\`\` or introductory text. Just return the sanitized prompt.`;

  try {
    const response = await ai.chat.completions.create({ model: 'chatgpt-5.4', messages: [{ role: 'system', content: systemInstruction }, { role: 'user', content: originalPrompt }], temperature: 0.4 });
    return response.choices[0]?.message?.content || originalPrompt;
  } catch (error: any) {
    console.error('Error sanitizing prompt:', error);
    if (error?.status === 429 || error?.message?.includes('429') || error?.message?.includes('RESOURCE_EXHAUSTED') || error?.message?.includes('quota')) {
      throw new Error('You have exceeded your OpenAI API quota. Please check your plan and billing details, or try again later.');
    }
    if (error?.status === 401 || error?.message?.includes('401') || error?.message?.includes('API key')) {
      throw new Error('Invalid OpenAI API key. Please check your .env file and ensure it is set correctly.');
    }
    throw new Error(`Failed to sanitize prompt. (${error?.message || 'Unknown error'})`);
  }
}

export interface ImagePayload {
  base64: string;
  mimeType: string;
}

export type StyleAdherenceType = 'Strict adherence' | 'Inspired by' | 'Playful interpretation';
export type StylePresetType = 
  | 'None' 
  | 'Photorealistic' 
  | 'Anime / Manga' 
  | 'Cyberpunk' 
  | 'Watercolor' 
  | '3D Render' 
  | 'Pixel Art'
  | 'Abstract Textured (Raised 1-2mm)'
  | 'Impasto Oil Painting'
  | 'Classic Oil Painting'
  | 'Real Hand-Painted Item'
  | 'Neon Cyber-Noir'
  | 'Vintage Pop-Art'
  | 'Surrealism'
  | 'Papercraft / Origami';
export type SubjectManipulationType = 'Match Original' | 'Keep Original Subject Identity' | 'Reinterpret Subject Concept' | 'New Subject/Character';
export type PreservationWeight = 'Low' | 'Medium' | 'High'; // Deprecated for percentages but keeping type for reference

export interface FocusRegion {
  id: string;
  imageId: string;
  label: string;
}

export interface PromptGenerationOptions {
  modelName: string;
  isCompletelyNew: boolean;
  customAction?: string;
  customMood?: string;
  addCreativeElements: boolean;
  strictFontMatching: boolean;
  styleAdherence: StyleAdherenceType;
  stylePresets: StylePresetType[];
  stylePresetStrength?: number;
  uniqueTextStyles: boolean;
  subjectManipulation: SubjectManipulationType;
  characterLikenessWeight: number;
  colorPaletteWeight: number;
  artisticMediumWeight: number;
  elementRetention: number;
  synthesisMode?: { subjectImage: ImagePayload, styleImage: ImagePayload } | null;
  cameraAngle: string;
  lightingSetup: string;
  promptDensity: 'Distilled' | 'Normal' | 'Expanded';
  colorOverride: { type: 'Extract' | 'Modify' | 'New', value: string };
  artworkCategory?: string;
  mandatorySubjectTraits?: string;
  useImageAsReference?: boolean;
  // High Fidelity Specific Options
  fidelityInstructions?: string;
  enableSpatialMapping?: boolean;
  focusRegions?: FocusRegion[];
  textureOption?: 'Auto-Detect' | 'Film Grain' | 'Grunge Overlay' | 'Crisp Digital' | 'Analog Print' | 'Aged Paper';
  textureEnabled?: boolean;
  textureIntensity?: number;
  advancedTypographyAnalysis?: boolean;
  enableCharacterMapping?: boolean;
  enableAntiFlat?: boolean;
  styleBlendRatio?: number;
  
  // Extension Modules
  enablePerSubjectForensics?: boolean;
  effectPaintSplash?: boolean;
  effectAtmosphericBlend?: boolean;
  effectTextureAmplifier?: boolean;
  effectEdgeEnergy?: boolean;
  effectStyleContrast?: boolean;
  effectColorHarmony?: boolean;
  effectDetailRecovery?: boolean;
  forensicStyleBoundary?: boolean;
  forensicPigmentPhysics?: boolean;
  forensicMicroDetailZoning?: boolean;
  forensicMaterialRecognition?: boolean;
  forensicEyePriority?: boolean;
  forensicPerspectiveIntegrity?: boolean;
  forensicStyleIntent?: boolean;
}

export interface GeneratedPrompt {
  positivePrompt: string;
  negativePrompt: string;
}

function parsePromptResponse(text: string): GeneratedPrompt {
  const positiveMatch = text.match(/\[POSITIVE PROMPT\]:?\s*([\s\S]*?)(?=\[NEGATIVE PROMPT\]|$)/i);
  const negativeMatch = text.match(/\[NEGATIVE PROMPT\]:?\s*([\s\S]*?)$/i);
  
  let positivePrompt = positiveMatch ? positiveMatch[1].trim() : text.trim();
  let negativePrompt = negativeMatch ? negativeMatch[1].trim() : "watermarks, text, frames, bad anatomy, blurry, low resolution, canvas weave, physical artifacts, uneven lighting, glare";

  if (!positiveMatch && !negativeMatch) {
    positivePrompt = text.trim();
  }

  return { positivePrompt, negativePrompt };
}

export async function generateFidelityPromptFromImage(
  images: ImagePayload[],
  options: PromptGenerationOptions
): Promise<GeneratedPrompt> {
  const modelName = options.modelName;
  
  let spatialInstruction = '';
  if (options.enableSpatialMapping) {
    spatialInstruction = `
- SPATIAL & DEPTH MAPPING: You MUST explicitly map out the scene on the Z-axis (Depth). Do not just list items. Explicitly state distances and placements. For example: "Foreground left (0-2m): [item]. Midground center (5m): [subject]. Background right (10m+): [object]". Force the generator to rigidly respect these Z-axis relationships so objects do not overlap incorrectly.`;
  }

  let recoveryInstruction = '';
  if (options.fidelityInstructions) {
    recoveryInstruction = `\n- MANUAL RECOVERY INSTRUCTIONS (CRITICAL): The user has mandated the following specific corrections/recoveries: "${options.fidelityInstructions}". You MUST explicitly weave these demands into your final prompt (e.g., "perfect hands, flawless eyes"). Ensure the prompt rigidly instructs the AI to fix these specific issues.`;
  }

  let addonInstructions = '';
  if (options.enablePerSubjectForensics) addonInstructions += `\n[STYLE FORENSICS ADDON — ENABLED]\nFor each subject in the composition, perform independent style reconstruction:\n- Detect and preserve the exact rendering style per subject.\n- Maintain subject-specific texture behavior.\n- Reconstruct edges, lighting response, and material appearance according to the detected style of each subject individually.\n`;
  if (options.effectPaintSplash) addonInstructions += `[PAINT SPLASH EFFECT: ON] Add dynamic paint splashes matching the color palette.\n`;
  if (options.effectAtmosphericBlend) addonInstructions += `[ATMOSPHERIC LAYER: ON] Add subtle haze, fog, or glow.\n`;
  if (options.effectTextureAmplifier) addonInstructions += `[TEXTURE BOOST: ON] Increase visibility of canvas grain / brush strokes / paper fibers.\n`;
  if (options.effectEdgeEnergy) addonInstructions += `[EDGE ACCENT: ON] Add subtle glow or contrast enhancement on subject edges.\n`;
  if (options.effectStyleContrast) addonInstructions += `[STYLE CONTRAST: ON] Increase visual separation between different style subjects.\n`;
  if (options.effectColorHarmony) addonInstructions += `[COLOR HARMONY: ON] Slightly unify overall palette while preserving original subject colors.\n`;
  if (options.effectDetailRecovery) addonInstructions += `[DETAIL RECOVERY: ON] Restore lost micro-details (eyes, facial features, edges).\n`;
  if (options.forensicStyleBoundary) addonInstructions += `[STYLE BOUNDARY MAPPING: ON] Prevent "style bleeding" across regions.\n`;
  if (options.forensicPigmentPhysics) addonInstructions += `[PIGMENT PHYSICS SIMULATION: ON] Detect and reconstruct pigment pooling, edge darkening, and water diffusion patterns.\n`;
  if (options.forensicMicroDetailZoning) addonInstructions += `[MICRO-DETAIL ZONING: ON] Divide image into zones and apply reconstruction intensity accordingly.\n`;
  if (options.forensicMaterialRecognition) addonInstructions += `[MATERIAL RECOGNITION: ON] Parse paper vs canvas vs digital surface natively.\n`;
  if (options.forensicEyePriority) addonInstructions += `[EYE PRIORITY RECONSTRUCTION: ON] Forces flawless iris, symmetry, and reflection rebuilds on subjects.\n`;
  if (options.forensicPerspectiveIntegrity) addonInstructions += `[PERSPECTIVE INTEGRITY: ON] Enforces rigid perspective across clashing styles.\n`;
  if (options.forensicStyleIntent) addonInstructions += `[STYLE INTENT PRESERVATION: ON] Avoids "fixing" deliberately rough/abstract art.\n`;

  let regionInstruction = '';
  if (options.focusRegions && options.focusRegions.length > 0) {
    const labels = options.focusRegions.map(r => r.label).join(', ');
    regionInstruction = `
- REGIONAL FOCUS (THE MAGNIFYING GLASS): The user highlighted specific details that MUST be protected at all costs: [${labels}]. Dedicate a specific, highly detailed segment in the prompt to ensure the generator renders these tiny details with micro-level precision.`;
  }

  let artworkInstruction = '';
  if (options.artworkCategory && options.artworkCategory !== 'Auto-Detect') {
    artworkInstruction = `
- ARTWORK CATEGORY MANDATE: Treat this exactly as a piece of "${options.artworkCategory}". It is NOT a commercial marketing banner, NOT a movie poster, and NOT an advertisement. Typography and elements must feel organically embedded in fine art or canvas.`;
  }

  let subjectTraitInstruction = '';
  if (options.mandatorySubjectTraits) {
    subjectTraitInstruction = `
- MANDATORY SUBJECT TRAITS: The user demands these exact physical/expressive traits be heavily emphasized: "${options.mandatorySubjectTraits}". Ensure these are explicitly described in the prompt to ensure they make it to the final image.`;
  }

  const systemInstruction = `You are an expert AI image prompt engineer specializing in image restoration and high-fidelity recreation.
Your task is to analyze the provided image(s) and write a highly detailed prompt for an AI image generator (specifically '${modelName}') to recreate the EXACT SAME artwork with MAXIMUM FIDELITY (99% similarity).

TEXTURE & OVERLAY MANAGEMENT (CRITICAL):
- DETECT & REPLICATE: Analyze the source for any subtle grains, textures, or overlays (e.g., film noise, watercolor tooth, paper fiber, subtle grit).
${options.textureEnabled ? `
- TEXTURE MIXING (${options.textureIntensity}% INTENSITY): The user has enabled texture management at ${options.textureIntensity}% strength.
- TEXTURE OVERRIDE: Use the mandated texture: "${options.textureOption || 'Auto-Detect'}".
- BLENDING: Blend the chosen texture seamlessly with the original artistic medium. If intensity is low, keep it subtle. If intensity is high, make the texture a dominant feature.` : '- TEXTURE: Maintain the original texture detected in the source.'}

CORE OBJECTIVES:
- FLAT DIGITAL OUTPUT ONLY: Extract the artwork from any physical context. Do NOT include any physical frames, canvas borders, walls, floors, or mockup elements. The output must be a flat, borderless digital artwork.
- REMOVE PHYSICAL ARTIFACTS & LIGHTING: If the source image is a photo of a physical print (e.g., taken with a phone or camera), you MUST explicitly instruct the generator to REMOVE all uneven shadows, uneven lighting, glare, canvas weave, and paper textures. The final output MUST be a clean digital output ready to print.
- PRESERVE ARTISTIC 3D EFFECTS: If the artwork itself contains 3D effects, depth, or specific lighting within the art, PRESERVE those 3D effects exactly.
- RECOVER DETAILS: Describe the scene so precisely that out-of-focus details, blurriness, and artifacts are replaced with crisp, high-resolution equivalents.
- TEXTURE RECOVERY: Explicitly describe the exact artistic textures (e.g., skin pores, fabric weave of clothing, exact brushstroke styles, metallic sheen) to ensure they are rendered sharply, but EXCLUDE physical canvas/paper textures.
- FONT COLORS & GRADIENTS: Deeply analyze the color of any text/font. Especially in pop-art or street art styles, look for and describe COMPLEX COLOR MAPS, including vertical/horizontal gradients, multi-color fills (e.g., "magenta to cyan gradient"), strokes, and drop shadows. Do not settle for single colors.
- PRECISE TEXT PLACEMENT & FLOW: Detect the EXACT SPATIAL PLACEMENT of text. Describe its flow (angle of rotation, curvature of the baseline, organic warping) so it perfectly matches the original's vibe and feel.
- FACE & TEXT RECOVERY: Deeply analyze and describe faces to restore perfect anatomy and likeness. Transcribe any text exactly. CRUCIAL: Do NOT just say "replicate text from the original". Describe the text SPATIALLY and ARTISTICALLY (e.g., "Hand-painted graffiti text that says 'Hello', positioned at coordinates [X,Y], slightly tilted at 15 degrees, with a subtle wave along the baseline, dripping edges, organically painted onto the background").
- CREATIVE RECOVERY: You may use a tiny amount of creative interpretation ONLY to fill in missing or degraded details, but the final output MUST remain 99% identical to the source composition, color palette, lighting, and subject matter.${spatialInstruction}${recoveryInstruction}${regionInstruction}${artworkInstruction}${subjectTraitInstruction}

You MUST structure your response EXACTLY in the following format:

Image Analysis
Subject: [Identify EACH AND EVERY subject, piece of furniture, character, or creature. EXHAUSTIVELY detail their EXACT KINEMATIC POSE (e.g., instead of "standing", use "leaning back 45 degrees, left arm outstretched pointing down, right hand on hip"). Describe exact hand gestures, direction of gaze, and physical interactions between subjects. Describe specific colors (e.g., "fur is pristine white", "clothing is deep mahogany"), and precise relative spatial positioning (e.g., "bottom left corner, overlapping the center subject"). Do this for all entities present. Break down composition into foreground, midground, background. Analyze depth cues. IF spatial mapping is active, explicitly use Z-axis depth mapping.]
Attire: [Detailed description of clothing and accessories.]
${options.enableCharacterMapping ? `Character Instance Map & Expressions: [Identify EACH character. CRITICAL: If a character appears exactly ONCE, you MUST explicitly state "ONLY ONE instance of [Character Name] in the entire image" to prevent the AI from hallucinating duplicates. Output exactly: CHARACTER_NAME | INSTANCE_COUNT | VARIATION_RULE. Then define an EXPRESSION_PROFILE: structured emotion tags for each character.]\nHierarchy & Composition: [Rank focal elements by priority: 1, 2, 3...]` : ''}
Textures & Materials: [Granular description. ${options.enableAntiFlat ? 'Analyze the source for tactile paint textures, spray gradients, ink bleed, paint cracking, and slight misregistration.' : ''} Clean digital output ready to print.]
Color Tone & Lighting: [Extract the exact color palette using Hex codes (e.g., #CC9966, #990000). Specific lighting conditions. Explicitly instruct to remove uneven shadows or photo glare.]
Vibe: [Detailed description of the overall mood]
Typography & Fine Details: [Exact text transcription and any highlighted focus regions. Deeply analyze font weight and artistic execution.]

AI Generation Prompt
[POSITIVE PROMPT]:
Flat digital fine art print, entirely borderless, no mockup.
[CORE AESTHETIC & COMPOSITION]: [Insert precise subject and composition here. Include spatial mapping Z-axis layout if enabled. State: Flat digital artwork, no uneven shadows, clean print output.]
[ARTISTIC STYLE & COLOR]: STRICT ADHERENCE: You must perfectly replicate the exact artistic style, medium, and aesthetic of the source image. Integrate the exact extracted Hex code color palette here to ensure color fidelity.
[CRITICAL SUBJECT OVERRIDE]: - CHARACTER / SUBJECT PRESERVATION: Keep the EXACT SAME main subjects. [Insert manual recovery instructions here if any: "${options.fidelityInstructions ? options.fidelityInstructions : ''}"]
${addonInstructions.trim() ? `[ADVANCED FORENSICS & ADDONS]:\n${addonInstructions.trim()}\n` : ''}
[SPECIFIC ELEMENTS]: [List ALL elements detected. For EVERY element/subject, explicitly inject the EXACT KINEMATIC POSE, hand gestures, gaze vector, and relative spatial overlaps identified earlier to ensure accurate description without gaps (e.g., "Jessica is leaning back 45 degrees with her left arm outstretched pointing a spray can down"). Do NOT use generic terms like "standing next to". State exactly where they are on the canvas. Include extreme detail for any regional focus items: ${options.focusRegions ? options.focusRegions.map(r=>r.label).join(', ') : 'None'}.]
${options.enableCharacterMapping ? `[CHARACTER MAPPING & EXPRESSIONS]: [Explicitly inject the extracted CHARACTER_NAME and INSTANCE_COUNT here. If a character is single, explicitly write "ONLY ONE [Character] in the scene, no duplicates". Include the exact EXPRESSION_PROFILE for each.]\n[FOCAL PRIORITY]: [Inject the extracted Hierarchy rankings 1, 2, 3...]` : ''}
${options.enableAntiFlat ? `[ANTI-FLAT RENDER CONSTRAINT]: EXPLICTLY AVOID clean vector fills, uniform gradients, and digital smooth shading. PRIORITIZE tactile paint textures, uneven pigment density, spray gradients, ink bleed, paint cracking, slight misregistration, and surface imperfections over flat vectors.` : ''}
${options.styleBlendRatio !== undefined ? `[STYLE BLENDING]: Use a precise rendering blend: ${100 - options.styleBlendRatio}% 2D Flat Color / Vectors mixed with ${options.styleBlendRatio}% Hand-Painted Texture (spray paint overspray, acrylic streaks, stencil edges, halftone dots).` : ''}
[TYPOGRAPHY]: [CRITICAL TYPOGRAPHY RULE: Text MUST feel physically integrated into the artwork. IF the source image has handwritten, stylized, pop art, or graffiti text: explicitly describe the physical medium of the text (e.g., "painted, brushed, scribbled, organic flow, irregular baseline, letters of varying sizes and tilts"). DO NOT describe text as flat, typed, or straight-lined unless the source is exactly a digital UI. Embed text naturally into layers.] [CHAOTIC TYPOGRAPHY RULE: Introduce variation in weight, spacing, and texture.] Include text: [List text].

[NEGATIVE PROMPT]: [Generate a highly specific negative prompt detailing what should NOT be in the image (e.g., watermarks, frames, bad anatomy, blurry, low resolution, canvas weave, physical artifacts, uneven lighting, glare, 3D elements if the original is flat). Include inversions of user recovery rules.]

Do not include markdown formatting blocks like \`\`\`.`;

  try {
    const imageParts = images.map(img => ({
      inlineData: {
        data: img.base64,
        mimeType: img.mimeType,
      },
    }));

    const openaiParts = images.map(img => ({ type: 'image_url' as const, image_url: { url: `data:${img.mimeType};base64,${img.base64}` } }));
    const response = await ai.chat.completions.create({ model: 'chatgpt-5.4', messages: [{ role: 'system', content: systemInstruction }, { role: 'user', content: [ ...openaiParts, { type: 'text' as const, text: 'Analyze this image and generate the maximum fidelity restoration prompt according to the system instructions.' } ] }], temperature: 0.1 });
    return parsePromptResponse(response.choices[0]?.message?.content || '');
  } catch (error: any) {
    console.error('Error generating fidelity prompt:', error);
    if (error?.status === 429 || error?.message?.includes('429') || error?.message?.includes('RESOURCE_EXHAUSTED') || error?.message?.includes('quota')) {
      throw new Error('You have exceeded your OpenAI API quota. Please check your plan and billing details, or try again later.');
    }
    if (error?.status === 401 || error?.message?.includes('401') || error?.message?.includes('API key')) {
      throw new Error('Invalid OpenAI API key. Please check your .env file and ensure it is set correctly.');
    }
    throw new Error(`Failed to generate prompt. (${error?.message || 'Unknown error'})`);
  }
}
export async function generatePromptFromImage(
  images: ImagePayload[],
  options: PromptGenerationOptions
): Promise<GeneratedPrompt> {
  const {
    modelName,
    isCompletelyNew,
    addCreativeElements,
    strictFontMatching,
    styleAdherence,
    stylePresets,
    uniqueTextStyles,
    subjectManipulation,
    characterLikenessWeight,
    colorPaletteWeight,
    artisticMediumWeight,
    elementRetention,
    synthesisMode,
    cameraAngle,
    lightingSetup,
    promptDensity,
    colorOverride,
    textureOption,
    textureEnabled,
    textureIntensity,
    advancedTypographyAnalysis
  } = options;

  let addonInstructions = '';
  if (options.enablePerSubjectForensics) addonInstructions += `\n[STYLE FORENSICS ADDON — ENABLED]\nFor each subject in the composition, perform independent style reconstruction:\n- Detect and preserve the exact rendering style per subject.\n- Maintain subject-specific texture behavior.\n- Reconstruct edges, lighting response, and material appearance according to the detected style of each subject individually.\n`;
  if (options.effectPaintSplash) addonInstructions += `[PAINT SPLASH EFFECT: ON] Add dynamic paint splashes matching the color palette.\n`;
  if (options.effectAtmosphericBlend) addonInstructions += `[ATMOSPHERIC LAYER: ON] Add subtle haze, fog, or glow.\n`;
  if (options.effectTextureAmplifier) addonInstructions += `[TEXTURE BOOST: ON] Increase visibility of canvas grain / brush strokes / paper fibers.\n`;
  if (options.effectEdgeEnergy) addonInstructions += `[EDGE ACCENT: ON] Add subtle glow or contrast enhancement on subject edges.\n`;
  if (options.effectStyleContrast) addonInstructions += `[STYLE CONTRAST: ON] Increase visual separation between different style subjects.\n`;
  if (options.effectColorHarmony) addonInstructions += `[COLOR HARMONY: ON] Slightly unify overall palette while preserving original subject colors.\n`;
  if (options.effectDetailRecovery) addonInstructions += `[DETAIL RECOVERY: ON] Restore lost micro-details (eyes, facial features, edges).\n`;
  if (options.forensicStyleBoundary) addonInstructions += `[STYLE BOUNDARY MAPPING: ON] Prevent "style bleeding" across regions.\n`;
  if (options.forensicPigmentPhysics) addonInstructions += `[PIGMENT PHYSICS SIMULATION: ON] Detect and reconstruct pigment pooling, edge darkening, and water diffusion patterns.\n`;
  if (options.forensicMicroDetailZoning) addonInstructions += `[MICRO-DETAIL ZONING: ON] Divide image into zones and apply reconstruction intensity accordingly.\n`;
  if (options.forensicMaterialRecognition) addonInstructions += `[MATERIAL RECOGNITION: ON] Parse paper vs canvas vs digital surface natively.\n`;
  if (options.forensicEyePriority) addonInstructions += `[EYE PRIORITY RECONSTRUCTION: ON] Forces flawless iris, symmetry, and reflection rebuilds on subjects.\n`;
  if (options.forensicPerspectiveIntegrity) addonInstructions += `[PERSPECTIVE INTEGRITY: ON] Enforces rigid perspective across clashing styles.\n`;
  if (options.forensicStyleIntent) addonInstructions += `[STYLE INTENT PRESERVATION: ON] Avoids "fixing" deliberately rough/abstract art.\n`;

  let compositionInstruction = "Exact composition: [Carefully describe the EXACT pose, layout, spatial relationship, and placement of all elements identically to the source image. Do NOT alter the pose or composition].";
  
  if (isCompletelyNew || subjectManipulation === 'Reinterpret Subject Concept' || subjectManipulation === 'New Subject/Character') {
    compositionInstruction = "Alternate composition: [Inject a little bit of creativity here to describe a NEW, dynamic, and different composition/pose/layout].";
  } else if (subjectManipulation === 'Keep Original Subject Identity') {
    compositionInstruction = "Alternate composition: [Place the original subjects in a completely NEW pose, layout, or scenario, matching the new requested composition].";
  }

  let subjectInstruction = "";
  if (subjectManipulation === 'Keep Original Subject Identity') {
    subjectInstruction = `- CHARACTER / SUBJECT PRESERVATION: Keep the EXACT SAME main subject/character from the original image (e.g., if it is a specific person, animal, or iconic object, retain their identity). However, place them in a completely new pose, angle, or situation that fits the new composition. Modify their outfit details or accessories to fit the new original artwork, but their core identity must remain identical.`;
  } else if (subjectManipulation === 'Reinterpret Subject Concept') {
    subjectInstruction = `- CHARACTER / SUBJECT REINTERPRETATION: Keep the same conceptual subject (pose idea, attitude, theme) but modify proportions, pose angle, facial expression, and styling details. Avoid exact likeness — reinterpret in a new artistic form. Do NOT use the exact original characters.`;
  } else if (subjectManipulation === 'New Subject/Character') {
    subjectInstruction = `- NEW SUBJECT: Do NOT use the original characters or exact elements. Invent COMPLETELY NEW characters and subjects that perfectly match the original style, representing a different concept or entity entirely.`;
  } else {
    subjectInstruction = `- CHARACTER / SUBJECT: Accurately describe the original subjects and characters, maintaining their exact identity and appearance.`;
  }

  let retentionInstruction = "";
  if (elementRetention >= 80) {
    retentionInstruction = "REUSE ALL ELEMENTS: Extract and reuse almost every specific object, character, and background detail from the source. Do not invent new major elements, just rearrange them.";
  } else if (elementRetention >= 40) {
    retentionInstruction = "MIXED ELEMENTS: Reuse the main subjects and key iconic elements from the source, but invent new, thematically related elements to fill out the new composition.";
  } else {
    retentionInstruction = "MOSTLY NEW ELEMENTS: Keep only the absolute core theme or subject. Invent entirely new, relative elements and objects to build a fresh composition. Discard most original specific details.";
  }

  let textureInstruction = "";
  if (textureEnabled) {
    if (textureOption && textureOption !== 'Auto-Detect') {
      textureInstruction = `\n[TEXTURE OVERRIDE - ${textureIntensity}% STRENGTH]: Ignore the original style's texture and force a "${textureOption}" aesthetic. Describe this in detail (e.g., if Film Grain: "heavy 35mm film grain, analog noise, vintage cinematic texture"; if Grunge Overlay: "weathered distressed textures, subtle scratches, grunge grit, aged surfaces"). Blend this at ${textureIntensity}% intensity with the base medium.`;
    } else {
      textureInstruction = `\n[TEXTURE ANALYSIS - ${textureIntensity}% STRENGTH]: Deeply analyze the artistic texture of the source (e.g., grain, brush tooth, ink bleed, digital smoothness) and faithfully replicate its exact physical properties at ${textureIntensity}% visibility strength.`;
    }
  } else {
    textureInstruction = "\n[TEXTURE]: Preserve the natural artistic texture of the source medium without additional overrides.";
  }

  const completelyNewBase = `CORE OBJECTIVE: Create a COMPLETELY NEW artwork that is highly original but relatable to the source image's DNA.
- DEEP ANALYSIS: Deeply analyze the style, color palette, and specific details of the source.
- SUBJECT PRESERVATION & TRANSFORMATION: Keep the EXACT main subject identity (e.g., if it is Marilyn Monroe, a specific character, or iconic figure, retain them). However, you MUST completely change their pose, expression, action, and mood to be entirely different from the source image. ${options.customAction ? `FORCE this specific action/pose: "${options.customAction}". ` : 'Invent a completely new dynamic action or pose. '}
- MOOD & VIBE: The overall mood and vibe MUST remain HIGHLY RELATABLE to the original (e.g., if it's seductive high-end fashion, keep it seductive and high-end). ${options.customMood ? `However, INFUSE this specific mood/vibe nuance: "${options.customMood}". ` : 'Maintain the core emotional resonance and atmosphere of the source.'}
- COMPOSITION & ENVIRONMENT: Create a completely new background and layout that fits the original relatable vibe perfectly. Do NOT duplicate the original layout, but keep the world-building consistent. 
- TYPOGRAPHY OVERRIDE (CRITICAL): If the source image has typography or text (especially pop-style art), extract ONLY recognized brand names or logos to reuse. Do NOT copy other common words or phrases as they are. Instead, invent and replace them with conceptually related keywords that fit the new vibe.
- ELEMENT RETENTION (${elementRetention}%): ${retentionInstruction}
- COLOR SYSTEM: Keep the general color palette but apply it to the new environment and mood.
- ORIGINALITY ENFORCEMENT: The final artwork must NOT be recognizable as a duplicate layout or tracing. Every background detail and secondary element must be new and original but stylistically relatable to the source.`;

  if (isCompletelyNew && addCreativeElements) {
    compositionInstruction = `[COMPLETELY NEW ARTWORK WITH EXTRA ELEMENTS]\n${completelyNewBase}\n- CREATIVE ADDITIONS: Introduce brand new, surprising, and highly creative thematic elements into the background or foreground that elevate the composition.`;
  } else if (isCompletelyNew) {
    compositionInstruction = `[COMPLETELY NEW ARTWORK]\n${completelyNewBase}`;
  } else if (addCreativeElements) {
    compositionInstruction = "Alternate composition with New Elements: [Describe a NEW, dynamic, and different composition/pose/layout using the original characters. ADDITIONALLY, introduce brand new, surprising, and highly creative thematic elements into the background or foreground that complement the original].";
  }

  let temperature = 0.4;
  let adherenceInstruction = "";
  if (styleAdherence === 'Strict adherence') {
    temperature = 0.2;
    adherenceInstruction = "STRICT ADHERENCE: You must perfectly replicate the exact artistic style, medium, and aesthetic of the source image without deviation.";
  } else if (styleAdherence === 'Inspired by') {
    temperature = 0.6;
    adherenceInstruction = "INSPIRED BY: Capture the core essence and mood of the source image's style, but allow for slight stylistic evolution or blending.";
  } else if (styleAdherence === 'Playful interpretation') {
    temperature = 0.9;
    adherenceInstruction = "PLAYFUL INTERPRETATION: Take the source image's style as a loose starting point and creatively reinterpret it. Push boundaries and introduce unexpected stylistic twists.";
  }

  if (options.stylePresets && options.stylePresets.length > 0 && !options.stylePresets.includes('None')) {
    const presetDescriptions = options.stylePresets.map(stylePreset => {
      let desc = `highly detailed ${stylePreset} style`;
      if (stylePreset === 'Abstract Textured (Raised 1-2mm)') {
        desc = `abstract textured artwork with extremely thick, raised 1-2mm physical texture (like heavy gesso, modeling paste, or plaster). Emphasize structural depth, 3D surface variations, tactile bumps, and thick ridges catching the light. Build the scene purely out of these thick textural ridges and abstract layered materials`;
      } else if (stylePreset === 'Impasto Oil Painting') {
        desc = `heavy impasto oil painting. Emphasize visible, expressive, thick brush strokes stacked on top of each other, sweeping palette knife smears, and rich physical paint texture completely covering the surface`;
      } else if (stylePreset === 'Classic Oil Painting') {
        desc = `classic, traditional oil painting. Emphasize masterful brushwork, blended glazes, rich chiaroscuro lighting, subtle craquelure, and the organic, analog imperfection of a real museum piece`;
      } else if (stylePreset === 'Real Hand-Painted Item') {
        desc = `real hand-painted item (like a painted sign, decorative box, or folk art). Emphasize the tactile nature of paint sitting on top of a physical surface, visible brush hairs, slight unevenness in the coating, and an authentic, handmade artisanal feel`;
      } else if (stylePreset === 'Neon Cyber-Noir') {
        desc = `neon cyber-noir aesthetic. Emphasize high-contrast chiaroscuro lighting, deep crushed black shadows, and piercing saturated neon lights (cyan, magenta, amber) illuminating the subjects through fog and atmospheric haze`;
      } else if (stylePreset === 'Vintage Pop-Art') {
        desc = `vintage pop-art style (like Roy Lichtenstein or Andy Warhol). Use bold varying halftone dots (Ben-Day dots), heavy mechanical black outlines, flat highly-saturated block colors, and distressed comic-book paper textures`;
      } else if (stylePreset === 'Papercraft / Origami') {
        desc = `layered papercraft and origami style. Build the entire composition using meticulously cut and folded layers of colored paper, with distinct harsh shadows and global illumination emphasizing the 3D depth of the cut paper layers`;
      } else if (stylePreset === 'Surrealism') {
         desc = `surrealism style art. Introduce dreamlike mechanics, physically impossible geometries, melting or floating elements, and a stark disconnect between realistic rendering and illogical subject scenarios`;
      }
      return desc;
    });

    const strengthStr = options.stylePresetStrength !== undefined ? `Force this style override at ${options.stylePresetStrength}% intensity.` : '';

    adherenceInstruction += ` \n\n[CRITICAL STYLE OVERRIDE]: Transform the original image's style into a fusion of the following styles: ${options.stylePresets.join(' and ')}. Focus on combining these exact aesthetic approaches: ${presetDescriptions.join(' AND ')}. Override the original medium while keeping the core subject concept intact. ${strengthStr}`;
  }

  if (!isCompletelyNew && subjectManipulation !== 'Match Original') {
    adherenceInstruction += ` \n\n[CRITICAL SUBJECT OVERRIDE]: ${subjectInstruction}`;
  }

  let textAnalysisInstruction = options.advancedTypographyAnalysis
    ? "Text: [Exact transcription of all text. CRITICAL: Deeply analyze the typography, font weight, and artistic execution. FONT COLORS & GRADIENTS: Identify and describe the exact color composition of the text, specifically looking for and detailing any gradients (e.g., 'top-to-bottom sunset gradient'), multi-color fills, or metallic glints. PRECISE PLACEMENT: Map the exact spatial placement of the text and the flow of the letters (angle, curve of the baseline, organic warping) to match the vibe and feel of the source. Explicitly detect and describe variations in text rendering, such as varying stroke widths, texture overlays (e.g., spray paint grunge), and subtle warping or distortion. Differentiate between specific styles: if handwritten, describe the pen/marker stroke and cursive flow; if graffiti, detail the spray paint texture, drips, and bubble/wildstyle forms. Describe the texture, medium, and exact visual appearance. Treat text as a physical artistic element.]"
    : "Text: [Exact transcription of all text. CRITICAL: Deeply analyze the typography, font weight, and artistic execution. Explicitly detect and describe variations in text rendering, such as varying stroke widths, texture overlays (e.g., spray paint grunge), and subtle warping or distortion. Differentiate between specific styles: if handwritten, describe the pen/marker stroke and cursive flow; if graffiti, detail the spray paint texture, drips, and bubble/wildstyle forms. Describe the texture, medium, and exact visual appearance. Treat text as a physical artistic element.]";

  let textPromptInstruction = options.advancedTypographyAnalysis
    ? "[CRITICAL TYPOGRAPHY RULE: State explicitly that text must be physically painted or drawn into the scene at the PRECISE ANALYZED COORIDNATES and with the EXACT ANALYZED FLOW / TILT. Describe the text using physical mediums (e.g., 'Messy graffiti text that says X drawn with thick marker', 'uneven baseline', 'drip-style paint'). MANDATE the use of detected COLOR GRADIENTS and multi-color fills for the letters. NEVER mention 'the original font' or 'the source image'. Describe the font's actual physical look. If it's pop-art or street art, mandate that the typography is chaotic, hand-rendered, heavily textured, and NOT typed, NOT digitally flat, and NOT in a perfect straight line.]"
    : "[CRITICAL TYPOGRAPHY RULE: State explicitly that text must be physically painted or drawn into the scene. Describe the text using physical mediums (e.g., 'Messy graffiti text that says X drawn with thick marker', 'uneven baseline', 'drip-style paint'). NEVER mention 'the original font' or 'the source image'. Describe the font's actual physical look. If it's pop-art or street art, mandate that the typography is chaotic, hand-rendered, heavily textured, and NOT typed, NOT digitally flat, and NOT in a perfect straight line.]";

  if (strictFontMatching) {
    textAnalysisInstruction += " [STRICT FONT MATCHING ENABLED: You MUST prioritize identifying handwritten, graffiti, or abstract styles over flat, typed fonts. Detail its organic, hand-rendered nature in extreme detail.]";
    textPromptInstruction += " [STRICT FONT MATCHING ENABLED: Explicitly mandate in the prompt that the AI avoid flat, typed fonts. Force the generator to use messy hand-rendered, graffiti, or abstract styles matching your analysis, ensuring organic flow and irregular baselines.]";
  }

  if (uniqueTextStyles) {
    textPromptInstruction += " [CHAOTIC TYPOGRAPHY RULE: Every text element must be uniquely designed and explicitly described as hand-painted or physically rendered. Avoid straight baselines — letters should have varying sizes, tilts, and messy street-art applications. State clearly: 'Text is NOT flat, NOT typed, NOT in a straight line. Use a mix of heavy impasto brush strokes, bold pop lettering, stencil, and distorted edges.' Typography MUST feel organically embedded into the physical layers.]";
  }

  let preservationInstructions = "";
  preservationInstructions += `- CHARACTER LIKENESS: [${characterLikenessWeight}% STRENGTH] ${characterLikenessWeight >= 70 ? 'CRITICAL: Preserve exact character likeness, facial features, and proportions.\n' : characterLikenessWeight <= 30 ? 'FLEXIBLE: Character likeness is flexible; focus on the concept rather than exact facial matching.\n' : 'MODERATE: Maintain general character likeness but allow for slight stylistic adaptation.\n'}`;
  preservationInstructions += `- COLOR PALETTE: [${colorPaletteWeight}% STRENGTH] ${colorPaletteWeight >= 70 ? 'CRITICAL: Strictly adhere to the exact color palette instructions.\n' : colorPaletteWeight <= 30 ? 'FLEXIBLE: Color palette can be loosely interpreted or shifted.\n' : 'MODERATE: Keep the general color mood but allow for some variation in specific hues.\n'}`;
  preservationInstructions += `- ARTISTIC MEDIUM: [${artisticMediumWeight}% STRENGTH] ${artisticMediumWeight >= 70 ? 'CRITICAL: Perfectly replicate the original artistic medium, brushstrokes, and texture.\n' : artisticMediumWeight <= 30 ? 'FLEXIBLE: Artistic medium can be adapted or changed.\n' : 'MODERATE: Maintain the general feel of the medium but allow for rendering differences.\n'}`;

  let densityInstruction = "";
  if (promptDensity === 'Distilled') {
    densityInstruction = "CRITICAL DENSITY RULE: The final [POSITIVE PROMPT] MUST be short, punchy, and under 40 words. Focus ONLY on the absolute core subject, style, and lighting. Do not over-describe.";
  } else if (promptDensity === 'Expanded') {
    densityInstruction = "CRITICAL DENSITY RULE: The final [POSITIVE PROMPT] MUST be massive and highly detailed (200+ words). Describe every single background element, texture, light ray, and micro-detail.";
  }

  let cameraInstruction = cameraAngle !== 'Auto' ? `[CAMERA OVERRIDE]: Force the camera angle to be: ${cameraAngle}. ` : '';
  let lightingInstruction = lightingSetup !== 'Auto' ? `[LIGHTING OVERRIDE]: Force the lighting setup to be: ${lightingSetup}. ` : '';

  let colorInstruction = "";
  if (colorOverride.type === 'Modify') {
    colorInstruction = `Extract the original palette (including Hex codes) but MODIFY it by adding/replacing with these colors/moods: ${colorOverride.value}.`;
  } else if (colorOverride.type === 'New') {
    colorInstruction = `IGNORE the original color palette. Force the entire scene to use this completely new color palette/mood: ${colorOverride.value}. Integrate exact hex codes.`;
  } else {
    colorInstruction = `Extract and strictly use the dominant color palette from the source image including exact Hex codes (e.g. #CC9966). Explicitly Suggest incorporating this exact palette directly into the AI Generation Prompt to ensure color fidelity.`;
  }

  let artworkInstruction = '';
  if (options.artworkCategory && options.artworkCategory !== 'Auto-Detect') {
    artworkInstruction = `\n[ARTWORK CATEGORY MANDATE]: Treat this explicitly as a piece of "${options.artworkCategory}". It is NOT a commercial marketing banner, NOT a movie poster, and NOT an advertisement. Typography and elements must feel organically embedded in fine art, editorial fashion, or canvas.`;
  }

  let subjectTraitInstruction = '';
  if (options.mandatorySubjectTraits) {
    subjectTraitInstruction = `\n[MANDATORY SUBJECT TRAITS]: The user explicitly requests these physical/expressive traits be heavily emphasized: "${options.mandatorySubjectTraits}". Ensure exact anatomy, expression, and detail matches this perfectly.`;
  }

  const systemInstruction = `You are an expert AI image prompt engineer. Analyze the provided image(s) in deep detail. Your task is to write a highly detailed prompt for an AI ${options.useImageAsReference ? 'Image Edit / Image-to-Image' : 'pure Text-to-Image'} generator (specifically '${modelName}').

${synthesisMode ? "SYNTHESIS MODE ACTIVE: You will receive two images. Image 1 is the SUBJECT REFERENCE. Image 2 is the STYLE REFERENCE. You MUST extract the character/layout from Image 1 and explicitly rewrite the prompt to render it entirely in the artistic medium, color palette, and vibe of Image 2." : ""}

You MUST structure your response EXACTLY in the following format:

Image Analysis
Subject: [Identify EACH AND EVERY subject, character, or creature. EXHAUSTIVELY detail their EXACT KINEMATIC POSE (e.g., instead of "standing", use "leaning back 45 degrees, left arm outstretched pointing a spray can down, right hand on hip"). Describe where they are looking. Describe exact hand gestures. Detail specific colors (including fur, skin, clothing hues), facial expressions, and specific markings. Break down the composition into foreground, midground, and background elements, explicitly describing how they interact and overlap (e.g., "Subject A is standing IN FRONT OF Subject B, partially obscuring their left arm"). Analyze the visual weight and balance of elements, the use of leading lines, and depth cues used in the artwork, such as atmospheric perspective, foreshortening, or overlapping elements.]
Attire: [Detailed description of clothing and accessories]
${options.enableCharacterMapping ? `Character Instance Map & Expressions: [Identify EACH character. CRITICAL: If a character appears exactly ONCE, you MUST explicitly state "ONLY ONE instance of [Character Name] in the entire image" to prevent the AI from hallucinating duplicates. Output exactly: CHARACTER_NAME | INSTANCE_COUNT | VARIATION_RULE. Then define an EXPRESSION_PROFILE: structured emotion tags for each character.]\nHierarchy & Composition: [Rank focal elements by priority: 1, 2, 3...]` : ''}
Color Tone: [${colorInstruction} Vividly describe the mood and specific lighting conditions. Explicitly detail ambient occlusion, rim lighting, global illumination, volumetric lighting, caustics, lens flares, or specific light sources within the artwork. Clearly distinguish if the artwork has flat lighting or intended 3D depth/volumetric lighting. Explicitly instruct to remove all uneven shadows and uneven lights detected in the source image, ensuring a clean digital output ready to print.]
Style: [Detailed description of the artistic style, medium, and aesthetic. Identify any specific artistic movements or eras (e.g., Art Nouveau, Baroque, Surrealism, 1980s synthwave). Provide granular descriptions of artistic techniques (e.g., impasto, scumbling, cel-shading, photorealism) and specific brushstroke patterns or rendering styles. Explicitly instruct to remove any canvas weave texture or photo artifacts, ensuring a clean digital output ready to print. ${textureEnabled ? `MANDATORY TEXTURE: Use ${textureOption || 'Auto-Detect'} at ${textureIntensity || 100}% intensity.` : 'STRICT TEXTURE ANALYSIS: Detect and describe the exact grain/texture from the source.'}]
Vibe: [Detailed description of the overall mood, atmosphere, and emotional resonance of the artwork.]
Elements: [List EACH AND EVERY specific background, foreground, or thematic element/object. For EVERY object listed, explicitly state its exact color, texture, and pose/state.]
${textAnalysisInstruction}

AI Generation Prompt
[POSITIVE PROMPT]:
${options.useImageAsReference ? '[IMAGE-TO-IMAGE REFERENCE RULE: This prompt is for an Image-to-Image / Image Edit model that WILL see the source image. You MUST instruct the generator to explicitly "only use the source image for reference and inspiration, and Do NOT edit, enhance, repaint, trace, or simply transform the source image." Frame the prompt to create a new piece inspired by this reference. Do NOT tell it to be purely standalone.]' : '[TEXT-TO-IMAGE PURE PROMPT RULE: This entire Positive and Negative prompt block will be fed to an AI that CANNOT see the original image. You MUST NOT use phrases like "in the source image", "identical to the original", or "as seen in the reference". Describe everything as a standalone, purely original creation.]'}
Flat digital fine art print, entirely borderless, no mockup, clean digital output ready to print, no uneven shadows, no uneven lighting, no canvas weave or camera artifacts. 
[PRESERVATION WEIGHTS]: ${preservationInstructions.trim()}
${densityInstruction}
[CORE AESTHETIC & COMPOSITION]: ${compositionInstruction} ${cameraInstruction} ${artworkInstruction} [Ensure foreground, midground, and background interactions, visual weight, balance, leading lines, and depth cues (like atmospheric perspective, foreshortening, or overlapping elements) are accurately reflected].
[ARTISTIC STYLE & COLOR]: ${adherenceInstruction} ${lightingInstruction} [Explicitly specify any identified artistic movements or eras (e.g., Art Nouveau, Surrealism, 1980s synthwave). Integrate the described Vibe (mood and atmosphere), the extracted dominant color palette (or the overridden palette), granular artistic techniques, and explicit lighting nuances like volumetric lighting, caustics, lens flares, ambient occlusion, or rim lighting here].
${addonInstructions.trim() ? `[ADVANCED FORENSICS & ADDONS]:\n${addonInstructions.trim()}\n` : ''}
[SPECIFIC ELEMENTS]: ${subjectTraitInstruction} [Seamlessly integrate ALL the details from your analysis: characters, attire, and background/foreground elements. EXPLICITLY INJECT the exact kinematic poses, hand gestures, gaze directions, and spatial overlaps for EACH AND EVERY subject/element identified so the prompt leaves nothing to interpretation (e.g., "Jessica is leaning back 45 degrees with her left arm outstretched"). Do NOT use generic terms like "standing next to"].
${options.enableCharacterMapping ? `[CHARACTER MAPPING & EXPRESSIONS]: [Explicitly inject the extracted CHARACTER_NAME and INSTANCE_COUNT here. If a character is single, explicitly write "ONLY ONE [Character] in the scene, no duplicates". Include the exact EXPRESSION_PROFILE for each.]\n[FOCAL PRIORITY]: [Inject the extracted Hierarchy rankings 1, 2, 3...]` : ''}
${options.enableAntiFlat ? `[ANTI-FLAT RENDER CONSTRAINT]: EXPLICTLY AVOID clean vector fills, uniform gradients, and digital smooth shading. PRIORITIZE tactile paint textures, uneven pigment density, spray gradients, ink bleed, paint cracking, slight misregistration, and surface imperfections over flat vectors.` : ''}
${options.styleBlendRatio !== undefined ? `[STYLE BLENDING]: Use a precise rendering blend: ${100 - options.styleBlendRatio}% 2D Flat Color / Vectors mixed with ${options.styleBlendRatio}% Hand-Painted Texture (spray paint overspray, acrylic streaks, stencil edges, halftone dots).` : ''}
[TYPOGRAPHY]: ${textPromptInstruction} [DESCRIBE TEXT SPATIALLY and ARTISTICALLY: e.g., "Hand-painted graffiti text that says 'Hello', with irregular baseline, differing sizes, and dripping edges." Do NOT say "Text identical to the original"].

[NEGATIVE PROMPT]: [Generate a highly specific negative prompt detailing what should NOT be in the image (e.g., watermarks, text (if none desired), typed fonts, straight line text, frames, bad anatomy, blurry, low resolution, canvas weave, physical artifacts, uneven lighting, glare, etc.)]

Make sure the look and feel of the output image matches the requested style adherence. Do not include markdown formatting blocks like \`\`\`.`;

  try {
    let openaiContent: any[] = [];
    
    if (synthesisMode) {
      openaiContent.push({ type: 'text' as const, text: "Image 1 (SUBJECT REFERENCE):" });
      openaiContent.push({ type: 'image_url' as const, image_url: { url: `data:${synthesisMode.subjectImage.mimeType};base64,${synthesisMode.subjectImage.base64}` } });
      openaiContent.push({ type: 'text' as const, text: "Image 2 (STYLE REFERENCE):" });
      openaiContent.push({ type: 'image_url' as const, image_url: { url: `data:${synthesisMode.styleImage.mimeType};base64,${synthesisMode.styleImage.base64}` } });
      openaiContent.push({ type: 'text' as const, text: "Analyze Image 1 for the SUBJECT and COMPOSITION. Analyze Image 2 for the ARTISTIC STYLE, MEDIUM, and VIBE. Merge them together according to the system instructions." });
    } else {
      const openaiParts = images.map((img: any) => ({ type: 'image_url' as const, image_url: { url: `data:${img.mimeType};base64,${img.base64}` } }));
      openaiContent = [
        ...openaiParts,
        { type: 'text' as const, text: 'Analyze this image and generate the prompt according to the system instructions.' }
      ];
    }

    const response = await ai.chat.completions.create({
      model: 'chatgpt-5.4',
      messages: [
        { role: 'system', content: systemInstruction },
        { role: 'user', content: openaiContent }
      ],
      temperature: temperature,
    });

    return parsePromptResponse(response.choices[0]?.message?.content || '');
  } catch (error: any) {
    console.error('Error generating prompt:', error);
    
    // Check for 429 Resource Exhausted error
    if (error?.status === 429 || error?.message?.includes('429') || error?.message?.includes('RESOURCE_EXHAUSTED') || error?.message?.includes('quota')) {
      throw new Error('You have exceeded your OpenAI API quota. Please check your plan and billing details, or try again later.');
    }
    
    if (error?.status === 401 || error?.message?.includes('401') || error?.message?.includes('API key')) {
      throw new Error('Invalid OpenAI API key. Please check your .env file and ensure it is set correctly.');
    }
    
    throw new Error(`Failed to analyze image and generate prompt. (${error?.message || 'Unknown error'})`);
  }
}
