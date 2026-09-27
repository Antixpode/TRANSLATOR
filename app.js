/**
 * Vocalis NL <-> FR - Moteur de traduction vocale instantanée
 * 100% Web Natif, Gratuit et sans clé d'API.
 */

// --- ÉTAT GLOBAL DE L'APPLICATION ---
const state = {
  // Modes: 'nl-fr' (Écouter NL -> Traduire en FR) ou 'fr-nl' (Parler FR -> Traduire en NL)
  mode: 'nl-fr',
  isListening: false,
  autoTTS: false, // Lecture vocale automatique de la traduction
  interimTranscript: '',
  finalTranscript: '',
  currentTranslation: '',
  isTranslating: false,
  history: [],
  debounceTimer: null,
  recognition: null,
  shouldKeepListening: false
};

// Configuration des langues
const LANG_CONFIG = {
  'nl-fr': {
    sourceCode: 'nl-NL',
    targetCode: 'fr-FR',
    sourceShort: 'nl',
    targetShort: 'fr',
    sourceLabel: 'Néerlandais',
    targetLabel: 'Français',
    sourceFlag: '🇳🇱',
    targetFlag: '🇫🇷',
    sourceInstruction: 'Parlez en néerlandais...',
    badge: 'NL ➜ FR'
  },
  'fr-nl': {
    sourceCode: 'fr-FR',
    targetCode: 'nl-NL',
    sourceShort: 'fr',
    targetShort: 'nl',
    sourceLabel: 'Français',
    targetLabel: 'Néerlandais',
    sourceFlag: '🇫🇷',
    targetFlag: '🇳🇱',
    sourceInstruction: 'Parlez en français...',
    badge: 'FR ➜ NL'
  }
};

// --- ÉLÉMENTS DOM ---
const elements = {
  // Boutons et contrôles
  btnToggleListen: document.getElementById('btn-toggle-listen'),
  btnListenText: document.getElementById('btn-listen-text'),
  btnListenIcon: document.getElementById('btn-listen-icon'),
  micPulseRing: document.getElementById('mic-pulse-ring'),
  btnSwitchMode: document.getElementById('btn-switch-mode'),
  btnClearHistory: document.getElementById('btn-clear-history'),
  btnSpeakCurrent: document.getElementById('btn-speak-current'),
  btnCopyCurrent: document.getElementById('btn-copy-current'),
  btnToggleTts: document.getElementById('btn-toggle-tts'),
  ttsToggleIcon: document.getElementById('tts-toggle-icon'),
  btnThemeToggle: document.getElementById('btn-theme-toggle'),

  // Sélecteurs de mode visuels
  cardModeNlFr: document.getElementById('card-mode-nl-fr'),
  cardModeFrNl: document.getElementById('card-mode-fr-nl'),

  // Badges & statuts
  statusBadge: document.getElementById('status-badge'),
  statusText: document.getElementById('status-text'),
  soundWaves: document.getElementById('sound-waves'),
  currentDirectionBadge: document.getElementById('current-direction-badge'),

  // Affichage du flux en direct
  liveStreamBox: document.getElementById('live-stream-box'),
  livePlaceholder: document.getElementById('live-placeholder'),
  liveSpeechContainer: document.getElementById('live-speech-container'),
  liveSpeechSource: document.getElementById('live-speech-source'),
  liveSpeechTarget: document.getElementById('live-speech-target'),
  liveTranslatingIndicator: document.getElementById('live-translating-indicator'),

  // Historique
  historyContainer: document.getElementById('history-container'),
  historyEmptyNotice: document.getElementById('history-empty-notice'),
  historyList: document.getElementById('history-list'),

  // Alertes
  alertBox: document.getElementById('alert-box'),
  alertMessage: document.getElementById('alert-message')
};

// --- INITIALISATION ---
document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  loadHistory();
  initSpeechRecognition();
  bindEvents();
  updateUIForCurrentMode();
  updateStatus('ready', 'Prêt à écouter');
});

