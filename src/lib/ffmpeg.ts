import { FFmpeg } from '@ffmpeg/ffmpeg';

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

// แบ่งไฟล์ใหญ่เขียนทีละ chunk แทนการอ่านทั้งหมดเข้า memory
async function writeFileInChunks(
  ffmpeg: FFmpeg,
  fileName: string,
  file: File,
  onProgress?: (percent: number) => void
): Promise<void> {
  const CHUNK_SIZE = 64 * 1024 * 1024; // 64 MB ต่อ chunk
  
  // สร้างไฟล์เปล่าในระบบไฟล์ของ FFmpeg
  await ffmpeg.writeFile(fileName, new Uint8Array(0));
  
  let offset = 0;
  while (offset < file.size) {
    const chunk = file.slice(offset, offset + CHUNK_SIZE);
    const arrayBuffer = await chunk.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    
    // เขียน append ต่อท้ายไฟล์
    await ffmpeg.writeFile(fileName, uint8Array, { append: true });
    
    offset += CHUNK_SIZE;
    if (onProgress) {
      onProgress(Math.round((offset / file.size) * 100));
    }
  }
}

// ดึงข้อมูลภาษาของ subtitle tracks จาก ffmpeg log
async function getSubtitleLanguages(ffmpeg: FFmpeg, inputName: string): Promise<string[]> {
  const languages: string[] = [];
  const logs: string[] = [];
  
  ffmpeg.on('log', ({ message }) => {
    logs.push(message);
  });

  try {
    await ffmpeg.exec(['-i', inputName]);
  } catch (e) {
    // ไม่ต้องทำอะไร เราแค่ต้องการ log
  }

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
  ffmpeg: FFmpeg,
  onProgress?: (percent: number) => void
): Promise<{ name: string; data: Uint8Array; type: 'subtitle' | 'attachment' | 'other' }[]> {
  const inputName = 'input.mkv';
  
  // ใช้ chunked write แทน fetchFile
  await writeFileInChunks(ffmpeg, inputName, file, onProgress);

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
      
      if (uint8Data.length > 10) {
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

  // แยก attachments
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
