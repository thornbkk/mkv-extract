<script>
  import { onMount } from 'svelte';
  import { browser } from '$app/environment';
  import JSZip from 'jszip';

  let ffmpeg = null;
  let fetchFile = null;
  let loaded = false;
  let loading = false;
  let file = null;
  let tracks = [];
  let extracting = false;
  let logMessages = [];
  let errorMsg = '';
  let dragOver = false;
  let fileInput;

  const CORE_JS_URL = 'https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.10/dist/umd/ffmpeg-core.js';
  const CORE_WASM_URL = 'https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.10/dist/umd/ffmpeg-core.wasm';

  function log(msg) {
    console.log(`[MKV Extractor] ${msg}`);
    logMessages = [...logMessages, msg];
  }

  function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  async function toBlobURL(url, mimeType) {
    log(`Downloading ${url.split('/').pop()}...`);
    const resp = await fetch(url);
    if (!resp.ok) throw new Error(`HTTP ${resp.status}: ${resp.statusText}`);
    const blob = await resp.blob();
    return URL.createObjectURL(new Blob([blob], { type: mimeType }));
  }

  async function initFFmpeg() {
    if (loaded || loading) return;
    loading = true;
    errorMsg = '';
    log('กำลังโหลด FFmpeg...');

    try {
      log('Importing @ffmpeg/ffmpeg...');
      const { FFmpeg } = await import('@ffmpeg/ffmpeg');
      log('Importing @ffmpeg/util...');
      const util = await import('@ffmpeg/util');
      fetchFile = util.fetchFile;
      log('Modules imported successfully');

      log('Creating FFmpeg instance...');
      ffmpeg = new FFmpeg();
      
      ffmpeg.on('log', ({ message, type }) => {
        if (type === 'stderr' || message.toLowerCase().includes('error')) {
          log(`FFmpeg: ${message}`);
        }
      });

      ffmpeg.on('progress', ({ progress: p }) => {
        log(`Progress: ${(p * 100).toFixed(0)}%`);
      });

      log('Fetching core files from CDN...');
      const coreURL = await toBlobURL(CORE_JS_URL, 'text/javascript');
      const wasmURL = await toBlobURL(CORE_WASM_URL, 'application/wasm');

      log('Calling ffmpeg.load()...');
      await ffmpeg.load({ coreURL, wasmURL });

      loaded = true;
      log('✅ FFmpeg พร้อมใช้งาน');
    } catch (err) {
      errorMsg = `โหลด FFmpeg ไม่สำเร็จ: ${err?.message || err}`;
      log(errorMsg);
      console.error('FFmpeg load error:', err);
    } finally {
      loading = false;
    }
  }

  // Auto-load FFmpeg เมื่อเปิดหน้า
  onMount(async () => {
    if (!browser) return;
    log('Browser ready, auto-loading FFmpeg...');
    await initFFmpeg();
  });

  function handleFile(selected) {
    if (!selected) return;
    const sizeMB = selected.size / 1024 / 1024;
    
    // แค่เตือน ไม่ block
    if (sizeMB > 1000) {
      log(`⚠️ ไฟล์ใหญ่มาก (${sizeMB.toFixed(0)} MB) อาจทำให้เบราว์เซอร์ค้าง`);
    }
    
    file = selected;
    tracks = [];
    log(`เลือกไฟล์: ${selected.name} (${sizeMB.toFixed(2)} MB)`);
  }

  function handleFileChange(e) {
    handleFile(e.target.files[0]);
    e.target.value = '';
  }

  function handleDragOver(e) {
    e.preventDefault();
    dragOver = true;
  }

  function handleDragLeave(e) {
    e.preventDefault();
    dragOver = false;
  }

  function handleDrop(e) {
    e.preventDefault();
    dragOver = false;
    const droppedFiles = e.dataTransfer?.files;
    if (droppedFiles && droppedFiles.length > 0) {
      const mkvFile = Array.from(droppedFiles).find(f => 
        f.name.toLowerCase().endsWith('.mkv') || f.type === 'video/x-matroska'
      );
      if (mkvFile) {
        handleFile(mkvFile);
      } else {
        errorMsg = 'กรุณาลากไฟล์ .mkv เท่านั้น';
        log(errorMsg);
      }
    }
  }

  function triggerFileInput() {
    fileInput?.click();
  }

  async function extractSubtitles() {
    if (!file || !loaded || !ffmpeg) {
      log('ยังไม่พร้อม: file=' + !!file + ' loaded=' + loaded + ' ffmpeg=' + !!ffmpeg);
      return;
    }
    
    extracting = true;
    tracks = [];
    errorMsg = '';
    logMessages = [];
    log('เริ่มกระบวนการ...');

    const inputName = 'input.mkv';
    let zip = new JSZip();
    let foundTracks = [];

    try {
      log('กำลังอ่านไฟล์เข้า memory...');
      const fileData = await fetchFile(file);
      log(`fetchFile สำเร็จ (${fileData.byteLength || fileData.length} bytes)`);
      
      log('กำลังเขียนไฟล์ลง FFmpeg FS...');
      await ffmpeg.writeFile(inputName, fileData);
      log('เขียนไฟล์สำเร็จ');

      for (let i = 0; i < 10; i++) {
        const outputName = `sub_${i}.ass`;
        try {
          log(`ลองดึง track ${i}...`);
          await ffmpeg.exec([
            '-y', '-nostats',
            '-i', inputName,
            '-map', `0:s:${i}`,
            '-c', 'copy',
            outputName
          ]);
          const data = await ffmpeg.readFile(outputName);
          if (data && data.length > 10) {
            const blob = new Blob([data]);
            zip.file(`track_${i + 1}.ass`, blob);
            foundTracks.push({
              index: i,
              name: `Track ${i + 1}`,
              format: 'ASS/SSA',
              size: blob.size
            });
            log(`✅ พบ track ${i} (${blob.size} bytes)`);
          }
          await ffmpeg.deleteFile(outputName);
        } catch (execErr) {
          log(`Track ${i}: ไม่พบหรือดึงไม่ได้`);
          if (i === 0 && foundTracks.length === 0) {
            try {
              const srtName = `sub_${i}.srt`;
              await ffmpeg.exec([
                '-y', '-nostats',
                '-i', inputName,
                '-map', `0:s:${i}`,
                '-c', 'copy',
                srtName
              ]);
              const data = await ffmpeg.readFile(srtName);
              if (data && data.length > 10) {
                const blob = new Blob([data]);
                zip.file(`track_${i + 1}.srt`, blob);
                foundTracks.push({ index: i, name: `Track ${i + 1}`, format: 'SRT', size: blob.size });
                log(`✅ พบ track ${i} เป็น SRT`);
              }
              await ffmpeg.deleteFile(srtName);
            } catch (e2) {
              break;
            }
          } else if (foundTracks.length > 0) {
            break;
          } else {
            break;
          }
        }
      }

      try {
        await ffmpeg.deleteFile(inputName);
        for (let i = 0; i < 10; i++) {
          try { await ffmpeg.deleteFile(`sub_${i}.ass`); } catch (e) {}
          try { await ffmpeg.deleteFile(`sub_${i}.srt`); } catch (e) {}
        }
      } catch (e) {}

      if (foundTracks.length > 0) {
        tracks = foundTracks;
        const zipBlob = await zip.generateAsync({ type: 'blob' });
        downloadBlob(zipBlob, `${file.name.replace(/\.mkv$/i, '')}_subtitles.zip`);
        log(`🎉 เสร็จสิ้น! พบ ${foundTracks.length} track(s)`);
      } else {
        errorMsg = 'ไม่พบ subtitle track ในไฟล์นี้';
        log(errorMsg);
      }
    } catch (err) {
      errorMsg = `ผิดพลาด: ${err?.message || err}`;
      log(errorMsg);
      console.error(err);
    } finally {
      extracting = false;
    }
  }