// --- RECONNAISSANCE VOCALE (WEB SPEECH API) ---
function initSpeechRecognition() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

  if (!SpeechRecognition) {
    showAlert(
      'La reconnaissance vocale n\'est pas supportée nativement sur ce navigateur. ' +
      'Veuillez utiliser Google Chrome sur Android ou Safari sur iPad/iOS.',
      'error'
    );
    elements.btnToggleListen.disabled = true;
    updateStatus('error', 'Non supporté');
    return;
  }

  try {
    state.recognition = new SpeechRecognition();
    state.recognition.continuous = true;
    state.recognition.interimResults = true;
    state.recognition.maxAlternatives = 1;

    state.recognition.onstart = () => {
      state.isListening = true;
      updateListenButtonUI(true);
      updateStatus('listening', 'Écoute active...');
      elements.soundWaves.classList.remove('hidden');
      elements.micPulseRing.classList.remove('hidden');
    };

    state.recognition.onresult = (event) => {
      let interim = '';
      let final = '';

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          final += transcript;
        } else {
          interim += transcript;
        }
      }

      handleSpeechResults(final, interim);
    };

    state.recognition.onerror = (event) => {
      console.warn('SpeechRecognition error:', event.error);
      if (event.error === 'not-allowed') {
        showAlert('Accès au microphone refusé. Autorisez le micro dans les paramètres du navigateur.', 'error');
        stopListening();
      } else if (event.error === 'network') {
        showAlert('Erreur réseau détectée pour la reconnaissance vocale.', 'warning');
      } else if (event.error === 'no-speech') {
        // Simple silence, rien de grave
      }
    };

    state.recognition.onend = () => {
      // Si l'utilisateur n'a pas appuyé manuellement sur Arrêter et qu'on doit continuer l'écoute
      if (state.shouldKeepListening) {
        try {
          state.recognition.lang = LANG_CONFIG[state.mode].sourceCode;
          state.recognition.start();
          return;
        } catch (e) {
          console.log('Restart recognition catch:', e);
        }
      }
      state.isListening = false;
      updateListenButtonUI(false);
      elements.soundWaves.classList.add('hidden');
      elements.micPulseRing.classList.add('hidden');
      updateStatus('ready', 'En pause');
    };
  } catch (err) {
    console.error('Initialization error:', err);
    showAlert('Impossible d\'initialiser le micro : ' + err.message, 'error');
  }
}

// --- GESTION DU FLUX AUDIO ET TRADUCTION ---
function handleSpeechResults(finalText, interimText) {
  const currentLang = LANG_CONFIG[state.mode];
  elements.livePlaceholder.classList.add('hidden');
  elements.liveSpeechContainer.classList.remove('hidden');

  // Affichage du texte source capturé
  if (finalText) {
    state.finalTranscript += (state.finalTranscript ? ' ' : '') + finalText.trim();
  }
  state.interimTranscript = interimText;

  const fullCurrentSource = (state.finalTranscript + ' ' + state.interimTranscript).trim();

  // Mise en valeur : final en gras, interim en italique plus clair
  elements.liveSpeechSource.innerHTML = `
    <span class="font-medium text-slate-800 dark:text-slate-100">${escapeHtml(state.finalTranscript)}</span>
    <span class="italic text-slate-500 dark:text-slate-400">${escapeHtml(state.interimTranscript)}</span>
  `;

  if (!fullCurrentSource) return;

  // Traduction instantanée avec debounce pour les résultats intermédiaires
  // Si on a un texte final, traduire immédiatement
  if (finalText) {
    executeTranslation(fullCurrentSource, true);
  } else {
    // Si c'est juste de l'interim, on attend 300ms de répit pour économiser le réseau
    clearTimeout(state.debounceTimer);
    state.debounceTimer = setTimeout(() => {
      executeTranslation(fullCurrentSource, false);
    }, 280);
  }
}

// --- MOTEUR DE TRADUCTION ASYNCHRONE RAPIDE (100% GRATUIT) ---
async function executeTranslation(text, isFinal) {
  if (!text || text.trim().length === 0) return;

  const cfg = LANG_CONFIG[state.mode];
  elements.liveTranslatingIndicator.classList.remove('opacity-0');
  state.isTranslating = true;

  try {
    const translated = await translateWithFallback(text, cfg.sourceShort, cfg.targetShort);

    state.currentTranslation = translated;
    elements.liveSpeechTarget.textContent = translated;
    elements.btnSpeakCurrent.classList.remove('hidden');
    elements.btnCopyCurrent.classList.remove('hidden');

    // Si le segment est validé (fin de phrase / pause marquée)
    if (isFinal && text.trim().length > 1) {
      commitToHistory(text.trim(), translated.trim(), state.mode);
      
      // Lecture vocale automatique si activée
      if (state.autoTTS) {
        speakText(translated, cfg.targetCode);
      }

      // Réinitialisation du tampon courant pour le prochain segment
      state.finalTranscript = '';
      state.interimTranscript = '';
    }
  } catch (error) {
    console.error('Translation error:', error);
  } finally {
    state.isTranslating = false;
    elements.liveTranslatingIndicator.classList.add('opacity-0');
  }
}

