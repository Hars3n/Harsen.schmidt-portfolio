/**
 * AUDIO VISUALIZER - GENERATIVE TYPOGRAPHY ENGINE
 * Style: Progressive Text Dispersion (GONE effect)
 * Fichier: audio-visualizer.js
 */

// ============================================================================
// CONFIGURATION & CONSTANTS
// ============================================================================

const CONFIG = {
    fftSize: 2048,
    smoothing: 0.8,
    minDecibels: -90,
    maxDecibels: -10,
    
    typography: {
        fontSize: 16,
        fontFamily: "'JetBrains Mono', monospace",
        lineHeight: 24,
        minSpacing: 0,      // Espacement minimum (texte compact)
        maxSpacing: 200,    // Espacement maximum (dispersion totale)
    },
    
    dispersion: {
        smoothness: 0.08,   // Lissage des transitions
        waveSpeed: 0.015,
        expansionRate: 1.2  // Vitesse d'expansion
    },
    
    colors: {
        accent: '#FF0033',
        secondary: '#00ff88',
        tertiary: '#ff00ff'
    },
    
    presets: {
        cyber: {
            accent: '#00FFFF',
            secondary: '#FF00FF',
            sensitivity: 1.5,
            speed: 1.2
        },
        retro: {
            accent: '#FF6B35',
            secondary: '#F7931E',
            sensitivity: 0.8,
            speed: 0.7
        },
        minimal: {
            accent: '#000000',
            secondary: '#FFFFFF',
            sensitivity: 0.5,
            speed: 0.5
        },
        psyche: {
            accent: '#FF00FF',
            secondary: '#00FF00',
            sensitivity: 2.5,
            speed: 2.0
        }
    }
};

// ============================================================================
// STATE MANAGEMENT
// ============================================================================

const STATE = {
    audioContext: null,
    analyser: null,
    source: null,
    dataArray: null,
    bufferLength: 0,
    
    animationId: null,
    time: 0,
    deltaTime: 0,
    lastFrameTime: 0,
    fps: 0,
    frameCount: 0,
    lastFpsUpdate: 0,
    
    waterfallCtx: null,
    generativeCtx: null,
    waterfallCanvas: null,
    generativeCanvas: null,
    
    textLines: [],
    characters: 'GONE',
    
    currentMode: 1,
    generationSpeed: 1,
    sensitivity: 1,
    isPlaying: false,
    showStats: false,
    showWaterfall: true,
    showGenerative: true,
    motionBlur: false,
    
    avgFrequency: 0,
    peakFrequency: 0,
    bassLevel: 0,
    midLevel: 0,
    trebleLevel: 0,
    beatDetected: false,
    
    isDarkMode: true
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

const Utils = {
    map(value, start1, stop1, start2, stop2) {
        return start2 + (stop2 - start2) * ((value - start1) / (stop1 - start1));
    },
    
    constrain(value, min, max) {
        return Math.min(Math.max(value, min), max);
    },
    
    lerp(start, end, amt) {
        return start + (end - start) * amt;
    },
    
    hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : null;
    },
    
    random(min, max) {
        return Math.random() * (max - min) + min;
    },
    
    easeInOutQuad(t) {
        return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
    }
};

// ============================================================================
// CHARACTER CLASS
// ============================================================================

class Character {
    constructor(char, lineIndex, charIndex, totalChars) {
        this.char = char;
        this.lineIndex = lineIndex;
        this.charIndex = charIndex;
        this.totalChars = totalChars;
        
        this.x = 0;
        this.y = 0;
        this.targetX = 0;
        this.targetY = 0;
        
        this.charSpacing = 0;
        this.targetCharSpacing = 0;
        
        this.opacity = 1.0;
        this.targetOpacity = 1.0;
        
        this.phase = Utils.random(0, Math.PI * 2);
    }
    
