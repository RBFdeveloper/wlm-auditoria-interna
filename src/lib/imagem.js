// src/lib/imagem.js
// Compressão de fotos no navegador antes do upload: fotos de câmera de celular
// (principalmente HEIC do iPhone) costumam vir gigantes e em formatos que o
// Storage não aceita. Redesenhar num canvas e exportar como JPEG resolve os dois
// problemas de uma vez — o navegador decodifica a imagem original ao desenhar.

const LADO_MAX = 1600;
const QUALIDADE = 0.8;
const LIMITE_BYTES = 5 * 1024 * 1024;

// Recebe um File/Blob de imagem e devolve um novo File .jpg, redimensionado e
// comprimido. Se algo falhar na decodificação/canvas, rejeita — quem chama deve
// cair de volta para o arquivo original.
export function comprimirImagem(file, { ladoMax = LADO_MAX, qualidade = QUALIDADE } = {}) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      try {
        const escala = Math.min(1, ladoMax / Math.max(img.width, img.height));
        const w = Math.round(img.width * escala) || img.width;
        const h = Math.round(img.height * escala) || img.height;
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, w, h);
        canvas.toBlob((blob) => {
          URL.revokeObjectURL(url);
          if (!blob) { reject(new Error("Não foi possível gerar a imagem comprimida.")); return; }
          const nome = (file.name || "foto").replace(/\.[^.]+$/, "") + ".jpg";
          resolve(new File([blob], nome, { type: "image/jpeg" }));
        }, "image/jpeg", qualidade);
      } catch (e) {
        URL.revokeObjectURL(url);
        reject(e);
      }
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Não foi possível ler a imagem selecionada.")); };
    img.src = url;
  });
}

// Usa a versão comprimida sempre que possível; se a compressão falhar, devolve o
// arquivo original para não travar o upload. Lança erro se, mesmo comprimido, o
// arquivo ainda estiver acima do limite de sanidade.
export async function prepararFotoParaUpload(file) {
  let out = file;
  try {
    out = await comprimirImagem(file);
  } catch (_) {
    out = file;
  }
  if (out.size > LIMITE_BYTES) throw new Error("Imagem muito grande, tente outra.");
  return out;
}