/**
 * Traduction multi-moteur sans clé requise
 * Tier 1 : Endpoint ultra-rapide Google GTX
 * Tier 2 : Endpoint MyMemory (fallback gratuit)
 */
async function translateWithFallback(text, src, tgt) {
  // Méthode 1: Google GTX public client (instantané & haute fidélité)
  try {
    const gtxUrl = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${src}&tl=${tgt}&dt=t&q=${encodeURIComponent(text)}`;
    const res = await fetch(gtxUrl, { method: 'GET' });
    if (res.ok) {
      const data = await res.json();
      if (data && data[0] && Array.isArray(data[0])) {
        return data[0].map(chunk => chunk[0]).join('');
      }
    }
  } catch (e) {
    console.warn('Google GTX fallback trigger:', e);
  }

  // Méthode 2: MyMemory API publique (fallback)
  try {
    const mmUrl = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${src}|${tgt}`;
    const res = await fetch(mmUrl);
    if (res.ok) {
      const data = await res.json();
      if (data && data.responseData && data.responseData.translatedText) {
        return data.responseData.translatedText;
      }
    }
  } catch (e) {
    console.warn('MyMemory fallback trigger:', e);
  }

  return `[Traduction indisponible pour le moment]`;
}

// --- SYNTHÈSE VOCALE (TEXT-TO-SPEECH) ---
function speakText(text, langCode) {
  if (!('speechSynthesis' in window) || !text) return;

  // Stopper toute lecture en cours
  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = langCode;
  utterance.rate = 1.0;
  utterance.pitch = 1.0;

  // Tenter de sélectionner une voix naturelle appropriée
  const voices = window.speechSynthesis.getVoices();
  const targetVoice = voices.find(v => v.lang.startsWith(langCode.substring(0, 2)));
  if (targetVoice) {
    utterance.voice = targetVoice;
  }

  window.speechSynthesis.speak(utterance);
}

// --- CONTRÔLES AUDIO ET ÉCOUTE ---
function startListening() {
  if (!state.recognition) {
    initSpeechRecognition();
    if (!state.recognition) return;
  }

  try {
    // Vibration haptique sur mobile
    if (navigator.vibrate) navigator.vibrate(40);

    state.shouldKeepListening = true;
    state.recognition.lang = LANG_CONFIG[state.mode].sourceCode;
    state.recognition.start();
  } catch (e) {
    console.warn('startListening catch:', e);
  }
}

function stopListening() {
  state.shouldKeepListening = false;
  if (state.recognition) {
    try {
      state.recognition.stop();
    } catch (e) {
      console.warn('stopListening catch:', e);
    }
  }
  state.isListening = false;
  updateListenButtonUI(false);
  elements.soundWaves.classList.add('hidden');
  elements.micPulseRing.classList.add('hidden');
  updateStatus('ready', 'Arrêté');
}

function toggleListening() {
  if (state.isListening) {
    stopListening();
  } else {
    startListening();
  }
}

// --- GESTION DES MODES (NL <-> FR) ---
function setMode(newMode) {
  if (state.mode === newMode) return;

  const wasListening = state.isListening;
  if (wasListening) {
    stopListening();
  }

  state.mode = newMode;
  state.finalTranscript = '';
  state.interimTranscript = '';
  state.currentTranslation = '';

  updateUIForCurrentMode();

  // Si on était en train d'écouter, on relance dans la nouvelle langue
  if (wasListening) {
    setTimeout(() => {
      startListening();
    }, 200);
  }
}

function toggleMode() {
  const nextMode = state.mode === 'nl-fr' ? 'fr-nl' : 'nl-fr';
  setMode(nextMode);
}

// --- HISTORIQUE DES TRADUCTIONS ---
function commitToHistory(sourceText, targetText, mode) {
  const entry = {
    id: Date.now(),
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    source: sourceText,
    target: targetText,
    mode: mode
  };

  state.history.unshift(entry);
  if (state.history.length > 50) state.history.pop();

  saveHistory();
  renderHistory();
}

