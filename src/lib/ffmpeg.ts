import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile } from '@ffmpeg/util';

let ffmpeg: FFmpeg | null = null;

export async function loadFFmpeg(onProgress?: (progress: number) => void): Promise<FFmpeg> {
  if (ffmpeg) return ffmpeg;

  ffmpeg = new FFmpeg();
  
  ffmpeg.on('log', ({ message }) => {
    console.log('FFmpeg:', message);
  });

  await ffmpeg.load();
  
  if (onProgress) onProgress(100);
  return ffmpeg;
}

export async function extractSubtitlesAndAttachments(
  file: File,
  ffmpeg: FFmpeg
): Promise<{ name: string; data: Uint8Array; type: 'subtitle' | 'attachment' | 'other' }[]> {
  const inputName = 'input.mkv';
  await ffmpeg.writeFile(inputName, await fetchFile(file));

  const results: { name: string; data: Uint8Array; type: 'subtitle' | 'attachment' | 'other' }[] = [];

  // แยก subtitle tracks ทีละตัว
  let subIndex = 0;
  while (true) {
    const outputName = `subtitle_${subIndex}.ass`;
    try {
      const exitCode = await ffmpeg.exec([
        '-i', inputName,
        '-map', `0:s:${subIndex}`,
        '-c', 'copy',
        outputName
      ]);
      
      if (exitCode !== 0) break;
      
      const data = await ffmpeg.readFile(outputName);
      const uint8Data = data instanceof Uint8Array ? data : new TextEncoder().encode(data);
      
      if (uint8Data.length > 0) {
        results.push({ name: outputName, data: uint8Data, type: 'subtitle' });
      }
      await ffmpeg.deleteFile(outputName);
      subIndex++;
    } catch (e) {
      break;
    }
  }

  // แยก attachments (fonts, รูปภาพ, ฯลฯ)
  let attIndex = 0;
  while (true) {
    const outputName = `attachment_${attIndex}`;
    try {
      const exitCode = await ffmpeg.exec([
        '-i', inputName,
        '-map', `0:t:${attIndex}`,
        '-c', 'copy',
        outputName
      ]);
      
      if (exitCode !== 0) break;
      
      const data = await ffmpeg.readFile(outputName);
      const uint8Data = data instanceof Uint8Array ? data : new TextEncoder().encode(data);
      
      if (uint8Data.length > 0) {
        results.push({ name: outputName, data: uint8Data, type: 'attachment' });
      }
      await ffmpeg.deleteFile(outputName);
      attIndex++;
    } catch (e) {
      break;
    }
  }

  await ffmpeg.deleteFile(inputName);
  return results;
}
