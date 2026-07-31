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

// ดึงข้อมูลภาษาของ subtitle tracks จาก ffmpeg log
async function getSubtitleLanguages(ffmpeg: FFmpeg, inputName: string): Promise<string[]> {
  const languages: string[] = [];
  const logs: string[] = [];
  
  const originalLogHandler = (ffmpeg as any)._logEventCallback;
  
  ffmpeg.on('log', ({ message }) => {
    logs.push(message);
  });

  try {
    // รัน ffmpeg เพื่อดึงข้อมูล streams (จะ fail แต่เราได้ log แล้ว)
    await ffmpeg.exec(['-i', inputName]);
  } catch (e) {
    // ไม่ต้องทำอะไร เราแค่ต้องการ log
  }

  // Parse log หาบรรทัดที่มี Stream #0:X(yyy): Subtitle:
  // เก็บภาษาตามลำดับที่เจอ
  for (const line of logs) {
    const match = line.match(/Stream #0:\d+\((\w{2,3})\):\s*Subtitle:/);
    if (match && match[1]) {
      languages.push(match[1]);
    }
  }

  return languages;
}

export async function extractSubtitlesAndAttachments(
  file: File,
  ffmpeg: FFmpeg
): Promise<{ name: string; data: Uint8Array; type: 'subtitle' | 'attachment' | 'other' }[]> {
  const inputName = 'input.mkv';
  await ffmpeg.writeFile(inputName, await fetchFile(file));

  // ดึงข้อมูลภาษาก่อน
  const subLanguages = await getSubtitleLanguages(ffmpeg, inputName);
  console.log('Detected subtitle languages:', subLanguages);

  const results: { name: string; data: Uint8Array; type: 'subtitle' | 'attachment' | 'other' }[] = [];

  // แยก subtitle tracks ทีละตัว
  let subIndex = 0;
  while (subIndex < 20) {
    const outputName = `subtitle_${subIndex}.srt`;
    try {
      await ffmpeg.exec([
        '-i', inputName,
        '-map', `0:s:${subIndex}`,
        '-c:s', 'copy',
        outputName
      ]);
      
      const data = await ffmpeg.readFile(outputName);
      let uint8Data: Uint8Array;
      
      if (data instanceof Uint8Array) {
        uint8Data = data;
      } else if (typeof data === 'string') {
        uint8Data = new TextEncoder().encode(data);
      } else {
        uint8Data = new Uint8Array(data as ArrayBuffer);
      }
      
      // ตรวจสอบว่ามีข้อมูลจริงๆ
      if (uint8Data.length > 10) {
        // ใช้ภาษาจาก metadata ถ้ามี ไม่มีก็ใช้ตัวเลข
        const lang = subLanguages[subIndex] || `${subIndex + 1}`;
        results.push({ 
          name: `[${lang}].srt`, 
          data: uint8Data, 
          type: 'subtitle' 
        });
      }
      
      await ffmpeg.deleteFile(outputName);
      subIndex++;
    } catch (e) {
      console.log('Stop subtitle extraction at index', subIndex);
      break;
    }
  }

  // แยก attachments (fonts, รูปภาพ, ฯลฯ)
  let attIndex = 0;
  while (attIndex < 20) {
    const outputName = `attachment_${attIndex}`;
    try {
      await ffmpeg.exec([
        '-i', inputName,
        '-map', `0:t:${attIndex}`,
        '-c', 'copy',
        outputName
      ]);
      
      const data = await ffmpeg.readFile(outputName);
      let uint8Data: Uint8Array;
      
      if (data instanceof Uint8Array) {
        uint8Data = data;
      } else if (typeof data === 'string') {
        uint8Data = new TextEncoder().encode(data);
      } else {
        uint8Data = new Uint8Array(data as ArrayBuffer);
      }
      
      if (uint8Data.length > 0) {
        results.push({ 
          name: `attachment_${attIndex + 1}`, 
          data: uint8Data, 
          type: 'attachment' 
        });
      }
      
      await ffmpeg.deleteFile(outputName);
      attIndex++;
    } catch (e) {
      console.log('Stop attachment extraction at index', attIndex);
      break;
    }
  }

  await ffmpeg.deleteFile(inputName);
  return results;
}
