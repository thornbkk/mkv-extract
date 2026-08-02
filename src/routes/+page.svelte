<script>
  import { extractSubtitlesFromMKV, convertToSubtitleFile, getLanguageFullName } from '$lib/ebml.js';
  import JSZip from 'jszip';

  let file = null;
  let tracks = [];
  let parsing = false;
  let progressText = '';
  let progressPercent = 0;
  let errorMsg = '';
  let dragOver = false;
  let fileInput;

  function log(msg) {
    console.log(`[MKV Extractor] ${msg}`);
  }

  function getBaseName() {
    if (!file) return 'subtitle';
    return file.name.replace(/\.mkv$/i, '').replace(/[^a-zA-Z0-9\u0E00-\u0E7F\s]/g, '_').replace(/\s+/g, '_');
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

  function handleFile(selected) {
    if (!selected) return;
    const sizeMB = selected.size / 1024 / 1024;
    file = selected;
    tracks = [];
    errorMsg = '';
    progressText = '';
    progressPercent = 0;
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
      }
    }
  }

  function triggerFileInput() {
    fileInput?.click();
  }

  async function extractSubtitles() {
    if (!file) return;
    
    parsing = true;
    tracks = [];
    errorMsg = '';
    progressText = 'เริ่มต้น...';
    progressPercent = 0;

    try {
      const onProgress = (msg, pct) => {
        progressText = msg;
        if (typeof pct === 'number') progressPercent = pct;
        log(msg);
      };

      const rawTracks = await extractSubtitlesFromMKV(file, onProgress);
      
      if (rawTracks.length === 0) {
        errorMsg = 'ไม่พบ subtitle track ในไฟล์นี้';
        parsing = false;
        return;
      }

      tracks = rawTracks.map(t => ({
        ...t,
        languageName: getLanguageFullName(t.languageIETF || t.language, t.name),
        blockCount: t.blocks ? t.blocks.length : 0
      }));

      log(`พบ ${tracks.length} subtitle track(s)`);
    } catch (err) {
      errorMsg = `ผิดพลาด: ${err?.message || err}`;
      console.error(err);
    } finally {
      parsing = false;
    }
  }

  function downloadTrack(track) {
    const result = convertToSubtitleFile(track);
    let blob;
    if (result.binary) {
      blob = new Blob([result.content], { type: 'application/octet-stream' });
    } else {
      blob = new Blob([result.content], { type: 'text/plain;charset=utf-8' });
    }
    const base = getBaseName();
    const lang = track.languageName.replace(/\s+/g, '_');
    const nameTag = track.name ? '_' + track.name.replace(/[^a-zA-Z0-9]/g, '_') : '';
    const filename = `${base}_${lang}_Track${track.trackNumber}${nameTag}.${result.extension}`;
    downloadBlob(blob, filename);
  }

  async function downloadAll() {
    if (tracks.length === 0) return;
    const zip = new JSZip();
    const base = getBaseName();
    for (const track of tracks) {
      const result = convertToSubtitleFile(track);
      const lang = track.languageName.replace(/\s+/g, '_');
      const nameTag = track.name ? '_' + track.name.replace(/[^a-zA-Z0-9]/g, '_') : '';
      const filename = `${base}_${lang}_Track${track.trackNumber}${nameTag}.${result.extension}`;
      zip.file(filename, result.content);
    }
    const blob = await zip.generateAsync({ type: 'blob' });
    downloadBlob(blob, `${base}_subtitles.zip`);
  }
</script>

