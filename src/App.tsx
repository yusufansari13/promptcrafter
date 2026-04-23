import React, { useState, useRef, ChangeEvent } from 'react';
import { Upload, Image as ImageIcon, Copy, Check, Loader2, Sparkles, AlertCircle, Info, ShieldCheck, Link as LinkIcon, X, Plus, Focus, History } from 'lucide-react';
import { generatePromptFromImage, makePromptSafe, generateFidelityPromptFromImage, StyleAdherenceType, StylePresetType, SubjectManipulationType, ImagePayload, PreservationWeight } from './lib/gemini';
import { generatePromptFromImage as generatePromptOpenAI, makePromptSafe as makePromptSafeOpenAI, generateFidelityPromptFromImage as generateFidelityPromptOpenAI } from './lib/openai';

type ApiProvider = 'Gemini' | 'ChatGPT';
type ModelType = 'Nano Banana 2' | 'Nano Banana Pro' | 'gpt-4o';
type GenerationMode = 'recreation' | 'new_artwork';
type AspectRatio = '1:1' | '16:9' | '9:16' | '4:3' | '3:4' | '3:2' | '2:3' | '21:9' | '9:21' | '5:4' | '4:5';
type Resolution = '1K' | '2K' | '4K';

interface ImageItem {
  id: string;
  file?: File;
  url?: string;
  previewUrl: string;
}