    update() {
        this.x = Utils.lerp(this.x, this.targetX, CONFIG.dispersion.smoothness);
        this.y = Utils.lerp(this.y, this.targetY, CONFIG.dispersion.smoothness);
        this.charSpacing = Utils.lerp(this.charSpacing, this.targetCharSpacing, CONFIG.dispersion.smoothness);
        this.opacity = Utils.lerp(this.opacity, this.targetOpacity, CONFIG.dispersion.smoothness);
    }
    
    draw(ctx) {
        ctx.save();
        ctx.globalAlpha = this.opacity;
        
        const color = STATE.isDarkMode ? '#ffffff' : '#0a0a0a';
        ctx.fillStyle = color;
        ctx.font = `${CONFIG.typography.fontSize}px ${CONFIG.typography.fontFamily}`;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        
        ctx.fillText(this.char, this.x, this.y);
        
        ctx.restore();
    }
}

// ============================================================================
// TEXT LINE CLASS
// ============================================================================

class TextLine {
    constructor(text, lineIndex) {
        this.text = text;
        this.lineIndex = lineIndex;
        this.characters = [];
        
        for (let i = 0; i < text.length; i++) {
            this.characters.push(new Character(text[i], lineIndex, i, text.length));
        }
        
        this.baseY = 0;
    }
    
    update() {
        this.characters.forEach(char => char.update());
    }
    
    draw(ctx) {
        this.characters.forEach(char => char.draw(ctx));
    }
}

// ============================================================================
// TYPOGRAPHY SYSTEM
// ============================================================================

const TypographySystem = {
    init() {
        this.createLines();
        console.log(`Typography system initialized with "${STATE.characters}"`);
    },
    
    createLines() {
        STATE.textLines = [];
        const text = STATE.characters;
        
        const numLines = Math.ceil(STATE.generativeCanvas.height / CONFIG.typography.lineHeight) + 2;
        
        for (let i = 0; i < numLines; i++) {
            STATE.textLines.push(new TextLine(text, i));
        }
    },
    
    updateText(newText) {
        STATE.characters = newText || 'GONE';
        this.createLines();
    },
    
    update() {
        STATE.textLines.forEach(line => line.update());
    },
    
    draw(ctx) {
        STATE.textLines.forEach(line => line.draw(ctx));
    }
};

// ============================================================================
// DISPERSION PATTERNS
// ============================================================================

