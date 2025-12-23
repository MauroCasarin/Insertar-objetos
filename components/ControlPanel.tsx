import React from 'react';
import { LayerType, TransformState } from '../types';

interface ControlPanelProps {
  onLoadFile: (type: LayerType, file: File) => void;
  transform: TransformState;
  onTransformChange: (newTransform: TransformState) => void;
  onExport: () => void;
  onAiRender: () => void;
  isGenerating: boolean;
}

export const ControlPanel: React.FC<ControlPanelProps> = ({
  onLoadFile,
  transform,
  onTransformChange,
  onExport,
  onAiRender,
  isGenerating
}) => {
  
  const handleFileChange = (type: LayerType) => (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onLoadFile(type, e.target.files[0]);
    }
  };

  const updateTransform = (key: keyof TransformState, value: number | boolean) => {
    onTransformChange({ ...transform, [key]: value });
  };

  return (
    <div className="w-full lg:w-80 bg-slate-800 p-6 flex flex-col gap-6 shadow-xl z-10 h-auto lg:h-full overflow-y-auto border-r border-slate-700">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-8 h-8 rounded bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
          <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-white">LayerMaster</h1>
      </div>

      {/* File Inputs */}
      <div className="space-y-4">
        <div className="flex flex-col gap-2">
          <label className="text-sm font-semibold text-slate-300">1. Imagen de Fondo (Lugar)</label>
          <input
            type="file"
            accept="image/*"
            onChange={handleFileChange('background')}
            className="block w-full text-sm text-slate-300
              file:mr-4 file:py-2 file:px-4
              file:rounded-full file:border-0
              file:text-sm file:font-semibold
              file:bg-indigo-600 file:text-white
              hover:file:bg-indigo-700
              cursor-pointer bg-slate-700 rounded-lg p-2"
          />
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-sm font-semibold text-slate-300">2. Objeto (Capa Superior)</label>
          <input
            type="file"
            accept="image/*"
            onChange={handleFileChange('foreground')}
            className="block w-full text-sm text-slate-300
              file:mr-4 file:py-2 file:px-4
              file:rounded-full file:border-0
              file:text-sm file:font-semibold
              file:bg-pink-600 file:text-white
              hover:file:bg-pink-700
              cursor-pointer bg-slate-700 rounded-lg p-2"
          />
        </div>
      </div>

      <hr className="border-slate-600" />

      {/* Sliders */}
      <div className="space-y-6">
        <h3 className="text-lg font-medium text-white">Transformación</h3>
        
        <div className="space-y-2">
          <div className="flex justify-between">
            <label className="text-xs text-slate-400">Escala</label>
            <span className="text-xs text-slate-400">{transform.scale.toFixed(2)}x</span>
          </div>
          <input
            type="range"
            min="0.1"
            max="3"
            step="0.05"
            value={transform.scale}
            onChange={(e) => updateTransform('scale', parseFloat(e.target.value))}
            className="w-full h-2 bg-slate-600 rounded-lg appearance-none cursor-pointer accent-indigo-500"
          />
        </div>

        <div className="space-y-2">
          <div className="flex justify-between">
            <label className="text-xs text-slate-400">Rotación</label>
            <span className="text-xs text-slate-400">{transform.rotation}°</span>
          </div>
          <input
            type="range"
            min="0"
            max="360"
            value={transform.rotation}
            onChange={(e) => updateTransform('rotation', parseInt(e.target.value))}
            className="w-full h-2 bg-slate-600 rounded-lg appearance-none cursor-pointer accent-indigo-500"
          />
        </div>

        <div className="space-y-2">
          <div className="flex justify-between">
            <label className="text-xs text-slate-400">Opacidad</label>
            <span className="text-xs text-slate-400">{Math.round(transform.opacity * 100)}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={transform.opacity}
            onChange={(e) => updateTransform('opacity', parseFloat(e.target.value))}
            className="w-full h-2 bg-slate-600 rounded-lg appearance-none cursor-pointer accent-indigo-500"
          />
        </div>

        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            id="removeWhite"
            checked={transform.removeWhite}
            onChange={(e) => updateTransform('removeWhite', e.target.checked)}
            className="w-5 h-5 text-indigo-600 rounded focus:ring-indigo-600 ring-offset-gray-800 bg-gray-700 border-gray-600"
          />
          <label htmlFor="removeWhite" className="text-sm text-slate-300">
            Remover fondo blanco (auto)
          </label>
        </div>
      </div>

      <div className="mt-auto pt-6 space-y-3">
        {/* AI Magic Button */}
        <button
          onClick={onAiRender}
          disabled={isGenerating}
          className={`w-full py-3 px-4 text-white font-bold rounded-lg shadow-lg transition-all flex items-center justify-center gap-2 relative overflow-hidden group
            ${isGenerating ? 'bg-slate-600 cursor-not-allowed' : 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700'}`}
        >
          {isGenerating ? (
            <>
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Generando...
            </>
          ) : (
            <>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              Render Realista (IA)
            </>
          )}
        </button>

        <button
          onClick={onExport}
          className="w-full py-2 px-4 bg-slate-700 hover:bg-slate-600 text-slate-200 font-medium rounded-lg transition-colors flex items-center justify-center gap-2 text-sm"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          Descargar Composición
        </button>
      </div>
    </div>
  );
};