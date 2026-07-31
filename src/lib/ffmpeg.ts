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

export async function extractStreams(
  file: File,
  ffmpeg: FFmpeg
): Promise<{ name: string; data: Uint8Array }[]> {
  const inputName = 'input.mkv';
  const outputDir = 'extracted';
  
  // เขียนไฟล์เข้าไปในระบบไฟล์เสมือนของ FFmpeg
  await ffmpeg.writeFile(inputName, await fetchFile(file));
  
  // ใช้คำสั่ง ffmpeg แยก streams ทั้งหมด
  await ffmpeg.createDir(outputDir);
  await ffmpeg.exec([
    '-i', inputName,
    '-map', '0',
    '-c', 'copy',
    '-f', 'segment',
    '-segment_format', 'rawvideo',
    `${outputDir}/stream_%d`
  ]);

  // อ่านรายชื่อไฟล์ที่แยกได้
  const files = await ffmpeg.listDir(outputDir);
  const results: { name: string; data: Uint8Array }[] = [];

  for (const f of files) {
    if (f.name === '.' || f.name === '..') continue;
    const data = await ffmpeg.readFile(`${outputDir}/${f.name}`) as Uint8Array;
    results.push({ name: f.name, data });
  }

  // ล้างไฟล์ชั่วคราว
  await ffmpeg.deleteDir(outputDir);
  await ffmpeg.deleteFile(inputName);

  return results;
}

export async function extractSubtitlesAndAttachments(
  file: File,
  ffmpeg: FFmpeg
): Promise<{ name: string; data: Uint8Array; type: 'subtitle' | 'attachment' | 'other' }[]> {
  const inputName = 'input.mkv';
  await ffmpeg.writeFile(inputName, await fetchFile(file));

  // ดึงข้อมูล streams ก่อน
  const probeResult = await ffmpeg.exec([
    '-i', inputName,
    '-hide_banner'
  ]).catch(() => {}); // ffmpeg จะ return error code เมื่อ probe แต่เราต้องการแค่ log

  // แยก subtitle tracks (srt, ass, ssa, vtt)
  await ffmpeg.exec([
    '-i', inputName,
    '-map', '0:s',
    '-c', 'copy',
    'subtitle_%d.ass'
  ]).catch(() => {});

  // แยก attachments (fonts, รูปภาพ, ฯลฯ)
  await ffmpeg.exec([
    '-i', inputName,
    '-map', '0:t',
    '-c', 'copy',
    'attachment_%d'
  ]).catch(() => {});

  // เก็บผลลัพธ์
  const results: { name: string; data: Uint8Array; type: 'subtitle' | 'attachment' | 'other' }[] = [];
  const dir = await ffmpeg.listDir('.');

  for (const f of dir) {
    if (f.name.startsWith('subtitle_')) {
      const data = await ffmpeg.readFile(f.name) as Uint8Array;
      results.push({ name: f.name.replace(/\.ass$/, '.ass'), data, type: 'subtitle' });
      await ffmpeg.deleteFile(f.name);
    } else if (f.name.startsWith('attachment_')) {
      const data = await ffmpeg.readFile(f.name) as Uint8Array;
      results.push({ name: f.name, data, type: 'attachment' });
      await ffmpeg.deleteFile(f.name);
    }
  }

  await ffmpeg.deleteFile(inputName);
  return results;
}