const DispersionPatterns = {
    /**
     * Mode 1: Vertical Dispersion - Effet GONE classique
     * Les lignes du haut sont compactes, celles du bas dispersées
     */
    verticalDispersion(audioData) {
        const intensity = audioData.avgFrequency * STATE.sensitivity * 0.01;
        const bassImpact = audioData.bassLevel * 0.005;
        const canvasHeight = STATE.generativeCanvas.height;
        
        STATE.textLines.forEach((line, lineIndex) => {
            line.baseY = lineIndex * CONFIG.typography.lineHeight;
            
            // Progression verticale: 0 en haut, 1 en bas
            const verticalProgress = line.baseY / canvasHeight;
            
            // Calcul de la dispersion avec courbe exponentielle
            const dispersionAmount = Math.pow(verticalProgress, CONFIG.dispersion.expansionRate);
            
            // Modulation audio
            const audioModulation = Math.sin(STATE.time * CONFIG.dispersion.waveSpeed + lineIndex * 0.1) * intensity * 0.3;
            const beatBoost = audioData.beatDetected ? 1.3 : 1.0;
            
            const finalDispersion = Utils.constrain(
                dispersionAmount + audioModulation * beatBoost,
                0,
                1
            );
            
            // Calculer l'espacement pour cette ligne
            const lineSpacing = Utils.lerp(
                CONFIG.typography.minSpacing,
                CONFIG.typography.maxSpacing,
                finalDispersion
            );
            
            // Opacité diminue avec la dispersion
            const lineOpacity = Utils.lerp(1.0, 0.1, finalDispersion);
            
            // Positionner chaque caractère
            let currentX = 50;
            
            line.characters.forEach((char, charIndex) => {
                char.targetCharSpacing = lineSpacing;
                char.targetX = currentX;
                char.targetY = line.baseY;
                char.targetOpacity = lineOpacity;
                
                currentX += CONFIG.typography.fontSize * 0.6 + lineSpacing;
            });
        });
    },
    
    /**
     * Mode 2: Radial Dispersion - Dispersion depuis le centre
     */
    radialDispersion(audioData) {
        const intensity = audioData.avgFrequency * STATE.sensitivity * 0.01;
        const centerX = STATE.generativeCanvas.width / 2;
        const centerY = STATE.generativeCanvas.height / 2;
        const maxDistance = Math.sqrt(centerX * centerX + centerY * centerY);
        
        STATE.textLines.forEach((line, lineIndex) => {
            line.baseY = lineIndex * CONFIG.typography.lineHeight;
            
            const lineY = line.baseY;
            const distanceFromCenter = Math.abs(lineY - centerY);
            const distanceProgress = distanceFromCenter / maxDistance;
            
            const dispersionAmount = Math.pow(distanceProgress, 1.5);
            const audioModulation = Math.sin(STATE.time * CONFIG.dispersion.waveSpeed * 2 + lineIndex * 0.2) * intensity * 0.2;
            
            const finalDispersion = Utils.constrain(dispersionAmount + audioModulation, 0, 1);
            
            const lineSpacing = Utils.lerp(
                CONFIG.typography.minSpacing,
                CONFIG.typography.maxSpacing * 0.8,
                finalDispersion
            );
            
            const lineOpacity = Utils.lerp(1.0, 0.2, finalDispersion);
            
            let currentX = centerX - (line.text.length * (CONFIG.typography.fontSize * 0.6 + lineSpacing)) / 2;
            
            line.characters.forEach((char, charIndex) => {
                char.targetCharSpacing = lineSpacing;
                char.targetX = currentX;
                char.targetY = line.baseY;
                char.targetOpacity = lineOpacity;
                
                currentX += CONFIG.typography.fontSize * 0.6 + lineSpacing;
            });
        });
    },
    
    /**
     * Mode 3: Wave Dispersion - Ondes de dispersion
     */
    waveDispersion(audioData) {
        const intensity = audioData.avgFrequency * STATE.sensitivity * 0.01;
        const bassImpact = audioData.bassLevel * 0.01;
        
        STATE.textLines.forEach((line, lineIndex) => {
            line.baseY = lineIndex * CONFIG.typography.lineHeight;
            
            // Onde sinusoïdale qui traverse l'écran
            const wavePhase = (STATE.time * CONFIG.dispersion.waveSpeed * 3) - (lineIndex * 0.15);
            const waveValue = (Math.sin(wavePhase) + 1) / 2; // 0 to 1
            
            // Combine avec position verticale
            const verticalProgress = line.baseY / STATE.generativeCanvas.height;
            const combinedProgress = (waveValue * 0.6 + verticalProgress * 0.4);
            
            const dispersionAmount = Math.pow(combinedProgress, 1.3);
            
            const lineSpacing = Utils.lerp(
                CONFIG.typography.minSpacing,
                CONFIG.typography.maxSpacing,
                dispersionAmount * (1 + bassImpact * 0.5)
            );
            
            const lineOpacity = Utils.lerp(1.0, 0.15, dispersionAmount);
            
            let currentX = 50;
            
            line.characters.forEach((char, charIndex) => {
                // Variation par caractère pour effet plus dynamique
                const charWave = Math.sin(wavePhase + charIndex * 0.3) * intensity * 20;
                
                char.targetCharSpacing = lineSpacing;
                char.targetX = currentX + charWave;
                char.targetY = line.baseY;
                char.targetOpacity = lineOpacity;
                
                currentX += CONFIG.typography.fontSize * 0.6 + lineSpacing;
            });
        });
    },
    
    update(audioData) {
        switch(STATE.currentMode) {
            case 1:
                this.verticalDispersion(audioData);
                break;
            case 2:
                this.radialDispersion(audioData);
                break;
            case 3:
                this.waveDispersion(audioData);
                break;
        }
    }
};

