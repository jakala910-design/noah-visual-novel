const tg = window.Telegram?.WebApp;

if (tg) {
    tg.ready();
    tg.expand();
    tg.setHeaderColor('#090a0f');
    tg.setBackgroundColor('#090a0f');
}

const state = {
    currentSceneId: 'scene_1',
    lineIndex: 0,
    isTyping: false,
    typeTimer: null,
    fullText: '',
    flags: {},
    audioEnabled: true,
    currentMusic: null,
    autoPlaying: false,       // Статус режима Авто
    autoTimer: null,          // Таймер для перехода к следующей строчке
    dialogueHistory: []       // Массив для хранения истории диалога за сессию
};

// Элементы DOM
const el = {
    container: document.getElementById('game-container'),
    startScreen: document.getElementById('start-screen'),
    btnNewGame: document.getElementById('btn-new-game'),
    btnContinue: document.getElementById('btn-continue'),
    btnAuthor: document.getElementById('btn-author'),
    btnSupport: document.getElementById('btn-support'),
    modal: document.getElementById('info-modal'),
    modalTitle: document.getElementById('modal-title'),
    modalText: document.getElementById('modal-text'),
    modalClose: document.getElementById('modal-close'),
    dialogueBox: document.getElementById('dialogue-box'),
    speaker: document.getElementById('speaker-name'),
    text: document.getElementById('dialogue-text'),
    actBadge: document.getElementById('act-badge'),
    bgLayer: document.getElementById('bg-layer'),
    bgLabel: document.getElementById('bg-placeholder-label'),
    charSprite: document.getElementById('char-sprite'),
    charPlaceholder: document.getElementById('char-placeholder'),
    choicesOverlay: document.getElementById('choices-overlay'),
    choicesContainer: document.getElementById('choices-container'),
    vfxGrain: document.getElementById('vfx-grain'),
    vfxAlert: document.getElementById('vfx-alert'),
    spaceCanvas: document.getElementById('space-canvas'),
    bgm: document.getElementById('bgm-player'),
    audioToggle: document.getElementById('audio-toggle'),
    // Новые элементы управления
    menuBtn: document.getElementById('menu-btn'),
    autoToggle: document.getElementById('auto-toggle'),
    historyToggle: document.getElementById('history-toggle'),
    historyModal: document.getElementById('history-modal'),
    historyClose: document.getElementById('history-close'),
    historyList: document.getElementById('history-list')
};

function checkSave() {
    const savedScene = localStorage.getItem('noah_game_scene');
    if (savedScene && STORY[savedScene]) {
        el.btnContinue.classList.remove('hidden');
    } else {
        el.btnContinue.classList.add('hidden');
    }
}
checkSave();

function haptic(type = 'light') {
    if (!tg?.HapticFeedback) return;
    if (['error', 'success', 'warning'].includes(type)) {
        tg.HapticFeedback.notificationOccurred(type);
    } else {
        tg.HapticFeedback.impactOccurred(type);
    }
}

const speakerColors = {
    'Ноа': '#60a5fa',
    'Лина': '#f472b6',
    'Ник': '#34d399',
    'Система': '#ef4444',
    'Мысли': '#9ca3af'
};

// Кнопка: Новая игра
el.btnNewGame.addEventListener('click', () => {
    haptic('medium');
    localStorage.removeItem('noah_game_scene');
    localStorage.removeItem('noah_game_line');
    state.currentSceneId = 'scene_1';
    state.lineIndex = 0;
    state.dialogueHistory = [];
    startGame();
});

// Кнопка: Продолжить
el.btnContinue.addEventListener('click', () => {
    haptic('medium');
    const savedScene = localStorage.getItem('noah_game_scene');
    const savedLine = parseInt(localStorage.getItem('noah_game_line') || '0', 10);
    if (savedScene && STORY[savedScene]) {
        state.currentSceneId = savedScene;
        state.lineIndex = savedLine;
    }
    startGame();
});

// Кнопка: Выход в меню во время игры
el.menuBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    haptic('medium');
    stopAutoPlay();
    el.dialogueBox.classList.add('hidden');
    el.choicesOverlay.classList.add('hidden');
    el.startScreen.classList.remove('hidden');
    checkSave(); // Обновляем видимость кнопки "Продолжить"
});

