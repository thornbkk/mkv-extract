<svelte:head>
  <title>MKV Extractor - แยก subtitle จาก MKV</title>
  <meta name="description" content="แยก subtitle และ attachment จากไฟล์ MKV โดยตรงในเบราว์เซอร์ รองรับไฟล์ขนาดใหญ่ 10GB+">
</svelte:head>

<script>
  import { onMount } from 'svelte';
  import JSZip from 'jszip';

  let ffmpeg = null;
  let isLoaded = false;
  let isProcessing = false;
  let progress = 0;
  let status = 'กำลังโหลด FFmpeg...';
  let isDragOver = false;
  let capturedLogs = [];

  onMount(async () => {
    try {
      // ✅ Dynamic import ใน browser เพื่อหลีกเลี่ยง Node.js empty module
      const { FFmpeg } = await import('@ffmpeg/ffmpeg');
      ffmpeg = new FFmpeg();

      ffmpeg.on('log', ({ message }) => {
        console.log('[ffmpeg]', message);
      });

      ffmpeg.on('progress', ({ progress: p }) => {
        progress = Math.round(p * 100);
      });

      await ffmpeg.load();
      isLoaded = true;
      status = 'พร้อมใช้งาน! ลากไฟล์ MKV มาวางที่นี่';
    } catch (err) {
      status = 'เกิดข้อผิดพลาดในการโหลด FFmpeg: ' + err.message;
      console.error(err);
    }
  });

  function startLogCapture() {
    capturedLogs = [];
    ffmpeg.on('log', ({ message }) => {
      capturedLogs.push(message);
    });
  }

  function stopLogCapture() {
    ffmpeg.on('log', ({ message }) => {
      console.log('[ffmpeg]', message);
    });
  }

  async function detectSubtitleLanguages(inputPath) {
    startLogCapture();
    try {
      await ffmpeg.exec(['-i', inputPath]);
    } catch (e) {
      // ปกติของ ffprobe ผ่าน -i ไม่มี output file จะ throw error
    }
    stopLogCapture();

    const languages = [];
    for (const line of capturedLogs) {
      const match = line.match(/Stream #0:\d+\((\w{2,3})\):\s*Subtitle:/);
      if (match && match[1]) languages.push(match[1]);
    }
    return languages;
  }

  async function extractFile(file) {
    if (!isLoaded) {
      alert('กรุณารอให้ FFmpeg โหลดเสร็จก่อน');
      return;
    }

    if (!file.name.toLowerCase().endsWith('.mkv') &&
        !file.name.toLowerCase().endsWith('.webm')) {
      alert('รองรับเฉพาะไฟล์ .mkv และ .webm เท่านั้น');
      return;
    }

    isProcessing = true;
    progress = 0;
    status = `กำลังแยกไฟล์จาก ${file.name}...`;

    const extracted = [];
    const baseName = file.name.replace(/\.(mkv|webm)$/i, '');
    const mountPoint = '/mnt';
    const inputPath = mountPoint + '/' + file.name;

    try {
      // ✅ ใช้ WORKERFS แทนการเขียนไฟล์เข้า Memory!
      await ffmpeg.mount('WORKERFS', { files: [file] }, mountPoint);
      console.log('WORKERFS mounted at', mountPoint, 'file:', file.name, 'size:', file.size);

      const languages = await detectSubtitleLanguages(inputPath);
      console.log('Detected subtitle languages:', languages);

      // แยก subtitle
      for (let i = 0; i < 20; i++) {
        const outName = `subtitle_${i}.srt`;
        try {
          await ffmpeg.exec(['-i', inputPath, '-map', `0:s:${i}`, '-c:s', 'copy', outName]);
          const data = await ffmpeg.readFile(outName);

          if (data.length > 10) {
            const lang = languages[i] || `${i + 1}`;
            extracted.push({
              name: `[${lang}].srt`,
              data: data,
              type: 'subtitle'
            });
          }
          await ffmpeg.deleteFile(outName);
        } catch (e) {
          console.log('Stop subtitle extraction at index', i, e.message || '');
          break;
        }
      }

      // แยก attachment
      for (let i = 0; i < 20; i++) {
        const outName = `attachment_${i}`;
        try {
          await ffmpeg.exec(['-i', inputPath, '-map', `0:t:${i}`, '-c', 'copy', outName]);
          const data = await ffmpeg.readFile(outName);

          if (data.length > 0) {
            extracted.push({
              name: `attachment_${i + 1}`,
              data: data,
              type: 'attachment'
            });
          }
          await ffmpeg.deleteFile(outName);
        } catch (e) {
          console.log('Stop attachment extraction at index', i, e.message || '');
          break;
        }
      }

      await ffmpeg.unmount(mountPoint);
      console.log('WORKERFS unmounted');

      if (extracted.length === 0) {
        status = 'ไม่พบ subtitle หรือ attachment ในไฟล์นี้';
        isProcessing = false;
        return;
      }

      // จัดชื่อไฟล์
      const subtitleCounts = {};
      for (const item of extracted) {
        if (item.type === 'subtitle') {
          const ext = item.name.split('.').pop() || 'srt';
          const base = item.name.replace(`.${ext}`, '').replace(/^\[/, '').replace(/\]$/, '');
          subtitleCounts[base] = (subtitleCounts[base] || 0) + 1;
        }
      }

      const countUsed = {};
      const finalFiles = extracted.map((item, idx) => {
        let name;
        const ext = item.name.split('.').pop() || 'bin';

        if (item.type === 'subtitle') {
          const baseNameOnly = item.name.replace(`.${ext}`, '');
          const cleanBase = baseNameOnly.replace(/^\[/, '').replace(/\]$/, '');
          countUsed[cleanBase] = (countUsed[cleanBase] || 0) + 1;

          if (subtitleCounts[cleanBase] > 1) {
            name = `${baseNameOnly}_track${idx + 1}.${ext}`;
          } else {
            name = `${baseNameOnly}.${ext}`;
          }
          name = baseName + name;
        } else {
          name = `${baseName}_attachment_${idx + 1}.${ext}`;
        }

        return { ...item, name };
      });

      status = `พบ ${finalFiles.length} ไฟล์ กำลังบีบอัดเป็น ZIP...`;
      const zip = new JSZip();
      for (const f of finalFiles) {
        zip.file(f.name, f.data);
      }

      const blob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${baseName}_extracted.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      status = `เสร็จสิ้น! ดาวน์โหลด ${baseName}_extracted.zip แล้ว`;
    } catch (err) {
      status = 'เกิดข้อผิดพลาด: ' + err.message;
      console.error(err);
      try { await ffmpeg.unmount(mountPoint); } catch (e) {}
    } finally {
      isProcessing = false;
      progress = 0;
    }
  }

  function handleDrop(e) {
    e.preventDefault();
    isDragOver = false;
    const files = e.dataTransfer.files;
    if (files.length > 0 && !isProcessing) extractFile(files[0]);
  }

  function handleDragOver(e) {
    e.preventDefault();
    isDragOver = true;
  }

  function handleDragLeave() {
    isDragOver = false;
  }

  function handleFileSelect(e) {
    const files = e.target.files;
    if (files.length > 0 && !isProcessing) extractFile(files[0]);
  }
</script>

<main>
  <div class="container">
    <h1>🎬 MKV Extractor</h1>
    <p class="subtitle">แยก subtitle, attachment และ fonts จากไฟล์ MKV โดยตรงในเบราว์เซอร์ ไม่ต้องอัปโหลดไฟล์ขึ้นเซิร์ฟเวอร์</p>

    <div
      class="dropzone"
      class:processing={isProcessing}
      class:dragover={isDragOver}
      on:dragover={handleDragOver}
      on:dragleave={handleDragLeave}
      on:drop={handleDrop}
      role="button"
      tabindex="0"
    >
      <div class="upload-icon">📁</div>
      <p><strong>ลากไฟล์ MKV มาวางที่นี่</strong></p>
      <p>หรือ</p>
      <label class="file-button">
        เลือกไฟล์จากคอมพิวเตอร์
        <input
          type="file"
          accept=".mkv,.webm"
          hidden
          on:change={handleFileSelect}
        >
      </label>

      {#if isProcessing}
        <div class="spinner"></div>
      {/if}

      <p class="status">{status}</p>

      {#if isProcessing}
        <div class="progress-bar">
          <div class="progress-fill" style="width: {progress}%"></div>
        </div>
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
      <p>การประมวลผลทั้งหมดเกิดขึ้นในเบราว์เซอร์ของคุณ ไฟล์จะไม่ถูกอัปโหลดไปยังเซิร์ฟเวอร์ใดๆ โดยใช้เทคโนโลยี <a href="https://ffmpegwasm.netlify.app/" target="_blank">FFmpeg.wasm</a> และ <strong>WORKERFS</strong> สำหรับไฟล์ขนาดใหญ่ (รองรับ 10GB+)</p>
    </div>

    <footer>
      <p>Powered by <a href="https://ffmpegwasm.netlify.app/" target="_blank">FFmpeg.wasm</a> |
         <a href="https://github.com/qgustavor/mkv-extract" target="_blank">Inspired by qgustavor/mkv-extract</a></p>
    </footer>
  </div>
</main>

<style>
  :global(body) {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
    background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
    color: #e0e0e0;
    min-height: 100vh;
    margin: 0;
    padding: 0;
  }

  main {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 2rem 1rem;
  }

  .container {
    width: 100%;
    max-width: 600px;
    text-align: center;
  }

  h1 {
    font-size: 2rem;
    margin-bottom: 0.5rem;
    color: #fff;
  }

  .subtitle {
    color: #a0a0b0;
    margin-bottom: 2rem;
    font-size: 0.95rem;
  }

  .dropzone {
    border: 2px dashed #4a4a6a;
    border-radius: 16px;
    padding: 3rem 2rem;
    background: rgba(255,255,255,0.03);
    transition: all 0.3s ease;
    cursor: pointer;
    position: relative;
    margin-bottom: 2rem;
  }

  .dropzone:hover,
  .dropzone.dragover {
    border-color: #6c5ce7;
    background: rgba(108, 92, 231, 0.08);
  }

  .dropzone.processing {
    pointer-events: none;
    opacity: 0.7;
  }

  .upload-icon {
    font-size: 3rem;
    margin-bottom: 1rem;
  }

  .dropzone p {
    margin: 0.5rem 0;
    color: #b0b0c0;
  }

  .dropzone strong {
    color: #fff;
    font-size: 1.1rem;
  }

  .file-button {
    display: inline-block;
    margin-top: 1rem;
    padding: 0.6rem 1.5rem;
    background: #6c5ce7;
    color: #fff;
    border-radius: 8px;
    cursor: pointer;
    font-size: 0.95rem;
    transition: background 0.2s;
  }

  .file-button:hover {
    background: #5b4cc4;
  }

  .status {
    margin-top: 1rem;
    font-size: 0.9rem;
    color: #b0b0c0;
    min-height: 1.5em;
  }

  .spinner {
    width: 40px;
    height: 40px;
    border: 3px solid rgba(108,92,231,0.2);
    border-top-color: #6c5ce7;
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin: 1rem auto;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  .progress-bar {
    width: 100%;
    height: 6px;
    background: rgba(255,255,255,0.1);
    border-radius: 3px;
    margin-top: 1rem;
    overflow: hidden;
  }

  .progress-fill {
    height: 100%;
    background: linear-gradient(90deg, #6c5ce7, #a29bfe);
    border-radius: 3px;
    transition: width 0.3s ease;
  }

  .info {
    text-align: left;
    background: rgba(255,255,255,0.05);
    border-radius: 12px;
    padding: 1.5rem;
    margin-bottom: 2rem;
    font-size: 0.9rem;
    line-height: 1.6;
  }

  .info h3 {
    color: #fff;
    margin: 1rem 0 0.5rem;
    font-size: 1rem;
  }

  .info h3:first-child {
    margin-top: 0;
  }

  .info ol {
    margin-left: 1.2rem;
    color: #b0b0c0;
  }

  .info ol li {
    margin-bottom: 0.3rem;
  }

  .info p {
    color: #b0b0c0;
  }

  .info a {
    color: #a29bfe;
    text-decoration: none;
  }

  .info a:hover {
    text-decoration: underline;
  }

  footer {
    text-align: center;
    font-size: 0.8rem;
    color: #606070;
    margin-top: auto;
    padding-top: 2rem;
  }

  footer a {
    color: #808090;
    text-decoration: none;
  }

  footer a:hover {
    color: #a0a0b0;
  }
</style>