// ============================================================================
// AUDIO ANALYSIS ENGINE
// ============================================================================

const AudioEngine = {
    init() {
        STATE.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        STATE.analyser = STATE.audioContext.createAnalyser();
        STATE.analyser.fftSize = CONFIG.fftSize;
        STATE.analyser.smoothingTimeConstant = CONFIG.smoothing;
        STATE.analyser.minDecibels = CONFIG.minDecibels;
        STATE.analyser.maxDecibels = CONFIG.maxDecibels;
        
        STATE.bufferLength = STATE.analyser.frequencyBinCount;
        STATE.dataArray = new Uint8Array(STATE.bufferLength);
        
        console.log('Audio Engine initialized');
    },
    
    connectSource(audioElement) {
        if (!STATE.source) {
            STATE.source = STATE.audioContext.createMediaElementSource(audioElement);
            STATE.source.connect(STATE.analyser);
            STATE.analyser.connect(STATE.audioContext.destination);
            console.log('Audio source connected');
        }
    },
    
    analyze() {
        STATE.analyser.getByteFrequencyData(STATE.dataArray);
        
        let sum = 0;
        let peak = 0;
        for (let i = 0; i < STATE.bufferLength; i++) {
            sum += STATE.dataArray[i];
            if (STATE.dataArray[i] > peak) peak = STATE.dataArray[i];
        }
        STATE.avgFrequency = sum / STATE.bufferLength;
        STATE.peakFrequency = peak;
        
        const bassRange = Math.floor(STATE.bufferLength * 0.1);
        const midRange = Math.floor(STATE.bufferLength * 0.5);
        
        let bassSum = 0;
        for (let i = 0; i < bassRange; i++) {
            bassSum += STATE.dataArray[i];
        }
        STATE.bassLevel = bassSum / bassRange;
        
        let midSum = 0;
        for (let i = bassRange; i < midRange; i++) {
            midSum += STATE.dataArray[i];
        }
        STATE.midLevel = midSum / (midRange - bassRange);
        
        let trebleSum = 0;
        for (let i = midRange; i < STATE.bufferLength; i++) {
            trebleSum += STATE.dataArray[i];
        }
        STATE.trebleLevel = trebleSum / (STATE.bufferLength - midRange);
        
        STATE.beatDetected = STATE.bassLevel > 180;
        
        return {
            avgFrequency: STATE.avgFrequency,
            peakFrequency: STATE.peakFrequency,
            bassLevel: STATE.bassLevel,
            midLevel: STATE.midLevel,
            trebleLevel: STATE.trebleLevel,
            beatDetected: STATE.beatDetected
        };
    }
};

// ============================================================================
// WATERFALL VISUALIZATION
// ============================================================================

const WaterfallViz = {
    init() {
        STATE.waterfallCanvas.width = window.innerWidth;
        STATE.waterfallCanvas.height = window.innerHeight - 70;
        STATE.waterfallCtx = STATE.waterfallCanvas.getContext('2d');
        console.log('Waterfall visualization initialized');
    },
    
    render() {
        const ctx = STATE.waterfallCtx;
        const canvas = STATE.waterfallCanvas;
        
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height - 1);
        ctx.putImageData(imageData, 0, 1);
        
        const step = STATE.bufferLength / canvas.width;
        
        for (let i = 0; i < canvas.width; i++) {
            const value = STATE.dataArray[Math.floor(i * step)];
            
            let r, g, b;
            const rgb = Utils.hexToRgb(CONFIG.colors.accent);
            const rgb2 = Utils.hexToRgb(CONFIG.colors.secondary);
            
            if (value < 64) {
                r = rgb.r * (value / 64);
                g = rgb.g * (value / 64);
                b = rgb.b * (value / 64);
            } else if (value < 128) {
                const t = (value - 64) / 64;
                r = Utils.lerp(rgb.r, rgb2.r, t);
                g = Utils.lerp(rgb.g, rgb2.g, t);
                b = Utils.lerp(rgb.b, rgb2.b, t);
            } else {
                const t = (value - 128) / 127;
                r = Utils.lerp(rgb2.r, 255, t);
                g = Utils.lerp(rgb2.g, 255, t);
                b = Utils.lerp(rgb2.b, 255, t);
            }
            
            ctx.fillStyle = `rgba(${r}, ${g}, ${b}, 0.8)`;
            ctx.fillRect(i, 0, 1, 1);
        }
    }
};