function saveHistory() {
  try {
    localStorage.setItem('vocalis_history', JSON.stringify(state.history));
  } catch (e) {
    console.warn('LocalStorage save failed:', e);
  }
}

function loadHistory() {
  try {
    const saved = localStorage.getItem('vocalis_history');
    if (saved) {
      state.history = JSON.parse(saved);
      renderHistory();
    }
  } catch (e) {
    console.warn('LocalStorage load failed:', e);
  }
}

function clearHistory() {
  state.history = [];
  saveHistory();
  renderHistory();

  // Réinitialiser la vue direct
  state.finalTranscript = '';
  state.interimTranscript = '';
  state.currentTranslation = '';
  elements.liveSpeechContainer.classList.add('hidden');
  elements.livePlaceholder.classList.remove('hidden');
  elements.btnSpeakCurrent.classList.add('hidden');
  elements.btnCopyCurrent.classList.add('hidden');
}

function renderHistory() {
  if (!state.history || state.history.length === 0) {
    elements.historyEmptyNotice.classList.remove('hidden');
    elements.historyList.innerHTML = '';
    return;
  }

  elements.historyEmptyNotice.classList.add('hidden');
  elements.historyList.innerHTML = state.history.map(item => {
    const isNlToFr = item.mode === 'nl-fr';
    const srcFlag = isNlToFr ? '🇳🇱 NL' : '🇫🇷 FR';
    const tgtFlag = isNlToFr ? '🇫🇷 FR' : '🇳🇱 NL';
    const tgtLangCode = isNlToFr ? 'fr-FR' : 'nl-NL';

    return `
      <div class="group p-4 rounded-2xl bg-white/70 dark:bg-slate-800/70 border border-slate-200/80 dark:border-slate-700/80 shadow-sm transition hover:shadow-md">
        <div class="flex items-center justify-between text-xs text-slate-400 dark:text-slate-400 mb-2">
          <span class="inline-flex items-center gap-1.5 font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200">
            ${srcFlag} ➜ ${tgtFlag}
          </span>
          <span>${item.timestamp}</span>
        </div>
        
        <p class="text-sm text-slate-600 dark:text-slate-300 mb-1.5">${escapeHtml(item.source)}</p>
        
        <div class="flex items-start justify-between gap-2 pt-1 border-t border-slate-100 dark:border-slate-700/60">
          <p class="text-base font-semibold text-indigo-600 dark:text-indigo-400">${escapeHtml(item.target)}</p>
          <button 
            onclick="speakText('${escapeForAttr(item.target)}', '${tgtLangCode}')" 
            class="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition" 
            title="Écouter la prononciation"
            aria-label="Écouter"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"/>
            </svg>
          </button>
        </div>
      </div>
    `;
  }).join('');
}

// --- GESTION DE L'INTERFACE UTILISATEUR ---
function updateUIForCurrentMode() {
  const isNlToFr = state.mode === 'nl-fr';
  const cfg = LANG_CONFIG[state.mode];

  // Cartes de mode
  if (isNlToFr) {
    elements.cardModeNlFr.className = "flex-1 p-3.5 sm:p-4 rounded-2xl border-2 border-indigo-600 bg-indigo-50/70 dark:bg-indigo-950/40 text-left transition shadow-sm";
    elements.cardModeFrNl.className = "flex-1 p-3.5 sm:p-4 rounded-2xl border-2 border-transparent bg-white/60 dark:bg-slate-800/60 text-left transition hover:border-slate-300 dark:hover:border-slate-700 opacity-70 hover:opacity-100";
  } else {
    elements.cardModeFrNl.className = "flex-1 p-3.5 sm:p-4 rounded-2xl border-2 border-indigo-600 bg-indigo-50/70 dark:bg-indigo-950/40 text-left transition shadow-sm";
    elements.cardModeNlFr.className = "flex-1 p-3.5 sm:p-4 rounded-2xl border-2 border-transparent bg-white/60 dark:bg-slate-800/60 text-left transition hover:border-slate-300 dark:hover:border-slate-700 opacity-70 hover:opacity-100";
  }

  elements.currentDirectionBadge.textContent = cfg.badge;
  elements.livePlaceholder.textContent = `${cfg.sourceFlag} ${cfg.sourceInstruction}`;
}

