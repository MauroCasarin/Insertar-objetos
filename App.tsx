import React, { useState, useRef, useEffect, useCallback } from 'react';
import { loadLayer, processTransparencyData } from './services/imageLogic';
import { generateRealisticRender } from './services/aiService';
import { ControlPanel } from './components/ControlPanel';
import { ImageState, LayerType, TransformState } from './types';

function App() {
  // --- STATE ---
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const [images, setImages] = useState<ImageState>({
    background: null,
    foreground: null,
    processedForeground: null
  });

  const [transform, setTransform] = useState<TransformState>({
    x: 0,
    y: 0,
    scale: 0.8,
    rotation: 0,
    opacity: 1,
    removeWhite: false,
  });

  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // AI State
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);

  // --- LOGIC FUNCTIONS (Code Injection Structure) ---

  // START: applyTransparency
  const applyTransparency = (ctx: CanvasRenderingContext2D, opacity: number) => {
    ctx.globalAlpha = opacity;
  };
  // END: applyTransparency

  // START: updateCanvas
  const updateCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 1. Clear Canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 2. Draw Background
    if (images.background) {
      const bg = images.background;
      // Note: We are now filling the canvas with the background to ensure no empty spaces for AI
      ctx.drawImage(bg, 0, 0, canvas.width, canvas.height);
    } else {
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.font = '20px sans-serif';
      ctx.fillStyle = '#94a3b8';
      ctx.textAlign = 'center';
      ctx.fillText('Carga una imagen de "Lugar" para comenzar', canvas.width / 2, canvas.height / 2);
    }

    // 3. Draw Foreground (Object)
    const fgToDraw = images.processedForeground || images.foreground;

    if (fgToDraw) {
      ctx.save();
      
      const cx = canvas.width / 2 + transform.x;
      const cy = canvas.height / 2 + transform.y;

      ctx.translate(cx, cy);
      ctx.rotate((transform.rotation * Math.PI) / 180);
      ctx.scale(transform.scale, transform.scale);
      
      applyTransparency(ctx, transform.opacity);

      ctx.drawImage(fgToDraw, -fgToDraw.width / 2, -fgToDraw.height / 2);

      ctx.restore();
    }
  }, [images, transform]);
  // END: updateCanvas

  // START: handleTransform
  const handleMouseDown = (e: React.MouseEvent | React.TouchEvent) => {
    if (!images.foreground) return;
    
    setIsDragging(true);
    
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
    
    setDragStart({ x: clientX - transform.x, y: clientY - transform.y });
  };

  const handleMouseMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDragging) return;

    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;

    setTransform(prev => ({
      ...prev,
      x: clientX - dragStart.x,
      y: clientY - dragStart.y
    }));
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };
  // END: handleTransform

  // --- EFFECTS ---

  useEffect(() => {
    requestAnimationFrame(updateCanvas);
  }, [updateCanvas]);

  useEffect(() => {
    if (images.background && canvasRef.current) {
      const aspect = images.background.width / images.background.height;
      const maxWidth = 1000;
      const canvasWidth = Math.min(window.innerWidth - 40, maxWidth);
      const canvasHeight = canvasWidth / aspect;
      
      canvasRef.current.width = canvasWidth;
      canvasRef.current.height = canvasHeight;
      updateCanvas();
    }
  }, [images.background, updateCanvas]);

  useEffect(() => {
    const process = async () => {
      if (images.foreground) {
        const processed = await processTransparencyData(images.foreground, transform.removeWhite);
        setImages(prev => ({ ...prev, processedForeground: processed }));
      }
    };
    process();
  }, [images.foreground, transform.removeWhite]);

  // --- HANDLERS ---

  const handleLoadLayer = async (type: LayerType, file: File) => {
    try {
      const img = await loadLayer(type, file);
      setImages(prev => ({
        ...prev,
        [type]: img,
        processedForeground: type === 'foreground' ? null : prev.processedForeground
      }));
      
      if (type === 'foreground') {
        setTransform(prev => ({ ...prev, x: 0, y: 0, scale: 0.5, rotation: 0 }));
      }
    } catch (error) {
      console.error("Error loading image", error);
      alert("Error cargando la imagen. Asegúrate que es un formato válido.");
    }
  };

  const handleExport = () => {
    if (!canvasRef.current) return;
    const link = document.createElement('a');
    link.download = 'composicion-manual.png';
    link.href = canvasRef.current.toDataURL('image/png');
    link.click();
  };

  const handleAiRender = async () => {
    if (!canvasRef.current || !images.background || !images.foreground) {
      alert("Por favor, carga un fondo y un objeto antes de generar el render.");
      return;
    }

    try {
      setIsGenerating(true);
      // Capture the current canvas composition
      const compositionBase64 = canvasRef.current.toDataURL('image/png');
      
      // Call Gemini API
      const resultImage = await generateRealisticRender(compositionBase64);
      setGeneratedImage(resultImage);

    } catch (error) {
      console.error(error);
      alert("Hubo un error generando el render. Intenta de nuevo.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="flex flex-col lg:flex-row h-screen bg-slate-900 overflow-hidden font-sans">
      
      <ControlPanel 
        onLoadFile={handleLoadLayer}
        transform={transform}
        onTransformChange={setTransform}
        onExport={handleExport}
        onAiRender={handleAiRender}
        isGenerating={isGenerating}
      />

      <main className="flex-1 relative flex items-center justify-center bg-slate-900 p-4 overflow-hidden touch-none">
        <div className="relative shadow-2xl border-4 border-slate-700 rounded-lg overflow-hidden bg-slate-800">
           <canvas
            ref={canvasRef}
            width={800}
            height={600}
            className={`cursor-${isDragging ? 'grabbing' : 'grab'} max-w-full max-h-screen block`}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onTouchStart={handleMouseDown}
            onTouchMove={handleMouseMove}
            onTouchEnd={handleMouseUp}
           />
           
           {!images.background && (
             <div className="absolute inset-0 pointer-events-none flex items-center justify-center opacity-20">
               <svg className="w-24 h-24 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
             </div>
           )}
        </div>
      </main>

      {/* Generated Image Modal */}
      {generatedImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-slate-800 rounded-xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden border border-slate-700">
            <div className="p-4 border-b border-slate-700 flex justify-between items-center bg-slate-900">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <span className="text-purple-400">✨</span> Resultado IA
              </h2>
              <button 
                onClick={() => setGeneratedImage(null)}
                className="text-slate-400 hover:text-white transition-colors"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="flex-1 overflow-auto bg-black flex items-center justify-center p-4">
              <img 
                src={generatedImage} 
                alt="AI Generated Render" 
                className="max-w-full max-h-full rounded shadow-lg"
              />
            </div>
            
            <div className="p-4 bg-slate-900 border-t border-slate-700 flex justify-end gap-3">
              <button 
                onClick={() => setGeneratedImage(null)}
                className="px-4 py-2 text-slate-300 hover:text-white font-medium transition-colors"
              >
                Cerrar
              </button>
              <a 
                href={generatedImage}
                download="render-realista-ia.png"
                className="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-lg shadow-lg flex items-center gap-2 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Descargar Imagen
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;