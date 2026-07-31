<script lang="ts">
  import { onMount } from 'svelte';
  import { loadFFmpeg, extractSubtitlesAndAttachments } from '$lib/ffmpeg';
  import { createZip, downloadFile } from '$lib/extractor';
  import type { FFmpeg } from '@ffmpeg/ffmpeg';

  let ffmpeg: FFmpeg | null = null;
  let isLoading = false;
  let isProcessing = false;
  let progress = 0;
  let status = 'กำลังโหลด FFmpeg...';
  let dragOver = false;

  onMount(async () => {
    try {
      ffmpeg = await loadFFmpeg((p) => {
        progress = p;
      });
      status = 'พร้อมใช้งาน! ลากไฟล์ MKV มาวางที่นี่';
    } catch (err) {
      status = 'เกิดข้อผิดพลาดในการโหลด FFmpeg: ' + (err as Error).message;
    }
  });

  async function handleFile(file: File) {
    if (!ffmpeg) {
      alert('กรุณารอให้ FFmpeg โหลดเสร็จก่อน');
      return;
    }

    if (!file.name.toLowerCase().endsWith('.mkv') && !file.name.toLowerCase().endsWith('.webm')) {
      alert('รองรับเฉพาะไฟล์ .mkv และ .webm เท่านั้น');
      return;
    }

    isProcessing = true;
    status = `กำลังแยกไฟล์จาก ${file.name}...`;
    progress = 0;

    try {
      const results = await extractSubtitlesAndAttachments(file, ffmpeg);
      
      if (results.length === 0) {
        status = 'ไม่พบ subtitle หรือ attachment ในไฟล์นี้';
        isProcessing = false;
        return;
      }

      const baseName = file.name.replace(/\.(mkv|webm)$/i, '');

      // นับจำนวน track แต่ละภาษา
      const langCounts: Record<string, number> = {};
      for (const r of results) {
        if (r.type === 'subtitle') {
          const ext = r.name.split('.').pop() || 'srt';
          const lang = r.name.replace(`.${ext}`, '').replace(/^\[/, '').replace(/\]$/, '');
          langCounts[lang] = (langCounts[lang] || 0) + 1;
        }
      }

      const langSeen: Record<string, number> = {};
      const renamedResults = results.map((r, i) => {
        let ext = r.name.split('.').pop() || 'bin';
        let newName: string;
        
        if (r.type === 'subtitle') {
          const langName = r.name.replace(`.${ext}`, '');
          const langCode = langName.replace(/^\[/, '').replace(/\]$/, '');
          
          langSeen[langCode] = (langSeen[langCode] || 0) + 1;
          
          if (langCounts[langCode] > 1) {
            newName = `${baseName}${langName}_track${i + 1}.${ext}`;
          } else {
            newName = `${baseName}${langName}.${ext}`;
          }
        } else {
          newName = `${baseName}_attachment_${i + 1}.${ext}`;
        }
        
        return { ...r, name: newName };
      });

      status = `พบ ${renamedResults.length} ไฟล์ กำลังบีบอัดเป็น ZIP...`;
      const zipBlob = await createZip(renamedResults);
      downloadFile(zipBlob, `${baseName}_extracted.zip`);
      
      status = `เสร็จสิ้น! ดาวน์โหลด ${baseName}_extracted.zip แล้ว`;
    } catch (err) {
      status = 'เกิดข้อผิดพลาด: ' + (err as Error).message;
      console.error(err);
    } finally {
      isProcessing = false;
    }
  }

  function handleDrop(e: DragEvent) {
    e.preventDefault();
    dragOver = false;
    const files = e.dataTransfer?.files;
    if (files && files.length > 0) {
      handleFile(files[0]);
    }
  }

  function handleDragOver(e: DragEvent) {
    e.preventDefault();
    dragOver = true;
  }

  function handleDragLeave() {
    dragOver = false;
  }

  function handleFileInput(e: Event) {
    const target = e.target as HTMLInputElement;
    const files = target.files;
    if (files && files.length > 0) {
      handleFile(files[0]);
    }
  }
</script>

<svelte:head>
  <title>MKV Extractor - แยก subtitle จาก MKV</title>
  <meta name="description" content="แยก subtitle และ attachment จากไฟล์ MKV โดยตรงในเบราว์เซอร์" />
</svelte:head>

