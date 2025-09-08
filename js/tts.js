/* Web Speech TTS MVP for Hexo NexT
 * - Chinese voice preferred (gentle female tone when available)
 * - Works with PJAX (re-initializes per page)
 * - Minimal UI: play/pause toggle, speed select, status text
 */
(function () {
  'use strict';

  const TTS_PROXY_URL = (typeof window.__TTS_PROXY_URL === 'string' && window.__TTS_PROXY_URL.trim()) ? window.__TTS_PROXY_URL.trim() : '';
  const SUPPORTS_TTS = ('speechSynthesis' in window) && ('SpeechSynthesisUtterance' in window);
  const synth = window.speechSynthesis;

  // Global guard for lifecycle bindings across PJAX navigations
  if (!window.__ttsGlobalsInstalled) {
    window.addEventListener('beforeunload', cancelAll);
    document.addEventListener('pjax:send', cancelAll);
    window.__ttsGlobalsInstalled = true;
  }

  // Mount for current page
  mountForPage();

  // --------------- Core Mount ---------------
  function mountForPage() {
    const { player, toggle, speed, status } = getPlayerElems();

    // No player on this page
    if (!player || !toggle || !speed || !status) return;

    // Always reset UI on new page
    setStatus('待机', status);
    setBtnIcon(toggle, 'play');
    toggle.disabled = false;

    if (!SUPPORTS_TTS) {
      setStatus('当前浏览器不支持语音朗读', status);
      toggle.disabled = true;
      return;
    }

    // Ensure we cancel any playing utterances left from previous page
    try { synth.cancel(); } catch (e) {}

    const state = createState();
    window.__ttsCurrentState = state;

    // Bind handlers (avoid duplicate by re-binding per page)
    toggle.addEventListener('click', () => onToggleClick(state, { toggle, speed, status }));
    speed.addEventListener('change', () => {
      const v = parseFloat(speed.value) || 1.0;
      state.rate = Math.min(Math.max(v, 0.5), 2.0);
      // Next utterances will adopt new rate. Keep current one unchanged to avoid jarring.
      if (state.isSpeaking && !state.isPaused) {
        setStatus(`朗读中 · ${state.rate.toFixed(1)}x`, status);
        if (state.useRemote && state.audio) {
          try { state.audio.playbackRate = state.rate; } catch (_) {}
        }
      }
    });
  }

  // --------------- State ---------------
  function createState() {
    return {
      voice: null,
      voicesLoaded: false,
      chunks: [],
      index: 0,
      isSpeaking: false,
      isPaused: false,
      rate: 1.0,
      cancelled: false,
      // remote tts
      useRemote: !!TTS_PROXY_URL,
      audio: null,
      blobUrl: null
    };
  }

  // --------------- UI Helpers ---------------
  function getPlayerElems() {
    const player = document.querySelector('#tts-player');
    if (!player) return {};
    return {
      player,
      toggle: player.querySelector('#tts-toggle'),
      speed: player.querySelector('#tts-speed'),
      status: player.querySelector('#tts-status')
    };
  }

  function setStatus(text, statusEl) {
    if (statusEl) statusEl.textContent = text;
  }

  function setBtnIcon(btn, type) {
    const icon = btn.querySelector('i');
    if (!icon) return;
    if (type === 'play') icon.className = 'fa fa-play';
    else if (type === 'pause') icon.className = 'fa fa-pause';
    else if (type === 'stop') icon.className = 'fa fa-stop';
  }

  function cancelAll() {
    try { window.speechSynthesis && window.speechSynthesis.cancel(); } catch (e) {}
    const st = window.__ttsCurrentState;
    if (st && st.audio) {
      try { st.audio.pause(); } catch (_) {}
      if (st.blobUrl) {
        try { URL.revokeObjectURL(st.blobUrl); } catch (_) {}
        st.blobUrl = null;
      }
      st.isSpeaking = false;
      st.isPaused = false;
    }
  }

  // --------------- Toggle Handler ---------------
  function onToggleClick(state, ui) {
    const { toggle, speed, status } = ui;

    // Initial start
    if (!state.isSpeaking && !state.isPaused) {
      const text = extractArticleText();
      if (!text || text.trim().length < 20) {
        setStatus('本篇内容过短或不可朗读', status);
        return;
      }
      state.rate = parseFloat(speed.value) || 1.0;
      if (state.useRemote) {
        remoteStart(state, ui, text);
      } else {
        state.chunks = splitIntoChunks(text, 180);
        state.index = 0;
        state.cancelled = false;
        ensurePreferredVoice(state, () => {
          speakNext(state, ui);
        });
      }
      return;
    }

    // Pause -> Resume
    if (state.isSpeaking && state.isPaused) {
      if (state.useRemote) {
        if (state.audio) {
          try { state.audio.playbackRate = state.rate; } catch (_) {}
          try { state.audio.play(); } catch (_) {}
        }
      } else {
        try { synth.resume(); } catch (e) {}
      }
      state.isPaused = false;
      setBtnIcon(toggle, 'pause');
      setStatus(`朗读中 · ${state.rate.toFixed(1)}x`, status);
      return;
    }

    // Speaking -> Pause
    if (state.isSpeaking && !state.isPaused) {
      if (state.useRemote) {
        try { state.audio && state.audio.pause(); } catch (_) {}
      } else {
        try { synth.pause(); } catch (e) {}
      }
      state.isPaused = true;
      setBtnIcon(toggle, 'play');
      setStatus('已暂停', status);
      return;
    }
  }

  // --------------- Remote TTS (Gemini via Worker) ---------------
  async function remoteStart(state, ui, text) {
    const { toggle, speed, status } = ui;
    if (!TTS_PROXY_URL) {
      setStatus('未配置云端 TTS，改用浏览器语音', status);
      state.useRemote = false;
      // Fallback to Web Speech
      state.chunks = splitIntoChunks(text, 180);
      state.index = 0;
      state.cancelled = false;
      ensurePreferredVoice(state, () => { speakNext(state, ui); });
      return;
    }

    // Cleanup previous
    if (state.audio) {
      try { state.audio.pause(); } catch (_) {}
      if (state.blobUrl) { try { URL.revokeObjectURL(state.blobUrl); } catch (_) {} }
      state.audio = null;
      state.blobUrl = null;
    }

    try {
      setStatus('正在生成高质量语音…', status);
      setBtnIcon(toggle, 'pause');
      const body = {
        text,
        // 按你的偏好提供默认参数；后端也会有 env 默认值作为兜底
        model: 'gemini-2.5-flash-preview-tts',
        voiceName: 'Leda',
        style: '普通话，温柔少女音色，可爱',
        temperature: 0.7
      };
      const resp = await fetch(TTS_PROXY_URL.replace(/\/$/, '') + '/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      if (!resp.ok) {
        const t = await resp.text();
        throw new Error(`TTS ${resp.status}: ${t}`);
      }
      const buf = await resp.arrayBuffer();
      const blob = new Blob([buf], { type: 'audio/wav' });
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audio.playbackRate = state.rate;

      audio.onplay = () => {
        state.isSpeaking = true;
        state.isPaused = false;
        setBtnIcon(toggle, 'pause');
        setStatus(`朗读中 · ${state.rate.toFixed(1)}x`, status);
      };
      audio.onpause = () => {
        if (!state.isPaused) return; // toggled pause
      };
      audio.onended = () => {
        state.isSpeaking = false;
        state.isPaused = false;
        setBtnIcon(toggle, 'play');
        setStatus('完成', status);
        try { URL.revokeObjectURL(url); } catch (_) {}
        state.blobUrl = null;
      };

      state.audio = audio;
      state.blobUrl = url;
      await audio.play();
    } catch (e) {
      console.error('[tts] remote start failed', e);
      setStatus('云端合成失败，改用浏览器语音', status);
      state.useRemote = false;
      // Fallback to Web Speech
      state.chunks = splitIntoChunks(text, 180);
      state.index = 0;
      state.cancelled = false;
      ensurePreferredVoice(state, () => { speakNext(state, ui); });
    }
  }

  // --------------- Voice Selection ---------------
  function ensurePreferredVoice(state, cb) {
    let done = false;
    const finish = () => { if (!done) { done = true; cb && cb(); } };

    function pick() {
      const voices = synth.getVoices() || [];
      if (!voices.length) return null;

      // Prefer Chinese voices; attempt known gentle female voice hints
      const zhVoices = voices.filter(v => /^(zh|cmn)/i.test(v.lang || ''));
      const nameHints = [
        'Xiaoxiao', '晓晓', 'Huihui', 'Ting-Ting', 'Tingting',
        'Mei-Jia', 'Liang', 'Google 普通话', 'Mandarin', 'Chinese'
      ];

      const scored = zhVoices.map(v => ({ v, score: scoreVoice(v, nameHints) }))
        .sort((a, b) => b.score - a.score);

      const chosen = (scored[0] && scored[0].v) || zhVoices[0] || voices[0];
      return chosen || null;
    }

    function scoreVoice(v, hints) {
      let s = 0;
      const n = (v.name || '') + ' ' + (v.lang || '');
      if (/zh|cmn|中文|普通话/i.test(n)) s += 3;
      for (const h of hints) if (n.includes(h)) s += 2;
      // Prefer Mainland first
      if (/zh-CN|China|Mainland/i.test(n)) s += 1;
      return s;
    }

    const immediate = pick();
    if (immediate) {
      state.voice = immediate;
      state.voicesLoaded = true;
      finish();
    } else {
      const onVoices = () => {
        const v = pick();
        if (v) {
          state.voice = v;
          state.voicesLoaded = true;
          synth.removeEventListener('voiceschanged', onVoices);
          finish();
        }
      };
      synth.addEventListener('voiceschanged', onVoices);
      // Fallback timeout
      setTimeout(() => {
        const v = pick();
        if (v) {
          state.voice = v;
          state.voicesLoaded = true;
          synth.removeEventListener('voiceschanged', onVoices);
          finish();
        }
      }, 1200);
    }
  }

  // --------------- Speaking ---------------
  function speakNext(state, ui) {
    const { toggle, speed, status } = ui;

    if (state.cancelled) return finishAll();
    if (state.index >= state.chunks.length) return finishAll();

    const txt = state.chunks[state.index];
    const utter = new SpeechSynthesisUtterance(txt);
    if (state.voice) utter.voice = state.voice;
    utter.lang = (state.voice && state.voice.lang) || 'zh-CN';
    utter.rate = parseFloat(speed.value) || state.rate || 1.0;
    utter.pitch = 1.06; // slightly gentle
    utter.volume = 1.0;

    utter.onstart = () => {
      state.isSpeaking = true;
      state.isPaused = false;
      setBtnIcon(toggle, 'pause');
      setStatus(`朗读中 · ${utter.rate.toFixed(1)}x`, status);
    };
    utter.onerror = (e) => {
      console.warn('[tts] utterance error', e);
      state.index++;
      speakNext(state, ui);
    };
    utter.onend = () => {
      if (state.cancelled) return finishAll();
      state.index++;
      if (state.index < state.chunks.length) speakNext(state, ui);
      else finishAll();
    };

    try {
      synth.speak(utter);
    } catch (e) {
      console.error('[tts] speak failed', e);
      setStatus('朗读失败，请重试', status);
      setBtnIcon(toggle, 'play');
      state.isSpeaking = false;
      state.isPaused = false;
    }

    function finishAll() {
      state.isSpeaking = false;
      state.isPaused = false;
      state.index = 0;
      setStatus('完成', status);
      setBtnIcon(toggle, 'play');
    }
  }

  // --------------- Text Extraction ---------------
  function extractArticleText() {
    const article = document.querySelector('.post-body');
    if (!article) return '';

    const clone = article.cloneNode(true);
    if (!(clone instanceof HTMLElement)) return '';

    // Remove non-readable parts
    const removeSel = [
      'pre', 'code', '.highlight', '.gutter',
      'table', 'mjx-container', '.MathJax', '.katex',
      '.post-toc', 'script', 'style', 'noscript', 'iframe', 'svg'
    ].join(',');
    clone.querySelectorAll(removeSel).forEach(el => el.remove());

    // Collect readable blocks
    const blocks = clone.querySelectorAll('h1, h2, h3, h4, h5, p, li, blockquote');
    const parts = [];
    blocks.forEach(node => {
      const t = (node.textContent || '').replace(/[\s\u00A0]+/g, ' ').trim();
      if (t) parts.push(t);
    });

    const text = parts.join('。'); // ensure pauses between blocks
    return text.replace(/([。！？!?；;])\s*(?=\S)/g, '$1 ');
  }

  function splitIntoChunks(text, maxLen) {
    maxLen = maxLen || 180;
    const sentences = text
      .replace(/[\r\n]+/g, '。')
      .split(/(?<=[。！？!?；;…])/);

    const chunks = [];
    let buf = '';
    for (const s of sentences) {
      const seg = s.trim();
      if (!seg) continue;
      if ((buf + seg).length > maxLen) {
        if (buf) chunks.push(buf);
        if (seg.length > maxLen) {
          // hard wrap long segment
          for (let i = 0; i < seg.length; i += maxLen) {
            chunks.push(seg.slice(i, i + maxLen));
          }
          buf = '';
        } else {
          buf = seg;
        }
      } else {
        buf += seg;
      }
    }
    if (buf) chunks.push(buf);
    return chunks;
  }
})();
