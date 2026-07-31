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
  while (subIndex < 20) { // จำกัด safety loop
    const outputName = `subtitle_${subIndex}.ass`;
    try {
      // ffmpeg.exec จะ resolve เมื่อสำเร็จ หรือ throw เมื่อล้มเหลว
      await ffmpeg.exec([
        '-i', inputName,
        '-map', `0:s:${subIndex}`,
        '-c', 'copy',
        outputName
      ]);
      
      // ถ้าถึงบรรทัดนี้ = สำเร็จ
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
        // ตรวจสอบ format จากเนื้อหา
        const preview = new TextDecoder('utf-8', { fatal: false }).decode(uint8Data.slice(0, 200));
        let ext = 'ass';
        if (preview.includes('[Script Info]') || preview.includes('Dialogue:')) {
          ext = 'ass';
        } else if (preview.match(/^\d+\s*\r?\n\d{2}:\d{2}:\d{2}/)) {
          ext = 'srt';
        } else if (preview.includes('WEBVTT')) {
          ext = 'vtt';
        }
        
        results.push({ 
          name: `subtitle_${subIndex + 1}.${ext}`, 
          data: uint8Data, 
          type: 'subtitle' 
        });
      }
      
      await ffmpeg.deleteFile(outputName);
      subIndex++;
    } catch (e) {
      // ไม่มี track นี้ หรือ extract ไม่ได้ = หยุด loop
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