</script>

<div class="container">
  <h1>🎬 MKV Subtitle Extractor</h1>
  <p class="subtitle">แยก subtitle จากไฟล์ MKV โดยไม่ต้องอัปโหลดไปเซิร์ฟเวอร์</p>

  {#if loading}
    <div class="badge loading">⏳ กำลังโหลด FFmpeg...</div>
  {:else if loaded}
    <div class="badge">✅ FFmpeg พร้อมใช้งาน</div>
  {:else}
    <button class="btn-primary" on:click={initFFmpeg}>
      🔌 โหลด FFmpeg (ลองใหม่)
    </button>
  {/if}

  <div 
    class="upload-zone"
    class:drag-active={dragOver}
    on:dragover|preventDefault={handleDragOver}
    on:dragleave|preventDefault={handleDragLeave}
    on:drop|preventDefault={handleDrop}
    on:click={triggerFileInput}
    role="button"
    tabindex="0"
  >
    <input
      bind:this={fileInput}
      type="file"
      accept=".mkv,video/x-matroska"
      on:change={handleFileChange}
      id="file-input"
      style="display: none;"
    />
    {#if !file}
      <div class="drop-icon">📁</div>
      <div>ลากไฟล์ MKV มาวางที่นี่ หรือคลิกเลือก</div>
      {#if !loaded && !loading}
        <div class="hint">รอ FFmpeg โหลดสำเร็จก่อน หรือคลิกปุ่มด้านบน</div>
      {/if}
    {:else}
      <div>📄 {file.name}</div>
      <div class="file-size">{(file.size / 1024 / 1024).toFixed(2)} MB</div>
    {/if}
  </div>

  {#if file && loaded}
    <button class="btn-primary" on:click={extractSubtitles} disabled={extracting}>
      {extracting ? '⏳ กำลังดึง subtitle...' : '📤 ดึง Subtitle'}
    </button>
  {/if}

  {#if errorMsg}
    <div class="error-box">❌ {errorMsg}</div>
  {/if}

  {#if logMessages.length > 0}
    <div class="log-box">
      <strong>📝 Log:</strong>
      {#each logMessages as msg}
        <div class="log-line">{msg}</div>
      {/each}
    </div>
  {/if}

  {#if tracks.length > 0}
    <div class="results">
      <h3>📦 พบ {tracks.length} Subtitle Track(s)</h3>
      <ul>
        {#each tracks as track}
          <li>
            {track.name} — {track.format} ({(track.size / 1024).toFixed(1)} KB)
          </li>
        {/each}
      </ul>
      <p class="success">✅ ดาวน์โหลด ZIP อัตโนมัติแล้ว</p>
    </div>
  {/if}
</div>

<style>
  .container {
    max-width: 640px;
    margin: 2rem auto;
    padding: 1.5rem;
    font-family: system-ui, -apple-system, sans-serif;
    color: #e2e8f0;
    background: #0f172a;
    border-radius: 16px;
  }
  h1 { margin: 0 0 0.25rem; color: #f8fafc; }
  .subtitle { color: #94a3b8; margin-bottom: 1.5rem; }
  .btn-primary {
    width: 100%;
    padding: 0.875rem;
    font-size: 1rem;
    font-weight: 600;
    border: none;
    border-radius: 10px;
    background: #6366f1;
    color: white;
    cursor: pointer;
    margin-bottom: 1rem;
    transition: opacity 0.2s;
  }
  .btn-primary:hover:not(:disabled) { opacity: 0.9; }
  .btn-primary:disabled { background: #475569; cursor: not-allowed; }
  .badge {
    display: inline-block;
    padding: 0.5rem 1rem;
    background: #059669;
    color: white;
    border-radius: 20px;
    font-size: 0.875rem;
    margin-bottom: 1rem;
  }
  .badge.loading {
    background: #d97706;
    animation: pulse 1.5s infinite;
  }
  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.7; }
  }
  .upload-zone {
    border: 2px dashed #475569;
    border-radius: 12px;
    padding: 2rem;
    text-align: center;
    margin-bottom: 1rem;
    transition: all 0.2s;
    cursor: pointer;
  }
  .upload-zone:hover, .upload-zone.drag-active {
    border-color: #6366f1;
    background: rgba(99, 102, 241, 0.1);
  }
  .hint {
    color: #94a3b8;
    font-size: 0.8rem;
    margin-top: 0.5rem;
  }
  .drop-icon { font-size: 3rem; margin-bottom: 0.5rem; }
  .file-size { color: #94a3b8; font-size: 0.875rem; margin-top: 0.25rem; }
  .error-box {
    background: #7f1d1d;
    color: #fecaca;
    padding: 1rem;
    border-radius: 8px;
    margin-bottom: 1rem;
  }
  .log-box {
    background: #1e293b;
    padding: 1rem;
    border-radius: 8px;
    margin-bottom: 1rem;
    font-size: 0.8rem;
    max-height: 300px;
    overflow-y: auto;
  }
  .log-line { color: #cbd5e1; margin-top: 0.25rem; font-family: monospace; }
  .results {
    background: #1e293b;
    padding: 1rem;
    border-radius: 8px;
  }
  .results h3 { margin-top: 0; color: #f8fafc; }
  .results ul { color: #cbd5e1; }
  .success { color: #34d399; font-weight: 600; margin-bottom: 0; }
</style>