// Кнопка: Автопрокрутка
el.autoToggle.addEventListener('click', (e) => {
    e.stopPropagation();
    haptic('light');
    state.autoPlaying = !state.autoPlaying;
    if (state.autoPlaying) {
        el.autoToggle.classList.add('active-auto');
        el.autoToggle.textContent = '⏸';
        // Если текст уже допечатался, сразу запускаем таймер переключения
        if (!state.isTyping) triggerAutoNext();
    } else {
        stopAutoPlay();
    }
});

function stopAutoPlay() {
    state.autoPlaying = false;
    el.autoToggle.classList.remove('active-auto');
    el.autoToggle.textContent = '▶';
    clearTimeout(state.autoTimer);
}

function triggerAutoNext() {
    if (!state.autoPlaying) return;
    clearTimeout(state.autoTimer);
    state.autoTimer = setTimeout(() => {
        if (!state.autoPlaying) return;
        advanceDialogue();
    }, 2200); // Пауза 2.2 секунды перед следующей репликой
}

// Кнопка: Открыть историю диалогов
el.historyToggle.addEventListener('click', (e) => {
    e.stopPropagation();
    haptic('light');
    stopAutoPlay();
    renderHistoryModal();
    el.historyModal.classList.remove('hidden');
});

el.historyClose.addEventListener('click', () => {
    haptic('light');
    el.historyModal.classList.add('hidden');
});

function renderHistoryModal() {
    el.historyList.innerHTML = '';
    state.dialogueHistory.forEach(item => {
        const div = document.createElement('div');
        div.className = 'history-item';
        const speakerColor = speakerColors[item.speaker] || '#e5e7eb';
        div.innerHTML = `<span class="h-speaker" style="color: ${speakerColor}">${item.speaker === 'Мысли' ? '' : item.speaker}</span>${item.text}`;
        el.historyList.appendChild(div);
    });
    el.historyList.scrollTop = el.historyList.scrollHeight;
}

// Контакты и поддержка
el.btnAuthor.addEventListener('click', () => {
    haptic('light');
    el.modalTitle.textContent = 'Контакты автора';
    el.modalText.textContent = 'Сценарий и идея: Жакупов Бекзат.\nРазработка и движок: Бисаримов Бекасыл и Жакупов Бекзат.\nНовелла На одной из.';
    el.modal.classList.remove('hidden');
});

el.btnSupport.addEventListener('click', () => {
    haptic('light');
    el.modalTitle.textContent = 'Поддержка игры';
    el.modalText.textContent = 'Если вам понравилась новелла, поделитесь ею с друзьями и можете отправить звезды автору @vellmixmolodoikrasivi и @bekasyl01';
    el.modal.classList.remove('hidden');
});

el.modalClose.addEventListener('click', () => {
    haptic('light');
    el.modal.classList.add('hidden');
});

function startGame() {
    el.startScreen.classList.add('hidden');
    el.dialogueBox.classList.remove('hidden');
    loadScene(state.currentSceneId, state.lineIndex);
}

el.audioToggle.addEventListener('click', (e) => {
    e.stopPropagation();
    state.audioEnabled = !state.audioEnabled;
    el.audioToggle.textContent = state.audioEnabled ? '🔊' : '🔇';
    if (state.audioEnabled && state.currentMusic) {
        el.bgm.play().catch(() => {});
    } else {
        el.bgm.pause();
    }
});

// Клик по диалоговому окну (пролистывание)
el.dialogueBox.addEventListener('click', () => {
    advanceDialogue();
});

function advanceDialogue() {
    if (state.isTyping) {
        clearInterval(state.typeTimer);
        el.text.textContent = state.fullText;
        state.isTyping = false;
        if (state.autoPlaying) triggerAutoNext();
        return;
    }
    
    clearTimeout(state.autoTimer);
    state.lineIndex++;
    
    localStorage.setItem('noah_game_scene', state.currentSceneId);
    localStorage.setItem('noah_game_line', state.lineIndex);
    
    renderLine();
}

function loadScene(sceneId, startLine = 0) {
    const scene = STORY[sceneId];
    if (!scene) return;

    state.currentSceneId = sceneId;
    state.lineIndex = startLine;

    if (scene.act) el.actBadge.textContent = scene.act;

    el.bgLayer.className = 'layer';
    if (scene.bgImage) {
        el.bgLayer.style.backgroundImage = `url('${scene.bgImage}')`;
        el.bgLabel.classList.add('hidden');
    } else {
        el.bgLayer.style.backgroundImage = '';
        el.bgLayer.classList.add(scene.bgClass || 'bg-warm-cafe');
        el.bgLabel.textContent = scene.locationName || '';
        el.bgLabel.classList.remove('hidden');
    }

    el.vfxGrain.classList.toggle('hidden', scene.vfx !== 'grain');
    el.vfxAlert.classList.toggle('hidden', scene.vfx !== 'alert');
    el.spaceCanvas.classList.toggle('hidden', scene.vfx !== 'space');
    if (scene.vfx === 'space') startStarfield();

    if (scene.music && scene.music !== state.currentMusic) {
        state.currentMusic = scene.music;
        el.bgm.src = scene.music;
        if (state.audioEnabled) el.bgm.play().catch(() => {});
    }

    renderLine();
}

