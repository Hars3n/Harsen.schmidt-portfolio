/**
 * AUDIO VISUALIZER - GENERATIVE TYPOGRAPHY ENGINE
 * Architecture modulaire avec effets génératifs avancés
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
    
    grid: {
        charWidth: 12,  // Largeur monospace
        charHeight: 20, // Hauteur monospace
        fontSize: 16
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
    // Audio
    audioContext: null,
    analyser: null,
    source: null,
    dataArray: null,
    bufferLength: 0,
    
    // Animation
    animationId: null,
    time: 0,
    deltaTime: 0,
    lastFrameTime: 0,
    fps: 0,
    frameCount: 0,
    lastFpsUpdate: 0,
    
    // Canvas
    waterfallCtx: null,
    generativeCtx: null,
    waterfallCanvas: null,
    generativeCanvas: null,
    
    // Grid
    gridCols: 0,
    gridRows: 0,
    grid: [],
    
    // Settings
    currentMode: 1,
    generationSpeed: 1,
    sensitivity: 1,
    characters: 'GO',
    isPlaying: false,
    showStats: false,
    showWaterfall: true,
    showGenerative: true,
    motionBlur: false,
    
    // Audio analysis
    avgFrequency: 0,
    peakFrequency: 0,
    bassLevel: 0,
    midLevel: 0,
    trebleLevel: 0,
    beatDetected: false,
    
    // Theme
    isDarkMode: true
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

const Utils = {
    /**
     * Map a value from one range to another
     */
    map(value, start1, stop1, start2, stop2) {
        return start2 + (stop2 - start2) * ((value - start1) / (stop1 - start1));
    },
    
    /**
     * Constrain value between min and max
     */
    constrain(value, min, max) {
        return Math.min(Math.max(value, min), max);
    },
    
    /**
     * Linear interpolation
     */
    lerp(start, end, amt) {
        return start + (end - start) * amt;
    },
    
    /**
     * Convert hex color to RGB
     */
    hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : null;
    },
    
    /**
     * Generate random value between min and max
     */
    random(min, max) {
        return Math.random() * (max - min) + min;
    }
};

// ============================================================================
// GRID SYSTEM - Monospace Typography Grid
// ============================================================================

const GridSystem = {
    /**
     * Initialize grid system
     */
    init() {
        const canvas = STATE.generativeCanvas;
        STATE.gridCols = Math.floor(canvas.width / CONFIG.grid.charWidth);
        STATE.gridRows = Math.floor(canvas.height / CONFIG.grid.charHeight);
        
        // Create empty grid
        STATE.grid = [];
        for (let y = 0; y < STATE.gridRows; y++) {
            STATE.grid[y] = [];
            for (let x = 0; x < STATE.gridCols; x++) {
                STATE.grid[y][x] = ' ';
            }
        }
        
        console.log(`Grid initialized: ${STATE.gridCols}x${STATE.gridRows}`);
    },
    
    /**
     * Clear grid
     */
    clear() {
        for (let y = 0; y < STATE.gridRows; y++) {
            for (let x = 0; x < STATE.gridCols; x++) {
                STATE.grid[y][x] = ' ';
            }
        }
    },
    
    /**
     * Set character at grid position
     */
    setChar(x, y, char) {
        x = Math.floor(x);
        y = Math.floor(y);
        if (x >= 0 && x < STATE.gridCols && y >= 0 && y < STATE.gridRows) {
            STATE.grid[y][x] = char;
        }
    },
    
    /**
     * Render grid to canvas
     */
    render(ctx) {
        ctx.font = `${CONFIG.grid.fontSize}px 'JetBrains Mono', monospace`;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        
        const color = STATE.isDarkMode ? '#ffffff' : '#0a0a0a';
        ctx.fillStyle = color;
        
        for (let y = 0; y < STATE.gridRows; y++) {
            for (let x = 0; x < STATE.gridCols; x++) {
                const char = STATE.grid[y][x];
                if (char !== ' ') {
                    ctx.fillText(
                        char,
                        x * CONFIG.grid.charWidth,
                        y * CONFIG.grid.charHeight
                    );
                }
            }
        }
    }
};

