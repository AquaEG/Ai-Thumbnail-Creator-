
import React, { useState, useRef, useEffect } from 'react';
import { 
  ThumbnailConfig, 
  GenerationResult, 
  Platform, 
  StylePreset, 
  ColorPalette, 
  FontStyle, 
  Placement, 
  AspectRatio,
  ImageSize,
  ChatMessage
} from './types';
import { 
    generateThumbnailConcept, 
    generateImageFromPrompt, 
    editImage, 
    generateVeoVideo,
    createChat,
    sendMessage,
    updateApiKey
} from './services/geminiService';
import { Section, Input, TextArea, Select, FileInput, Toggle } from './components/InputSection';
import { Loader2, Wand2, RefreshCcw, Image as ImageIcon, Sparkles, Video, MessageSquare, Send, X, BrainCircuit, PlayCircle, Key, Cpu, Zap, Layout, Sun, Moon, Settings, Download } from 'lucide-react';
import { Chat } from '@google/genai';

const App: React.FC = () => {
  // --- STATE ---
  const [config, setConfig] = useState<ThumbnailConfig>({
    video_title: "",
    video_hook: "",
    platform: Platform.YouTube,
    overlay_text: "",
    auto_generate_text: false,
    style_preset: StylePreset.Crazy,
    color_palette: ColorPalette.Neon,
    font_style: FontStyle.Bold,
    face_image: null,
    use_stock_face: false,
    placement: Placement.Right,
    aspect_ratio: AspectRatio.Ratio16_9,
    brand_logo: null,
    reference_thumbnail: null,
    cta_badge_text: "",
    seed: null,
    image_size: ImageSize.Size1K,
    use_pro_model: false,
    use_thinking: false
  });

  const [result, setResult] = useState<GenerationResult>({
    base_thumbnail_url: "",
    refined_thumbnail_url: "",
    last_refinement_prompt: "",
  });

  const [refinementPrompt, setRefinementPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isRefining, setIsRefining] = useState(false);
  const [isGeneratingVideo, setIsGeneratingVideo] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Theme State
  const [isDarkMode, setIsDarkMode] = useState(true);

  // Settings / API Key State
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [tempApiKey, setTempApiKey] = useState("");

  // Chat State
  const [showChat, setShowChat] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatInstance, setChatInstance] = useState<Chat | null>(null);
  const [isChatThinking, setIsChatThinking] = useState(false);
  const chatScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Theme initialization
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  useEffect(() => {
    if (chatScrollRef.current) {
        chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [chatMessages]);

  useEffect(() => {
    // Initialize chat on load
    const chat = createChat("You are a helpful expert assistant for a YouTube Thumbnail designer app. Help the user come up with ideas, copy, and visual concepts.");
    setChatInstance(chat);
    
    // Check local storage for API key on load
    const storedKey = localStorage.getItem('gemini_api_key');
    if (storedKey) setTempApiKey(storedKey);
  }, []);

  // --- ACTIONS ---

  const handleConfigChange = (key: keyof ThumbnailConfig, value: any) => {
    setConfig(prev => ({ ...prev, [key]: value }));
  };

  const handleSaveApiKey = () => {
      if (tempApiKey.trim()) {
          localStorage.setItem('gemini_api_key', tempApiKey.trim());
      } else {
          localStorage.removeItem('gemini_api_key');
      }
      setIsSettingsOpen(false);
      // Force reload or re-init logic if needed, but since geminiService reads on demand, it should be fine.
  };

  const handleClearApiKey = () => {
      localStorage.removeItem('gemini_api_key');
      setTempApiKey("");
  };

  const handleGenerateThumbnail = async () => {
    setIsGenerating(true);
    setError(null);
    try {
      // 1. Generate Concept (Text)
      const concept = await generateThumbnailConcept(config, config.reference_thumbnail);
      
      // 2. Generate Image (Visual)
      const refImages: File[] = [];
      if (config.face_image) refImages.push(config.face_image);
      if (config.brand_logo) refImages.push(config.brand_logo);
      if (config.reference_thumbnail) refImages.push(config.reference_thumbnail);

      const imageUrl = await generateImageFromPrompt(
          concept.final_prompt, 
          config.aspect_ratio, 
          config.image_size,
          config.use_pro_model,
          refImages
      );

      setResult({
        base_thumbnail_url: imageUrl,
        refined_thumbnail_url: "",
        last_refinement_prompt: "",
        generated_prompt_concept: concept.final_prompt
      });

    } catch (err: any) {
        console.error(err);
        setError(err.message || "Failed to generate thumbnail");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRefineThumbnail = async () => {
    const sourceImage = result.refined_thumbnail_url || result.base_thumbnail_url;
    if (!sourceImage) return;
    
    setIsRefining(true);
    setError(null);
    try {
        const imageUrl = await editImage(sourceImage, refinementPrompt);

        setResult(prev => ({
            ...prev,
            refined_thumbnail_url: imageUrl,
            last_refinement_prompt: refinementPrompt
        }));
        setRefinementPrompt(""); // Clear input after success

    } catch (err: any) {
        console.error(err);
        setError(err.message || "Failed to refine thumbnail");
    } finally {
        setIsRefining(false);
    }
  };

  const handleGenerateVideo = async () => {
      const sourceImage = result.refined_thumbnail_url || result.base_thumbnail_url;
      if (!sourceImage) return;

      setIsGeneratingVideo(true);
      setError(null);
      try {
          let targetAr: '16:9'|'9:16' = '16:9';
          if (config.aspect_ratio === AspectRatio.Ratio9_16 || config.aspect_ratio === AspectRatio.Ratio3_4) {
              targetAr = '9:16';
          }

          const videoUrl = await generateVeoVideo(
              "Animate this thumbnail cinematically",
              sourceImage,
              targetAr
          );

          setResult(prev => ({
              ...prev,
              video_url: videoUrl
          }));
      } catch (err: any) {
          console.error(err);
          setError(err.message || "Failed to generate video");
      } finally {
          setIsGeneratingVideo(false);
      }
  };

  const handleDownload = () => {
    const imageUrl = result.refined_thumbnail_url || result.base_thumbnail_url;
    if (!imageUrl) return;
    
    const link = document.createElement('a');
    link.href = imageUrl;
    
    // Generate filename based on video title if available, otherwise timestamp
    const cleanTitle = config.video_title 
      ? config.video_title.replace(/[^a-z0-9]/gi, '-').toLowerCase().substring(0, 50)
      : 'neothumb';
    
    link.download = `${cleanTitle}-${Date.now()}.png`;
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleChatSend = async () => {
      if (!chatInput.trim() || !chatInstance) return;
      
      const userMsg = chatInput;
      setChatMessages(prev => [...prev, { role: 'user', text: userMsg }]);
      setChatInput("");
      setIsChatThinking(true);

      try {
          const responseText = await sendMessage(chatInstance, userMsg);
          setChatMessages(prev => [...prev, { role: 'model', text: responseText || "" }]);
      } catch (err) {
          console.error(err);
          setChatMessages(prev => [...prev, { role: 'model', text: "Sorry, I encountered an error." }]);
      } finally {
          setIsChatThinking(false);
      }
  };

  return (
    <div className="h-screen flex flex-col lg:flex-row bg-gray-50 dark:bg-black text-gray-900 dark:text-zinc-100 overflow-hidden font-sans selection:bg-cyan-500/30 selection:text-cyan-900 dark:selection:text-cyan-100 transition-colors duration-300">
      
      {/* --- COLUMN 1: CONFIG DECK (LEFT) --- */}
      <aside className="w-full lg:w-[380px] flex-shrink-0 bg-white/80 dark:bg-black/60 backdrop-blur-xl border-r border-gray-200 dark:border-white/5 h-screen overflow-y-auto z-20 scrollbar-thin flex flex-col shadow-xl dark:shadow-[10px_0_40px_-10px_rgba(0,0,0,0.8)] transition-colors duration-300">
        
        {/* Header */}
        <div className="p-6 border-b border-gray-200 dark:border-white/5 bg-gradient-to-b from-white/50 to-transparent dark:from-white/5 sticky top-0 z-30 backdrop-blur-md">
            <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                    <div className="relative">
                        <div className="absolute inset-0 bg-cyan-500 blur-lg opacity-20 dark:opacity-40"></div>
                        <div className="relative p-2 bg-gradient-to-br from-gray-100 to-white dark:from-cyan-950 dark:to-black rounded border border-gray-300 dark:border-cyan-800 shadow-sm">
                            <Cpu className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
                        </div>
                    </div>
                    <div>
                        <h1 className="text-xl font-black tracking-tight text-gray-900 dark:text-white font-mono">
                            NEO<span className="text-cyan-600 dark:text-cyan-500">THUMB</span>
                        </h1>
                        <p className="text-[10px] text-gray-500 dark:text-zinc-500 uppercase tracking-widest font-bold">AI Generation Unit</p>
                    </div>
                </div>
                <div className="flex items-center gap-1">
                    <button 
                        onClick={() => setIsDarkMode(!isDarkMode)}
                        className="p-2 text-gray-600 dark:text-zinc-400 hover:text-cyan-600 dark:hover:text-cyan-400 hover:bg-gray-200 dark:hover:bg-cyan-950/30 rounded-md transition-all"
                        title="Toggle Theme"
                    >
                        {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                    </button>
                    <button 
                        onClick={() => updateApiKey()}
                        className="p-2 text-gray-600 dark:text-zinc-600 hover:text-cyan-600 dark:hover:text-cyan-400 hover:bg-gray-200 dark:hover:bg-cyan-950/30 rounded-md border border-transparent hover:border-gray-300 dark:hover:border-cyan-900/50 transition-all"
                        title="Connect AI Studio"
                    >
                        <Key className="w-4 h-4" />
                    </button>
                    <button 
                        onClick={() => setIsSettingsOpen(true)}
                        className="p-2 text-gray-600 dark:text-zinc-600 hover:text-cyan-600 dark:hover:text-cyan-400 hover:bg-gray-200 dark:hover:bg-cyan-950/30 rounded-md border border-transparent hover:border-gray-300 dark:hover:border-cyan-900/50 transition-all"
                        title="Manual API Key"
                    >
                        <Settings className="w-4 h-4" />
                    </button>
                </div>
            </div>
        </div>

        {/* Controls Container */}
        <div className="flex-1 p-6 space-y-8">
            <Section title="System Core">
                <div className="bg-gray-50 dark:bg-zinc-900/30 p-4 rounded-md border border-gray-200 dark:border-white/5 space-y-4 shadow-sm dark:shadow-none">
                    <Toggle 
                        label="Pro Model (High-Res)" 
                        checked={config.use_pro_model}
                        onChange={(val) => handleConfigChange('use_pro_model', val)}
                    />
                    {config.use_pro_model && (
                        <Select 
                            label="Output Resolution"
                            options={Object.values(ImageSize)}
                            value={config.image_size}
                            onChange={(e) => handleConfigChange('image_size', e.target.value)}
                        />
                    )}
                    <Toggle 
                        label="Deep Thinking Mode" 
                        checked={config.use_thinking}
                        onChange={(val) => handleConfigChange('use_thinking', val)}
                    />
                </div>
            </Section>

            <Section title="Reference Data">
                <FileInput 
                    label="Style Reference (Optional)"
                    onChange={(file) => handleConfigChange('reference_thumbnail', file)}
                />
            </Section>

            <Section title="Content Parameters">
                <Input 
                    label="Video Title" 
                    placeholder="ENTER TITLE..." 
                    value={config.video_title}
                    onChange={(e) => handleConfigChange('video_title', e.target.value)}
                />
                <Input 
                    label="Hook / Subtitle" 
                    placeholder="ENTER HOOK..." 
                    value={config.video_hook}
                    onChange={(e) => handleConfigChange('video_hook', e.target.value)}
                />
                <Select 
                    label="Target Platform"
                    options={Object.values(Platform)}
                    value={config.platform}
                    onChange={(e) => handleConfigChange('platform', e.target.value)}
                />
            </Section>

            <Section title="Text Layer">
                <TextArea 
                    label="Overlay Text"
                    placeholder="TEXT CONTENT..."
                    value={config.overlay_text}
                    onChange={(e) => handleConfigChange('overlay_text', e.target.value)}
                />
                <Toggle 
                    label="Auto-Generate Copy" 
                    checked={config.auto_generate_text}
                    onChange={(val) => handleConfigChange('auto_generate_text', val)}
                />
            </Section>

            <Section title="Visual Style">
                <Select 
                    label="Aesthetic Preset"
                    options={Object.values(StylePreset)}
                    value={config.style_preset}
                    onChange={(e) => handleConfigChange('style_preset', e.target.value)}
                />
                <Select 
                    label="Color Palette"
                    options={Object.values(ColorPalette)}
                    value={config.color_palette}
                    onChange={(e) => handleConfigChange('color_palette', e.target.value)}
                />
                <Select 
                    label="Typography"
                    options={Object.values(FontStyle)}
                    value={config.font_style}
                    onChange={(e) => handleConfigChange('font_style', e.target.value)}
                />
            </Section>

            <Section title="Composition">
                <div className="grid grid-cols-2 gap-4">
                    <Select 
                        label="Placement"
                        options={Object.values(Placement)}
                        value={config.placement}
                        onChange={(e) => handleConfigChange('placement', e.target.value)}
                    />
                    <Select 
                        label="Aspect Ratio"
                        options={Object.values(AspectRatio)}
                        value={config.aspect_ratio}
                        onChange={(e) => handleConfigChange('aspect_ratio', e.target.value)}
                    />
                </div>
                <FileInput 
                    label="Face / Subject Reference"
                    onChange={(file) => handleConfigChange('face_image', file)}
                />
                 <Toggle 
                    label="Use Stock Assets"
                    checked={config.use_stock_face}
                    onChange={(val) => handleConfigChange('use_stock_face', val)}
                />
            </Section>

            <div className="pt-4 pb-20">
                <button 
                    onClick={handleGenerateThumbnail}
                    disabled={isGenerating}
                    className="group relative w-full py-4 bg-gray-900 dark:bg-zinc-900 border border-gray-800 dark:border-cyan-900/50 rounded-lg font-black text-white dark:text-cyan-500 uppercase tracking-widest text-sm transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden hover:bg-gray-800 dark:hover:bg-cyan-950/30 shadow-lg hover:shadow-xl dark:hover:shadow-[0_0_20px_rgba(6,182,212,0.15)]"
                >
                    <div className="absolute inset-0 translate-y-[100%] bg-gradient-to-t from-cyan-500/20 to-transparent transition-transform duration-300 group-hover:translate-y-0"></div>
                    <span className="relative flex items-center justify-center gap-3">
                        {isGenerating ? (
                            <>
                                <Loader2 className="w-5 h-5 animate-spin text-cyan-400" />
                                {config.use_thinking ? 'PROCESSING CONCEPT...' : 'RENDERING...'}
                            </>
                        ) : (
                            <>
                                {config.use_thinking ? <BrainCircuit className="w-5 h-5"/> : <Zap className="w-5 h-5" />}
                                {result.base_thumbnail_url ? 'Regenerate Thumbnail' : 'Generate Thumbnail'}
                            </>
                        )}
                    </span>
                </button>
                
                {result.base_thumbnail_url && (
                    <button 
                        onClick={handleGenerateVideo}
                        disabled={isGeneratingVideo}
                        className="mt-3 w-full py-3 bg-white dark:bg-zinc-900/50 border border-violet-200 dark:border-violet-900/50 hover:bg-violet-50 dark:hover:bg-violet-900/20 rounded-lg font-bold text-violet-700 dark:text-violet-400 uppercase tracking-widest text-xs transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-sm group"
                    >
                        {isGeneratingVideo ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Processing Video...
                            </>
                        ) : (
                            <>
                                <Video className="w-4 h-4 group-hover:scale-110 transition-transform" />
                                Generate Video
                            </>
                        )}
                    </button>
                )}

                {error && (
                    <div className="mt-4 p-3 bg-red-100 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400 text-xs font-bold font-mono rounded">
                        ERROR: {error}
                    </div>
                )}
            </div>
        </div>
      </aside>

      {/* --- COLUMN 2: VIEWPORT (CENTER) --- */}
      <main className="flex-1 flex flex-col h-screen relative bg-gray-100 dark:bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] dark:from-zinc-900 dark:via-black dark:to-black transition-colors duration-300">
        
        {/* HUD Overlay (Dark mode only usually, but adapted for light) */}
        <div className="absolute inset-0 pointer-events-none opacity-20 dark:opacity-100 transition-opacity">
            {/* Corner Markers */}
            <div className="absolute top-8 left-8 w-8 h-8 border-t border-l border-gray-400 dark:border-zinc-700/50"></div>
            <div className="absolute top-8 right-8 w-8 h-8 border-t border-r border-gray-400 dark:border-zinc-700/50"></div>
            <div className="absolute bottom-8 left-8 w-8 h-8 border-b border-l border-gray-400 dark:border-zinc-700/50"></div>
            <div className="absolute bottom-8 right-8 w-8 h-8 border-b border-r border-gray-400 dark:border-zinc-700/50"></div>
        </div>

        {/* Top Bar */}
        <header className="p-4 flex justify-between items-center z-10 border-b border-gray-200 dark:border-white/5 bg-white/50 dark:bg-black/20 backdrop-blur-sm">
            <div className="flex items-center gap-2 px-4 py-1 bg-white dark:bg-zinc-900/50 rounded-full border border-gray-200 dark:border-white/5 shadow-sm">
                <div className={`w-2 h-2 rounded-full ${isGenerating ? 'bg-yellow-500 animate-pulse' : 'bg-emerald-500'}`}></div>
                <span className="text-[11px] font-bold font-mono text-gray-500 dark:text-zinc-400 uppercase tracking-wide">System Ready</span>
            </div>
            
            <button 
                onClick={() => setShowChat(!showChat)}
                className={`px-4 py-2 rounded-md border transition-all flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider shadow-sm ${
                    showChat 
                    ? 'bg-cyan-100 dark:bg-cyan-950 border-cyan-300 dark:border-cyan-500/50 text-cyan-700 dark:text-cyan-400 dark:shadow-[0_0_15px_rgba(6,182,212,0.2)]' 
                    : 'bg-white dark:bg-zinc-900/50 border-gray-200 dark:border-white/10 text-gray-600 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white hover:border-gray-300 dark:hover:border-white/20'
                }`}
            >
                <MessageSquare className="w-3 h-3" />
                AI Assistant
            </button>
        </header>

        {/* Viewport Content */}
        <div className="flex-1 flex flex-col items-center justify-center p-8 z-10 overflow-hidden relative">
            {result.base_thumbnail_url ? (
                 <div className="flex flex-col gap-8 max-w-5xl w-full h-full justify-center">
                    
                    {/* Main Image Container */}
                    <div className="relative group w-full flex-1 flex items-center justify-center min-h-0">
                        {/* Glow Effect */}
                        <div className="absolute -inset-1 bg-gradient-to-r from-cyan-500/20 to-violet-500/20 rounded-lg blur-xl opacity-0 dark:opacity-50 dark:group-hover:opacity-100 transition duration-700"></div>
                        
                        <div className="relative border border-gray-200 dark:border-white/10 rounded-xl overflow-hidden shadow-2xl bg-white dark:bg-zinc-950 max-h-full">
                            <img 
                                src={result.refined_thumbnail_url || result.base_thumbnail_url} 
                                alt="Generated Output" 
                                className="max-h-[70vh] w-auto object-contain"
                            />
                            
                            {/* Image Overlay UI */}
                            <div className="absolute top-0 left-0 right-0 p-4 bg-gradient-to-b from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                <div className="flex justify-between items-start">
                                    <span className="text-[10px] font-mono font-bold text-cyan-400 bg-cyan-950/80 border border-cyan-900/50 px-2 py-1 rounded">
                                        {result.refined_thumbnail_url ? "V2.0 // REFINED" : "V1.0 // BASE"}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Actions Deck */}
                    <div className="flex gap-4 justify-center py-4">
                         <button 
                            onClick={handleGenerateThumbnail}
                            disabled={isGenerating}
                            className="px-6 py-3 bg-white dark:bg-zinc-900 hover:bg-gray-50 dark:hover:bg-zinc-800 border border-gray-200 dark:border-zinc-700 hover:border-gray-300 dark:hover:border-zinc-500 rounded-md text-gray-800 dark:text-zinc-300 text-xs font-black uppercase tracking-wider shadow-lg flex items-center gap-2 transition-all"
                        >
                            <RefreshCcw className={`w-4 h-4 ${isGenerating ? 'animate-spin' : ''}`} />
                            Regenerate
                        </button>

                        <button 
                            onClick={handleDownload}
                            className="px-6 py-3 bg-white dark:bg-zinc-900 hover:bg-gray-50 dark:hover:bg-zinc-800 border border-gray-200 dark:border-zinc-700 hover:border-gray-300 dark:hover:border-zinc-500 rounded-md text-gray-800 dark:text-zinc-300 text-xs font-black uppercase tracking-wider shadow-lg flex items-center gap-2 transition-all"
                        >
                            <Download className="w-4 h-4" />
                            Download
                        </button>

                        <button 
                            onClick={handleGenerateVideo}
                            disabled={isGeneratingVideo}
                            className="px-6 py-3 bg-gradient-to-r from-violet-600 to-fuchsia-600 dark:from-violet-900 dark:to-fuchsia-900 hover:from-violet-500 hover:to-fuchsia-500 dark:hover:from-violet-800 dark:hover:to-fuchsia-800 border border-transparent dark:border-violet-500/30 rounded-md text-white dark:text-violet-100 text-xs font-black uppercase tracking-wider shadow-md dark:shadow-[0_0_15px_rgba(139,92,246,0.3)] flex items-center gap-2 transition-all disabled:opacity-50"
                        >
                            {isGeneratingVideo ? <Loader2 className="w-4 h-4 animate-spin"/> : <Video className="w-4 h-4" />}
                            Init Veo Animation
                        </button>
                    </div>

                    {/* Video Result Popup */}
                    {result.video_url && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 dark:bg-black/90 backdrop-blur-md p-10 animate-in fade-in duration-200">
                             <div className="max-w-4xl w-full bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-2xl overflow-hidden shadow-2xl">
                                <div className="p-4 border-b border-gray-200 dark:border-zinc-800 flex justify-between items-center bg-gray-50 dark:bg-zinc-950">
                                    <h3 className="text-xs font-extrabold text-violet-600 dark:text-violet-400 uppercase flex items-center gap-2">
                                        <PlayCircle className="w-5 h-5"/> Veo Animation Output
                                    </h3>
                                    <button onClick={() => setResult(prev => ({...prev, video_url: undefined}))} className="text-gray-400 hover:text-gray-900 dark:text-zinc-500 dark:hover:text-white">
                                        <X className="w-6 h-6" />
                                    </button>
                                </div>
                                <div className="p-2 bg-gray-100 dark:bg-black">
                                    <video 
                                        src={result.video_url} 
                                        controls 
                                        autoPlay 
                                        loop
                                        className="w-full h-auto max-h-[70vh] mx-auto rounded"
                                    />
                                </div>
                             </div>
                        </div>
                    )}
                 </div>
            ) : (
                <div className="border-2 border-dashed border-gray-300 dark:border-zinc-800 rounded-2xl w-full max-w-lg aspect-video flex flex-col items-center justify-center gap-6 bg-white/40 dark:bg-zinc-900/20 backdrop-blur-sm shadow-sm">
                    <div className="relative">
                        <div className="absolute inset-0 bg-cyan-500 blur-2xl opacity-10 dark:opacity-10"></div>
                        <Layout className="w-16 h-16 text-gray-300 dark:text-zinc-700 relative" />
                    </div>
                    <div className="text-center space-y-2">
                        <p className="font-mono font-bold text-sm text-gray-500 dark:text-zinc-400">AWAITING INPUT STREAM</p>
                        <p className="text-[11px] font-bold text-gray-400 dark:text-zinc-600 uppercase tracking-widest">Configure parameters to initialize</p>
                    </div>
                </div>
            )}
        </div>

        {/* --- SETTINGS MODAL --- */}
        {isSettingsOpen && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-md p-6 animate-in fade-in duration-200">
                <div className="max-w-md w-full bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl shadow-2xl overflow-hidden">
                    <div className="p-4 border-b border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-950 flex justify-between items-center">
                        <h3 className="text-xs font-black text-gray-800 dark:text-gray-200 uppercase tracking-widest flex items-center gap-2">
                            <Settings className="w-4 h-4"/> API Configuration
                        </h3>
                        <button onClick={() => setIsSettingsOpen(false)} className="text-gray-400 hover:text-gray-900 dark:hover:text-white">
                            <X className="w-4 h-4"/>
                        </button>
                    </div>
                    <div className="p-6 space-y-4">
                        <p className="text-xs text-gray-600 dark:text-zinc-400 leading-relaxed">
                            Enter your Google Gemini API Key below. This key will be stored securely in your browser's local storage and used for all AI generations.
                        </p>
                        <div className="space-y-1">
                            <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-zinc-500">API Key</label>
                            <div className="relative">
                                <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-zinc-600" />
                                <input 
                                    type="password" 
                                    className="w-full bg-gray-100 dark:bg-black border border-gray-300 dark:border-zinc-800 rounded p-3 pl-10 text-sm font-mono text-gray-900 dark:text-white focus:outline-none focus:border-cyan-500 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                                    placeholder="AIza..."
                                    value={tempApiKey}
                                    onChange={(e) => setTempApiKey(e.target.value)}
                                />
                            </div>
                        </div>
                    </div>
                    <div className="p-4 border-t border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-900/50 flex justify-between">
                         <button 
                            onClick={handleClearApiKey}
                            className="px-4 py-2 text-xs font-bold text-red-500 hover:text-red-700 dark:hover:text-red-400 uppercase tracking-wide hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                        >
                            Remove Key
                        </button>
                        <div className="flex gap-2">
                             <button 
                                onClick={() => setIsSettingsOpen(false)}
                                className="px-4 py-2 text-xs font-bold text-gray-600 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white uppercase tracking-wide transition-colors"
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={handleSaveApiKey}
                                className="px-6 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded font-bold text-xs uppercase tracking-wide shadow-lg shadow-cyan-500/20 transition-all"
                            >
                                Save Configuration
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        )}

        {/* --- CHAT MODAL --- */}
        {showChat && (
            <div className="absolute bottom-6 right-6 w-[400px] bg-white dark:bg-zinc-950/90 backdrop-blur-xl border border-gray-200 dark:border-zinc-800 rounded-xl shadow-2xl flex flex-col overflow-hidden z-50 h-[600px] animate-in slide-in-from-bottom-10 fade-in duration-300">
                <div className="p-4 bg-gray-50 dark:bg-zinc-900/50 border-b border-gray-200 dark:border-white/5 flex justify-between items-center">
                    <h3 className="text-xs font-black text-cyan-600 dark:text-cyan-500 uppercase tracking-widest flex items-center gap-2">
                        <BrainCircuit className="w-4 h-4"/> Gemini Assistant
                    </h3>
                    <button onClick={() => setShowChat(false)} className="text-gray-400 hover:text-gray-900 dark:text-zinc-600 dark:hover:text-white transition-colors">
                        <X className="w-4 h-4"/>
                    </button>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin" ref={chatScrollRef}>
                    {chatMessages.length === 0 && (
                        <div className="h-full flex flex-col items-center justify-center text-gray-400 dark:text-zinc-700 space-y-2 opacity-70">
                            <BrainCircuit className="w-10 h-10"/>
                            <p className="text-[10px] font-bold uppercase tracking-widest">System Online</p>
                        </div>
                    )}
                    {chatMessages.map((msg, idx) => (
                        <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[85%] p-3 rounded-lg text-xs font-medium leading-relaxed border shadow-sm ${
                                msg.role === 'user' 
                                ? 'bg-cyan-50 dark:bg-cyan-950/50 border-cyan-100 dark:border-cyan-900 text-cyan-900 dark:text-cyan-100' 
                                : 'bg-white dark:bg-zinc-900 border-gray-200 dark:border-zinc-800 text-gray-800 dark:text-zinc-300'
                            }`}>
                                {msg.text}
                            </div>
                        </div>
                    ))}
                    {isChatThinking && (
                        <div className="flex justify-start">
                            <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 p-3 rounded-lg flex gap-1 items-center shadow-sm">
                                <span className="w-1.5 h-1.5 bg-cyan-500 rounded-full animate-pulse"></span>
                                <span className="w-1.5 h-1.5 bg-cyan-500 rounded-full animate-pulse delay-75"></span>
                                <span className="w-1.5 h-1.5 bg-cyan-500 rounded-full animate-pulse delay-150"></span>
                            </div>
                        </div>
                    )}
                </div>
                <div className="p-4 border-t border-gray-200 dark:border-white/5 bg-gray-50 dark:bg-zinc-900/30">
                    <div className="flex gap-2">
                        <input 
                            className="flex-1 bg-white dark:bg-black/50 border border-gray-300 dark:border-zinc-800 rounded-md px-3 py-2 text-xs font-semibold text-gray-900 dark:text-white focus:outline-none focus:border-cyan-500 transition-colors placeholder:text-gray-400 dark:placeholder:text-zinc-700"
                            placeholder="Input command..."
                            value={chatInput}
                            onChange={(e) => setChatInput(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleChatSend()}
                        />
                        <button 
                            onClick={handleChatSend}
                            disabled={isChatThinking}
                            className="p-2 bg-cyan-50 dark:bg-cyan-900/20 border border-cyan-200 dark:border-cyan-500/30 rounded-md text-cyan-600 dark:text-cyan-400 hover:bg-cyan-100 dark:hover:bg-cyan-900/40 transition-all disabled:opacity-50"
                        >
                            <Send className="w-4 h-4"/>
                        </button>
                    </div>
                </div>
            </div>
        )}

      </main>

      {/* --- COLUMN 3: REFINEMENT CONSOLE (RIGHT) --- */}
      <aside className="w-full lg:w-[340px] flex-shrink-0 bg-white/80 dark:bg-black/60 backdrop-blur-xl border-l border-gray-200 dark:border-white/5 h-screen overflow-y-auto p-6 z-20 flex flex-col scrollbar-thin shadow-xl dark:shadow-[-10px_0_40px_-10px_rgba(0,0,0,0.8)] transition-colors duration-300">
        <div className="flex items-center gap-2 mb-8 pb-4 border-b border-gray-200 dark:border-white/5">
            <Sparkles className="w-5 h-5 text-emerald-500 dark:text-emerald-400" />
            <h2 className="text-xs font-black text-emerald-600 dark:text-emerald-500 uppercase tracking-[0.2em]">Refinement Core</h2>
        </div>

        <div className="flex-1 flex flex-col gap-8">
            <div className="p-1 bg-gradient-to-br from-emerald-100 to-transparent dark:from-emerald-900/50 rounded-lg border border-emerald-200 dark:border-emerald-900/50">
                <div className="bg-white/80 dark:bg-black/80 rounded p-4 h-full">
                    <div className="flex items-center justify-between mb-4">
                        <span className="text-[10px] font-bold font-mono text-emerald-600 dark:text-emerald-500 uppercase">Input Stream</span>
                        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                    </div>
                    
                    <textarea 
                        className="w-full bg-gray-50 dark:bg-zinc-900/50 border border-gray-300 dark:border-zinc-800 rounded p-3 text-xs font-medium text-gray-800 dark:text-zinc-300 focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 focus:outline-none min-h-[120px] resize-none mb-4 placeholder:text-gray-400 dark:placeholder:text-zinc-700 font-mono"
                        placeholder="> Enter modification parameters..."
                        value={refinementPrompt}
                        onChange={(e) => setRefinementPrompt(e.target.value)}
                    />
                    <button 
                        onClick={handleRefineThumbnail}
                        disabled={!result.base_thumbnail_url || isRefining}
                        className="w-full py-3 bg-emerald-50 dark:bg-emerald-900/20 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 border border-emerald-200 dark:border-emerald-500/30 text-emerald-700 dark:text-emerald-400 rounded-md text-xs font-black uppercase tracking-wider transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 group shadow-sm"
                    >
                        {isRefining ? <Loader2 className="w-3 h-3 animate-spin"/> : <Sparkles className="w-3 h-3 group-hover:scale-110 transition-transform"/>}
                        Execute Modification
                    </button>
                </div>
            </div>

            <div className="flex-1 flex flex-col">
                <h3 className="text-[10px] font-black text-gray-500 dark:text-zinc-600 uppercase tracking-widest mb-4 flex items-center gap-2">
                    <span className="w-4 h-px bg-gray-400 dark:bg-zinc-700"></span> History Log
                </h3>
                
                <div className="space-y-4">
                    {result.refined_thumbnail_url && (
                        <div className="group relative rounded-lg border border-emerald-500/20 overflow-hidden bg-gray-100 dark:bg-black shadow-md">
                            <div className="absolute top-2 left-2 z-10 bg-white/90 dark:bg-black/70 backdrop-blur px-2 py-1 border border-emerald-200 dark:border-emerald-900 rounded">
                                <span className="text-[9px] text-emerald-600 dark:text-emerald-500 font-mono uppercase font-bold">Latest Output</span>
                            </div>
                             <img 
                                src={result.refined_thumbnail_url} 
                                alt="Current" 
                                className="w-full h-auto object-cover opacity-90 dark:opacity-60 group-hover:opacity-100 transition-opacity duration-500"
                            />
                        </div>
                    )}

                    {result.last_refinement_prompt ? (
                        <div className="p-3 bg-gray-50 dark:bg-zinc-900/50 border border-gray-200 dark:border-zinc-800 rounded font-mono shadow-sm">
                            <p className="text-[9px] uppercase font-bold text-gray-500 dark:text-zinc-500 mb-1 border-b border-gray-200 dark:border-zinc-800 pb-1">Command Executed</p>
                            <p className="text-xs font-semibold text-emerald-600/90 dark:text-emerald-400/80">"{result.last_refinement_prompt}"</p>
                        </div>
                    ) : (
                         <div className="p-4 border-2 border-dashed border-gray-200 dark:border-zinc-800 rounded text-center">
                            <p className="text-[10px] font-bold text-gray-400 dark:text-zinc-700 uppercase">No modifications recorded</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
      </aside>
    </div>
  );
};

export default App;