function renderLine() {
    const scene = STORY[state.currentSceneId];
    
    if (state.lineIndex >= scene.lines.length) {
        stopAutoPlay();
        if (scene.choices) {
            showChoices(scene.choices);
        } else if (scene.next) {
            loadScene(scene.next, 0);
            localStorage.setItem('noah_game_scene', state.currentSceneId);
            localStorage.setItem('noah_game_line', 0);
        }
        return;
    }

    const line = scene.lines[state.lineIndex];

    if (line.shake) {
        el.container.classList.remove('shake');
        void el.container.offsetWidth;
        el.container.classList.add('shake');
        haptic('error');
    } else if (line.haptic) {
        haptic(line.haptic);
    }

    if (line.spriteImage) {
        el.charSprite.src = line.spriteImage;
        el.charSprite.classList.remove('hidden');
        el.charPlaceholder.classList.add('hidden');
    } else if (line.charLabel) {
        el.charSprite.classList.add('hidden');
        el.charPlaceholder.textContent = `[ ${line.charLabel} ]`;
        el.charPlaceholder.classList.remove('hidden');
    } else {
        el.charSprite.classList.add('hidden');
        el.charPlaceholder.classList.add('hidden');
    }

    let processedText = line.text;
    for (const [key, val] of Object.entries(state.flags)) {
        processedText = processedText.replace(`{${key}}`, val);
    }

    const speaker = line.speaker || 'Мысли';
    el.speaker.textContent = speaker === 'Мысли' ? '' : speaker;
    el.speaker.style.color = speakerColors[speaker] || '#e5e7eb';

    // Добавляем реплику в историю диалогов
    state.dialogueHistory.push({ speaker: speaker, text: processedText });

    typeText(processedText);
}

function typeText(text) {
    clearInterval(state.typeTimer);
    state.isTyping = true;
    state.fullText = text;
    el.text.textContent = '';
    let i = 0;

    state.typeTimer = setInterval(() => {
        el.text.textContent += text.charAt(i);
        i++;
        if (i >= text.length) {
            clearInterval(state.typeTimer);
            state.isTyping = false;
            // Если включен режим авто, запускаем таймер для перехода к следующей строке
            if (state.autoPlaying) triggerAutoNext();
        }
    }, 24);
}

function showChoices(choices) {
    el.choicesContainer.innerHTML = '';
    choices.forEach(choice => {
        const btn = document.createElement('button');
        btn.className = 'choice-btn';
        btn.textContent = choice.text;
        btn.onclick = () => {
            haptic('medium');

            // Обработка возврата в главное меню через action: 'menu'
            if (choice.action === 'menu') {
                stopAutoPlay();
                el.dialogueBox.classList.add('hidden');
                el.choicesOverlay.classList.add('hidden');
                el.startScreen.classList.remove('hidden');
                checkSave();
                return;
            }

            if (choice.setFlag) {
                Object.assign(state.flags, choice.setFlag);
            }
            el.choicesOverlay.classList.add('hidden');
            loadScene(choice.next, 0);
            localStorage.setItem('noah_game_scene', choice.next);
            localStorage.setItem('noah_game_line', 0);
        };
        el.choicesContainer.appendChild(btn);
    });
    el.choicesOverlay.classList.remove('hidden');
}

let starsStarted = false;
function startStarfield() {
    if (starsStarted) return;
    starsStarted = true;
    const canvas = el.spaceCanvas;
    const ctx = canvas.getContext('2d');
    canvas.width = el.container.clientWidth;
    canvas.height = el.container.clientHeight;

    const stars = Array.from({ length: 90 }, () => ({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        size: Math.random() * 1.8,
        speed: 0.15 + Math.random() * 0.4
    }));

    function animate() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
        stars.forEach(s => {
            s.y += s.speed;
            if (s.y > canvas.height) s.y = 0;
            ctx.beginPath();
            ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
            ctx.fill();
        });
        requestAnimationFrame(animate);
    }
    animate();
}