// ============================================================================
// GENERATIVE PATTERNS - Mathematical Curves
// ============================================================================

const GenerativePatterns = {
    /**
     * Mode 1: Liquid - Flowing wave patterns
     */
    liquid(audioData) {
        GridSystem.clear();
        
        const word = STATE.characters;
        const intensity = audioData.avgFrequency * STATE.sensitivity * 0.01;
        const bassImpact = audioData.bassLevel * 0.005;
        
        let charIndex = 0;
        
        // Create multiple horizontal waves
        const numWaves = 5;
        for (let waveNum = 0; waveNum < numWaves; waveNum++) {
            const baseY = (STATE.gridRows / (numWaves + 1)) * (waveNum + 1);
            
            for (let x = 0; x < STATE.gridCols; x++) {
                // Multi-layered sine waves for organic movement
                const wave1 = Math.sin((x * 0.1) + (STATE.time * 0.02)) * intensity * 3;
                const wave2 = Math.sin((x * 0.05) + (STATE.time * 0.015) + waveNum) * intensity * 2;
                const wave3 = Math.sin((x * 0.15) + (STATE.time * 0.025) + waveNum * 2) * bassImpact * 5;
                
                const y = baseY + wave1 + wave2 + wave3;
                
                // Place character
                const char = word[charIndex % word.length];
                GridSystem.setChar(x, y, char);
                charIndex++;
            }
        }
    },
    
    /**
     * Mode 2: Pulse - Circular/radial patterns
     */
    pulse(audioData) {
        GridSystem.clear();
        
        const word = STATE.characters;
        const centerX = STATE.gridCols / 2;
        const centerY = STATE.gridRows / 2;
        const intensity = audioData.avgFrequency * STATE.sensitivity * 0.01;
        const beatPulse = audioData.beatDetected ? 1.5 : 1.0;
        
        let charIndex = 0;
        
        // Create concentric circles
        const numCircles = 8;
        for (let circleNum = 1; circleNum <= numCircles; circleNum++) {
            const baseRadius = (circleNum / numCircles) * Math.min(centerX, centerY) * 0.8;
            const radiusVariation = Math.sin(STATE.time * 0.03 + circleNum) * intensity * 2;
            const radius = (baseRadius + radiusVariation) * beatPulse;
            
            // Number of points on circle based on circumference
            const circumference = 2 * Math.PI * radius;
            const numPoints = Math.floor(circumference / 2);
            
            for (let i = 0; i < numPoints; i++) {
                const angle = (i / numPoints) * Math.PI * 2;
                const x = centerX + Math.cos(angle) * radius;
                const y = centerY + Math.sin(angle) * radius;
                
                const char = word[charIndex % word.length];
                GridSystem.setChar(x, y, char);
                charIndex++;
            }
        }
    },
    
    /**
     * Mode 3: Vortex - Spiral patterns
     */
    vortex(audioData) {
        GridSystem.clear();
        
        const word = STATE.characters;
        const centerX = STATE.gridCols / 2;
        const centerY = STATE.gridRows / 2;
        const intensity = audioData.avgFrequency * STATE.sensitivity * 0.01;
        const midImpact = audioData.midLevel * 0.01;
        
        let charIndex = 0;
        
        // Create multiple spirals
        const numSpirals = 3;
        for (let spiralNum = 0; spiralNum < numSpirals; spiralNum++) {
            const angleOffset = (spiralNum / numSpirals) * Math.PI * 2;
            const maxRadius = Math.min(centerX, centerY) * 0.9;
            const numPoints = 200;
            
            for (let i = 0; i < numPoints; i++) {
                const t = i / numPoints;
                
                // Archimedean spiral with audio modulation
                const angle = t * Math.PI * 8 + (STATE.time * 0.02) + angleOffset;
                const radiusBase = t * maxRadius;
                const radiusWave = Math.sin(angle * 2 + STATE.time * 0.03) * intensity * 3;
                const radius = radiusBase + radiusWave + (midImpact * 10);
                
                const x = centerX + Math.cos(angle) * radius;
                const y = centerY + Math.sin(angle) * radius;
                
                const char = word[charIndex % word.length];
                GridSystem.setChar(x, y, char);
                charIndex++;
            }
        }
    },
    
    /**
     * Update pattern based on current mode
     */
    update(audioData) {
        switch(STATE.currentMode) {
            case 1:
                this.liquid(audioData);
                break;
            case 2:
                this.pulse(audioData);
                break;
            case 3:
                this.vortex(audioData);
                break;
        }
    }
};

