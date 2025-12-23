import { GoogleGenAI } from "https://esm.sh/@google/genai@0.1.1";

/**
 * ==========================================
 * 1. GLOBAL ERROR HANDLING & SETUP
 * ==========================================
 */
window.onerror = function(msg, source, lineno, colno, error) {
    console.error("Global Error Caught:", msg, error);
    // Alert user if script fails to load generally (e.g. file:// protocol issue)
    if (msg.toString().includes("import") || msg.toString().includes("module")) {
        alert("Error de carga: Si estás ejecutando esto localmente, asegúrate de usar un Servidor Local (Live Server) y no abrir el archivo directamente.");
    }
    return false;
};

/**
 * ==========================================
 * 2. APP STATE
 * ==========================================
 */
const state = {
    // API Key handled by process.env.API_KEY
    images: {
        bg: null,
        fg: null,
        processedFg: null
    },
    transform: {
        x: 0,
        y: 0,
        scale: 0.5,
        rotation: 0,
        opacity: 1,
        removeWhite: false
    },
    ui: {
        isDragging: false,
        dragStart: { x: 0, y: 0 },
        isGenerating: false
    }
};

/**
 * ==========================================
 * 3. DOM ELEMENTS
 * ==========================================
 */
// We initialize this empty and fill it on DOMContentLoaded to be safe
let elements = {};

/**
 * ==========================================
 * 4. HELPER FUNCTIONS (IMAGE LOGIC)
 * ==========================================
 */
const loadLayer = (file) => {
    return new Promise((resolve, reject) => {
        console.log("Loading file:", file.name);
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                console.log("Image loaded successfully:", img.width, "x", img.height);
                resolve(img);
            };
            img.onerror = (err) => {
                console.error("Image load error:", err);
                reject(err);
            };
            img.src = e.target.result;
        };
        reader.onerror = (err) => {
            console.error("FileReader error:", err);
            reject(err);
        };
        reader.readAsDataURL(file);
    });
};

const processTransparency = (img, removeWhite) => {
    if (!removeWhite) return Promise.resolve(img);

    return new Promise((resolve) => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
        
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        const threshold = 240; 

        for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            if (r > threshold && g > threshold && b > threshold) {
                data[i + 3] = 0;
            }
        }
        ctx.putImageData(imageData, 0, 0);
        
        const newImg = new Image();
        newImg.onload = () => resolve(newImg);
        newImg.src = canvas.toDataURL();
    });
};

/**
 * ==========================================
 * 5. CANVAS RENDERING ENGINE
 * ==========================================
 */
function renderCanvas() {
    if (!elements.canvas) return;
    const ctx = elements.canvas.getContext('2d');
    const { width, height } = elements.canvas;
    
    // 1. Clear
    ctx.clearRect(0, 0, width, height);

    // 2. Background Layer
    if (state.images.bg) {
        ctx.drawImage(state.images.bg, 0, 0, width, height);
    } else {
        // Draw Placeholder
        const grad = ctx.createLinearGradient(0, 0, 0, height);
        grad.addColorStop(0, '#0f172a'); 
        grad.addColorStop(1, '#1e293b'); 
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, width, height);

        // Grid
        ctx.strokeStyle = 'rgba(255,255,255,0.03)';
        ctx.lineWidth = 1;
        const gridSize = 40;
        for(let x = 0; x < width; x+=gridSize) { ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,height); ctx.stroke(); }
        for(let y = 0; y < height; y+=gridSize) { ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(width,y); ctx.stroke(); }

        // Instructions
        ctx.font = 'bold 24px sans-serif';
        ctx.fillStyle = '#64748b';
        ctx.textAlign = 'center';
        ctx.fillText('1. Carga una imagen de Fondo', width/2, height/2 - 25);
        ctx.font = '18px sans-serif';
        ctx.fillStyle = '#475569';
        ctx.fillText('2. Superpone un Objeto', width/2, height/2 + 20);
    }

    // 3. Foreground Layer
    const fg = state.images.processedFg || state.images.fg;
    if (fg) {
        ctx.save();
        
        const cx = (width / 2) + state.transform.x;
        const cy = (height / 2) + state.transform.y;
        
        ctx.translate(cx, cy);
        ctx.rotate((state.transform.rotation * Math.PI) / 180);
        ctx.scale(state.transform.scale, state.transform.scale);
        ctx.globalAlpha = state.transform.opacity;

        ctx.drawImage(fg, -fg.width/2, -fg.height/2);

        // Selection Box
        if (!state.ui.isGenerating) {
            ctx.strokeStyle = '#818cf8'; 
            ctx.lineWidth = 2 / state.transform.scale;
            ctx.setLineDash([8, 4]);
            ctx.strokeRect(-fg.width/2, -fg.height/2, fg.width, fg.height);
            
            ctx.fillStyle = '#818cf8';
            const size = 10 / state.transform.scale;
            ctx.fillRect(-fg.width/2 - size/2, -fg.height/2 - size/2, size, size); // TL
            ctx.fillRect(fg.width/2 - size/2, fg.height/2 - size/2, size, size); // TR
            ctx.fillRect(fg.width/2 - size/2, -fg.height/2 - size/2, size, size); // BR
            ctx.fillRect(-fg.width/2 - size/2, fg.height/2 - size/2, size, size); // BL
        }

        ctx.restore();
    }
}

