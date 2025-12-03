// Utility to decode base64 string
export function decodeBase64(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

// Utility to decode audio data for the browser
export async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number = 24000,
  numChannels: number = 1
): Promise<AudioBuffer> {
  // Determine if we need to manually process PCM or if it's a format verifyable by decodeAudioData
  // The TTS model often returns raw PCM. 
  // If it is raw PCM (no header), we construct the buffer manually.
  
  try {
     // Attempt standard decode first (in case headers are present)
     // Note: copy buffer because decodeAudioData detaches it
     const bufferCopy = data.buffer.slice(0);
     return await ctx.decodeAudioData(bufferCopy);
  } catch (e) {
    // Fallback: Assume Raw PCM 16-bit little-endian if standard decode fails
    const dataInt16 = new Int16Array(data.buffer);
    const frameCount = dataInt16.length / numChannels;
    const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

    for (let channel = 0; channel < numChannels; channel++) {
      const channelData = buffer.getChannelData(channel);
      for (let i = 0; i < frameCount; i++) {
        // Convert 16-bit integer to float [-1.0, 1.0]
        channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
      }
    }
    return buffer;
  }
}