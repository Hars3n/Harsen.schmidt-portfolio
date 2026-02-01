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
    
    particles: {
        densityLevels: [50, 100, 200, 400, 600],
        baseSize: 20,
        maxSize: 80,
        minOpacity: 0.1,
        maxOpacity: 1
    },
    
    physics: {
        friction: 0.95,
        attraction: 0.001,
        repulsion: 0.05,
        gravity: 0.1
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
    
    // Particles
    particles: [],
    particleDensity: 3,
    
    // Settings
    currentMode: 1,
    generationSpeed: 1,
    sensitivity: 1,
    characters: 'GO',
    isPlaying: false,
    showStats: false,
    showWaterfall: true,
    showGenerative: true,
    
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
     * Calculate distance between two points
     */
    distance(x1, y1, x2, y2) {
        return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
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
// PARTICLE CLASS - Advanced Typography Particle System
// ============================================================================

class TypoParticle {
    constructor(x, y, char, index) {
        this.x = x;
        this.y = y;
        this.baseX = x;
        this.baseY = y;
        this.char = char;
        this.index = index;
        
        // Physics
        this.vx = 0;
        this.vy = 0;
        this.ax = 0;
        this.ay = 0;
        
        // Visual properties
        this.size = CONFIG.particles.baseSize;
        this.baseSize = CONFIG.particles.baseSize;
        this.opacity = Utils.random(0.3, 0.8);
        this.rotation = Utils.random(0, Math.PI * 2);
        this.rotationSpeed = Utils.random(-0.02, 0.02);
        
        // Animation
        this.phase = Utils.random(0, Math.PI * 2);
        this.frequency = Utils.random(0.01, 0.05);
        
        // Color
        this.hue = Utils.random(0, 360);
        this.saturation = 80;
        this.lightness = 50;
        
        // Beat response
        this.beatScale = 1;
        this.beatDecay = 0.95;
    }
    
    /**
     * Update particle based on audio analysis and mode
     */
    update(audioData, mode, deltaTime) {
        const { avgFrequency, bassLevel, midLevel, trebleLevel, beatDetected } = audioData;
        const intensity = avgFrequency * STATE.sensitivity * 0.01;
        
        // Beat detection response
        if (beatDetected) {
            this.beatScale = 1.5;
        }
        this.beatScale *= this.beatDecay;
        
        // Mode-specific behaviors
        switch(mode) {
            case 1: // Wave mode
                this.updateWaveMode(intensity, bassLevel);
                break;
            case 2: // Spiral mode
                this.updateSpiralMode(intensity, midLevel);
                break;
            case 3: // Chaos mode
                this.updateChaosMode(intensity, trebleLevel);
                break;
            case 4: // Fractal mode
                this.updateFractalMode(intensity, avgFrequency);
                break;
            case 5: // Flow field mode
                this.updateFlowFieldMode(intensity, bassLevel);
                break;
            case 6: // Glitch mode
                this.updateGlitchMode(intensity, beatDetected);
                break;
        }
        
        // Update rotation
        this.rotation += this.rotationSpeed * STATE.generationSpeed;
        
        // Update phase
        this.phase += this.frequency * STATE.generationSpeed;
        
        // Update size based on audio
        const targetSize = this.baseSize + avgFrequency * 0.3 * this.beatScale;
        this.size = Utils.lerp(this.size, targetSize, 0.1);
        
        // Update opacity
        this.opacity = Utils.constrain(
            CONFIG.particles.minOpacity + avgFrequency * 0.005,
            CONFIG.particles.minOpacity,
            CONFIG.particles.maxOpacity
        );
    }
    
    /**
     * Wave motion - sinusoidal movement
     */
    updateWaveMode(intensity, bassLevel) {
        const waveX = Math.sin(STATE.time * 0.05 + this.baseY * 0.01 + this.phase) * intensity * 50;
        const waveY = Math.cos(STATE.time * 0.03 + this.baseX * 0.01 + this.phase) * intensity * 30;
        
        this.x = this.baseX + waveX * (1 + bassLevel * 0.01);
        this.y = this.baseY + waveY * (1 + bassLevel * 0.01);
        
        this.rotationSpeed = Math.sin(STATE.time * 0.1) * intensity * 0.1;
    }
    
    /**
     * Spiral motion - rotating around center
     */
    updateSpiralMode(intensity, midLevel) {
        const centerX = STATE.generativeCanvas.width / 2;
        const centerY = STATE.generativeCanvas.height / 2;
        
        const angle = Math.atan2(this.baseY - centerY, this.baseX - centerX);
        const dist = Utils.distance(this.baseX, this.baseY, centerX, centerY);
        
        const spiral = STATE.time * 0.02 + dist * 0.005;
        const radius = intensity * 30 * (1 + midLevel * 0.01);
        
        this.x = this.baseX + Math.cos(angle + spiral) * radius;
        this.y = this.baseY + Math.sin(angle + spiral) * radius;
        
        this.rotation = angle + spiral;
    }
    
    /**
     * Chaos mode - particle physics with random forces
     */
    updateChaosMode(intensity, trebleLevel) {
        // Random forces
        this.ax += (Math.random() - 0.5) * intensity * 0.5 * (1 + trebleLevel * 0.01);
        this.ay += (Math.random() - 0.5) * intensity * 0.5 * (1 + trebleLevel * 0.01);
        
        // Apply acceleration
        this.vx += this.ax;
        this.vy += this.ay;
        
        // Apply friction
        this.vx *= CONFIG.physics.friction;
        this.vy *= CONFIG.physics.friction;
        
        // Update position
        this.x = this.baseX + this.vx;
        this.y = this.baseY + this.vy;
        
        // Reset acceleration
        this.ax = 0;
        this.ay = 0;
        
        // Add rotation chaos
        this.rotation += intensity * 0.1 * (Math.random() - 0.5);
    }
    
    /**
     * Fractal mode - recursive pattern generation
     */
    updateFractalMode(intensity, avgFrequency) {
        const iterations = 3;
        let offsetX = 0;
        let offsetY = 0;
        
        for (let i = 0; i < iterations; i++) {
            const scale = Math.pow(0.5, i);
            const freq = STATE.time * (0.02 + i * 0.01);
            
            offsetX += Math.sin(freq + this.phase) * intensity * 30 * scale;
            offsetY += Math.cos(freq * 1.3 + this.phase) * intensity * 30 * scale;
        }
        
        this.x = this.baseX + offsetX * (1 + avgFrequency * 0.005);
        this.y = this.baseY + offsetY * (1 + avgFrequency * 0.005);
        
        this.rotation = STATE.time * 0.05 + Math.sin(STATE.time * 0.1) * Math.PI;
    }
    
    /**
     * Flow field mode - Perlin noise-like movement
     */
    updateFlowFieldMode(intensity, bassLevel) {
        // Simulate flow field with sine waves
        const fieldX = Math.sin(this.baseX * 0.005 + STATE.time * 0.01);
        const fieldY = Math.cos(this.baseY * 0.005 + STATE.time * 0.01);
        
        this.vx += fieldX * intensity * 0.5;
        this.vy += fieldY * intensity * 0.5;
        
        // Apply friction
        this.vx *= 0.92;
        this.vy *= 0.92;
        
        // Update position
        this.x = this.baseX + this.vx * (1 + bassLevel * 0.01);
        this.y = this.baseY + this.vy * (1 + bassLevel * 0.01);
    }
    
    /**
     * Glitch mode - digital distortion effects
     */
    updateGlitchMode(intensity, beatDetected) {
        if (beatDetected && Math.random() > 0.7) {
            // Random displacement on beat
            this.x = this.baseX + Utils.random(-100, 100) * intensity;
            this.y = this.baseY + Utils.random(-100, 100) * intensity;
            this.rotation = Utils.random(0, Math.PI * 2);
        } else {
            // Snap back to base position
            this.x = Utils.lerp(this.x, this.baseX, 0.1);
            this.y = Utils.lerp(this.y, this.baseY, 0.1);
        }
        
        // Glitch rotation
        if (Math.random() > 0.95) {
            this.rotation += Utils.random(-Math.PI, Math.PI);
        }
    }
    
    /**
     * Render particle to canvas
     */
    draw(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rotation);
        
        // Apply color based on mode or theme
        const color = STATE.isDarkMode ? 
            `rgba(255, 255, 255, ${this.opacity})` :
            `rgba(10, 10, 10, ${this.opacity})`;
        
        // Draw character
        ctx.font = `bold ${this.size}px 'Archivo Black', sans-serif`;
        ctx.fillStyle = color;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(this.char, 0, 0);
        
        // Optional: Add glow effect based on audio
        if (this.beatScale > 1.1) {
            ctx.shadowBlur = 20;
            ctx.shadowColor = CONFIG.colors.accent;
        }
        
        ctx.restore();
    }
}

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
// PARTICLE SYSTEM MANAGER
// ============================================================================

const ParticleSystem = {
    /**
     * Initialize particle system
     */
    init() {
        this.createParticles();
        console.log(`Particle System initialized with ${STATE.particles.length} particles`);
    },
    
    /**
     * Create particles based on density setting
     */
    createParticles() {
        STATE.particles = [];
        const density = CONFIG.particles.densityLevels[STATE.particleDensity - 1];
        const cols = Math.ceil(Math.sqrt(density * (STATE.generativeCanvas.width / STATE.generativeCanvas.height)));
        const rows = Math.ceil(density / cols);
        
        const cellWidth = STATE.generativeCanvas.width / cols;
        const cellHeight = STATE.generativeCanvas.height / rows;
        
        let index = 0;
        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < cols; col++) {
                const x = (col + 0.5) * cellWidth;
                const y = (row + 0.5) * cellHeight + 70;
                const char = STATE.characters[Math.floor(Math.random() * STATE.characters.length)];
                
                STATE.particles.push(new TypoParticle(x, y, char, index++));
            }
        }
    },
    
    /**
     * Update all particles
     */
    update(audioData, deltaTime) {
        STATE.particles.forEach(particle => {
            particle.update(audioData, STATE.currentMode, deltaTime);
        });
    },
    
    /**
     * Render all particles
     */
    render(ctx) {
        STATE.particles.forEach(particle => {
            particle.draw(ctx);
        });
    },
    
    /**
     * Update character set
     */
    updateCharacters(newChars) {
        STATE.particles.forEach(particle => {
            particle.char = newChars[Math.floor(Math.random() * newChars.length)];
        });
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
            // Clear and render generative canvas
            STATE.generativeCtx.clearRect(0, 0, STATE.generativeCanvas.width, STATE.generativeCanvas.height);
            
            // Update and render particles
            ParticleSystem.update(audioData, STATE.deltaTime);
            ParticleSystem.render(STATE.generativeCtx);
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
            
            // Adjust waterfall opacity when generative is toggled
            if (STATE.showWaterfall) {
                STATE.waterfallCanvas.style.opacity = STATE.showGenerative ? '0.3' : '1.0';
            }
        });

        document.getElementById('waterfallToggle').addEventListener('click', () => {
            STATE.showWaterfall = !STATE.showWaterfall;
            STATE.waterfallCanvas.classList.toggle('hidden', !STATE.showWaterfall);
            document.getElementById('waterfallToggle').classList.toggle('active', STATE.showWaterfall);
            
            // Adjust waterfall opacity based on generative state
            if (STATE.showWaterfall) {
                STATE.waterfallCanvas.style.opacity = STATE.showGenerative ? '0.3' : '1.0';
            }
        });
        
        // Mode controls
        for (let i = 1; i <= 6; i++) {
            document.getElementById(`mode${i}`).addEventListener('click', () => {
                STATE.currentMode = i;
                this.setActiveModeButton(i);
            });
        }
        
        // Custom text
        document.getElementById('customText').addEventListener('input', (e) => {
            STATE.characters = e.target.value || 'GO';
            ParticleSystem.updateCharacters(STATE.characters);
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
        
        // Density control
        document.getElementById('densitySlider').addEventListener('input', (e) => {
            STATE.particleDensity = parseInt(e.target.value);
            const labels = ['Very Low', 'Low', 'Medium', 'High', 'Very High'];
            document.getElementById('densityValue').textContent = labels[STATE.particleDensity - 1];
            ParticleSystem.createParticles();
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
            ParticleSystem.createParticles();
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
            ParticleSystem.init();
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
            document.getElementById('particleCount').textContent = STATE.particles.length;
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
     * Set active mode button
     */
    setActiveModeButton(modeNumber) {
        for (let i = 1; i <= 6; i++) {
            if (i === modeNumber) {
                document.getElementById(`mode${i}`).classList.add('active');
            } else {
                document.getElementById(`mode${i}`).classList.remove('active');
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