/**
 * ==========================================
 * 6. AI SERVICE
 * ==========================================
 */
async function generateRender() {
    setGenerating(true);
    
    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const base64 = elements.canvas.toDataURL('image/png').split(',')[1];
        
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: {
                parts: [
                    { inlineData: { mimeType: 'image/png', data: base64 } },
                    { text: `
                        ACT AS: Expert CGI Compositor.
                        TASK: Create a photorealistic photo from this composite.
                        1. Fix Perspective: Warp the foreground object to match the background vanishing point.
                        2. Fix Lighting: Relight object to match background source. Cast realistic shadows on the ground.
                        3. Blend: Match white balance and grain.
                        Output only the final image.
                    `}
                ]
            }
        });

        const resultPart = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
        if (resultPart) {
            const resultUrl = `data:image/png;base64,${resultPart.inlineData.data}`;
            elements.imgResult.src = resultUrl;
            elements.linkDownloadAi.href = resultUrl;
            elements.modalResult.classList.remove('hidden');
            elements.modalResult.classList.add('flex');
        } else {
            throw new Error("No image in response");
        }

    } catch (e) {
        console.error(e);
        alert("Error AI: " + (e.message || "Unknown error"));
    } finally {
        setGenerating(false);
    }
}

/**
 * ==========================================
 * 7. EVENT LISTENERS
 * ==========================================
 */

