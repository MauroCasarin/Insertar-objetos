import { LayerType } from "../types";

// START: loadLayer
/**
 * Gestiona la carga de la imagen desde un archivo local.
 * Retorna una promesa que resuelve con un elemento HTMLImageElement.
 */
export const loadLayer = (type: LayerType, file: File): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = (err) => reject(err);
      if (event.target?.result) {
        img.src = event.target.result as string;
      }
    };
    
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
};
// END: loadLayer

// START: applyTransparency
/**
 * Procesa la imagen del objeto.
 * Si 'removeWhite' es true, crea un canvas temporal, extrae los píxeles,
 * convierte los píxeles blancos (o cercanos al blanco) en transparentes,
 * y retorna una nueva imagen.
 */
export const processTransparencyData = (
  img: HTMLImageElement, 
  removeWhite: boolean
): Promise<HTMLImageElement> => {
  if (!removeWhite) {
    return Promise.resolve(img);
  }

  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext('2d');
    
    if (!ctx) {
      resolve(img);
      return;
    }

    // Dibujar imagen original
    ctx.drawImage(img, 0, 0);
    
    // Obtener data de píxeles
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    
    // Umbral para considerar algo como "blanco"
    const threshold = 240;

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      
      // Si es suficientemente blanco, hacer alpha = 0
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
// END: applyTransparency