function updateListenButtonUI(isListening) {
  if (isListening) {
    elements.btnListenText.textContent = 'Arrêter l\'écoute';
    elements.btnToggleListen.classList.remove('bg-indigo-600', 'hover:bg-indigo-700', 'shadow-indigo-500/25');
    elements.btnToggleListen.classList.add('bg-rose-600', 'hover:bg-rose-700', 'shadow-rose-500/30');
    elements.btnListenIcon.innerHTML = `
      <rect x="6" y="6" width="12" height="12" rx="2" fill="currentColor"/>
    `;
  } else {
    elements.btnListenText.textContent = 'Démarrer l\'écoute';
    elements.btnToggleListen.classList.remove('bg-rose-600', 'hover:bg-rose-700', 'shadow-rose-500/30');
    elements.btnToggleListen.classList.add('bg-indigo-600', 'hover:bg-indigo-700', 'shadow-indigo-500/25');
    elements.btnListenIcon.innerHTML = `
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"/>
    `;
  }
}

function updateStatus(type, message) {
  elements.statusText.textContent = message;
  const badgeClasses = {
    ready: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800',
    listening: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300 border-indigo-300 dark:border-indigo-800 animate-pulse',
    error: 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border-rose-300 dark:border-rose-800'
  };

  elements.statusBadge.className = `inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium border ${badgeClasses[type] || badgeClasses.ready}`;
}

function showAlert(message, type = 'warning') {
  elements.alertMessage.textContent = message;
  elements.alertBox.classList.remove('hidden');
  setTimeout(() => {
    elements.alertBox.classList.add('hidden');
  }, 6000);
}

// --- THÈME SOMBRE / CLAIR AUTOMATIQUE ---
function initTheme() {
  const savedTheme = localStorage.getItem('vocalis_theme');
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

  if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }
}

function toggleTheme() {
  const isDark = document.documentElement.classList.toggle('dark');
  localStorage.setItem('vocalis_theme', isDark ? 'dark' : 'light');
}

// --- ÉCOUTEURS D'ÉVÉNEMENTS ---
function bindEvents() {
  elements.btnToggleListen.addEventListener('click', toggleListening);
  elements.btnSwitchMode.addEventListener('click', toggleMode);
  elements.cardModeNlFr.addEventListener('click', () => setMode('nl-fr'));
  elements.cardModeFrNl.addEventListener('click', () => setMode('fr-nl'));
  elements.btnClearHistory.addEventListener('click', clearHistory);
  elements.btnThemeToggle.addEventListener('click', toggleTheme);

  // Synthèse vocale de la traduction en cours
  elements.btnSpeakCurrent.addEventListener('click', () => {
    if (state.currentTranslation) {
      const cfg = LANG_CONFIG[state.mode];
      speakText(state.currentTranslation, cfg.targetCode);
    }
  });

  // Copier le texte traduit
  elements.btnCopyCurrent.addEventListener('click', async () => {
    if (state.currentTranslation) {
      try {
        await navigator.clipboard.writeText(state.currentTranslation);
        showAlert('Traduction copiée dans le presse-papier !', 'info');
      } catch (err) {
        console.warn('Clipboard failed:', err);
      }
    }
  });

  // Bascule de la lecture automatique
  elements.btnToggleTts.addEventListener('click', () => {
    state.autoTTS = !state.autoTTS;
    if (state.autoTTS) {
      elements.btnToggleTts.classList.add('bg-indigo-600', 'text-white');
      elements.btnToggleTts.classList.remove('bg-slate-200', 'dark:bg-slate-700', 'text-slate-600', 'dark:text-slate-300');
      showAlert('Lecture vocale automatique activée', 'info');
    } else {
      elements.btnToggleTts.classList.remove('bg-indigo-600', 'text-white');
      elements.btnToggleTts.classList.add('bg-slate-200', 'dark:bg-slate-700', 'text-slate-600', 'dark:text-slate-300');
      showAlert('Lecture vocale automatique désactivée', 'info');
    }
  });
}

// --- UTILITAIRES ---
function escapeHtml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function escapeForAttr(str) {
  if (!str) return '';
  return str.replace(/'/g, "\\'").replace(/"/g, '&quot;');
}

// Exposer globalement speakText pour les onclicks inline dans l'historique
window.speakText = speakText;
