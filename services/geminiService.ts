import { GoogleGenAI, Modality } from "@google/genai";
import { IllustrationStyle, StoryPage } from "../types";
import { decodeBase64, decodeAudioData } from "./audioUtils";

// Initialize Gemini Client
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const SYSTEM_INSTRUCTION = `
Kamu adalah ilustrator profesional dan penulis buku anak.

=== PENTING ===
SETIAP output WAJIB mengandung:
1. DESKRIPSI ILUSTRASI PANJANG DAN DETAIL (Wajib minimal 6–10 kalimat per halaman)
2. TEKS CERITA (3–5 kalimat)
3. TEKS SUARA (1–2 kalimat)

Jika tidak, ulangi format sampai lengkap.

=== TRIGGER VISUAL (WAJIB DIPATUHI) ===
Gunakan VISUALISASI GAMBAR yang sangat detail:
- gaya ilustrasi
- warna dominan
- pose karakter
- ekspresi wajah
- pakaian
- latar belakang
- lighting
- atmosfer
- aksi adegan

Kamu TIDAK BOLEH mengabaikan bagian ini.

=== STYLE ===
Jika pengguna menyebut gaya, gunakan gaya itu.
Jika tidak, gunakan default: Watercolor Storybook.

Style valid:
1. Watercolor Storybook (default)
2. Disney Storybook 2D
3. Studio Ghibli Style
4. Soft Pastel Cartoon

=== FORMAT OUTPUT WAJIB ===

========================================
HALAMAN {N}
========================================

[DESKRIPSI ILUSTRASI]
Tuliskan DESKRIPSI VISUAL sangat lengkap dan detail sesuai gaya yang dipilih.

[TEKS CERITA]
Tuliskan cerita 3–5 kalimat.

[TEKS SUARA]
Tuliskan narasi 1–2 kalimat.

========================================

=== ATURAN TAMBAHAN ===
- Semua halaman harus lengkap.
- Total halaman: 6–12.
- Jangan pernah menghasilkan teks saja.
- Jangan pernah mengabaikan deskripsi ilustrasi visual.
`;

export const generateStoryText = async (topic: string, style: IllustrationStyle): Promise<StoryPage[]> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Buatkan storybook berdasarkan: ${topic}. Gaya ilustrasi: ${style}.`,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        temperature: 0.7,
      }
    });

    const text = response.text;
    if (!text) throw new Error("No text generated");

    return parseStoryResponse(text);
  } catch (error) {
    console.error("Error generating story text:", error);
    throw error;
  }
};

const parseStoryResponse = (text: string): StoryPage[] => {
  const pages: StoryPage[] = [];
  // Regex to split by page separator
  const rawPages = text.split(/={10,}\s*HALAMAN\s*\d+\s*={10,}/i).slice(1);

  rawPages.forEach((rawPage, index) => {
    const descMatch = rawPage.match(/\[DESKRIPSI ILUSTRASI\]([\s\S]*?)\[TEKS CERITA\]/i);
    const storyMatch = rawPage.match(/\[TEKS CERITA\]([\s\S]*?)\[TEKS SUARA\]/i);
    const voiceMatch = rawPage.match(/\[TEKS SUARA\]([\s\S]*?)(?:={10,}|$)/i);

    if (descMatch && storyMatch && voiceMatch) {
      pages.push({
        pageNumber: index + 1,
        illustrationDescription: descMatch[1].trim(),
        storyText: storyMatch[1].trim(),
        voiceText: voiceMatch[1].trim(),
        isLoadingAssets: true,
      });
    }
  });

  return pages;
};

export const generateIllustration = async (prompt: string, style: IllustrationStyle): Promise<string> => {
  try {
    const finalPrompt = `${style} style. ${prompt}`;
    
    // Using gemini-2.5-flash-image for speed and efficiency
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [{ text: finalPrompt }],
      },
      config: {
         // Using 1:1 aspect ratio, no specific mime type needed for flash-image
      }
    });

    // Iterate parts to find the image
    const parts = response.candidates?.[0]?.content?.parts;
    if (parts) {
      for (const part of parts) {
        if (part.inlineData && part.inlineData.data) {
          return `data:image/png;base64,${part.inlineData.data}`;
        }
      }
    }

    throw new Error("No image data found in response");
  } catch (error) {
    console.error("Error generating illustration:", error);
    // Return a placeholder if generation fails to keep app running
    return `https://picsum.photos/1024/1024?random=${Math.random()}`;
  }
};

export const generateNarration = async (text: string): Promise<AudioBuffer | undefined> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-preview-tts',
      contents: [{ parts: [{ text: text }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Kore' }, // Kore is usually good for storytelling
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    
    if (base64Audio) {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({sampleRate: 24000});
      const audioBytes = decodeBase64(base64Audio);
      return await decodeAudioData(audioBytes, audioContext, 24000, 1);
    }
    return undefined;
  } catch (error) {
    console.error("Error generating narration:", error);
    return undefined;
  }
};