// ============================================================================
// ANIMATION LOOP
// ============================================================================

const AnimationEngine = {
    animate(currentTime) {
        STATE.animationId = requestAnimationFrame(AnimationEngine.animate);
        
        if (STATE.lastFrameTime === 0) {
            STATE.lastFrameTime = currentTime;
        }
        STATE.deltaTime = (currentTime - STATE.lastFrameTime) / 1000;
        STATE.lastFrameTime = currentTime;
        
        STATE.frameCount++;
        if (currentTime - STATE.lastFpsUpdate > 1000) {
            STATE.fps = STATE.frameCount;
            STATE.frameCount = 0;
            STATE.lastFpsUpdate = currentTime;
            UI.updateStats();
        }
        
        const audioData = AudioEngine.analyze();
        
        STATE.time += STATE.generationSpeed;
        
        UI.updateFrequencyBar(audioData.avgFrequency);
        
        if (STATE.showWaterfall) {
            WaterfallViz.render();
        }
        
        if (STATE.showGenerative) {
            const bgColor = STATE.isDarkMode ? '#0a0a0a' : '#f5f5f0';
            STATE.generativeCtx.fillStyle = bgColor;
            STATE.generativeCtx.fillRect(0, 0, STATE.generativeCanvas.width, STATE.generativeCanvas.height);
            
            DispersionPatterns.update(audioData);
            TypographySystem.update();
            TypographySystem.draw(STATE.generativeCtx);
        }
    },
    
    start() {
        if (!STATE.animationId) {
            STATE.lastFrameTime = 0;
            AnimationEngine.animate(0);
            console.log('Animation started');
        }
    },
    
    stop() {
        if (STATE.animationId) {
            cancelAnimationFrame(STATE.animationId);
            STATE.animationId = null;
            STATE.generativeCtx.clearRect(0, 0, STATE.generativeCanvas.width, STATE.generativeCanvas.height);
            console.log('Animation stopped');
        }
    }
};

// ============================================================================
// UI CONTROLLER
// ============================================================================