export default function App() {
  const [apiProvider, setApiProvider] = useState<ApiProvider>('Gemini');
  const [images, setImages] = useState<ImageItem[]>([]);
  const [imageUrlInput, setImageUrlInput] = useState('');
  const [isFetchingUrl, setIsFetchingUrl] = useState(false);
  
  const [model, setModel] = useState<ModelType>('Nano Banana 2');
  const [generationMode, setGenerationMode] = useState<GenerationMode>('recreation');
  const [elementRetention, setElementRetention] = useState(70);
  const [subjectManipulation, setSubjectManipulation] = useState<SubjectManipulationType>('Match Original');
  const [addCreativeElements, setAddCreativeElements] = useState(false);
  const [strictFontMatching, setStrictFontMatching] = useState(false);
  const [uniqueTextStyles, setUniqueTextStyles] = useState(false);
  const [customAction, setCustomAction] = useState('');
  const [customMood, setCustomMood] = useState('');
  const [styleAdherence, setStyleAdherence] = useState<StyleAdherenceType>('Strict adherence');
  const [stylePresets, setStylePresets] = useState<StylePresetType[]>([]);
  const [characterLikenessWeight, setCharacterLikenessWeight] = useState<number>(80);
  const [colorPaletteWeight, setColorPaletteWeight] = useState<number>(80);
  const [artisticMediumWeight, setArtisticMediumWeight] = useState<number>(80);
  const [prompt, setPrompt] = useState<string>('');
  const [negativePrompt, setNegativePrompt] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isGeneratingFidelity, setIsGeneratingFidelity] = useState(false);
  const [isSanitizing, setIsSanitizing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [negativeCopied, setNegativeCopied] = useState(false);
  
  // History State
  const [history, setHistory] = useState<{id: string, positive: string, negative: string, timestamp: number, thumbnailUrl?: string}[]>(() => {
    const saved = localStorage.getItem('prompt_history');
    return saved ? JSON.parse(saved) : [];
  });
  const [showHistory, setShowHistory] = useState(false);

  // New Feature States
  const [synthesisMode, setSynthesisMode] = useState(false);
  const [subjectImageId, setSubjectImageId] = useState<string | null>(null);
  const [styleImageId, setStyleImageId] = useState<string | null>(null);
  const [cameraAngle, setCameraAngle] = useState('Auto');
  const [lightingSetup, setLightingSetup] = useState('Auto');
  const [promptDensity, setPromptDensity] = useState<'Distilled' | 'Normal' | 'Expanded'>('Normal');
  const [colorOverrideType, setColorOverrideType] = useState<'Extract' | 'Modify' | 'New'>('Extract');
  const [colorOverrideValue, setColorOverrideValue] = useState('');
  const [stylePresetStrength, setStylePresetStrength] = useState<number>(100);

  // High Fidelity Specific States
  const [fidelityInstructions, setFidelityInstructions] = useState('');
  const [enableSpatialMapping, setEnableSpatialMapping] = useState(false);
  // Focus Regions structure: { id, imageId, label }
  const [focusRegions, setFocusRegions] = useState<{id: string, imageId: string, label: string}[]>([]);
  const [artworkCategory, setArtworkCategory] = useState<string>('Auto-Detect');
  const [mandatorySubjectTraits, setMandatorySubjectTraits] = useState<string>('');
  const [useImageAsReference, setUseImageAsReference] = useState<boolean>(false);
  const [textureOption, setTextureOption] = useState<'Auto-Detect' | 'Film Grain' | 'Grunge Overlay' | 'Crisp Digital' | 'Analog Print' | 'Aged Paper'>('Auto-Detect');
  const [textureEnabled, setTextureEnabled] = useState<boolean>(false);
  const [textureIntensity, setTextureIntensity] = useState<number>(100);
  const [advancedTypographyAnalysis, setAdvancedTypographyAnalysis] = useState<boolean>(false);
  
  // Advanced Pipeline Controls
  const [enableCharacterMapping, setEnableCharacterMapping] = useState<boolean>(true);
  const [enableAntiFlat, setEnableAntiFlat] = useState<boolean>(false);
  const [enableStyleBlend, setEnableStyleBlend] = useState<boolean>(false);
  const [styleBlendRatio, setStyleBlendRatio] = useState<number>(50);

  // Addon Expansion Modules
  const [enablePerSubjectForensics, setEnablePerSubjectForensics] = useState<boolean>(false);

  const [effectPaintSplash, setEffectPaintSplash] = useState<boolean>(false);
  const [effectAtmosphericBlend, setEffectAtmosphericBlend] = useState<boolean>(false);
  const [effectTextureAmplifier, setEffectTextureAmplifier] = useState<boolean>(false);
  const [effectEdgeEnergy, setEffectEdgeEnergy] = useState<boolean>(false);
  const [effectStyleContrast, setEffectStyleContrast] = useState<boolean>(false);
  const [effectColorHarmony, setEffectColorHarmony] = useState<boolean>(false);
  const [effectDetailRecovery, setEffectDetailRecovery] = useState<boolean>(false);

  const [forensicStyleBoundary, setForensicStyleBoundary] = useState<boolean>(false);
  const [forensicPigmentPhysics, setForensicPigmentPhysics] = useState<boolean>(false);
  const [forensicMicroDetailZoning, setForensicMicroDetailZoning] = useState<boolean>(false);
  const [forensicMaterialRecognition, setForensicMaterialRecognition] = useState<boolean>(false);
  const [forensicEyePriority, setForensicEyePriority] = useState<boolean>(false);
  const [forensicPerspectiveIntegrity, setForensicPerspectiveIntegrity] = useState<boolean>(false);
  const [forensicStyleIntent, setForensicStyleIntent] = useState<boolean>(false);

  // Image Generation State
  const [imageModel, setImageModel] = useState<ModelType>('Nano Banana 2');
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('1:1');
  const [resolution, setResolution] = useState<Resolution>('1K');
  const [useSourceImage, setUseSourceImage] = useState(false);
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []) as File[];
    addFiles(files);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files || []) as File[];
    addFiles(files);
  };

  const addFiles = (files: File[]) => {
    const validFiles = files.filter(file => file.type.startsWith('image/'));
    
    if (validFiles.length !== files.length) {
      setError('Some files were skipped. Please upload valid image files only.');
    } else {
      setError(null);
    }

    if (validFiles.length > 0) {
      const newImages = validFiles.map(file => ({
        id: Math.random().toString(36).substring(7),
        file,
        previewUrl: URL.createObjectURL(file)
      }));
      setImages(prev => [...prev, ...newImages]);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const removeImage = (id: string) => {
    setImages(prev => {
      const img = prev.find(i => i.id === id);
      if (img?.previewUrl && !img.url) {
        URL.revokeObjectURL(img.previewUrl);
      }
      return prev.filter(i => i.id !== id);
    });
  };

  const handleAddUrl = async () => {
    if (!imageUrlInput.trim()) return;
    
    setIsFetchingUrl(true);
    setError(null);
    
    try {
      const urlObj = new URL(imageUrlInput);
      
      // 1. Check valid image file extensions (if present)
      const pathname = urlObj.pathname;
      const ext = pathname.split('.').pop()?.toLowerCase();
      const validExts = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'avif', 'svg'];
      
      if (pathname.includes('.') && ext && !validExts.includes(ext)) {
        throw new Error(`Invalid file extension (.${ext}). Please provide a direct link to an image.`);
      }

      // 2. Basic reachability and Content-Type check
      try {
        const response = await fetch(imageUrlInput, { method: 'HEAD' });
        if (!response.ok) {
          throw new Error(`URL is unreachable (Status: ${response.status})`);
        }
        const contentType = response.headers.get('content-type');
        if (contentType && !contentType.startsWith('image/')) {
          throw new Error(`URL does not point to an image (Content-Type: ${contentType})`);
        }
      } catch (fetchErr) {
        // Fallback to GET if HEAD is blocked or fails
        const getResponse = await fetch(imageUrlInput, { method: 'GET' });
        if (!getResponse.ok) {
           throw new Error(`URL is unreachable (Status: ${getResponse.status})`);
        }
        const contentType = getResponse.headers.get('content-type');
        if (contentType && !contentType.startsWith('image/')) {
          throw new Error(`URL does not point to an image (Content-Type: ${contentType})`);
        }
      }

      setImages(prev => [...prev, {
        id: Math.random().toString(36).substring(7),
        url: imageUrlInput,
        previewUrl: imageUrlInput
      }]);
      
      setImageUrlInput('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid URL or unreachable. Ensure it points directly to an image and allows CORS.');
    } finally {
      setIsFetchingUrl(false);
    }
  };

  const convertFileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          const base64 = reader.result.split(',')[1];
          resolve(base64);
        } else {
          reject(new Error('Failed to convert file to base64'));
        }
      };
      reader.onerror = error => reject(error);
    });
  };

  const fetchUrlAsBase64 = async (url: string): Promise<{base64: string, mimeType: string}> => {
    try {
      // Use a proxy to avoid CORS if needed, or assume the URL is CORS-friendly
      const response = await fetch(url);
      if (!response.ok) throw new Error(`Failed to fetch image: ${response.statusText}`);
      const blob = await response.blob();
      const mimeType = blob.type;
      
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(blob);
        reader.onload = () => {
          if (typeof reader.result === 'string') {
            resolve({
              base64: reader.result.split(',')[1],
              mimeType
            });
          } else {
            reject(new Error('Failed to convert blob to base64'));
          }
        };
        reader.onerror = error => reject(error);
      });
    } catch (error) {
      throw new Error(`Could not load image from URL: ${url}. It might be blocked by CORS.`);
    }
  };

  const generateThumbnail = (imageUrl: string): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = "Anonymous";
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_SIZE = 120;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_SIZE) {
            height *= MAX_SIZE / width;
            width = MAX_SIZE;
          }
        } else {
          if (height > MAX_SIZE) {
            width *= MAX_SIZE / height;
            height = MAX_SIZE;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', 0.6));
        } else {
          resolve('');
        }
      };
      img.onerror = () => resolve('');
      img.src = imageUrl;
    });
  };

  const handleGenerate = async () => {
    if (images.length === 0) {
      setError('Please upload at least one image first.');
      return;
    }

    setIsGenerating(true);
    setError(null);
    setPrompt('');
    setNegativePrompt('');

    try {
      const payloads: ImagePayload[] = [];
      
      for (const img of images) {
        if (img.file) {
          const base64 = await convertFileToBase64(img.file);
          payloads.push({ base64, mimeType: img.file.type });
        } else if (img.url) {
          const result = await fetchUrlAsBase64(img.url);
          payloads.push(result);
        }
      }

      let synthesisOptions = null;
      if (synthesisMode && subjectImageId && styleImageId) {
        const subjectIndex = images.findIndex(img => img.id === subjectImageId);
        const styleIndex = images.findIndex(img => img.id === styleImageId);
        if (subjectIndex !== -1 && styleIndex !== -1) {
          synthesisOptions = {
            subjectImage: payloads[subjectIndex],
            styleImage: payloads[styleIndex]
          };
        }
      }

      let thumbnailUrl = '';
      if (images.length > 0) {
        thumbnailUrl = await generateThumbnail(images[0].previewUrl);
      }

      const generateFn = apiProvider === 'ChatGPT' ? generatePromptOpenAI : generatePromptFromImage;
      const generatedPrompt = await generateFn(payloads, {
        modelName: model,
        isCompletelyNew: generationMode === 'new_artwork',
        customAction,
        customMood,
        addCreativeElements,
        strictFontMatching,
        styleAdherence,
        stylePresets,
        stylePresetStrength,
        uniqueTextStyles,
        subjectManipulation,
        characterLikenessWeight,
        colorPaletteWeight,
        artisticMediumWeight,
        elementRetention,
        synthesisMode: synthesisOptions,
        cameraAngle,
        lightingSetup,
        promptDensity,
        colorOverride: { type: colorOverrideType, value: colorOverrideValue },
        artworkCategory,
        mandatorySubjectTraits,
        useImageAsReference,
        textureOption,
        textureEnabled,
        textureIntensity,
        advancedTypographyAnalysis,
        enableCharacterMapping,
        enableAntiFlat,
        styleBlendRatio: enableStyleBlend ? styleBlendRatio : undefined,
        enablePerSubjectForensics,
        effectPaintSplash,
        effectAtmosphericBlend,
        effectTextureAmplifier,
        effectEdgeEnergy,
        effectStyleContrast,
        effectColorHarmony,
        effectDetailRecovery,
        forensicStyleBoundary,
        forensicPigmentPhysics,
        forensicMicroDetailZoning,
        forensicMaterialRecognition,
        forensicEyePriority,
        forensicPerspectiveIntegrity,
        forensicStyleIntent
      });
      setPrompt(generatedPrompt.positivePrompt);
      setNegativePrompt(generatedPrompt.negativePrompt);
      
      // Save to history
      const historyItem = {
        id: Math.random().toString(36).substring(7),
        positive: generatedPrompt.positivePrompt,
        negative: generatedPrompt.negativePrompt,
        timestamp: Date.now(),
        thumbnailUrl
      };
      setHistory(prev => {
        const updated = [historyItem, ...prev].slice(0, 50);
        localStorage.setItem('prompt_history', JSON.stringify(updated));
        return updated;
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGenerateFidelity = async () => {
    if (images.length === 0) {
      setError('Please upload at least one image first.');
      return;
    }

    setIsGeneratingFidelity(true);
    setError(null);
    setPrompt('');
    setNegativePrompt('');

    try {
      const payloads: ImagePayload[] = [];
      
      for (const img of images) {
        if (img.file) {
          const base64 = await convertFileToBase64(img.file);
          payloads.push({ base64, mimeType: img.file.type });
        } else if (img.url) {
          const result = await fetchUrlAsBase64(img.url);
          payloads.push(result);
        }
      }

      let thumbnailUrl = '';
      if (images.length > 0) {
        thumbnailUrl = await generateThumbnail(images[0].previewUrl);
      }

      const generateFidelityFn = apiProvider === 'ChatGPT' ? generateFidelityPromptOpenAI : generateFidelityPromptFromImage;
      const generatedPrompt = await generateFidelityFn(payloads, {
        modelName: model,
        isCompletelyNew: false, // Not used in fidelity mode but required by interface
        addCreativeElements: false,
        strictFontMatching: false,
        styleAdherence: 'Strict adherence',
        stylePresets: [],
        uniqueTextStyles: false,
        subjectManipulation: 'Match Original',
        characterLikenessWeight: 100,
        colorPaletteWeight: 100,
        artisticMediumWeight: 100,
        elementRetention: 100,
        cameraAngle: 'Auto',
        lightingSetup: 'Auto',
        promptDensity: 'Normal',
        colorOverride: { type: 'Extract', value: '' },
        fidelityInstructions,
        enableSpatialMapping,
        focusRegions: focusRegions.filter(fr => images.some(img => img.id === fr.imageId)),
        artworkCategory,
        mandatorySubjectTraits,
        textureOption,
        textureEnabled,
        textureIntensity,
        advancedTypographyAnalysis,
        enableCharacterMapping,
        enableAntiFlat,
        styleBlendRatio: enableStyleBlend ? styleBlendRatio : undefined,
        enablePerSubjectForensics,
        effectPaintSplash,
        effectAtmosphericBlend,
        effectTextureAmplifier,
        effectEdgeEnergy,
        effectStyleContrast,
        effectColorHarmony,
        effectDetailRecovery,
        forensicStyleBoundary,
        forensicPigmentPhysics,
        forensicMicroDetailZoning,
        forensicMaterialRecognition,
        forensicEyePriority,
        forensicPerspectiveIntegrity,
        forensicStyleIntent
      });
      setPrompt(generatedPrompt.positivePrompt);
      setNegativePrompt(generatedPrompt.negativePrompt);

      // Save to history
      const historyItem = {
        id: Math.random().toString(36).substring(7),
        positive: generatedPrompt.positivePrompt,
        negative: generatedPrompt.negativePrompt,
        timestamp: Date.now(),
        thumbnailUrl
      };
      setHistory(prev => {
        const updated = [historyItem, ...prev].slice(0, 50);
        localStorage.setItem('prompt_history', JSON.stringify(updated));
        return updated;
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred.');
    } finally {
      setIsGeneratingFidelity(false);
    }
  };

  const deleteHistoryItem = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setHistory(prev => {
      const updated = prev.filter(item => item.id !== id);
      localStorage.setItem('prompt_history', JSON.stringify(updated));
      return updated;
    });
  };

  const clearHistory = () => {
    setHistory([]);
    localStorage.removeItem('prompt_history');
  };

  const loadFromHistory = (item: {positive: string, negative: string}) => {
    setPrompt(item.positive);
    setNegativePrompt(item.negative);
    setShowHistory(false);
  };

  const handleMakeSafe = async () => {
    if (!prompt) return;
    
    setIsSanitizing(true);
    setError(null);
    
    try {
      const makeSafeFn = apiProvider === 'ChatGPT' ? makePromptSafeOpenAI : makePromptSafe;
      const safePrompt = await makeSafeFn(prompt);
      setPrompt(safePrompt);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to sanitize prompt.');
    } finally {
      setIsSanitizing(false);
    }
  };

  const handleCopy = async () => {
    if (!prompt) return;
    try {
      await navigator.clipboard.writeText(prompt);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text:', err);
    }
  };

  const handleCopyNegative = async () => {
    if (!negativePrompt) return;
    try {
      await navigator.clipboard.writeText(negativePrompt);
      setNegativeCopied(true);
      setTimeout(() => setNegativeCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy negative text:', err);
    }
  };

  const calculateCost = () => {
    let base = imageModel === 'Nano Banana Pro' ? 0.10 : 0.05;
    if (resolution === '2K') base *= 2;
    if (resolution === '4K') base *= 4;
    if (useSourceImage) base += 0.02;
    return base.toFixed(2);
  };

  const handleGenerateImage = async () => {
    if (!prompt) return;
    setIsGeneratingImage(true);
    setError(null);
    try {
      let baseSize = resolution === '1K' ? 1024 : resolution === '2K' ? 2048 : 4096;
      let w = baseSize;
      let h = baseSize;
      if (aspectRatio === '16:9') { h = Math.round(w * 9 / 16); }
      else if (aspectRatio === '9:16') { w = Math.round(h * 9 / 16); }
      else if (aspectRatio === '4:3') { h = Math.round(w * 3 / 4); }
      else if (aspectRatio === '3:4') { w = Math.round(h * 3 / 4); }
      else if (aspectRatio === '3:2') { h = Math.round(w * 2 / 3); }
      else if (aspectRatio === '2:3') { w = Math.round(h * 2 / 3); }
      else if (aspectRatio === '21:9') { h = Math.round(w * 9 / 21); }
      else if (aspectRatio === '9:21') { w = Math.round(h * 9 / 21); }
      else if (aspectRatio === '5:4') { h = Math.round(w * 4 / 5); }
      else if (aspectRatio === '4:5') { w = Math.round(h * 4 / 5); }
      
      if (useSourceImage && images.length > 0) {
        // IMAGE-TO-IMAGE / IMAGE EDIT LOGIC
        // Prepare all source images to pass to the model
        const payloads: ImagePayload[] = [];
        for (const img of images) {
          if (img.file) {
            const base64 = await convertFileToBase64(img.file);
            payloads.push({ base64, mimeType: img.file.type });
          } else if (img.url) {
            const result = await fetchUrlAsBase64(img.url);
            payloads.push(result);
          }
        }

        console.log(`[Mock API] Executing Image-to-Image (Image Edit) generation using ${imageModel}`, {
          prompt,
          sourceImagesCount: payloads.length,
          width: w,
          height: h
        });

        // Mock generation delay for Image-to-Image
        await new Promise(resolve => setTimeout(resolve, 3500));
        
        // Fallback to text-to-image for preview purposes since we don't have a real I2I endpoint here
        const seed = Math.floor(Math.random() * 100000);
        const encodedPrompt = encodeURIComponent(`Image edit of original artwork: ${prompt}`.substring(0, 800));
        const url = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=${w}&height=${h}&seed=${seed}&nologo=true`;
        setGeneratedImageUrl(url);
      } else {
        // TEXT-TO-IMAGE LOGIC
        console.log(`[Mock API] Executing Text-to-Image generation using ${imageModel}`, {
          prompt,
          width: w,
          height: h
        });

        // Mock generation delay for Text-to-Image
        await new Promise(resolve => setTimeout(resolve, 2500));
        
        const seed = Math.floor(Math.random() * 100000);
        const encodedPrompt = encodeURIComponent(prompt.substring(0, 800));
        const url = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=${w}&height=${h}&seed=${seed}&nologo=true`;
        
        setGeneratedImageUrl(url);
      }
    } catch (err) {
      setError('Failed to generate image. Please try again.');
    } finally {
      setIsGeneratingImage(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-gray-100 font-sans selection:bg-[#FF6321] selection:text-white">
      {/* History Sidebar */}
      <div 
        className={`fixed inset-y-0 right-0 w-80 md:w-96 bg-[#0A0A0A]/95 backdrop-blur-2xl border-l border-white/10 z-[60] transform transition-transform duration-500 ease-out shadow-2xl ${
          showHistory ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="h-full flex flex-col">
          <div className="p-6 border-b border-white/10 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <History className="w-5 h-5 text-[#FF6321]" />
              <h2 className="text-lg font-bold text-white">Prompt History</h2>
            </div>
            <div className="flex items-center space-x-2">
              {history.length > 0 && (
                <button 
                  onClick={clearHistory}
                  className="text-[10px] uppercase tracking-wider text-white/40 hover:text-red-400 transition-colors"
                >
                  Clear All
                </button>
              )}
              <button 
                onClick={() => setShowHistory(false)}
                className="p-1.5 rounded-lg hover:bg-white/5 text-white/50 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
            {history.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-8 opacity-40">
                <History className="w-12 h-12 mb-4" />
                <p className="text-sm">No history yet.<br/>Generate prompts to see them here.</p>
              </div>
            ) : (
              history.map((item) => (
                <div 
                  key={item.id}
                  onClick={() => loadFromHistory(item)}
                  className="group relative bg-white/5 border border-white/10 rounded-2xl p-4 hover:bg-white/10 hover:border-[#FF6321]/30 transition-all cursor-pointer"
                >
                  <div className="flex justify-between items-start mb-3">
                    <span className="text-[10px] font-mono text-white/30">
                      {new Date(item.timestamp).toLocaleTimeString()} - {new Date(item.timestamp).toLocaleDateString()}
                    </span>
                    <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-all">
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          navigator.clipboard.writeText(`[POSITIVE PROMPT]:\n${item.positive}\n\n[NEGATIVE PROMPT]:\n${item.negative}`);
                        }}
                        className="p-1 rounded-md hover:bg-white/10 text-white/30 hover:text-white transition-all"
                        title="Copy Prompt"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                      <button 
                        onClick={(e) => deleteHistoryItem(item.id, e)}
                        className="p-1 rounded-md hover:bg-red-500/20 text-white/30 hover:text-red-400 transition-all"
                        title="Delete"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  
                  {item.thumbnailUrl && (
                    <div className="w-full h-24 mb-3 rounded-lg overflow-hidden border border-white/10 relative">
                      <img src={item.thumbnailUrl} alt="Thumbnail representation" className="absolute inset-0 w-full h-full object-cover blur-sm opacity-50" />
                      <img src={item.thumbnailUrl} alt="Thumbnail" className="relative w-full h-full object-contain drop-shadow-2xl" />
                    </div>
                  )}

                  <p className="text-sm text-white/80 line-clamp-3 mb-2 leading-relaxed italic">
                    "{item.positive.substring(0, 150)}..."
                  </p>
                  <div className="flex items-center space-x-2 text-[10px] text-[#FF6321] opacity-70">
                    <Sparkles className="w-3 h-3" />
                    <span>Click to restore</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Header */}
      <header className="border-b border-white/10 bg-black/50 backdrop-blur-md sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#FF6321] to-[#FF9D21] flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-xl font-semibold tracking-tight text-white">PromptCrafter <span className="text-white/50 font-light">Pro</span></h1>
          </div>
          <div className="flex items-center space-x-4">
            <button 
              onClick={() => setShowHistory(!showHistory)}
              className="p-2 rounded-xl bg-white/5 border border-white/10 text-white/50 hover:bg-white/10 hover:text-white transition-all duration-300 relative group"
              title="Prompt History"
            >
              <History className="w-5 h-5" />
              {history.length > 0 && (
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-[#FF6321] text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                  {history.length}
                </div>
              )}
            </button>
            <div className="text-xs font-mono text-white/40 uppercase tracking-widest hidden sm:block text-right">
              Vision Analysis Engine
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-[1600px] mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Column 1: Image Input & Settings */}
          <div className="space-y-6 flex flex-col h-[calc(100vh-8rem)] overflow-y-auto pr-2 custom-scrollbar pb-8">
            <div>
              <div className="flex items-center justify-between mb-1">
                <h2 className="text-lg font-medium text-white">Reference Images</h2>
                <span className="text-xs font-mono text-white/40">{images.length} added</span>
              </div>
              <p className="text-sm text-white/50 mb-4">Upload source images or paste URLs to analyze style, characters, and typography from multiple angles.</p>
              
              {/* URL Input */}
              <div className="flex gap-2 mb-4">
                <div className="relative flex-1">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <LinkIcon className="h-4 w-4 text-white/30" />
                  </div>
                  <input
                    type="text"
                    value={imageUrlInput}
                    onChange={(e) => setImageUrlInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddUrl()}
                    placeholder="Paste image URL here..."
                    className="block w-full pl-10 pr-3 py-2.5 bg-black/50 border border-white/10 rounded-xl text-sm text-white placeholder-white/30 focus:outline-none focus:border-[#FF6321]/50 focus:ring-1 focus:ring-[#FF6321]/50 transition-colors"
                  />
                </div>
                <button
                  onClick={handleAddUrl}
                  disabled={!imageUrlInput.trim() || isFetchingUrl}
                  className="px-4 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-sm font-medium text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {isFetchingUrl ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  Add URL
                </button>
              </div>

              {/* Dropzone & Grid */}
              <div 
                className={`relative group border-2 border-dashed rounded-2xl transition-all duration-200 ease-in-out p-4
                  ${images.length > 0 ? 'border-white/10 bg-black/20' : 'border-white/10 bg-black/50 hover:border-[#FF6321]/50 hover:bg-[#FF6321]/5'}
                  ${isGenerating || isGeneratingFidelity ? 'opacity-50 pointer-events-none' : ''}
                `}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
              >
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileChange} 
                  accept="image/*" 
                  multiple
                  className="hidden" 
                />
                
                {images.length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    {images.map((img) => (
                      <div key={img.id} className="relative aspect-square rounded-xl overflow-hidden group/item border border-white/10 bg-black/50">
                        <img 
                          src={img.previewUrl} 
                          alt="Reference" 
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover/item:opacity-100 transition-opacity flex items-center justify-center">
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              removeImage(img.id);
                            }}
                            className="p-2 bg-red-500/80 hover:bg-red-500 text-white rounded-full transition-colors"
                            title="Remove image"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                    
                    {/* Add More Button */}
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="aspect-square rounded-xl border border-dashed border-white/20 bg-white/5 hover:bg-white/10 hover:border-white/30 transition-all flex flex-col items-center justify-center text-white/50 hover:text-white/80"
                    >
                      <Plus className="w-6 h-6 mb-2" />
                      <span className="text-xs font-medium">Add More</span>
                    </button>
                  </div>
                ) : (
                  <div 
                    onClick={() => fileInputRef.current?.click()}
                    className="aspect-[4/3] w-full flex flex-col items-center justify-center text-center cursor-pointer"
                  >
                    <div className="w-16 h-16 mb-4 rounded-full bg-white/5 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                      <Upload className="w-8 h-8 text-white/40 group-hover:text-[#FF6321]" />
                    </div>
                    <p className="text-base font-medium text-white/80 mb-1">Click or drag images here</p>
                    <p className="text-sm text-white/40">Supports multiple JPG, PNG, WebP</p>
                  </div>
                )}
              </div>
            </div>

            {error && (
              <div className="flex items-start gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 shrink-0">
                <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                <p className="text-sm">{error}</p>
              </div>
            )}

            {/* Controls */}
            <div className="bg-white/[0.02] border border-white/10 rounded-2xl p-6 shrink-0">
              {/* Mode Toggle */}
              <div className="flex p-1 bg-black/40 border border-white/10 rounded-xl mb-6">
                <button
                  onClick={() => setGenerationMode('recreation')}
                  className={`flex-1 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 ${
                    generationMode === 'recreation' 
                      ? 'bg-white/10 text-white shadow-sm' 
                      : 'text-white/50 hover:text-white/80 hover:bg-white/5'
                  }`}
                >
                  Recreate Artwork
                </button>
                <button
                  onClick={() => setGenerationMode('new_artwork')}
                  className={`flex-1 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 ${
                    generationMode === 'new_artwork' 
                      ? 'bg-[#FF6321]/20 text-[#FF6321] shadow-sm' 
                      : 'text-white/50 hover:text-white/80 hover:bg-white/5'
                  }`}
                >
                  Create New Artwork
                </button>
              </div>

              <h2 className="text-lg font-medium text-white mb-4">
                {generationMode === 'recreation' ? 'Recreation Settings' : 'New Artwork Settings'}
              </h2>
              
              <div className="space-y-6">
                <div>
                  <label className="block text-xs font-mono text-white/50 uppercase tracking-wider mb-3">Vision AI Provider</label>
                  <div className="grid grid-cols-2 gap-3">
                    {(['Gemini', 'ChatGPT'] as ApiProvider[]).map((p) => (
                      <button
                        key={p}
                        onClick={() => setApiProvider(p)}
                        className={`py-3 px-4 rounded-xl text-sm font-medium transition-all duration-200 border ${
                          apiProvider === p 
                            ? 'bg-[#FF6321]/10 border-[#FF6321] text-[#FF6321]' 
                            : 'bg-black/50 border-white/10 text-white/60 hover:bg-white/5 hover:text-white'
                        }`}
                      >
                        {p} {p === 'Gemini' ? '3.1 Pro' : '5.4 Image 2'}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-mono text-white/50 uppercase tracking-wider mb-3">Target Model</label>
                  <div className="grid grid-cols-2 gap-3">
                    {(['Nano Banana 2', 'Nano Banana Pro'] as ModelType[]).map((m) => (
                      <button
                        key={m}
                        onClick={() => setModel(m)}
                        className={`py-3 px-4 rounded-xl text-sm font-medium transition-all duration-200 border ${
                          model === m 
                            ? 'bg-[#FF6321]/10 border-[#FF6321] text-[#FF6321]' 
                            : 'bg-black/50 border-white/10 text-white/60 hover:bg-white/5 hover:text-white'
                        }`}
                      >
                        {m}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-3 pt-4 border-t border-white/10">
                  <label className="block text-xs font-mono text-white/50 uppercase tracking-wider mb-2">Artwork Category / Medium</label>
                  <select
                    value={artworkCategory}
                    onChange={(e) => setArtworkCategory(e.target.value)}
                    className="w-full bg-black/50 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:border-[#FF6321]/50 focus:outline-none"
                  >
                    <option value="Auto-Detect">Auto-Detect</option>
                    <option value="Mixed Media Pop Art">Mixed Media Pop Art (Avoid Poster Look)</option>
                    <option value="Fashion Editorial Portrait">Fashion Editorial Portrait</option>
                    <option value="Classic Fine Art / Oil Painting">Classic Fine Art / Oil Painting</option>
                    <option value="Street Art / Graffiti Canvas">Street Art / Graffiti Canvas</option>
                  </select>
                </div>

                {/* RECREATION SETTINGS */}
                {generationMode === 'recreation' && (
                  <>
                    <div className="space-y-3 pt-4 border-t border-white/10">
                      <label className="flex items-center space-x-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={useImageAsReference}
                          onChange={(e) => setUseImageAsReference(e.target.checked)}
                          className="form-checkbox h-4 w-4 rounded border-white/20 bg-black/50 text-[#FF6321] focus:ring-[#FF6321] focus:ring-offset-0"
                        />
                        <span className="text-sm text-white/80">Use Image as Reference (Image-to-Image Mode)</span>
                      </label>
                      <p className="text-[10px] text-white/50 pl-7">Instructs the AI to only use the source image for reference/inspiration and explicitly forbids editing, repainting, or tracing it.</p>
                    </div>

                    <div className="space-y-3 pt-4 border-t border-white/10">
                      <label className="block text-xs font-mono text-white/50 uppercase tracking-wider mb-2">Mandatory Subject Traits</label>
                      <textarea
                        value={mandatorySubjectTraits}
                        onChange={(e) => setMandatorySubjectTraits(e.target.value)}
                        placeholder="e.g., 'finger on lips shushing, deep cleavage, intense gaze'"
                        className="w-full bg-black/50 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder-white/30 focus:border-[#FF6321]/50 focus:outline-none resize-none h-16"
                      />
                      <p className="text-[10px] text-white/50 mt-1">Forces the AI to prioritize these specific physical/expressive details so they are never lost.</p>
                    </div>

                    <div className="space-y-3 pt-4 border-t border-white/10">
                      <div className="flex items-center space-x-2 mb-3">
                        <label className="block text-xs font-mono text-white/50 uppercase tracking-wider">Style Adherence</label>
                        <div className="group relative">
                          <Info className="w-3.5 h-3.5 text-white/40 cursor-help" />
                          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 p-3 bg-black/90 border border-white/10 rounded-xl text-xs text-white/80 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50">
                            Controls how strictly the AI should follow the artistic style of the source image vs Hallucinating its own interpretations.
                          </div>
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        {(['Strict adherence', 'Inspired by', 'Playful interpretation'] as StyleAdherenceType[]).map((s) => (
                          <button
                            key={s}
                            onClick={() => setStyleAdherence(s)}
                            className={`py-2 px-3 rounded-lg text-xs font-medium transition-all duration-200 border ${
                              styleAdherence === s 
                                ? 'bg-[#FF6321]/10 border-[#FF6321] text-[#FF6321]' 
                                : 'bg-black/50 border-white/10 text-white/60 hover:bg-white/5 hover:text-white'
                            }`}
                          >
                            {s}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-3 pt-4 border-t border-white/10">
                      <label className="block text-xs font-mono text-white/50 uppercase tracking-wider mb-3">Style Override Presets</label>
                      <div className="flex flex-wrap gap-2">
                        {(['None', 'Photorealistic', 'Anime / Manga', 'Cyberpunk', 'Watercolor', '3D Render', 'Pixel Art', 'Abstract Textured (Raised 1-2mm)', 'Impasto Oil Painting', 'Classic Oil Painting', 'Real Hand-Painted Item', 'Neon Cyber-Noir', 'Vintage Pop-Art', 'Surrealism', 'Papercraft / Origami'] as StylePresetType[]).map((p) => (
                          <button
                            key={p}
                            onClick={() => {
                              if (p === 'None') {
                                setStylePresets([]);
                                setStyleAdherence('Strict adherence');
                              } else {
                                if (stylePresets.includes(p)) {
                                  setStylePresets(stylePresets.filter(preset => preset !== p));
                                } else {
                                  setStylePresets([...stylePresets.filter(preset => preset !== 'None'), p]);
                                }
                                setStyleAdherence('Playful interpretation');
                              }
                            }}
                            className={`py-1.5 px-3 rounded-lg text-xs font-medium transition-all duration-200 border ${
                              (p === 'None' && stylePresets.length === 0) || stylePresets.includes(p)
                                ? 'bg-[#FF6321]/10 border-[#FF6321] text-[#FF6321]' 
                                : 'bg-black/50 border-white/10 text-white/60 hover:bg-white/5 hover:text-white'
                            }`}
                          >
                            {p}
                          </button>
                        ))}
                      </div>

                      {stylePresets.length > 0 && (
                        <div className="space-y-2 pt-3">
                          <div className="flex justify-between text-[10px] font-mono text-white/40 uppercase">
                            <span>Preset Override Strength</span>
                            <span className="text-[#FF6321]">{stylePresetStrength}%</span>
                          </div>
                          <input 
                            type="range" 
                            min="1" 
                            max="100" 
                            value={stylePresetStrength} 
                            onChange={(e) => setStylePresetStrength(parseInt(e.target.value))}
                            className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-[#FF6321]"
                          />
                          <p className="text-[10px] text-white/40 italic">
                            Controls how strongly the selected presets overwrite the original image's style. 100% forces the preset style completely.
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="space-y-3 pt-4 border-t border-white/10">
                      <label className="block text-xs font-mono text-white/50 uppercase tracking-wider mb-3">Subject Manipulation</label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {[
                          { label: 'Match Original', desc: 'Accurately describes the original subjects and characters exactly as they appear.' },
                          { label: 'Keep Original Subject Identity', desc: 'Retains the exact identity of the main character (e.g., Marilyn Monroe) but places them in new poses or situations.' },
                          { label: 'Reinterpret Subject Concept', desc: 'Keeps the conceptual theme but modifies proportions, expressions, and styling to avoid an exact likeness.' },
                          { label: 'New Subject/Character', desc: 'Invents completely new characters and subjects that match the original style but represent a different concept.' }
                        ].map(({ label, desc }) => (
                          <div key={label} className="group/tooltip relative flex">
                            <button
                              onClick={() => setSubjectManipulation(label as SubjectManipulationType)}
                              className={`w-full py-2 px-3 rounded-lg text-xs font-medium transition-all duration-200 border text-left flex justify-between items-center ${
                                subjectManipulation === label 
                                  ? 'bg-[#FF6321]/10 border-[#FF6321] text-[#FF6321]' 
                                  : 'bg-black/50 border-white/10 text-white/60 hover:bg-white/5 hover:text-white'
                              }`}
                            >
                              <span className="truncate pr-2">{label}</span>
                              <Info className="w-3.5 h-3.5 opacity-40 shrink-0" />
                            </button>
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 p-3 bg-black/90 border border-white/10 rounded-xl text-xs text-white/80 opacity-0 group-hover/tooltip:opacity-100 pointer-events-none transition-opacity z-50 shadow-xl whitespace-normal break-words">
                              {desc}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-3 pt-4 border-t border-white/10">
                      <div className="flex items-center space-x-2 mb-3">
                        <label className="block text-xs font-mono text-white/50 uppercase tracking-wider">Style Preservation</label>
                        <div className="group relative">
                          <Info className="w-3.5 h-3.5 text-white/40 cursor-help" />
                          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 p-3 bg-black/90 border border-white/10 rounded-xl text-xs text-white/80 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50">
                            Adjust how strictly exact features from the source image are maintained in the output.
                          </div>
                        </div>
                      </div>
                      
                      <div className="space-y-4">
                        <div>
                          <div className="flex justify-between items-center text-xs text-white/70 mb-2">
                            <div className="flex items-center space-x-1">
                              <span>Character Likeness</span>
                              <div className="group relative">
                                <Info className="w-3 h-3 text-white/30 cursor-help" />
                                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 bg-black/90 border border-white/10 rounded-lg text-[10px] text-white/80 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50">How strictly the facial features and anatomy of the subject should be preserved.</div>
                              </div>
                            </div>
                            <span className="text-[#FF6321] font-mono">{characterLikenessWeight}%</span>
                          </div>
                          <input 
                            type="range" 
                            min="0" 
                            max="100" 
                            step="10" 
                            value={characterLikenessWeight} 
                            onChange={(e) => setCharacterLikenessWeight(Number(e.target.value))} 
                            className="w-full accent-[#FF6321] h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer" 
                          />
                        </div>

                        <div>
                          <div className="flex justify-between items-center text-xs text-white/70 mb-2">
                            <div className="flex items-center space-x-1">
                              <span>Color Palette Fidelity</span>
                              <div className="group relative">
                                <Info className="w-3 h-3 text-white/30 cursor-help" />
                                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 bg-black/90 border border-white/10 rounded-lg text-[10px] text-white/80 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50">How strictly the exact original colors should be maintained without shifting.</div>
                              </div>
                            </div>
                            <span className="text-[#FF6321] font-mono">{colorPaletteWeight}%</span>
                          </div>
                          <input 
                            type="range" 
                            min="0" 
                            max="100" 
                            step="10" 
                            value={colorPaletteWeight} 
                            onChange={(e) => setColorPaletteWeight(Number(e.target.value))} 
                            className="w-full accent-[#FF6321] h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer" 
                          />
                        </div>

                        <div>
                          <div className="flex justify-between items-center text-xs text-white/70 mb-2">
                            <div className="flex items-center space-x-1">
                              <span>Artistic Medium</span>
                              <div className="group relative">
                                <Info className="w-3 h-3 text-white/30 cursor-help" />
                                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 bg-black/90 border border-white/10 rounded-lg text-[10px] text-white/80 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50">Whether to force the exact original medium (e.g. oil, 3D, photography) vs letting the AI drift.</div>
                              </div>
                            </div>
                            <span className="text-[#FF6321] font-mono">{artisticMediumWeight}%</span>
                          </div>
                          <input 
                            type="range" 
                            min="0" 
                            max="100" 
                            step="10" 
                            value={artisticMediumWeight} 
                            onChange={(e) => setArtisticMediumWeight(Number(e.target.value))} 
                            className="w-full accent-[#FF6321] h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer" 
                          />
                        </div>
                      </div>
                    </div>
                  </>
                )}

                {/* NEW ARTWORK SETTINGS */}
                {generationMode === 'new_artwork' && (
                  <>
                    <div className="space-y-3 pt-4 border-t border-white/10">
                      <label className="block text-xs font-mono text-[#FF6321] uppercase tracking-wider mb-3">New Artwork Composition</label>
                      <div>
                        <div className="flex justify-between text-xs text-white/70 mb-2">
                          <span>Source Element Retention</span>
                          <span className="text-[#FF6321] font-mono">{elementRetention}%</span>
                        </div>
                        <input 
                          type="range" 
                          min="0" 
                          max="100" 
                          step="10" 
                          value={elementRetention} 
                          onChange={(e) => setElementRetention(Number(e.target.value))} 
                          className="w-full accent-[#FF6321] h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer" 
                        />
                        <div className="flex justify-between text-[10px] text-white/40 mt-2 font-medium">
                          <span>Completely New (0%)</span>
                          <span>Mixed (50%)</span>
                          <span>Highly Similar (100%)</span>
                        </div>
                        <p className="text-xs text-white/50 mt-3 leading-relaxed">
                          Controls how many specific source elements (objects, text, layout) are carried over. <br/>
                          <span className="text-[#FF6321]/80">Note: The main subject is always kept, but given a new pose, expression, and mood.</span>
                        </p>
                      </div>
                    </div>
                    
                    <div className="space-y-3 pt-4 border-t border-white/10">
                      <label className="block text-xs font-mono text-white/50 uppercase tracking-wider mb-2">Custom Action / Pose</label>
                      <input
                        type="text"
                        value={customAction}
                        onChange={(e) => setCustomAction(e.target.value)}
                        placeholder="e.g., 'dancing in the rain', 'looking away shyly'"
                        className="w-full bg-black/50 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder-white/30 focus:border-[#FF6321]/50 focus:outline-none"
                      />
                      <p className="text-[10px] text-white/50">Leave blank to let the AI randomly assign a new action/pose.</p>
                    </div>

                    <div className="space-y-3 pt-4 border-t border-white/10">
                      <label className="block text-xs font-mono text-white/50 uppercase tracking-wider mb-2">Custom Mood / Vibe</label>
                      <input
                        type="text"
                        value={customMood}
                        onChange={(e) => setCustomMood(e.target.value)}
                        placeholder="e.g., 'melancholic', 'energetic and chaotic'"
                        className="w-full bg-black/50 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder-white/30 focus:border-[#FF6321]/50 focus:outline-none"
                      />
                      <p className="text-[10px] text-white/50">Leave blank to let the AI randomly assign a new mood.</p>
                    </div>
                  </>
                )}

                <div className="space-y-3 pt-4 border-t border-white/10">
                  <div className="flex items-center space-x-2 mb-3">
                    <label className="block text-xs font-mono text-white/50 uppercase tracking-wider">Prompt Density</label>
                    <div className="group relative">
                      <Info className="w-3.5 h-3.5 text-white/40 cursor-help" />
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 p-3 bg-black/90 border border-white/10 rounded-xl text-xs text-white/80 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50">
                        Distilled creates a short punchy prompt. Expanded creates an extremely verbose prompt analyzing every micro-detail of the scene.
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {(['Distilled', 'Normal', 'Expanded'] as const).map((d) => (
                      <button
                        key={d}
                        onClick={() => setPromptDensity(d)}
                        className={`py-2 px-3 rounded-lg text-xs font-medium transition-all duration-200 border ${
                          promptDensity === d 
                            ? 'bg-[#FF6321]/10 border-[#FF6321] text-[#FF6321]' 
                            : 'bg-black/50 border-white/10 text-white/60 hover:bg-white/5 hover:text-white'
                        }`}
                      >
                        {d}
                      </button>
                    ))}
                  </div>
                  <p className="text-[10px] text-white/40 mt-1">
                    {promptDensity === 'Distilled' && 'Short, punchy, ~30 words. Core elements only.'}
                    {promptDensity === 'Normal' && 'Standard detailed prompt.'}
                    {promptDensity === 'Expanded' && 'Massive, highly detailed prompt (200+ words).'}
                  </p>
                </div>

                <div className="space-y-3 pt-4 border-t border-white/10">
                  <label className="block text-xs font-mono text-white/50 uppercase tracking-wider mb-3">Camera & Lighting Director</label>
                  <div className="space-y-3">
                    <div>
                      <span className="text-xs text-white/70 mb-1.5 block">Camera Angle</span>
                      <select 
                        value={cameraAngle} 
                        onChange={(e) => setCameraAngle(e.target.value)}
                        className="w-full bg-black/50 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:border-[#FF6321]/50 focus:outline-none"
                      >
                        <option value="Auto">Auto (Extract from image)</option>
                        <option value="Extreme Close-up">Extreme Close-up</option>
                        <option value="Drone Shot">Drone Shot</option>
                        <option value="Isometric">Isometric</option>
                        <option value="Low Angle">Low Angle</option>
                        <option value="Wide Angle">Wide Angle</option>
                        <option value="Macro">Macro</option>
                      </select>
                    </div>
                    <div>
                      <span className="text-xs text-white/70 mb-1.5 block">Lighting Setup</span>
                      <select 
                        value={lightingSetup} 
                        onChange={(e) => setLightingSetup(e.target.value)}
                        className="w-full bg-black/50 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:border-[#FF6321]/50 focus:outline-none"
                      >
                        <option value="Auto">Auto (Extract from image)</option>
                        <option value="Cinematic Studio Lighting">Cinematic Studio Lighting</option>
                        <option value="Golden Hour">Golden Hour</option>
                        <option value="Cyberpunk Neon">Cyberpunk Neon</option>
                        <option value="Bioluminescent">Bioluminescent</option>
                        <option value="Moody Dark">Moody Dark</option>
                        <option value="Natural Daylight">Natural Daylight</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="space-y-3 pt-4 border-t border-white/10">
                  <label className="block text-xs font-mono text-white/50 uppercase tracking-wider mb-3">Color Palette Override</label>
                  <div className="grid grid-cols-3 gap-2 mb-3">
                    {(['Extract', 'Modify', 'New'] as const).map((t) => (
                      <button
                        key={t}
                        onClick={() => setColorOverrideType(t)}
                        className={`py-2 px-2 rounded-lg text-xs font-medium transition-all duration-200 border ${
                          colorOverrideType === t 
                            ? 'bg-[#FF6321]/10 border-[#FF6321] text-[#FF6321]' 
                            : 'bg-black/50 border-white/10 text-white/60 hover:bg-white/5 hover:text-white'
                        }`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                  {colorOverrideType !== 'Extract' && (
                    <input
                      type="text"
                      value={colorOverrideValue}
                      onChange={(e) => setColorOverrideValue(e.target.value)}
                      placeholder={colorOverrideType === 'Modify' ? "e.g., Add neon pink, replace blue with red" : "e.g., Matrix Green, #FF0000 and #00FF00"}
                      className="w-full bg-black/50 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder-white/30 focus:border-[#FF6321]/50 focus:outline-none"
                    />
                  )}
                </div>

                {images.length >= 2 && (
                  <div className="space-y-3 pt-4 border-t border-white/10">
                    <label className="flex items-start gap-3 cursor-pointer group mb-3">
                      <div className="relative flex items-center justify-center mt-0.5">
                        <input 
                          type="checkbox" 
                          className="peer sr-only"
                          checked={synthesisMode}
                          onChange={(e) => setSynthesisMode(e.target.checked)}
                        />
                        <div className="w-5 h-5 rounded border border-white/20 bg-black/50 peer-checked:bg-[#FF6321] peer-checked:border-[#FF6321] transition-colors"></div>
                        <Check className="absolute w-3.5 h-3.5 text-white opacity-0 peer-checked:opacity-100 transition-opacity pointer-events-none" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-white group-hover:text-[#FF6321] transition-colors">Enable Synthesis Mode</p>
                        <p className="text-[10px] text-white/50 mt-0.5">Extract Subject from Image A, apply Style from Image B.</p>
                      </div>
                    </label>

                    {synthesisMode && (
                      <div className="space-y-3 pl-8">
                        <div>
                          <span className="text-xs text-white/70 mb-1.5 block">Subject Image</span>
                          <select 
                            value={subjectImageId || ''} 
                            onChange={(e) => setSubjectImageId(e.target.value)}
                            className="w-full bg-black/50 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:border-[#FF6321]/50 focus:outline-none"
                          >
                            <option value="" disabled>Select Subject Image</option>
                            {images.map((img, i) => (
                              <option key={img.id} value={img.id}>Image {i + 1}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <span className="text-xs text-white/70 mb-1.5 block">Style Image</span>
                          <select 
                            value={styleImageId || ''} 
                            onChange={(e) => setStyleImageId(e.target.value)}
                            className="w-full bg-black/50 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:border-[#FF6321]/50 focus:outline-none"
                          >
                            <option value="" disabled>Select Style Image</option>
                            {images.map((img, i) => (
                              <option key={img.id} value={img.id}>Image {i + 1}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <div className="space-y-3 pt-4 border-t border-white/10">
                  <label className="block text-xs font-mono text-white/50 uppercase tracking-wider mb-3">Creative Options</label>
                  
                  <label className="flex items-start gap-3 cursor-pointer group">
                    <div className="relative flex items-center justify-center mt-0.5">
                      <input 
                        type="checkbox" 
                        className="peer sr-only"
                        checked={addCreativeElements}
                        onChange={(e) => setAddCreativeElements(e.target.checked)}
                      />
                      <div className="w-5 h-5 rounded border border-white/20 bg-black/50 peer-checked:bg-[#FF6321] peer-checked:border-[#FF6321] transition-colors"></div>
                      <Check className="absolute w-3.5 h-3.5 text-white opacity-0 peer-checked:opacity-100 transition-opacity pointer-events-none" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white group-hover:text-[#FF6321] transition-colors">Add Creative Elements</p>
                      <p className="text-xs text-white/50 mt-0.5">Keep the original characters, but introduce new, surprising thematic elements into the composition.</p>
                    </div>
                  </label>

                  <label className="flex items-start gap-3 cursor-pointer group">
                    <div className="relative flex items-center justify-center mt-0.5">
                      <input 
                        type="checkbox" 
                        className="peer sr-only"
                        checked={strictFontMatching}
                        onChange={(e) => setStrictFontMatching(e.target.checked)}
                      />
                      <div className="w-5 h-5 rounded border border-white/20 bg-black/50 peer-checked:bg-[#FF6321] peer-checked:border-[#FF6321] transition-colors"></div>
                      <Check className="absolute w-3.5 h-3.5 text-white opacity-0 peer-checked:opacity-100 transition-opacity pointer-events-none" />
                    </div>
                    <div>
                      <div className="relative flex items-center gap-2">
                        <p className="text-sm font-medium text-white group-hover:text-[#FF6321] transition-colors">Strict Font Style Matching</p>
                        <div className="group/tooltip relative flex items-center justify-center">
                          <Info className="w-4 h-4 text-white/40 hover:text-white transition-colors cursor-help" />
                          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-3 bg-black/90 border border-white/10 rounded-xl text-xs text-white/80 opacity-0 group-hover/tooltip:opacity-100 pointer-events-none transition-opacity z-50 shadow-xl">
                            Prioritizes organic text styles over flat, typed fonts. 
                            <br/><br/>
                            • <b className="text-white">Handwritten:</b> Cursive, scribbles, marker strokes.<br/>
                            • <b className="text-white">Graffiti:</b> Spray paint, bubble letters, drips.<br/>
                            • <b className="text-white">Abstract:</b> Distorted, neon tubes, integrated into art.<br/>
                            <br/>
                            Forces the generator to replicate these specific artistic executions.
                          </div>
                        </div>
                      </div>
                      <p className="text-xs text-white/50 mt-0.5">Prioritize handwritten, graffiti, or abstract styles over flat typed fonts. Embeds specific instructions to avoid standard text.</p>
                    </div>
                  </label>

                  <label className="flex items-start gap-3 cursor-pointer group">
                    <div className="relative flex items-center justify-center mt-0.5">
                      <input 
                        type="checkbox" 
                        className="peer sr-only"
                        checked={uniqueTextStyles}
                        onChange={(e) => setUniqueTextStyles(e.target.checked)}
                      />
                      <div className="w-5 h-5 rounded border border-white/20 bg-black/50 peer-checked:bg-[#FF6321] peer-checked:border-[#FF6321] transition-colors"></div>
                      <Check className="absolute w-3.5 h-3.5 text-white opacity-0 peer-checked:opacity-100 transition-opacity pointer-events-none" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white group-hover:text-[#FF6321] transition-colors">Chaotic / Unique Typography</p>
                      <p className="text-xs text-white/50 mt-0.5">Forces every text element to have a completely unique, hand-crafted style (graffiti, stencil, brush, etc.) with zero duplication.</p>
                    </div>
                  </label>

                  <label className="flex items-start gap-3 cursor-pointer group">
                    <div className="relative flex items-center justify-center mt-0.5">
                      <input 
                        type="checkbox" 
                        className="peer sr-only"
                        checked={advancedTypographyAnalysis}
                        onChange={(e) => setAdvancedTypographyAnalysis(e.target.checked)}
                      />
                      <div className="w-5 h-5 rounded border border-white/20 bg-black/50 peer-checked:bg-[#FF6321] peer-checked:border-[#FF6321] transition-colors"></div>
                      <Check className="absolute w-3.5 h-3.5 text-white opacity-0 peer-checked:opacity-100 transition-opacity pointer-events-none" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white group-hover:text-[#FF6321] transition-colors">Advanced Typography Analysis</p>
                      <p className="text-xs text-white/50 mt-0.5">Explicitly detects gradients, multi-color fills, metallic glints, and maps exact spatial coordinates for text placement.</p>
                    </div>
                  </label>

                  <div className="pt-4 mt-4 border-t border-white/10">
                    <div className="flex items-center justify-between mb-3">
                      <label className="block text-xs font-mono text-white/50 uppercase tracking-wider">Texture & Overlays</label>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input 
                          type="checkbox" 
                          className="sr-only peer" 
                          checked={textureEnabled}
                          onChange={(e) => setTextureEnabled(e.target.checked)}
                        />
                        <div className="w-9 h-5 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#FF6321]"></div>
                        <span className="ml-2 text-[10px] font-medium text-white/40 uppercase tracking-wider">{textureEnabled ? 'On' : 'Off'}</span>
                      </label>
                    </div>

                    {textureEnabled && (
                      <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                        <div className="grid grid-cols-2 gap-2">
                          {(['Auto-Detect', 'Film Grain', 'Grunge Overlay', 'Crisp Digital', 'Analog Print', 'Aged Paper'] as const).map((option) => (
                            <button
                              key={option}
                              onClick={() => setTextureOption(option)}
                              className={`px-3 py-2 rounded-xl text-xs font-medium border transition-all duration-200 ${
                                textureOption === option
                                  ? 'bg-[#FF6321]/10 border-[#FF6321]/50 text-[#FF6321]'
                                  : 'bg-black/40 border-white/10 text-white/60 hover:bg-white/5 hover:text-white'
                              }`}
                            >
                              {option}
                            </button>
                          ))}
                        </div>

                        <div className="space-y-2">
                          <div className="flex justify-between text-[10px] font-mono text-white/40 uppercase">
                            <span>Texture Mixing Intensity</span>
                            <span className="text-[#FF6321]">{textureIntensity}%</span>
                          </div>
                          <input 
                            type="range" 
                            min="0" 
                            max="100" 
                            value={textureIntensity} 
                            onChange={(e) => setTextureIntensity(parseInt(e.target.value))}
                            className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-[#FF6321]"
                          />
                        </div>

                        <p className="text-[10px] text-white/40 italic leading-relaxed">
                          {textureOption === 'Auto-Detect' 
                            ? 'Analyzes and replicates the exact grain/texture from source at the specified intensity.' 
                            : `Forces a persistent "${textureOption}" aesthetic mixed at ${textureIntensity}% with the base medium.`}
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="pt-4 mt-4 border-t border-white/10">
                    <label className="block text-xs font-mono text-white/50 mb-3 uppercase tracking-wider">Advanced Structural Controls</label>
                    <div className="space-y-4">
                      
                      {/* Character Mapping */}
                      <label className="flex items-start gap-3 cursor-pointer group">
                        <div className="relative flex items-center justify-center mt-0.5">
                          <input 
                            type="checkbox" 
                            className="peer sr-only"
                            checked={enableCharacterMapping}
                            onChange={(e) => setEnableCharacterMapping(e.target.checked)}
                          />
                          <div className="w-5 h-5 rounded border border-white/20 bg-black/50 peer-checked:bg-[#FF6321] peer-checked:border-[#FF6321] transition-colors"></div>
                          <Check className="absolute w-3.5 h-3.5 text-white opacity-0 peer-checked:opacity-100 transition-opacity pointer-events-none" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-white group-hover:text-[#FF6321] transition-colors">Character Instance & Expression Mapping</p>
                          <p className="text-xs text-white/50 mt-0.5">Explicitly tracks duplicate entities & sets fixed expression locks to prevent random generation variation or dropped characters.</p>
                        </div>
                      </label>

                      {/* Anti Flat Render */}
                      <label className="flex items-start gap-3 cursor-pointer group">
                        <div className="relative flex items-center justify-center mt-0.5">
                          <input 
                            type="checkbox" 
                            className="peer sr-only"
                            checked={enableAntiFlat}
                            onChange={(e) => setEnableAntiFlat(e.target.checked)}
                          />
                          <div className="w-5 h-5 rounded border border-white/20 bg-black/50 peer-checked:bg-[#FF6321] peer-checked:border-[#FF6321] transition-colors"></div>
                          <Check className="absolute w-3.5 h-3.5 text-white opacity-0 peer-checked:opacity-100 transition-opacity pointer-events-none" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-white group-hover:text-[#FF6321] transition-colors">Anti-Flat Rendering Constraint</p>
                          <p className="text-xs text-white/50 mt-0.5">Actively blocks default AI generation styles like clean vector fills and smooth digital shading in favor of organic micro-details (grain, ink bleed).</p>
                        </div>
                      </label>

                      {/* Style Blending Slider */}
                      <div className="space-y-4 pt-2">
                        <label className="flex items-start gap-3 cursor-pointer group">
                          <div className="relative flex items-center justify-center mt-0.5">
                            <input 
                              type="checkbox" 
                              className="peer sr-only"
                              checked={enableStyleBlend}
                              onChange={(e) => setEnableStyleBlend(e.target.checked)}
                            />
                            <div className="w-5 h-5 rounded border border-white/20 bg-black/50 peer-checked:bg-[#FF6321] peer-checked:border-[#FF6321] transition-colors"></div>
                            <Check className="absolute w-3.5 h-3.5 text-white opacity-0 peer-checked:opacity-100 transition-opacity pointer-events-none" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-white group-hover:text-[#FF6321] transition-colors">Style Blending Override</p>
                            <p className="text-xs text-white/50 mt-0.5">Toggle to manually mix flat vs organic textures. If off, it will auto-detect from the original image.</p>
                          </div>
                        </label>

                        {enableStyleBlend && (
                          <div className="space-y-2 animate-in fade-in slide-in-from-top-1 duration-200 pl-8">
                            <div className="flex justify-between text-[10px] font-mono text-white/40 uppercase">
                              <span>Style Blend: Flat 2D vs. Organic Texture</span>
                              <span className="text-[#FF6321]">{styleBlendRatio}% Textured</span>
                            </div>
                            <input 
                              type="range" 
                              min="0" 
                              max="100" 
                              value={styleBlendRatio} 
                              onChange={(e) => setStyleBlendRatio(parseInt(e.target.value))}
                              className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-[#FF6321]"
                            />
                            <div className="flex justify-between text-[10px] text-white/30">
                              <span>0 (Flat Vector/Cell Shaded)</span>
                              <span>100 (Full Hand Painted/Grungy)</span>
                            </div>
                          </div>
                        )}
                      </div>

                    </div>
                  </div>

                  {/* ADVANCED EXPANSION MODULES */}
                  <div className="pt-4 mt-4 border-t border-white/10">
                    <label className="block text-xs font-mono text-white/50 mb-3 uppercase tracking-wider">Advanced Expansion Modules</label>
                    <div className="space-y-4">
                      
                      {/* Character-Level Style Detection */}
                      <div className="space-y-3 pb-3 border-b border-white/5">
                        <label className="flex items-start gap-3 cursor-pointer group">
                          <div className="relative flex items-center justify-center mt-0.5">
                            <input type="checkbox" className="peer sr-only" checked={enablePerSubjectForensics} onChange={(e) => setEnablePerSubjectForensics(e.target.checked)} />
                            <div className="w-5 h-5 rounded border border-white/20 bg-black/50 peer-checked:bg-[#FF6321] peer-checked:border-[#FF6321] transition-colors"></div>
                            <Check className="absolute w-3.5 h-3.5 text-white opacity-0 peer-checked:opacity-100 transition-opacity pointer-events-none" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-white group-hover:text-[#FF6321] transition-colors">Character-Level Forensics (Addon)</p>
                            <p className="text-xs text-white/50 mt-0.5">Runs style analysis per subject independently (reverting style bleed in mixed-media outputs).</p>
                          </div>
                        </label>
                      </div>

                      {/* Visual Effects Toggles */}
                      <div className="space-y-2 pb-3 border-b border-white/5">
                        <p className="text-[10px] font-mono text-[#FF6321] uppercase tracking-wider">Visual Effects Overrides</p>
                        
                        {[
                          { key: 'splash', label: 'Paint Splash Overlay', desc: 'Adds dynamic, color-matched splashes.', value: effectPaintSplash, setter: setEffectPaintSplash },
                          { key: 'atmos', label: 'Atmospheric Blend Layer', desc: 'Subtle environmental haze/glow/fog.', value: effectAtmosphericBlend, setter: setEffectAtmosphericBlend },
                          { key: 'texture', label: 'Texture Amplifier', desc: 'Boosts grain/brush strokes visibility.', value: effectTextureAmplifier, setter: setEffectTextureAmplifier },
                          { key: 'edge', label: 'Edge Energy Accent', desc: 'Enhances glow/contrast on subject borders.', value: effectEdgeEnergy, setter: setEffectEdgeEnergy },
                          { key: 'contrast', label: 'Style Contrast Enhancer', desc: 'Increases separation between distinct styles.', value: effectStyleContrast, setter: setEffectStyleContrast },
                          { key: 'color', label: 'Color Harmony Sync', desc: 'Unifies multi-style coloring gracefully.', value: effectColorHarmony, setter: setEffectColorHarmony },
                          { key: 'detail', label: 'Detail Recovery Mode', desc: 'Restores micro-details / strips artifact noise.', value: effectDetailRecovery, setter: setEffectDetailRecovery },
                        ].map((effect) => (
                          <label key={effect.key} className="flex items-start gap-3 cursor-pointer group py-1">
                            <div className="relative flex items-center justify-center mt-0.5">
                              <input type="checkbox" className="peer sr-only" checked={effect.value} onChange={(e) => effect.setter(e.target.checked)} />
                              <div className="w-4 h-4 rounded border border-white/20 bg-black/50 peer-checked:bg-[#FF6321] peer-checked:border-[#FF6321] transition-colors"></div>
                              <Check className="absolute w-3 h-3 text-white opacity-0 peer-checked:opacity-100 transition-opacity pointer-events-none" />
                            </div>
                            <div className="flex-1 flex justify-between items-center">
                              <p className="text-xs font-medium text-white/80 group-hover:text-white transition-colors">{effect.label}</p>
                              <p className="text-[10px] text-white/40 max-w-[150px] text-right truncate" title={effect.desc}>{effect.desc}</p>
                            </div>
                          </label>
                        ))}
                      </div>

                      {/* Advanced Forensic Features */}
                      <div className="space-y-2">
                        <p className="text-[10px] font-mono text-[#FF6321] uppercase tracking-wider">Deep Forensics (Next-Level)</p>

                        {[
                          { key: 'boundary', label: 'Style Boundary Mapping', desc: 'Prevents bleeding across regions.', value: forensicStyleBoundary, setter: setForensicStyleBoundary },
                          { key: 'pigment', label: 'Pigment Physics', desc: 'Simulates watercolor pooling/edge diffusion natively.', value: forensicPigmentPhysics, setter: setForensicPigmentPhysics },
                          { key: 'zoning', label: 'Micro-Detail Zoning', desc: 'Divides image into focus vs background reconstruction.', value: forensicMicroDetailZoning, setter: setForensicMicroDetailZoning },
                          { key: 'material', label: 'Material Recognition', desc: 'Explicit paper vs canvas vs digital parsing.', value: forensicMaterialRecognition, setter: setForensicMaterialRecognition },
                          { key: 'eyes', label: 'Eye Priority Reconstruction', desc: 'Forces flawless iris/symmetry rebuilds on subjects.', value: forensicEyePriority, setter: setForensicEyePriority },
                          { key: 'perspective', label: 'Perspective Integrity', desc: 'Enforces rigid perspective across clashing styles.', value: forensicPerspectiveIntegrity, setter: setForensicPerspectiveIntegrity },
                          { key: 'intent', label: 'Style Intent Preservation', desc: 'Avoids "fixing" deliberately rough/abstract art.', value: forensicStyleIntent, setter: setForensicStyleIntent },
                        ].map((forensic) => (
                          <label key={forensic.key} className="flex items-start gap-3 cursor-pointer group py-1">
                            <div className="relative flex items-center justify-center mt-0.5">
                              <input type="checkbox" className="peer sr-only" checked={forensic.value} onChange={(e) => forensic.setter(e.target.checked)} />
                              <div className="w-4 h-4 rounded border border-white/20 bg-black/50 peer-checked:bg-[#FF6321] peer-checked:border-[#FF6321] transition-colors"></div>
                              <Check className="absolute w-3 h-3 text-white opacity-0 peer-checked:opacity-100 transition-opacity pointer-events-none" />
                            </div>
                            <div className="flex-1 flex justify-between items-center">
                              <p className="text-xs font-medium text-white/80 group-hover:text-white transition-colors">{forensic.label}</p>
                              <p className="text-[10px] text-white/40 max-w-[150px] text-right truncate" title={forensic.desc}>{forensic.desc}</p>
                            </div>
                          </label>
                        ))}
                      </div>

                    </div>
                  </div>

                </div>

                {generationMode === 'recreation' && (
                  <>
                    <div className="pt-8 border-t border-white/10">
                      <h2 className="text-lg font-medium text-[#FF6321] mb-1 flex items-center gap-2">
                        <Focus className="w-5 h-5" />
                        High-Fidelity Overrides
                      </h2>
                      <p className="text-xs text-white/50 mb-4 tracking-wide">ADVANCED FORENSIC RECOVERY</p>
                      
                      <div className="space-y-6">
                        <div className="space-y-3">
                          <label className="block text-xs font-mono text-white/50 uppercase tracking-wider mb-2">Manual Corrective Instructions</label>
                          <textarea
                            value={fidelityInstructions}
                            onChange={(e) => setFidelityInstructions(e.target.value)}
                            placeholder="e.g., 'Recover hands to be anatomically perfect, fix the blurry eyes, ensure exact lighting angle'"
                            className="w-full bg-black/50 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder-white/30 focus:border-[#FF6321]/50 focus:outline-none resize-none h-20"
                          />
                        </div>

                        <label className="flex items-start gap-3 cursor-pointer group">
                          <div className="relative flex items-center justify-center mt-0.5">
                            <input 
                              type="checkbox" 
                              className="peer sr-only"
                              checked={enableSpatialMapping}
                              onChange={(e) => setEnableSpatialMapping(e.target.checked)}
                            />
                            <div className="w-5 h-5 rounded border border-white/20 bg-black/50 peer-checked:bg-[#FF6321] peer-checked:border-[#FF6321] transition-colors"></div>
                            <Check className="absolute w-3.5 h-3.5 text-white opacity-0 peer-checked:opacity-100 transition-opacity pointer-events-none" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-white group-hover:text-[#FF6321] transition-colors">Enable Spatial & Depth Mapping</p>
                            <p className="text-xs text-white/50 mt-0.5">Forces AI to map the scene on the Z-axis (Foreground, Midground, Background) to prevent spatial nesting errors.</p>
                          </div>
                        </label>

                        <div className="space-y-3 pt-4 border-t border-white/10">
                          <label className="block text-xs font-mono text-white/50 uppercase tracking-wider mb-2 flex items-center justify-between">
                            <span>Regional Focus (Magnifying Glass)</span>
                            <button
                              onClick={() => {
                                if (images.length === 0) return;
                                setFocusRegions([...focusRegions, {
                                  id: Math.random().toString(36).substring(7),
                                  imageId: images[0].id,
                                  label: ''
                                }]);
                              }}
                              className="text-[10px] bg-white/10 hover:bg-white/20 px-2 py-1 rounded text-white flex items-center gap-1"
                            >
                              <Plus className="w-3 h-3" /> Add Focus Area
                            </button>
                          </label>
                          <p className="text-xs text-white/50 mb-3">Highlight tiny details that usually get lost (e.g., "The specific pendant on the necklace").</p>
                          
                          {focusRegions.length > 0 ? (
                            <div className="space-y-3">
                              {focusRegions.map((region) => (
                                <div key={region.id} className="flex gap-2 items-start bg-black/30 p-2 border border-white/5 rounded-lg">
                                  <div className="flex-1 space-y-2">
                                    <select 
                                      value={region.imageId}
                                      onChange={(e) => setFocusRegions(focusRegions.map(r => r.id === region.id ? { ...r, imageId: e.target.value } : r))}
                                      className="w-full bg-black/50 border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none"
                                    >
                                      {images.map((img, i) => <option key={img.id} value={img.id}>Image {i + 1}</option>)}
                                    </select>
                                    <input 
                                      type="text"
                                      value={region.label}
                                      onChange={(e) => setFocusRegions(focusRegions.map(r => r.id === region.id ? { ...r, label: e.target.value } : r))}
                                      placeholder="Describe the specific micro-detail..."
                                      className="w-full bg-black/50 border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white placeholder-white/30 focus:outline-none"
                                    />
                                  </div>
                                  <button 
                                    onClick={() => setFocusRegions(focusRegions.filter(r => r.id !== region.id))}
                                    className="p-1.5 text-white/50 hover:text-red-400 bg-white/5 hover:bg-white/10 rounded transition-colors"
                                  >
                                    <X className="w-4 h-4" />
                                  </button>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="text-center py-4 border border-dashed border-white/10 rounded-xl text-xs text-white/30 bg-black/20">
                              No focus regions added.
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </>
                )}

                <div className="pt-4 border-t border-white/10 flex flex-col gap-3">
                  <button
                    onClick={handleGenerate}
                    disabled={images.length === 0 || isGenerating || isSanitizing || isGeneratingFidelity}
                    className={`w-full py-4 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all duration-300 ${
                      images.length === 0 
                        ? 'bg-white/5 text-white/30 cursor-not-allowed' 
                        : isGenerating
                          ? 'bg-[#FF6321]/50 text-white cursor-wait'
                          : 'bg-[#FF6321] hover:bg-[#FF7A42] text-white shadow-[0_0_20px_rgba(255,99,33,0.3)] hover:shadow-[0_0_30px_rgba(255,99,33,0.5)]'
                    }`}
                  >
                    {isGenerating ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Analyzing Images...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-5 h-5" />
                        Generate Prompt
                      </>
                    )}
                  </button>

                  {generationMode === 'recreation' && (
                    <button
                      onClick={handleGenerateFidelity}
                      disabled={images.length === 0 || isGenerating || isSanitizing || isGeneratingFidelity}
                      className={`w-full py-3 rounded-xl text-sm font-medium flex items-center justify-center gap-2 transition-all duration-300 ${
                        images.length === 0 
                          ? 'bg-white/5 text-white/30 cursor-not-allowed' 
                          : isGeneratingFidelity
                            ? 'bg-blue-500/20 text-blue-400 cursor-wait'
                            : 'bg-white/5 hover:bg-white/10 text-white/80 hover:text-white border border-white/10'
                      }`}
                    >
                      {isGeneratingFidelity ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Analyzing Images...
                        </>
                      ) : (
                        <>
                          <Focus className="w-4 h-4" />
                          High-Fidelity Recreation
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Column 2: Prompt Output & Image Gen Settings */}
          <div className="space-y-6 flex flex-col h-[calc(100vh-8rem)] overflow-y-auto pr-2 custom-scrollbar pb-8">
            
            {/* Output */}
            <div className="flex flex-col bg-white/[0.02] border border-white/10 rounded-2xl overflow-hidden min-h-[300px] shrink-0">
              <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-black/20">
                <h2 className="text-sm font-medium text-white flex items-center gap-2">
                  <ImageIcon className="w-4 h-4 text-white/50" />
                  Generated Prompt
                </h2>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleMakeSafe}
                    disabled={!prompt || isSanitizing || isGenerating || isGeneratingFidelity}
                    title="Rewrite prompt to bypass safety filters while keeping the vibe"
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      !prompt || isSanitizing || isGenerating || isGeneratingFidelity
                        ? 'text-white/20 cursor-not-allowed' 
                        : 'bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 hover:text-blue-300'
                    }`}
                  >
                    {isSanitizing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ShieldCheck className="w-3.5 h-3.5" />}
                    {isSanitizing ? 'Sanitizing...' : 'Make Safe'}
                  </button>
                  <button
                    onClick={handleCopy}
                    disabled={!prompt}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      !prompt 
                        ? 'text-white/20 cursor-not-allowed' 
                        : copied
                          ? 'bg-green-500/20 text-green-400'
                          : 'bg-white/10 text-white/80 hover:bg-white/20 hover:text-white'
                    }`}
                  >
                    {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    {copied ? 'Copied!' : 'Copy'}
                  </button>
                </div>
              </div>
              
              <div className="flex-1 p-6 relative group flex flex-col gap-4">
                {!prompt && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-white/20 pointer-events-none">
                    <Sparkles className="w-12 h-12 mb-3 opacity-20" />
                    <p className="text-sm font-medium text-center">
                      Prompt will appear here<br/>
                      <span className="text-xs opacity-70 font-normal mt-1 block">Or paste your own prompt to make it safe</span>
                    </p>
                  </div>
                )}
                <div className="flex-1 flex flex-col min-h-[200px]">
                  <h3 className="text-xs font-mono text-[#FF6321] uppercase tracking-wider mb-2">Positive Prompt</h3>
                  <textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    disabled={isGenerating || isSanitizing || isGeneratingFidelity}
                    className="relative z-10 w-full flex-1 bg-transparent resize-none outline-none text-white/80 leading-relaxed font-mono text-sm custom-scrollbar disabled:opacity-50"
                  />
                </div>
                {negativePrompt && (
                  <div className="flex-1 flex flex-col min-h-[100px] pt-4 border-t border-white/10">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-xs font-mono text-red-400 uppercase tracking-wider">Negative Prompt</h3>
                      <button
                        onClick={handleCopyNegative}
                        className={`flex items-center gap-1.5 px-2 py-1 rounded text-[10px] font-medium transition-colors ${
                          negativeCopied
                            ? 'bg-green-500/20 text-green-400'
                            : 'bg-white/5 text-white/60 hover:bg-white/10 hover:text-white'
                        }`}
                      >
                        {negativeCopied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                        {negativeCopied ? 'Copied' : 'Copy'}
                      </button>
                    </div>
                    <textarea
                      value={negativePrompt}
                      onChange={(e) => setNegativePrompt(e.target.value)}
                      disabled={isGenerating || isSanitizing || isGeneratingFidelity}
                      className="relative z-10 w-full flex-1 bg-transparent resize-none outline-none text-white/60 leading-relaxed font-mono text-sm custom-scrollbar disabled:opacity-50"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Image Generation Settings */}
            <div className="bg-white/[0.02] border border-white/10 rounded-2xl p-6 shrink-0">
              <h2 className="text-lg font-medium text-white mb-4">Image Generation</h2>
              
              <div className="space-y-6">
                <div>
                  <label className="block text-xs font-mono text-white/50 uppercase tracking-wider mb-3">Model</label>
                  <div className="grid grid-cols-2 gap-3">
                    {(['Nano Banana 2', 'Nano Banana Pro'] as ModelType[]).map((m) => (
                      <button
                        key={m}
                        onClick={() => setImageModel(m)}
                        className={`py-3 px-4 rounded-xl text-sm font-medium transition-all duration-200 border ${
                          imageModel === m 
                            ? 'bg-[#FF6321]/10 border-[#FF6321] text-[#FF6321]' 
                            : 'bg-black/50 border-white/10 text-white/60 hover:bg-white/5 hover:text-white'
                        }`}
                      >
                        {m}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-3 pt-4 border-t border-white/10">
                  <label className="block text-xs font-mono text-white/50 uppercase tracking-wider mb-3">Aspect Ratio</label>
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                    {(['1:1', '16:9', '9:16', '4:3', '3:4', '3:2', '2:3', '21:9', '9:21', '5:4', '4:5'] as AspectRatio[]).map((ar) => (
                      <button
                        key={ar}
                        onClick={() => setAspectRatio(ar)}
                        className={`py-2 px-2 rounded-lg text-xs font-medium transition-all duration-200 border ${
                          aspectRatio === ar 
                            ? 'bg-[#FF6321]/10 border-[#FF6321] text-[#FF6321]' 
                            : 'bg-black/50 border-white/10 text-white/60 hover:bg-white/5 hover:text-white'
                        }`}
                      >
                        {ar}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-3 pt-4 border-t border-white/10">
                  <label className="block text-xs font-mono text-white/50 uppercase tracking-wider mb-3">Resolution</label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['1K', '2K', '4K'] as Resolution[]).map((res) => (
                      <button
                        key={res}
                        onClick={() => setResolution(res)}
                        className={`py-2 px-3 rounded-lg text-xs font-medium transition-all duration-200 border ${
                          resolution === res 
                            ? 'bg-[#FF6321]/10 border-[#FF6321] text-[#FF6321]' 
                            : 'bg-black/50 border-white/10 text-white/60 hover:bg-white/5 hover:text-white'
                        }`}
                      >
                        {res}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-3 pt-4 border-t border-white/10">
                  <label className="flex items-start gap-3 cursor-pointer group">
                    <div className="relative flex items-center justify-center mt-0.5">
                      <input 
                        type="checkbox" 
                        className="peer sr-only"
                        checked={useSourceImage}
                        onChange={(e) => setUseSourceImage(e.target.checked)}
                        disabled={images.length === 0}
                      />
                      <div className="w-5 h-5 rounded border border-white/20 bg-black/50 peer-checked:bg-[#FF6321] peer-checked:border-[#FF6321] transition-colors peer-disabled:opacity-50"></div>
                      <Check className="absolute w-3.5 h-3.5 text-white opacity-0 peer-checked:opacity-100 transition-opacity pointer-events-none" />
                    </div>
                    <div>
                      <p className={`text-sm font-medium transition-colors ${images.length === 0 ? 'text-white/30' : 'text-white group-hover:text-[#FF6321]'}`}>Use Source Image (Img2Img)</p>
                      <p className="text-xs text-white/50 mt-0.5">Pass the first uploaded image as a reference to the model.</p>
                    </div>
                  </label>
                </div>

                <div className="pt-4 border-t border-white/10 flex flex-col gap-3">
                  <div className="flex items-center justify-between text-sm mb-2">
                    <span className="text-white/50">Estimated Cost:</span>
                    <span className="text-[#FF6321] font-mono font-medium">${calculateCost()}</span>
                  </div>
                  <button
                    onClick={handleGenerateImage}
                    disabled={!prompt || isGeneratingImage}
                    className={`w-full py-4 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all duration-300 ${
                      !prompt
                        ? 'bg-white/5 text-white/30 cursor-not-allowed' 
                        : isGeneratingImage
                          ? 'bg-[#FF6321]/50 text-white cursor-wait'
                          : 'bg-[#FF6321] hover:bg-[#FF7A42] text-white shadow-[0_0_20px_rgba(255,99,33,0.3)] hover:shadow-[0_0_30px_rgba(255,99,33,0.5)]'
                    }`}
                  >
                    {isGeneratingImage ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Generating Image...
                      </>
                    ) : (
                      <>
                        <ImageIcon className="w-5 h-5" />
                        Generate Image
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Column 3: Generated Image */}
          <div className="space-y-6 flex flex-col h-[calc(100vh-8rem)] overflow-y-auto pr-2 custom-scrollbar pb-8">
            <div className="flex-1 bg-white/[0.02] border border-white/10 rounded-2xl overflow-hidden flex flex-col min-h-[400px]">
              <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-black/20 shrink-0">
                <h2 className="text-sm font-medium text-white flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[#FF6321]" />
                  Generated Result
                </h2>
              </div>
              
              <div className="flex-1 p-6 flex items-center justify-center relative">
                {isGeneratingImage ? (
                  <div className="flex flex-col items-center gap-4">
                    <div className="w-16 h-16 rounded-full border-4 border-white/10 border-t-[#FF6321] animate-spin"></div>
                    <p className="text-sm text-white/50 font-medium animate-pulse">Rendering masterpiece...</p>
                  </div>
                ) : generatedImageUrl ? (
                  <div className="relative w-full h-full flex items-center justify-center group">
                    <img 
                      src={generatedImageUrl} 
                      alt="Generated Artwork" 
                      className="max-w-full max-h-full object-contain rounded-xl shadow-2xl"
                    />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4 rounded-xl">
                      <a 
                        href={generatedImageUrl} 
                        target="_blank" 
                        rel="noreferrer"
                        className="p-3 bg-white/10 hover:bg-white/20 text-white rounded-full backdrop-blur-md transition-colors"
                        title="Open full size"
                      >
                        <LinkIcon className="w-5 h-5" />
                      </a>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center text-white/20 text-center">
                    <ImageIcon className="w-16 h-16 mb-4 opacity-20" />
                    <p className="text-sm font-medium">No image generated yet</p>
                    <p className="text-xs opacity-70 mt-1">Generate a prompt and click "Generate Image"</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