// ============================================================================
// AUDIO ANALYSIS ENGINE
// ============================================================================

const AudioEngine = {
    /**
     * Initialize audio context and analyser
     */
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
    
    /**
     * Connect audio source
     */
    connectSource(audioElement) {
        if (!STATE.source) {
            STATE.source = STATE.audioContext.createMediaElementSource(audioElement);
            STATE.source.connect(STATE.analyser);
            STATE.analyser.connect(STATE.audioContext.destination);
            console.log('Audio source connected');
        }
    },
    
    /**
     * Analyze audio and extract features
     */
    analyze() {
        STATE.analyser.getByteFrequencyData(STATE.dataArray);
        
        // Calculate average frequency
        let sum = 0;
        let peak = 0;
        for (let i = 0; i < STATE.bufferLength; i++) {
            sum += STATE.dataArray[i];
            if (STATE.dataArray[i] > peak) peak = STATE.dataArray[i];
        }
        STATE.avgFrequency = sum / STATE.bufferLength;
        STATE.peakFrequency = peak;
        
        // Frequency bands
        const bassRange = Math.floor(STATE.bufferLength * 0.1);
        const midRange = Math.floor(STATE.bufferLength * 0.5);
        
        // Bass (0-10%)
        let bassSum = 0;
        for (let i = 0; i < bassRange; i++) {
            bassSum += STATE.dataArray[i];
        }
        STATE.bassLevel = bassSum / bassRange;
        
        // Mid (10-50%)
        let midSum = 0;
        for (let i = bassRange; i < midRange; i++) {
            midSum += STATE.dataArray[i];
        }
        STATE.midLevel = midSum / (midRange - bassRange);
        
        // Treble (50-100%)
        let trebleSum = 0;
        for (let i = midRange; i < STATE.bufferLength; i++) {
            trebleSum += STATE.dataArray[i];
        }
        STATE.trebleLevel = trebleSum / (STATE.bufferLength - midRange);
        
        // Simple beat detection
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
    /**
     * Initialize waterfall canvas
     */
    init() {
        STATE.waterfallCanvas.width = window.innerWidth;
        STATE.waterfallCanvas.height = window.innerHeight - 70;
        STATE.waterfallCtx = STATE.waterfallCanvas.getContext('2d');
        console.log('Waterfall visualization initialized');
    },
    
    /**
     * Render waterfall effect
     */
    render() {
        const ctx = STATE.waterfallCtx;
        const canvas = STATE.waterfallCanvas;
        
        // Scroll previous frame down
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height - 1);
        ctx.putImageData(imageData, 0, 1);
        
        // Draw new line at top
        const step = STATE.bufferLength / canvas.width;
        
        for (let i = 0; i < canvas.width; i++) {
            const value = STATE.dataArray[Math.floor(i * step)];
            
            // Color mapping
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
    /**
     * Main animation loop
     */
    animate(currentTime) {
        STATE.animationId = requestAnimationFrame(AnimationEngine.animate);
        
        // Calculate delta time
        if (STATE.lastFrameTime === 0) {
            STATE.lastFrameTime = currentTime;
        }
        STATE.deltaTime = (currentTime - STATE.lastFrameTime) / 1000;
        STATE.lastFrameTime = currentTime;
        
        // Update FPS
        STATE.frameCount++;
        if (currentTime - STATE.lastFpsUpdate > 1000) {
            STATE.fps = STATE.frameCount;
            STATE.frameCount = 0;
            STATE.lastFpsUpdate = currentTime;
            UI.updateStats();
        }
        
        // Analyze audio
        const audioData = AudioEngine.analyze();
        
        // Update time based on speed
        STATE.time += STATE.generationSpeed;
        
        // Update frequency bar
        UI.updateFrequencyBar(audioData.avgFrequency);
        
        // Render waterfall only if enabled
        if (STATE.showWaterfall) {
            WaterfallViz.render();
        }
        
        // Render generative only if enabled
        if (STATE.showGenerative) {
            // Clear canvas
            const bgColor = STATE.isDarkMode ? '#0a0a0a' : '#f5f5f0';
            STATE.generativeCtx.fillStyle = bgColor;
            STATE.generativeCtx.fillRect(0, 0, STATE.generativeCanvas.width, STATE.generativeCanvas.height);
            
            // Update and render pattern
            GenerativePatterns.update(audioData);
            GridSystem.render(STATE.generativeCtx);
        }
    },
    
    /**
     * Start animation
     */
    start() {
        if (!STATE.animationId) {
            STATE.lastFrameTime = 0;
            AnimationEngine.animate(0);
            console.log('Animation started');
        }
    },
    
    /**
     * Stop animation
     */
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
    /**
     * Initialize UI elements
     */
    init() {
        // Get canvas elements
        STATE.waterfallCanvas = document.getElementById('waterfallCanvas');
        STATE.generativeCanvas = document.getElementById('generativeCanvas');
        STATE.generativeCtx = STATE.generativeCanvas.getContext('2d');
        
        // Initialize canvases
        this.resizeCanvases();
        WaterfallViz.init();
        GridSystem.init();
        
        // Setup event listeners
        this.setupEventListeners();
        
        // Hide loading screen
        setTimeout(() => {
            document.getElementById('loading').classList.add('hidden');
        }, 500);
        
        console.log('UI initialized');
    },
    
    /**
     * Resize canvas elements
     */
    resizeCanvases() {
        STATE.waterfallCanvas.width = window.innerWidth;
        STATE.waterfallCanvas.height = window.innerHeight - 70;
        STATE.generativeCanvas.width = window.innerWidth;
        STATE.generativeCanvas.height = window.innerHeight - 70;
    },
    
    /**
     * Setup all event listeners
     */
    setupEventListeners() {
        const audio = document.getElementById('audio');
        const uploadZone = document.getElementById('uploadZone');
        const fileInput = document.getElementById('fileInput');
        
        // Upload handlers
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
        
        // Playback controls
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
        
        // Theme controls
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

        // Display toggles
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
        
        // Mode controls - FIX: Un seul mode actif à la fois
        for (let i = 1; i <= 3; i++) {
            document.getElementById(`mode${i}`).addEventListener('click', () => {
                STATE.currentMode = i;
                this.setActiveModeButton(i);
            });
        }
        
        // Custom text
        document.getElementById('customText').addEventListener('input', (e) => {
            STATE.characters = e.target.value || 'GO';
        });
        
        // Speed control
        document.getElementById('speedSlider').addEventListener('input', (e) => {
            STATE.generationSpeed = parseFloat(e.target.value);
            document.getElementById('speedValue').textContent = STATE.generationSpeed.toFixed(1) + 'x';
        });
        
        // Sensitivity control
        document.getElementById('sensitivitySlider').addEventListener('input', (e) => {
            STATE.sensitivity = parseFloat(e.target.value);
            document.getElementById('sensitivityValue').textContent = STATE.sensitivity.toFixed(1) + 'x';
        });
        
        // Density control - Removed as no longer needed with grid system
        document.getElementById('densitySlider').addEventListener('input', (e) => {
            const value = parseInt(e.target.value);
            const labels = ['Very Low', 'Low', 'Medium', 'High', 'Very High'];
            document.getElementById('densityValue').textContent = labels[value - 1];
        });
        
        // Color controls
        document.getElementById('accentColor').addEventListener('input', (e) => {
            CONFIG.colors.accent = e.target.value;
            document.documentElement.style.setProperty('--accent-color', e.target.value);
        });
        
        document.getElementById('secondaryColor').addEventListener('input', (e) => {
            CONFIG.colors.secondary = e.target.value;
            document.documentElement.style.setProperty('--secondary-accent', e.target.value);
        });
        
        // Preset controls
        document.getElementById('preset1').addEventListener('click', () => this.applyPreset('cyber'));
        document.getElementById('preset2').addEventListener('click', () => this.applyPreset('retro'));
        document.getElementById('preset3').addEventListener('click', () => this.applyPreset('minimal'));
        document.getElementById('preset4').addEventListener('click', () => this.applyPreset('psyche'));
        
        // Stats toggle
        document.getElementById('statsBtn').addEventListener('click', () => {
            STATE.showStats = !STATE.showStats;
            document.getElementById('stats').classList.toggle('visible', STATE.showStats);
        });
        
        // Fullscreen
        document.getElementById('fullscreenBtn').addEventListener('click', () => {
            if (!document.fullscreenElement) {
                document.documentElement.requestFullscreen();
                document.getElementById('header').classList.add('hidden');
            } else {
                document.exitFullscreen();
                document.getElementById('header').classList.remove('hidden');
            }
        });
        
        // Keyboard shortcuts
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
        
        // Window resize
        window.addEventListener('resize', () => {
            this.resizeCanvases();
            WaterfallViz.init();
            GridSystem.init();
        });
    },
    
    /**
     * Load audio file
     */
    loadAudio(file) {
        const audio = document.getElementById('audio');
        const url = URL.createObjectURL(file);
        audio.src = url;
        
        document.getElementById('info').textContent = `Chargé: ${file.name}`;
        
        // Enable controls
        document.getElementById('playBtn').disabled = false;
        document.getElementById('pauseBtn').disabled = false;
        document.getElementById('stopBtn').disabled = false;
        
        // Initialize audio context if needed
        if (!STATE.audioContext) {
            AudioEngine.init();
            AudioEngine.connectSource(audio);
        }
    },
    
    /**
     * Apply preset configuration
     */
    applyPreset(presetName) {
        const preset = CONFIG.presets[presetName];
        if (preset) {
            CONFIG.colors.accent = preset.accent;
            CONFIG.colors.secondary = preset.secondary;
            STATE.sensitivity = preset.sensitivity;
            STATE.generationSpeed = preset.speed;
            
            // Update UI
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
    
    /**
     * Update frequency bar
     */
    updateFrequencyBar(avgFrequency) {
        const bar = document.getElementById('frequencyBar');
        bar.style.transform = `scaleX(${avgFrequency / 255})`;
    },
    
    /**
     * Update performance stats
     */
    updateStats() {
        if (STATE.showStats) {
            document.getElementById('fps').textContent = STATE.fps;
            document.getElementById('particleCount').textContent = STATE.gridCols * STATE.gridRows;
            document.getElementById('avgFreq').textContent = Math.round(STATE.avgFrequency);
        }
    },
    
    /**
     * Set active button helper
     */
    setActiveButton(activeId, inactiveId) {
        document.getElementById(activeId).classList.add('active');
        document.getElementById(inactiveId).classList.remove('active');
    },
    
    /**
     * Set active mode button - FIX: Désactive tous les autres
     */
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
    console.log('🎵 Audio Visualizer - Generative Typography Engine');
    console.log('Initializing...');
    
    UI.init();
    
    console.log('✅ Ready!');
});