const UI = {
    init() {
        STATE.waterfallCanvas = document.getElementById('waterfallCanvas');
        STATE.generativeCanvas = document.getElementById('generativeCanvas');
        STATE.generativeCtx = STATE.generativeCanvas.getContext('2d');
        
        this.resizeCanvases();
        WaterfallViz.init();
        TypographySystem.init();
        
        this.setupEventListeners();
        
        setTimeout(() => {
            document.getElementById('loading').classList.add('hidden');
        }, 500);
        
        console.log('UI initialized');
    },
    
    resizeCanvases() {
        STATE.waterfallCanvas.width = window.innerWidth;
        STATE.waterfallCanvas.height = window.innerHeight - 70;
        STATE.generativeCanvas.width = window.innerWidth;
        STATE.generativeCanvas.height = window.innerHeight - 70;
    },
    
    setupEventListeners() {
        const audio = document.getElementById('audio');
        const uploadZone = document.getElementById('uploadZone');
        const fileInput = document.getElementById('fileInput');
        
        uploadZone.addEventListener('click', () => fileInput.click());
        
        uploadZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadZone.classList.add('dragover');
        });
        
        uploadZone.addEventListener('dragleave', () => {
            uploadZone.classList.remove('dragover');
        });
        
        uploadZone.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadZone.classList.remove('dragover');
            const file = e.dataTransfer.files[0];
            if (file && file.type === 'audio/mpeg') {
                this.loadAudio(file);
            }
        });
        
        fileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) this.loadAudio(file);
        });
        
        document.getElementById('playBtn').addEventListener('click', () => {
            audio.play();
            STATE.isPlaying = true;
            AnimationEngine.start();
        });
        
        document.getElementById('pauseBtn').addEventListener('click', () => {
            audio.pause();
            STATE.isPlaying = false;
        });
        
        document.getElementById('stopBtn').addEventListener('click', () => {
            audio.pause();
            audio.currentTime = 0;
            STATE.isPlaying = false;
            AnimationEngine.stop();
        });
        
        document.getElementById('darkBtn').addEventListener('click', () => {
            document.body.classList.remove('light-mode');
            STATE.isDarkMode = true;
            this.setActiveButton('darkBtn', 'lightBtn');
        });
        
        document.getElementById('lightBtn').addEventListener('click', () => {
            document.body.classList.add('light-mode');
            STATE.isDarkMode = false;
            this.setActiveButton('lightBtn', 'darkBtn');
        });

        document.getElementById('generativeToggle').addEventListener('click', () => {
            STATE.showGenerative = !STATE.showGenerative;
            STATE.generativeCanvas.classList.toggle('hidden', !STATE.showGenerative);
            document.getElementById('generativeToggle').classList.toggle('active', STATE.showGenerative);
        });

        document.getElementById('waterfallToggle').addEventListener('click', () => {
            STATE.showWaterfall = !STATE.showWaterfall;
            STATE.waterfallCanvas.classList.toggle('hidden', !STATE.showWaterfall);
            document.getElementById('waterfallToggle').classList.toggle('active', STATE.showWaterfall);
        });

        document.getElementById('motionBlurToggle').addEventListener('click', () => {
            STATE.motionBlur = !STATE.motionBlur;
            document.getElementById('motionBlurToggle').classList.toggle('active', STATE.motionBlur);
        });
        
        for (let i = 1; i <= 3; i++) {
            document.getElementById(`mode${i}`).addEventListener('click', () => {
                STATE.currentMode = i;
                this.setActiveModeButton(i);
            });
        }
        
        document.getElementById('customText').addEventListener('input', (e) => {
            TypographySystem.updateText(e.target.value);
        });
        
        document.getElementById('speedSlider').addEventListener('input', (e) => {
            STATE.generationSpeed = parseFloat(e.target.value);
            document.getElementById('speedValue').textContent = STATE.generationSpeed.toFixed(1) + 'x';
        });
        
        document.getElementById('sensitivitySlider').addEventListener('input', (e) => {
            STATE.sensitivity = parseFloat(e.target.value);
            document.getElementById('sensitivityValue').textContent = STATE.sensitivity.toFixed(1) + 'x';
        });
        
        document.getElementById('densitySlider').addEventListener('input', (e) => {
            const value = parseInt(e.target.value);
            const labels = ['Very Low', 'Low', 'Medium', 'High', 'Very High'];
            document.getElementById('densityValue').textContent = labels[value - 1];
        });
        
        document.getElementById('accentColor').addEventListener('input', (e) => {
            CONFIG.colors.accent = e.target.value;
            document.documentElement.style.setProperty('--accent-color', e.target.value);
        });
        
        document.getElementById('secondaryColor').addEventListener('input', (e) => {
            CONFIG.colors.secondary = e.target.value;
            document.documentElement.style.setProperty('--secondary-accent', e.target.value);
        });
        
        document.getElementById('preset1').addEventListener('click', () => this.applyPreset('cyber'));
        document.getElementById('preset2').addEventListener('click', () => this.applyPreset('retro'));
        document.getElementById('preset3').addEventListener('click', () => this.applyPreset('minimal'));
        document.getElementById('preset4').addEventListener('click', () => this.applyPreset('psyche'));
        
        document.getElementById('statsBtn').addEventListener('click', () => {
            STATE.showStats = !STATE.showStats;
            document.getElementById('stats').classList.toggle('visible', STATE.showStats);
        });
        
        document.getElementById('fullscreenBtn').addEventListener('click', () => {
            if (!document.fullscreenElement) {
                document.documentElement.requestFullscreen();
                document.getElementById('header').classList.add('hidden');
            } else {
                document.exitFullscreen();
                document.getElementById('header').classList.remove('hidden');
            }
        });
        
        document.addEventListener('keydown', (e) => {
            if (e.code === 'Space' && !document.getElementById('playBtn').disabled) {
                e.preventDefault();
                if (audio.paused) {
                    audio.play();
                    STATE.isPlaying = true;
                    AnimationEngine.start();
                } else {
                    audio.pause();
                    STATE.isPlaying = false;
                }
            }
        });
        
        window.addEventListener('resize', () => {
            this.resizeCanvases();
            WaterfallViz.init();
            TypographySystem.createLines();
        });
    },
    
    loadAudio(file) {
        const audio = document.getElementById('audio');
        const url = URL.createObjectURL(file);
        audio.src = url;
        
        document.getElementById('info').textContent = `Chargé: ${file.name}`;
        
        document.getElementById('playBtn').disabled = false;
        document.getElementById('pauseBtn').disabled = false;
        document.getElementById('stopBtn').disabled = false;
        
        if (!STATE.audioContext) {
            AudioEngine.init();
            AudioEngine.connectSource(audio);
        }
    },
    
    applyPreset(presetName) {
        const preset = CONFIG.presets[presetName];
        if (preset) {
            CONFIG.colors.accent = preset.accent;
            CONFIG.colors.secondary = preset.secondary;
            STATE.sensitivity = preset.sensitivity;
            STATE.generationSpeed = preset.speed;
            
            document.documentElement.style.setProperty('--accent-color', preset.accent);
            document.documentElement.style.setProperty('--secondary-accent', preset.secondary);
            document.getElementById('accentColor').value = preset.accent;
            document.getElementById('secondaryColor').value = preset.secondary;
            document.getElementById('sensitivitySlider').value = preset.sensitivity;
            document.getElementById('sensitivityValue').textContent = preset.sensitivity.toFixed(1) + 'x';
            document.getElementById('speedSlider').value = preset.speed;
            document.getElementById('speedValue').textContent = preset.speed.toFixed(1) + 'x';
            
            console.log(`Preset applied: ${presetName}`);
        }
    },
    
    updateFrequencyBar(avgFrequency) {
        const bar = document.getElementById('frequencyBar');
        bar.style.transform = `scaleX(${avgFrequency / 255})`;
    },
    
    updateStats() {
        if (STATE.showStats) {
            document.getElementById('fps').textContent = STATE.fps;
            document.getElementById('particleCount').textContent = STATE.textLines.length;
            document.getElementById('avgFreq').textContent = Math.round(STATE.avgFrequency);
        }
    },
    
    setActiveButton(activeId, inactiveId) {
        document.getElementById(activeId).classList.add('active');
        document.getElementById(inactiveId).classList.remove('active');
    },
    
    setActiveModeButton(modeNumber) {
        for (let i = 1; i <= 3; i++) {
            const btn = document.getElementById(`mode${i}`);
            if (i === modeNumber) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        }
    }
};

// ============================================================================
// APPLICATION INITIALIZATION
// ============================================================================

window.addEventListener('DOMContentLoaded', () => {
    console.log('🎵 Audio Visualizer - Progressive Dispersion Engine');
    console.log('Initializing...');
    
    UI.init();
    
    console.log('✅ Ready!');
});