window.addEventListener('DOMContentLoaded', () => {
    console.log("DOM Ready, initializing...");
    
    // 1. Cache Elements safely
    elements = {
        fileBg: document.getElementById('file-bg'),
        fileFg: document.getElementById('file-fg'),
        controlsContainer: document.getElementById('controls-container'),
        inputScale: document.getElementById('input-scale'),
        valScale: document.getElementById('val-scale'),
        inputRotation: document.getElementById('input-rotation'),
        valRotation: document.getElementById('val-rotation'),
        inputOpacity: document.getElementById('input-opacity'),
        valOpacity: document.getElementById('val-opacity'),
        inputRemoveWhite: document.getElementById('input-remove-white'),
        canvas: document.getElementById('main-canvas'),
        btnGenerate: document.getElementById('btn-generate'),
        btnTextIdle: document.getElementById('btn-text-idle'),
        btnTextLoading: document.getElementById('btn-text-loading'),
        btnExport: document.getElementById('btn-export'),
        modalResult: document.getElementById('modal-result'),
        imgResult: document.getElementById('img-result'),
        btnCloseModal: document.getElementById('btn-close-modal'),
        btnCloseModal2: document.getElementById('btn-close-modal-2'),
        linkDownloadAi: document.getElementById('link-download-ai')
    };

    // 2. Setup Initial Canvas
    if (elements.canvas) {
        elements.canvas.width = 800;
        elements.canvas.height = 600;
        renderCanvas();
    } else {
        console.error("Canvas element not found!");
    }
    
    updateButtonState();

    // 3. Attach Listeners
    
    // Background
    if(elements.fileBg) {
        elements.fileBg.addEventListener('change', async (e) => {
            if(e.target.files[0]) {
                try {
                    state.images.bg = await loadLayer(e.target.files[0]);
                    
                    // Resize logic
                    const aspect = state.images.bg.width / state.images.bg.height;
                    const maxW = window.innerWidth < 1024 ? window.innerWidth - 40 : 1000;
                    const maxH = window.innerHeight * 0.85;
                    let newW = maxW;
                    let newH = newW / aspect;
                    if(newH > maxH) { newH = maxH; newW = newH * aspect; }
                    
                    elements.canvas.width = newW;
                    elements.canvas.height = newH;
                    renderCanvas();
                    updateButtonState();
                } catch (err) {
                    alert("Error cargando fondo: " + err);
                }
            }
        });
    }

    // Foreground
    if(elements.fileFg) {
        elements.fileFg.addEventListener('change', async (e) => {
            if(e.target.files[0]) {
                try {
                    state.images.fg = await loadLayer(e.target.files[0]);
                    
                    // Reset
                    state.transform.x = 0;
                    state.transform.y = 0;
                    state.transform.scale = 0.5;
                    state.transform.rotation = 0;
                    
                    // UI Update
                    elements.inputScale.value = 0.5; elements.valScale.innerText = "0.50x";
                    elements.inputRotation.value = 0; elements.valRotation.innerText = "0°";
                    elements.inputOpacity.value = 1; elements.valOpacity.innerText = "100%";
                    elements.inputRemoveWhite.checked = false;
                    state.transform.removeWhite = false;
                    
                    elements.controlsContainer.classList.remove('opacity-50', 'pointer-events-none');
                    
                    state.images.processedFg = await processTransparency(state.images.fg, false);
                    renderCanvas();
                    updateButtonState();
                } catch (err) {
                    alert("Error cargando objeto: " + err);
                }
            }
        });
    }

    // Controls
    const updateTransformUI = (key, value) => {
        state.transform[key] = value;
        renderCanvas();
    };

    if(elements.inputScale) elements.inputScale.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value);
        elements.valScale.innerText = val.toFixed(2) + 'x';
        updateTransformUI('scale', val);
    });

    if(elements.inputRotation) elements.inputRotation.addEventListener('input', (e) => {
        const val = parseInt(e.target.value);
        elements.valRotation.innerText = val + '°';
        updateTransformUI('rotation', val);
    });

    if(elements.inputOpacity) elements.inputOpacity.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value);
        elements.valOpacity.innerText = Math.round(val * 100) + '%';
        updateTransformUI('opacity', val);
    });

    if(elements.inputRemoveWhite) elements.inputRemoveWhite.addEventListener('change', async (e) => {
        const checked = e.target.checked;
        state.transform.removeWhite = checked;
        if(state.images.fg) {
            state.images.processedFg = await processTransparency(state.images.fg, checked);
            renderCanvas();
        }
    });

    // Dragging
    const handleStart = (e) => {
        if(!state.images.fg) return;
        state.ui.isDragging = true;
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        state.ui.dragStart = {
            x: clientX - state.transform.x,
            y: clientY - state.transform.y
        };
        elements.canvas.classList.add('cursor-grabbing');
        elements.canvas.classList.remove('cursor-grab');
    };

    const handleMove = (e) => {
        if(!state.ui.isDragging) return;
        if(e.touches) e.preventDefault();
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        state.transform.x = clientX - state.ui.dragStart.x;
        state.transform.y = clientY - state.ui.dragStart.y;
        renderCanvas();
    };

    const handleEnd = () => {
        state.ui.isDragging = false;
        elements.canvas.classList.remove('cursor-grabbing');
        elements.canvas.classList.add('cursor-grab');
    };

    if(elements.canvas) {
        elements.canvas.addEventListener('mousedown', handleStart);
        elements.canvas.addEventListener('touchstart', handleStart);
    }
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('touchmove', handleMove, { passive: false });
    window.addEventListener('mouseup', handleEnd);
    window.addEventListener('touchend', handleEnd);

    // Buttons
    if(elements.btnGenerate) elements.btnGenerate.addEventListener('click', generateRender);
    if(elements.btnExport) elements.btnExport.addEventListener('click', () => {
        if(!state.images.bg) return;
        const link = document.createElement('a');
        link.download = 'composicion-manual.png';
        link.href = elements.canvas.toDataURL('image/png');
        link.click();
    });

    // Modal
    const closeModal = () => {
        elements.modalResult.classList.add('hidden');
        elements.modalResult.classList.remove('flex');
        elements.imgResult.src = "";
    };
    if(elements.btnCloseModal) elements.btnCloseModal.addEventListener('click', closeModal);
    if(elements.btnCloseModal2) elements.btnCloseModal2.addEventListener('click', closeModal);
});

// Helpers
function setGenerating(isGen) {
    state.ui.isGenerating = isGen;
    if(isGen) {
        elements.btnGenerate.disabled = true;
        elements.btnTextIdle.classList.add('hidden');
        elements.btnTextLoading.classList.remove('hidden');
    } else {
        updateButtonState();
        elements.btnTextIdle.classList.remove('hidden');
        elements.btnTextLoading.classList.add('hidden');
    }
}

function updateButtonState() {
    const isValid = state.images.bg && state.images.fg;
    if (isValid && !state.ui.isGenerating) {
        elements.btnGenerate.disabled = false;
        elements.btnGenerate.classList.remove('bg-slate-700', 'cursor-not-allowed', 'opacity-50', 'grayscale');
        elements.btnGenerate.classList.add('bg-gradient-to-r', 'from-purple-600', 'to-indigo-600', 'hover:from-purple-500', 'hover:to-indigo-500', 'hover:shadow-indigo-500/25');
    } else if (!state.ui.isGenerating) {
        if(elements.btnGenerate) {
            elements.btnGenerate.disabled = true;
            elements.btnGenerate.classList.add('bg-slate-700', 'cursor-not-allowed', 'opacity-50', 'grayscale');
            elements.btnGenerate.classList.remove('bg-gradient-to-r', 'from-purple-600', 'to-indigo-600', 'hover:from-purple-500', 'hover:to-indigo-500', 'hover:shadow-indigo-500/25');
        }
    }
}