<div class="cyber-bg">
  <div class="cyber-grid"></div>
  
  <div class="container">
    <div class="header-glow">
      <h1>🎬 MKV Subtitle Extractor Pro 2.0.0</h1>
      <div class="subtitle">แยก subtitle จากไฟล์ MKV โดยไม่ต้องอัปโหลดไปเซิร์ฟเวอร์ <span class="tech-badge">Pure JS Parser</span></div>
    </div>

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
        style="display: none;"
      />
      {#if !file}
        <div class="upload-icon">
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#34d399" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
            <polyline points="17 8 12 3 7 8"></polyline>
            <line x1="12" y1="3" x2="12" y2="15"></line>
          </svg>
        </div>
        <div class="upload-text">ลากไฟล์ MKV มาวางที่นี่ หรือคลิกเลือก</div>
        <div class="upload-hint">รองรับไฟล์ขนาดใหญ่ · ประมวลผลในเบราว์เซอร์</div>
      {:else}
        <div class="file-icon">📁</div>
        <div class="file-name">{file.name}</div>
        <div class="file-size">{(file.size / 1024 / 1024).toFixed(2)} MB</div>
      {/if}
    </div>

    {#if file}
      <button class="btn-primary" on:click={extractSubtitles} disabled={parsing}>
        {#if parsing}
          <span class="spinner"></span>
          <span>กำลังอ่านไฟล์...</span>
        {:else}
          <span>🔍 สแกน Subtitle Tracks</span>
        {/if}
      </button>
    {/if}

    {#if parsing && progressPercent > 0}
      <div class="progress-container">
        <div class="progress-track">
          <div class="progress-fill" style="width: {progressPercent}%"></div>
        </div>
        <div class="progress-text">{progressText} <span class="progress-pct">{progressPercent}%</span></div>
      </div>
    {/if}

    {#if errorMsg}
      <div class="error-box">
        <div class="error-icon">⚠️</div>
        <div>{errorMsg}</div>
      </div>
    {/if}

    {#if tracks.length > 0}
      <div class="results-panel">
        <div class="results-header">
          <div class="results-title">
            <span class="results-icon">📦</span>
            <span>พบ {tracks.length} Subtitle Track(s)</span>
          </div>
          <button class="btn-download-all" on:click={downloadAll}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
              <polyline points="7 10 12 15 17 10"></polyline>
              <line x1="12" y1="15" x2="12" y2="3"></line>
            </svg>
            ดาวน์โหลดทั้งหมด (ZIP)
          </button>
        </div>
        
        <div class="track-list">
          {#each tracks as track, i}
            <div class="track-card" style="animation-delay: {i * 0.1}s">
              <div class="track-glow"></div>
              <div class="track-content">
                <div class="track-main">
                  <span class="track-lang">{track.languageName}</span>
                  <span class="track-codec">{track.codecId}</span>
                </div>
                {#if track.name}
                  <div class="track-name">{track.name}</div>
                {/if}
                <div class="track-meta">
                  <span class="track-blocks">🧩 {track.blockCount} blocks</span>
                  <span class="track-num">Track #{track.trackNumber}</span>
                </div>
              </div>
              <button class="btn-download" on:click={() => downloadTrack(track)}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                  <polyline points="7 10 12 15 17 10"></polyline>
                  <line x1="12" y1="15" x2="12" y2="3"></line>
                </svg>
                ดาวน์โหลด
              </button>
            </div>
          {/each}
        </div>
      </div>
    {/if}

    <div class="footer">
      <div class="footer-line"></div>
      <div class="footer-text">MKV Subtitle Extractor Pro 2.0.0 · (Pure JS EBML Parser) More 2GB Supported </div>
    </div>
  </div>
</div>

<style>
  :global(body) {
    margin: 0;
    padding: 0;
    background: #020617;
    min-height: 100vh;
  }

  .cyber-bg {
    min-height: 100vh;
    background: linear-gradient(180deg, #020617 0%, #0f172a 50%, #022c22 100%);
    position: relative;
    overflow-x: hidden;
  }

  .cyber-grid {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-image: 
      linear-gradient(rgba(5, 150, 105, 0.03) 1px, transparent 1px),
      linear-gradient(90deg, rgba(5, 150, 105, 0.03) 1px, transparent 1px);
    background-size: 50px 50px;
    pointer-events: none;
    z-index: 0;
  }

  .container {
    position: relative;
    z-index: 1;
    max-width: 720px;
    margin: 0 auto;
    padding: 3rem 1.5rem 2rem;
    font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
  }

  .header-glow {
    text-align: center;
    margin-bottom: 2.5rem;
    position: relative;
  }

  .header-glow::before {
    content: '';
    position: absolute;
    top: -20px;
    left: 50%;
    transform: translateX(-50%);
    width: 300px;
    height: 100px;
    background: radial-gradient(ellipse, rgba(52, 211, 153, 0.15) 0%, transparent 70%);
    pointer-events: none;
  }

  h1 {
    margin: 0 0 0.5rem;
    color: #34d399;
    font-size: 2rem;
    font-weight: 800;
    letter-spacing: -0.5px;
    text-shadow: 0 0 30px rgba(52, 211, 153, 0.3), 0 0 60px rgba(52, 211, 153, 0.1);
  }

  .subtitle {
    color: #6ee7b7;
    font-size: 0.95rem;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    flex-wrap: wrap;
  }

  .tech-badge {
    background: rgba(5, 150, 105, 0.2);
    border: 1px solid rgba(52, 211, 153, 0.4);
    color: #34d399;
    padding: 0.15rem 0.6rem;
    border-radius: 20px;
    font-size: 0.75rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .upload-zone {
    border: 2px dashed rgba(52, 211, 153, 0.3);
    border-radius: 16px;
    padding: 3rem 2rem;
    text-align: center;
    margin-bottom: 1.5rem;
    transition: all 0.3s ease;
    cursor: pointer;
    background: rgba(2, 44, 34, 0.4);
    backdrop-filter: blur(10px);
    position: relative;
    overflow: hidden;
  }

  .upload-zone::before {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(90deg, transparent, rgba(52, 211, 153, 0.05), transparent);
    transition: left 0.5s;
  }

  .upload-zone:hover::before {
    left: 100%;
  }

  .upload-zone:hover, .upload-zone.drag-active {
    border-color: #34d399;
    background: rgba(2, 44, 34, 0.6);
    box-shadow: 0 0 30px rgba(52, 211, 153, 0.15), inset 0 0 30px rgba(52, 211, 153, 0.05);
    transform: translateY(-2px);
  }

  .upload-icon {
    margin-bottom: 1rem;
    filter: drop-shadow(0 0 10px rgba(52, 211, 153, 0.3));
  }

  .upload-text {
    color: #ecfdf5;
    font-size: 1.1rem;
    font-weight: 600;
    margin-bottom: 0.5rem;
  }

  .upload-hint {
    color: #059669;
    font-size: 0.8rem;
  }

  .file-icon {
    font-size: 2.5rem;
    margin-bottom: 0.5rem;
  }

  .file-name {
    color: #ecfdf5;
    font-weight: 600;
    font-size: 1rem;
    word-break: break-all;
  }

  .file-size {
    color: #34d399;
    font-size: 0.875rem;
    margin-top: 0.25rem;
    font-weight: 500;
  }

  .btn-primary {
    width: 100%;
    padding: 1rem;
    font-size: 1rem;
    font-weight: 700;
    border: none;
    border-radius: 12px;
    background: linear-gradient(135deg, #059669 0%, #10b981 100%);
    color: #020617;
    cursor: pointer;
    margin-bottom: 1.5rem;
    transition: all 0.3s ease;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    box-shadow: 0 4px 20px rgba(5, 150, 105, 0.3);
    position: relative;
    overflow: hidden;
  }

  .btn-primary::after {
    content: '';
    position: absolute;
    top: -50%;
    left: -50%;
    width: 200%;
    height: 200%;
    background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent);
    transform: rotate(30deg);
    transition: all 0.6s;
  }

  .btn-primary:hover::after {
    left: 100%;
  }

  .btn-primary:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 8px 30px rgba(5, 150, 105, 0.4);
  }

  .btn-primary:disabled {
    background: #1f2937;
    color: #6b7280;
    cursor: not-allowed;
    box-shadow: none;
  }

  .spinner {
    width: 18px;
    height: 18px;
    border: 2px solid rgba(2, 6, 23, 0.3);
    border-top-color: #020617;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
    display: inline-block;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  .progress-container {
    margin-bottom: 1.5rem;
  }

  .progress-track {
    width: 100%;
    height: 6px;
    background: rgba(52, 211, 153, 0.1);
    border-radius: 3px;
    overflow: hidden;
    box-shadow: inset 0 0 4px rgba(0,0,0,0.3);
  }

  .progress-fill {
    height: 100%;
    background: linear-gradient(90deg, #059669, #34d399, #6ee7b7);
    border-radius: 3px;
    transition: width 0.4s ease;
    box-shadow: 0 0 10px rgba(52, 211, 153, 0.5);
    position: relative;
  }

  .progress-fill::after {
    content: '';
    position: absolute;
    top: 0;
    right: 0;
    bottom: 0;
    width: 20px;
    background: linear-gradient(90deg, transparent, rgba(255,255,255,0.4));
  }

  .progress-text {
    color: #6ee7b7;
    font-size: 0.875rem;
    margin-top: 0.5rem;
    text-align: center;
    display: flex;
    justify-content: space-between;
  }

  .progress-pct {
    color: #34d399;
    font-weight: 700;
  }

  .error-box {
    background: linear-gradient(135deg, rgba(127, 29, 29, 0.8), rgba(153, 27, 27, 0.6));
    color: #fecaca;
    padding: 1rem 1.25rem;
    border-radius: 12px;
    margin-bottom: 1.5rem;
    border: 1px solid rgba(248, 113, 113, 0.3);
    display: flex;
    align-items: center;
    gap: 0.75rem;
    backdrop-filter: blur(10px);
  }

  .error-icon {
    font-size: 1.25rem;
  }

  .results-panel {
    background: rgba(2, 44, 34, 0.3);
    border: 1px solid rgba(52, 211, 153, 0.2);
    border-radius: 16px;
    padding: 1.5rem;
    backdrop-filter: blur(10px);
    margin-bottom: 1.5rem;
    box-shadow: 0 0 40px rgba(5, 150, 105, 0.1);
  }

  .results-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1.25rem;
    flex-wrap: wrap;
    gap: 0.75rem;
  }

  .results-title {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    color: #ecfdf5;
    font-size: 1.1rem;
    font-weight: 700;
  }

  .results-icon {
    font-size: 1.25rem;
  }

  .btn-download-all {
    padding: 0.5rem 1rem;
    font-size: 0.875rem;
    font-weight: 600;
    border: 1px solid rgba(52, 211, 153, 0.4);
    border-radius: 8px;
    background: rgba(5, 150, 105, 0.2);
    color: #34d399;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 0.4rem;
    transition: all 0.2s;
    white-space: nowrap;
  }

  .btn-download-all:hover {
    background: rgba(5, 150, 105, 0.3);
    border-color: #34d399;
    box-shadow: 0 0 15px rgba(52, 211, 153, 0.2);
  }

  .track-list {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .track-card {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1rem 1.25rem;
    background: rgba(2, 6, 23, 0.6);
    border: 1px solid rgba(52, 211, 153, 0.15);
    border-radius: 12px;
    gap: 1rem;
    position: relative;
    overflow: hidden;
    animation: slideIn 0.4s ease forwards;
    opacity: 0;
    transform: translateY(10px);
  }

  @keyframes slideIn {
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .track-glow {
    position: absolute;
    top: 0;
    left: 0;
    width: 3px;
    height: 100%;
    background: linear-gradient(180deg, #34d399, #059669);
    opacity: 0.6;
  }

  .track-content {
    flex: 1;
    min-width: 0;
  }

  .track-main {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    flex-wrap: wrap;
    margin-bottom: 0.25rem;
  }

  .track-lang {
    font-weight: 700;
    color: #34d399;
    font-size: 1rem;
    text-shadow: 0 0 10px rgba(52, 211, 153, 0.3);
  }

  .track-codec {
    color: #059669;
    font-size: 0.75rem;
    background: rgba(5, 150, 105, 0.15);
    padding: 0.15rem 0.5rem;
    border-radius: 4px;
    border: 1px solid rgba(5, 150, 105, 0.3);
    font-family: monospace;
  }

  .track-name {
    color: #6ee7b7;
    font-size: 0.875rem;
    margin-top: 0.25rem;
  }

  .track-meta {
    display: flex;
    gap: 1rem;
    margin-top: 0.5rem;
    font-size: 0.75rem;
    color: #059669;
  }

  .track-blocks {
    display: flex;
    align-items: center;
    gap: 0.25rem;
  }

  .track-num {
    opacity: 0.7;
  }

  .btn-download {
    padding: 0.5rem 1rem;
    font-size: 0.875rem;
    font-weight: 600;
    border: none;
    border-radius: 8px;
    background: linear-gradient(135deg, #059669, #10b981);
    color: #020617;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 0.4rem;
    transition: all 0.2s;
    white-space: nowrap;
    box-shadow: 0 2px 10px rgba(5, 150, 105, 0.3);
  }

  .btn-download:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 15px rgba(5, 150, 105, 0.4);
  }

  .footer {
    text-align: center;
    margin-top: 2rem;
  }

  .footer-line {
    height: 1px;
    background: linear-gradient(90deg, transparent, rgba(52, 211, 153, 0.3), transparent);
    margin-bottom: 1rem;
  }

  .footer-text {
    color: #059669;
    font-size: 0.75rem;
    letter-spacing: 0.5px;
  }

  @media (max-width: 640px) {
    h1 {
      font-size: 1.5rem;
    }
    
    .track-card {
      flex-direction: column;
      align-items: flex-start;
    }
    
    .btn-download {
      width: 100%;
      justify-content: center;
    }
    
    .results-header {
      flex-direction: column;
      align-items: flex-start;
    }
  }
</style>