<main>
  <div class="container">
    <h1>🎬 MKV Extractor</h1>
    <p class="subtitle">แยก subtitle, attachment และ fonts จากไฟล์ MKV โดยตรงในเบราว์เซอร์ ไม่ต้องอัปโหลดไฟล์ขึ้นเซิร์ฟเวอร์</p>

    <div 
      class="dropzone"
      class:dragover={dragOver}
      class:processing={isProcessing}
      on:drop={handleDrop}
      on:dragover={handleDragOver}
      on:dragleave={handleDragLeave}
    >
      {#if isProcessing}
        <div class="spinner"></div>
        <p>{status}</p>
        <div class="progress-bar">
          <div class="progress-fill" style="width: {progress}%"></div>
        </div>
      {:else if !ffmpeg}
        <div class="spinner"></div>
        <p>{status}</p>
        <div class="progress-bar">
          <div class="progress-fill" style="width: {progress}%"></div>
        </div>
      {:else}
        <div class="upload-icon">📁</div>
        <p><strong>ลากไฟล์ MKV มาวางที่นี่</strong></p>
        <p>หรือ</p>
        <label class="file-button">
          เลือกไฟล์จากคอมพิวเตอร์
          <input type="file" accept=".mkv,.webm" on:change={handleFileInput} hidden />
        </label>
        <p class="status">{status}</p>
      {/if}
    </div>

    <div class="info">
      <h3>ℹ️ วิธีใช้งาน</h3>
      <ol>
        <li>ลากไฟล์ .mkv หรือ .webm มาวางในช่องด้านบน หรือคลิกเลือกไฟล์</li>
        <li>รอให้ระบบประมวลผล (ใช้เวลาขึ้นอยู่กับขนาดไฟล์)</li>
        <li>ไฟล์ที่แยกได้จะถูกบีบอัดเป็น .zip และดาวน์โหลดอัตโนมัติ</li>
      </ol>
      
      <h3>🔒 ความปลอดภัย</h3>
      <p>การประมวลผลทั้งหมดเกิดขึ้นในเบราว์เซอร์ของคุณ ไฟล์จะไม่ถูกอัปโหลดไปยังเซิร์ฟเวอร์ใดๆ โดยใช้เทคโนโลยี <a href="https://ffmpegwasm.netlify.app/" target="_blank">FFmpeg.wasm</a></p>
    </div>

    <footer>
      <p>Powered by <a href="https://ffmpegwasm.netlify.app/" target="_blank">FFmpeg.wasm</a> | 
         <a href="https://github.com/qgustavor/mkv-extract" target="_blank">Inspired by qgustavor/mkv-extract</a></p>
    </footer>
  </div>
</main>

<style>
  :global(body) {
    margin: 0;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    min-height: 100vh;
    color: #333;
  }

  .container {
    max-width: 800px;
    margin: 0 auto;
    padding: 2rem 1rem;
  }

  h1 {
    text-align: center;
    color: white;
    font-size: 2.5rem;
    margin-bottom: 0.5rem;
  }

  .subtitle {
    text-align: center;
    color: rgba(255, 255, 255, 0.9);
    margin-bottom: 2rem;
    font-size: 1.1rem;
  }

  .dropzone {
    background: white;
    border: 3px dashed #ccc;
    border-radius: 16px;
    padding: 3rem 2rem;
    text-align: center;
    transition: all 0.3s ease;
    cursor: pointer;
    margin-bottom: 2rem;
    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
  }

  .dropzone.dragover {
    border-color: #667eea;
    background: #f0f4ff;
    transform: scale(1.02);
  }

  .dropzone.processing {
    cursor: wait;
    border-style: solid;
    border-color: #667eea;
  }

  .upload-icon {
    font-size: 3rem;
    margin-bottom: 1rem;
  }

  .file-button {
    display: inline-block;
    background: #667eea;
    color: white;
    padding: 0.75rem 1.5rem;
    border-radius: 8px;
    cursor: pointer;
    font-weight: 600;
    transition: background 0.2s;
    margin: 0.5rem 0;
  }

  .file-button:hover {
    background: #5568d3;
  }

  .status {
    color: #666;
    font-size: 0.9rem;
    margin-top: 1rem;
  }

  .spinner {
    width: 40px;
    height: 40px;
    border: 4px solid #f3f3f3;
    border-top: 4px solid #667eea;
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin: 0 auto 1rem;
  }

  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }

  .progress-bar {
    width: 100%;
    max-width: 300px;
    height: 8px;
    background: #e0e0e0;
    border-radius: 4px;
    margin: 1rem auto 0;
    overflow: hidden;
  }

  .progress-fill {
    height: 100%;
    background: #667eea;
    transition: width 0.3s ease;
  }

  .info {
    background: white;
    border-radius: 12px;
    padding: 1.5rem 2rem;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
    margin-bottom: 2rem;
  }

  .info h3 {
    color: #667eea;
    margin-top: 0;
  }

  .info ol {
    padding-left: 1.2rem;
    line-height: 1.8;
  }

  .info p {
    line-height: 1.6;
    color: #555;
  }

  .info a {
    color: #667eea;
    text-decoration: none;
  }

  .info a:hover {
    text-decoration: underline;
  }

  footer {
    text-align: center;
    color: rgba(255, 255, 255, 0.8);
    font-size: 0.9rem;
  }

  footer a {
    color: white;
    text-decoration: none;
    border-bottom: 1px dotted rgba(255, 255, 255, 0.5);
  }

  footer a:hover {
    border-bottom-style: solid;
  }
</style>
