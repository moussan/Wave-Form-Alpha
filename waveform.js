class WaveformVisualizer {
    constructor() {
        this.canvas = document.getElementById('waveformCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        this.analyser = this.audioContext.createAnalyser();
        
        // Configuration
        this.analyser.fftSize = 2048;
        this.bufferLength = this.analyser.frequencyBinCount;
        this.dataArray = new Uint8Array(this.bufferLength);
        
        // Controls
        this.waveColor = document.getElementById('waveColor');
        this.smoothing = document.getElementById('smoothing');
        this.visualMode = document.getElementById('visualMode');
        this.secondaryColor = document.getElementById('secondaryColor');
        
        // Add new controls
        this.lineWidth = 2;
        
        // Playback controls
        this.playBtn = document.getElementById('playBtn');
        this.pauseBtn = document.getElementById('pauseBtn');
        this.stopBtn = document.getElementById('stopBtn');
        
        // Background animation
        this.particles = [];
        this.gradientAngle = 0;
        
        // Timer
        this.timer = document.querySelector('.timer');
        this.startTime = 0;
        this.pausedTime = 0;
        this.isPlaying = false;
        
        // Add loop control
        this.loopToggle = document.getElementById('loopToggle');
        this.isLooping = false;
        
        // Add progress slider
        this.progressSlider = document.getElementById('progressSlider');
        this.isDraggingProgress = false;
        
        // Remove backgroundEffect control reference
        // Add shake effect timing
        this.lastShakeTime = 0;
        this.isShaking = false;
        this.shakeIntensity = 0;
        
        // Add volume and playback speed controls
        this.gainNode = this.audioContext.createGain();
        this.volumeControl = document.getElementById('volume');
        this.playbackSpeedControl = document.getElementById('playbackSpeed');
        
        // Connect gain node
        this.analyser.connect(this.gainNode);
        this.gainNode.connect(this.audioContext.destination);
        
        // Disconnect old direct connection
        this.analyser.disconnect(this.audioContext.destination);
        
        // Add drag-and-drop zone
        this.dragZone = document.querySelector('.drag-zone');
        this.setupDragAndDrop();
        
        // Add keyboard shortcuts
        this.keyboardShortcuts = document.querySelector('.keyboard-shortcuts');
        this.setupKeyboardShortcuts();
        
        // Add mute state
        this.isMuted = false;
        this.lastVolume = 1;
        
        // Bind methods
        this.setupAudioInput();
        this.setupControls();
        
        // Make canvas responsive
        this.setupCanvas();
        window.addEventListener('resize', () => this.setupCanvas());
        
        // Remove control references
        this.amplitude = 1.2; // Fixed amplitude value
        this.frequency = 1.0; // Fixed frequency value
        this.analyser.smoothingTimeConstant = 0.6; // Fixed smoothing value
        
        // Add equalizer
        this.setupEqualizer();
        
        // Add visualization presets
        this.presets = document.getElementById('presets');
        this.setupPresets();
        
        // Add audio effects
        this.setupAudioEffects();
        
        // Add keyboard shortcuts for new features
        this.setupExtendedKeyboardShortcuts();
        
        // Add custom preset storage
        this.customPresets = JSON.parse(localStorage.getItem('customPresets') || '{}');

        // Add new audio effect nodes
        this.setupAdvancedAudioEffects();
        
        // Add MIDI support
        this.setupMIDI();
        
        // Add recording capabilities
        this.setupRecording();
    }

    setupCanvas() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    }

    setupAudioInput() {
        const audioInput = document.getElementById('audioInput');
        audioInput.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (!file) return;

            const arrayBuffer = await file.arrayBuffer();
            const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
            this.loadAudioBuffer(audioBuffer);
        });
    }

    setupControls() {
        this.playBtn.addEventListener('click', () => {
            if (this.audioContext.state === 'suspended') {
                this.audioContext.resume();
            }
            this.startTime = this.audioContext.currentTime - this.pausedTime;
            this.source.start(0, this.pausedTime);
            this.playBtn.disabled = true;
            this.isPlaying = true;

            // Add ended event listener for non-looping playback
            if (!this.source.loop) {
                this.source.addEventListener('ended', () => {
                    this.playBtn.disabled = false;
                    this.isPlaying = false;
                    this.pausedTime = 0;
                    this.updateTimer();
                });
            }
        });

        this.pauseBtn.addEventListener('click', () => {
            this.audioContext.suspend();
            this.pausedTime = this.audioContext.currentTime - this.startTime;
            this.playBtn.disabled = false;
            this.isPlaying = false;
        });

        this.stopBtn.addEventListener('click', () => {
            this.audioContext.suspend();
            this.source.stop();
            this.playBtn.disabled = false;
            this.isPlaying = false;
            this.pausedTime = 0;
            this.updateTimer();
        });

        this.loopToggle.addEventListener('change', () => {
            if (this.source) {
                this.source.loop = this.loopToggle.checked;
            }
        });

        // Progress slider controls
        this.progressSlider.addEventListener('mousedown', () => {
            this.isDraggingProgress = true;
            if (this.isPlaying) {
                this.audioContext.suspend();
            }
        });

        this.progressSlider.addEventListener('mouseup', () => {
            this.isDraggingProgress = false;
            if (this.isPlaying) {
                this.audioContext.resume();
            }
            this.seekToPosition(this.progressSlider.value);
        });

        this.progressSlider.addEventListener('input', () => {
            if (this.source && this.source.buffer) {
                const time = (this.progressSlider.value / 100) * this.source.buffer.duration;
                this.timer.textContent = `${this.formatTime(time)} / ${this.formatTime(this.source.buffer.duration)}`;
            }
        });

        // Volume control
        this.volumeControl.addEventListener('input', () => {
            this.gainNode.gain.value = this.volumeControl.value;
        });

        // Playback speed control
        this.playbackSpeedControl.addEventListener('change', () => {
            if (this.source) {
                const newSpeed = parseFloat(this.playbackSpeedControl.value);
                this.source.playbackRate.value = newSpeed;
                
                // Adjust timer calculations for new playback speed
                if (this.isPlaying) {
                    this.pausedTime = this.audioContext.currentTime - this.startTime;
                    this.startTime = this.audioContext.currentTime - (this.pausedTime / newSpeed);
                }
            }
        });
    }

    formatTime(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }

    updateTimer() {
        if (!this.source || !this.source.buffer) return;
        
        const totalDuration = this.source.buffer.duration;
        let currentTime;
        
        if (this.isPlaying) {
            currentTime = (this.audioContext.currentTime - this.startTime) + this.pausedTime;
            
            // Handle looping playback time display
            if (this.source.loop) {
                currentTime = currentTime % totalDuration;
            }
        } else {
            currentTime = this.pausedTime;
        }

        // Ensure currentTime doesn't exceed duration
        currentTime = Math.min(currentTime, totalDuration);
        
        // Update progress slider if not being dragged
        if (!this.isDraggingProgress) {
            this.progressSlider.value = (currentTime / totalDuration) * 100;
        }
        
        this.timer.textContent = `${this.formatTime(currentTime)} / ${this.formatTime(totalDuration)}`;
    }

    draw() {
        const draw = () => {
            requestAnimationFrame(draw);
            
            this.updateTimer();
            
            const width = this.canvas.width;
            const height = this.canvas.height;
            
            this.drawBackground(width, height);
            
            this.analyser.getByteTimeDomainData(this.dataArray);
            
            this.ctx.lineWidth = this.lineWidth;
            
            switch(this.visualMode.value) {
                case 'bars':
                    this.drawBars(width, height);
                    break;
                case 'circles':
                    this.drawCircles(width, height);
                    break;
                case 'spectrum':
                    this.drawSpectrum(width, height);
                    break;
                case 'particles':
                    this.drawParticles(width, height);
                    break;
                case 'spiral':
                    this.drawSpiral(width, height);
                    break;
                case 'tunnel':
                    this.drawTunnel(width, height);
                    break;
                case 'fractal':
                    this.drawFractal(width, height);
                    break;
                case 'kaleidoscope':
                    this.drawKaleidoscope(width, height);
                    break;
                case 'waterfall':
                    this.drawWaterfall(width, height);
                    break;
                case 'oscilloscope':
                    this.drawOscilloscope(width, height);
                    break;
                case 'vortex':
                    this.drawVortex(width, height);
                    break;
                case 'aurora':
                    this.drawAurora(width, height);
                    break;
                case 'waveform3D':
                    this.drawWaveform3D(width, height);
                    break;
                default:
                    this.drawWaves(width, height);
            }
        };
        
        draw();
    }

    drawWaves(width, height) {
        const drawChannel = (channelData, offset, color) => {
            this.ctx.beginPath();
            this.ctx.strokeStyle = color;
            this.ctx.lineWidth = this.lineWidth;

            const sliceWidth = (width * this.frequency) / this.bufferLength;
            let x = 0;

            for (let i = 0; i < this.bufferLength; i++) {
                const v = (channelData[i] / 128.0) * this.amplitude;
                const y = (v * height) / 2 + offset;

                if (i === 0) {
                    this.ctx.moveTo(x, y);
                } else {
                    this.ctx.lineTo(x, y);
                }

                x += sliceWidth;
            }

            this.ctx.lineTo(width, height / 2 + offset);
            this.ctx.stroke();
        };

        // Get data for each channel
        const channels = [];
        for (let i = 0; i < this.analyser.channelCount || 1; i++) {
            const channelData = new Uint8Array(this.bufferLength);
            this.analyser.getByteTimeDomainData(channelData);
            channels.push(channelData);
        }

        // Draw each channel with offset
        const offsetStep = 20;
        channels.forEach((channelData, index) => {
            const offset = (index - (channels.length - 1) / 2) * offsetStep;
            const color = index === 0 ? this.waveColor.value : this.secondaryColor.value;
            drawChannel(channelData, offset, color);
        });
    }

    drawBars(width, height) {
        const barWidth = (width * this.frequency) / this.bufferLength;
        let x = 0;

        for (let i = 0; i < this.bufferLength; i++) {
            const v = (this.dataArray[i] / 128.0) * this.amplitude;
            const barHeight = (v * height) / 2;

            const gradient = this.ctx.createLinearGradient(0, height/2 - barHeight, 0, height/2 + barHeight);
            gradient.addColorStop(0, this.waveColor.value);
            gradient.addColorStop(1, this.secondaryColor.value);
            
            this.ctx.fillStyle = gradient;
            this.ctx.fillRect(x, height/2 - barHeight, barWidth, barHeight * 2);

            x += barWidth + 1;
        }
    }

    drawCircles(width, height) {
        const centerX = width / 2;
        const centerY = height / 2;
        const maxRadius = Math.min(width, height) / 3;

        for (let i = 0; i < this.bufferLength; i += 32) {
            const v = (this.dataArray[i] / 128.0) * this.amplitude;
            const radius = v * maxRadius;
            
            const gradient = this.ctx.createRadialGradient(
                centerX, centerY, 0,
                centerX, centerY, radius
            );
            gradient.addColorStop(0, this.waveColor.value);
            gradient.addColorStop(1, this.secondaryColor.value);

            this.ctx.beginPath();
            this.ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
            this.ctx.strokeStyle = gradient;
            this.ctx.lineWidth = this.lineWidth;
            this.ctx.stroke();
        }
    }

    drawBackground(width, height) {
        const currentTime = Date.now();
        if (currentTime - this.lastShakeTime > 3000) {
            this.lastShakeTime = currentTime;
            this.isShaking = true;
            this.shakeIntensity = 10; // Initial shake intensity
        }

        // Update shake intensity
        if (this.isShaking) {
            this.shakeIntensity *= 0.9; // Decay factor
            if (this.shakeIntensity < 0.1) {
                this.isShaking = false;
            }
        }

        // Create particles if needed
        while (this.particles.length < 50) {
            this.particles.push({
                x: Math.random() * width,
                y: Math.random() * height,
                size: Math.random() * 3 + 1,
                speedX: Math.random() * 2 - 1,
                speedY: Math.random() * 2 - 1,
                baseSpeedX: Math.random() * 2 - 1,
                baseSpeedY: Math.random() * 2 - 1
            });
        }

        // Clear background
        this.ctx.fillStyle = 'rgba(42, 42, 42, 0.3)';
        this.ctx.fillRect(0, 0, width, height);

        // Update and draw particles
        this.particles.forEach(particle => {
            // Add shake effect to particle speed
            if (this.isShaking) {
                particle.speedX = particle.baseSpeedX + (Math.random() * 2 - 1) * this.shakeIntensity;
                particle.speedY = particle.baseSpeedY + (Math.random() * 2 - 1) * this.shakeIntensity;
            } else {
                particle.speedX = particle.baseSpeedX;
                particle.speedY = particle.baseSpeedY;
            }

            // Update position
            particle.x += particle.speedX;
            particle.y += particle.speedY;

            // Wrap around edges
            if (particle.x < 0) particle.x = width;
            if (particle.x > width) particle.x = 0;
            if (particle.y < 0) particle.y = height;
            if (particle.y > height) particle.y = 0;

            // Draw particle
            this.ctx.beginPath();
            this.ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
            this.ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
            this.ctx.fill();
        });
    }

    seekToPosition(percentage) {
        if (!this.source || !this.source.buffer) return;
        
        // Stop current playback
        this.source.stop();
        this.source.disconnect();
        
        // Create new source
        this.source = this.audioContext.createBufferSource();
        this.source.buffer = this.currentBuffer;
        this.source.loop = this.loopToggle.checked;
        this.source.connect(this.analyser);
        this.analyser.connect(this.audioContext.destination);
        
        // Calculate new position
        const seekTime = (percentage / 100) * this.source.buffer.duration;
        this.pausedTime = seekTime;
        this.startTime = this.audioContext.currentTime - this.pausedTime;
        
        // Start playback from new position if playing
        if (this.isPlaying) {
            this.source.start(0, this.pausedTime);
        }
    }

    setupDragAndDrop() {
        const handleDrag = (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.dragZone.classList.add('active');
        };

        const handleDrop = async (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.dragZone.classList.remove('active');

            const file = e.dataTransfer.files[0];
            if (file && file.type.startsWith('audio/')) {
                const arrayBuffer = await file.arrayBuffer();
                const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
                this.loadAudioBuffer(audioBuffer);
            }
        };

        ['dragenter', 'dragover'].forEach(eventName => {
            this.dragZone.addEventListener(eventName, handleDrag);
        });

        ['dragleave', 'drop'].forEach(eventName => {
            this.dragZone.addEventListener(eventName, (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.dragZone.classList.remove('active');
                if (eventName === 'drop') handleDrop(e);
            });
        });
    }

    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            if (e.target.tagName === 'INPUT') return;

            switch(e.key) {
                case ' ':
                    e.preventDefault();
                    if (this.isPlaying) {
                        this.pauseBtn.click();
                    } else {
                        this.playBtn.click();
                    }
                    break;
                case 'ArrowLeft':
                    e.preventDefault();
                    if (this.source && this.source.buffer) {
                        const newTime = Math.max(0, parseFloat(this.progressSlider.value) - 5);
                        this.seekToPosition(newTime);
                    }
                    break;
                case 'ArrowRight':
                    e.preventDefault();
                    if (this.source && this.source.buffer) {
                        const newTime = Math.min(100, parseFloat(this.progressSlider.value) + 5);
                        this.seekToPosition(newTime);
                    }
                    break;
                case 'ArrowUp':
                    e.preventDefault();
                    this.volumeControl.value = Math.min(1, parseFloat(this.volumeControl.value) + 0.1);
                    this.gainNode.gain.value = this.volumeControl.value;
                    break;
                case 'ArrowDown':
                    e.preventDefault();
                    this.volumeControl.value = Math.max(0, parseFloat(this.volumeControl.value) - 0.1);
                    this.gainNode.gain.value = this.volumeControl.value;
                    break;
                case 'l':
                case 'L':
                    this.loopToggle.click();
                    break;
                case 'm':
                case 'M':
                    this.toggleMute();
                    break;
                case '?':
                    this.keyboardShortcuts.classList.toggle('visible');
                    break;
            }
        });
    }

    toggleMute() {
        if (this.isMuted) {
            this.gainNode.gain.value = this.lastVolume;
            this.volumeControl.value = this.lastVolume;
        } else {
            this.lastVolume = this.volumeControl.value;
            this.gainNode.gain.value = 0;
            this.volumeControl.value = 0;
        }
        this.isMuted = !this.isMuted;
    }

    loadAudioBuffer(audioBuffer) {
        // Store buffer for seeking
        this.currentBuffer = audioBuffer;
        
        // Enable progress slider
        this.progressSlider.disabled = false;
        this.progressSlider.value = 0;
        
        // Create audio source
        if (this.source) {
            this.source.disconnect();
        }
        this.source = this.audioContext.createBufferSource();
        this.source.buffer = audioBuffer;
        this.source.loop = this.loopToggle.checked;
        
        // Set initial playback rate
        this.source.playbackRate.value = parseFloat(this.playbackSpeedControl.value);
        
        // Connect through EQ chain
        if (this.source) {
            this.source.disconnect();
            let prevNode = this.source;
            this.eqBands.forEach(filter => {
                prevNode.connect(filter);
                prevNode = filter;
            });
            prevNode.connect(this.analyser);
            this.analyser.connect(this.gainNode);
        }
        
        // Enable playback controls
        this.playBtn.disabled = false;
        this.pauseBtn.disabled = false;
        this.stopBtn.disabled = false;
        
        // Start visualization without playback
        this.draw();
        
        // Reset timer values
        this.startTime = 0;
        this.pausedTime = 0;
        this.isPlaying = false;
        this.updateTimer();
    }

    setupEqualizer() {
        this.eqBands = [];
        const frequencies = [60, 170, 310, 600, 1000, 3000, 6000, 12000, 16000];
        
        frequencies.forEach(freq => {
            const filter = this.audioContext.createBiquadFilter();
            filter.type = 'peaking';
            filter.frequency.value = freq;
            filter.Q.value = 1;
            filter.gain.value = 0;
            this.eqBands.push(filter);
        });

        // Connect filters in series
        this.source && this.source.disconnect();
        let prevNode = this.source;
        this.eqBands.forEach(filter => {
            prevNode && prevNode.connect(filter);
            prevNode = filter;
        });
        prevNode && prevNode.connect(this.analyser);

        // Add event listeners to EQ sliders
        document.querySelectorAll('.eq-slider').forEach((slider, index) => {
            slider.addEventListener('input', () => {
                this.eqBands[index].gain.value = parseFloat(slider.value);
            });
        });

        // Reset EQ button
        document.getElementById('resetEq').addEventListener('click', () => {
            document.querySelectorAll('.eq-slider').forEach((slider, index) => {
                slider.value = 0;
                this.eqBands[index].gain.value = 0;
            });
        });

        // Add EQ presets
        this.eqPresets = {
            flat: [0, 0, 0, 0, 0, 0, 0, 0, 0],
            rock: [4, 3, 2, 0, -1, 2, 3, 4, 3],
            pop: [-1, 0, 2, 4, 3, 0, -1, -1, -1],
            jazz: [3, 2, 0, 2, -2, -1, 0, 1, 2],
            classical: [3, 2, 0, -1, -2, -1, 0, 2, 3],
            electronic: [4, 3, 0, -2, -3, 0, 2, 3, 4],
            acoustic: [-2, -1, 0, 2, 3, 2, 0, -1, -2],
            vocal: [-3, -2, -1, 2, 4, 3, 1, 0, -1],
            bass: [5, 4, 3, 1, 0, -1, -2, -2, -2]
        };

        // Add EQ preset control
        this.eqPresetControl = document.getElementById('eqPreset');
        this.eqPresetControl.addEventListener('change', () => {
            const preset = this.eqPresets[this.eqPresetControl.value];
            document.querySelectorAll('.eq-slider').forEach((slider, index) => {
                slider.value = preset[index];
                this.eqBands[index].gain.value = preset[index];
            });
        });

        // Add save preset functionality
        document.getElementById('saveEqPreset').addEventListener('click', () => {
            this.saveCurrentPreset();
        });
    }

    setupPresets() {
        const presets = {
            default: {
                colors: ['#00ff00', '#ff00ff'],
                mode: 'wave'
            },
            neon: {
                colors: ['#00ffff', '#ff00ff'],
                mode: 'bars'
            },
            minimal: {
                colors: ['#ffffff', '#888888'],
                mode: 'wave'
            },
            rainbow: {
                colors: ['#ff0000', '#00ff00'],
                mode: 'spectrum'
            },
            matrix: {
                colors: ['#00ff00', '#003300'],
                mode: 'particles'
            }
        };

        this.presets.addEventListener('change', () => {
            const preset = presets[this.presets.value];
            this.waveColor.value = preset.colors[0];
            this.secondaryColor.value = preset.colors[1];
            this.visualMode.value = preset.mode;
        });
    }

    drawSpectrum(width, height) {
        const freqData = new Uint8Array(this.analyser.frequencyBinCount);
        this.analyser.getByteFrequencyData(freqData);
        
        const barWidth = width / freqData.length;
        const heightScale = height / 256;
        
        for (let i = 0; i < freqData.length; i++) {
            const barHeight = freqData[i] * heightScale;
            const hue = (i / freqData.length) * 360;
            
            this.ctx.fillStyle = `hsl(${hue}, 100%, 50%)`;
            this.ctx.fillRect(i * barWidth, height - barHeight, barWidth, barHeight);
        }
    }

    drawParticles(width, height) {
        const freqData = new Uint8Array(this.analyser.frequencyBinCount);
        this.analyser.getByteFrequencyData(freqData);
        
        const particles = 100;
        const angleStep = (2 * Math.PI) / particles;
        
        for (let i = 0; i < particles; i++) {
            const angle = i * angleStep;
            const freqIndex = Math.floor((i / particles) * freqData.length);
            const radius = (freqData[freqIndex] / 256) * Math.min(width, height) / 3;
            
            const x = width/2 + Math.cos(angle) * radius;
            const y = height/2 + Math.sin(angle) * radius;
            
            const gradient = this.ctx.createRadialGradient(x, y, 0, x, y, 5);
            gradient.addColorStop(0, this.waveColor.value);
            gradient.addColorStop(1, this.secondaryColor.value);
            
            this.ctx.beginPath();
            this.ctx.arc(x, y, 5, 0, 2 * Math.PI);
            this.ctx.fillStyle = gradient;
            this.ctx.fill();
        }
    }

    drawSpiral(width, height) {
        const freqData = new Uint8Array(this.analyser.frequencyBinCount);
        this.analyser.getByteFrequencyData(freqData);
        
        const centerX = width / 2;
        const centerY = height / 2;
        const maxRadius = Math.min(width, height) / 3;
        
        this.ctx.beginPath();
        this.ctx.moveTo(centerX, centerY);
        
        for (let i = 0; i < freqData.length; i++) {
            const amplitude = freqData[i] / 256;
            const angle = (i / freqData.length) * Math.PI * 20;
            const radius = (i / freqData.length) * maxRadius * (1 + amplitude);
            
            const x = centerX + Math.cos(angle) * radius;
            const y = centerY + Math.sin(angle) * radius;
            
            this.ctx.lineTo(x, y);
        }
        
        const gradient = this.ctx.createLinearGradient(0, 0, width, height);
        gradient.addColorStop(0, this.waveColor.value);
        gradient.addColorStop(1, this.secondaryColor.value);
        
        this.ctx.strokeStyle = gradient;
        this.ctx.stroke();
    }

    setupAudioEffects() {
        // Create reverb and delay nodes
        this.reverbNode = this.audioContext.createConvolver();
        this.delayNode = this.audioContext.createDelay(5.0);
        this.delayFeedback = this.audioContext.createGain();
        this.reverbMix = this.audioContext.createGain();
        this.delayMix = this.audioContext.createGain();
        this.dryMix = this.audioContext.createGain();

        // Set up delay feedback loop
        this.delayNode.connect(this.delayFeedback);
        this.delayFeedback.connect(this.delayNode);

        // Initialize effect controls
        this.reverbMixControl = document.getElementById('reverbMix');
        this.reverbTypeControl = document.getElementById('reverbType');
        this.delayMixControl = document.getElementById('delayMix');
        this.delayTimeControl = document.getElementById('delayTime');
        this.delayFeedbackControl = document.getElementById('delayFeedback');

        // Set up event listeners
        this.reverbMixControl.addEventListener('input', () => this.updateEffects());
        this.reverbTypeControl.addEventListener('change', () => this.loadReverbImpulse());
        this.delayMixControl.addEventListener('input', () => this.updateEffects());
        this.delayTimeControl.addEventListener('input', () => {
            this.delayNode.delayTime.value = parseFloat(this.delayTimeControl.value);
        });
        this.delayFeedbackControl.addEventListener('input', () => {
            this.delayFeedback.gain.value = parseFloat(this.delayFeedbackControl.value);
        });

        // Load initial reverb impulse
        this.loadReverbImpulse();
    }

    async loadReverbImpulse() {
        const type = this.reverbTypeControl.value;
        const response = await fetch(`reverb/${type}.wav`);
        const arrayBuffer = await response.arrayBuffer();
        this.reverbNode.buffer = await this.audioContext.decodeAudioData(arrayBuffer);
    }

    updateEffects() {
        const reverbLevel = parseFloat(this.reverbMixControl.value);
        const delayLevel = parseFloat(this.delayMixControl.value);
        const dryLevel = Math.max(0, 1 - (reverbLevel + delayLevel));

        this.reverbMix.gain.value = reverbLevel;
        this.delayMix.gain.value = delayLevel;
        this.dryMix.gain.value = dryLevel;
    }

    setupExtendedKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            if (e.target.tagName === 'INPUT') return;

            if (e.ctrlKey && e.key === 's') {
                e.preventDefault();
                this.saveCurrentPreset();
            } else if (e.ctrlKey && e.key === 'o') {
                e.preventDefault();
                this.loadCustomPreset();
            }

            switch(e.key) {
                case '1':
                case '2':
                case '3':
                case '4':
                case '5':
                    if (e.ctrlKey) {
                        e.preventDefault();
                        this.quickSavePreset(parseInt(e.key));
                    }
                    break;
                case 'r':
                    this.reverbMixControl.value = Math.min(1, parseFloat(this.reverbMixControl.value) + 0.1);
                    this.updateEffects();
                    break;
                case 'R':
                    this.reverbMixControl.value = Math.max(0, parseFloat(this.reverbMixControl.value) - 0.1);
                    this.updateEffects();
                    break;
                case 'd':
                    this.delayMixControl.value = Math.min(1, parseFloat(this.delayMixControl.value) + 0.1);
                    this.updateEffects();
                    break;
                case 'D':
                    this.delayMixControl.value = Math.max(0, parseFloat(this.delayMixControl.value) - 0.1);
                    this.updateEffects();
                    break;
            }
        });
    }

    saveCurrentPreset() {
        const name = prompt('Enter a name for your preset:');
        if (!name) return;

        const preset = {
            eq: Array.from(document.querySelectorAll('.eq-slider')).map(slider => parseFloat(slider.value)),
            reverb: {
                mix: parseFloat(this.reverbMixControl.value),
                type: this.reverbTypeControl.value
            },
            delay: {
                mix: parseFloat(this.delayMixControl.value),
                time: parseFloat(this.delayTimeControl.value),
                feedback: parseFloat(this.delayFeedbackControl.value)
            },
            visualization: {
                mode: this.visualMode.value,
                colors: [this.waveColor.value, this.secondaryColor.value]
            }
        };

        this.customPresets[name] = preset;
        localStorage.setItem('customPresets', JSON.stringify(this.customPresets));
        this.updateCustomPresetsList();
    }

    loadCustomPreset() {
        const presetNames = Object.keys(this.customPresets);
        if (presetNames.length === 0) {
            alert('No custom presets saved');
            return;
        }

        const name = prompt('Enter preset name to load: ' + presetNames.join(', '));
        if (!name || !this.customPresets[name]) return;

        const preset = this.customPresets[name];
        
        // Apply EQ settings
        document.querySelectorAll('.eq-slider').forEach((slider, index) => {
            slider.value = preset.eq[index];
            this.eqBands[index].gain.value = preset.eq[index];
        });

        // Apply effect settings
        this.reverbMixControl.value = preset.reverb.mix;
        this.reverbTypeControl.value = preset.reverb.type;
        this.delayMixControl.value = preset.delay.mix;
        this.delayTimeControl.value = preset.delay.time;
        this.delayFeedbackControl.value = preset.delay.feedback;
        this.updateEffects();

        // Apply visualization settings
        this.visualMode.value = preset.visualization.mode;
        this.waveColor.value = preset.visualization.colors[0];
        this.secondaryColor.value = preset.visualization.colors[1];
    }

    quickSavePreset(slot) {
        const name = `Quick Preset ${slot}`;
        this.customPresets[name] = {
            eq: Array.from(document.querySelectorAll('.eq-slider')).map(slider => parseFloat(slider.value)),
            reverb: {
                mix: parseFloat(this.reverbMixControl.value),
                type: this.reverbTypeControl.value
            },
            delay: {
                mix: parseFloat(this.delayMixControl.value),
                time: parseFloat(this.delayTimeControl.value),
                feedback: parseFloat(this.delayFeedbackControl.value)
            },
            visualization: {
                mode: this.visualMode.value,
                colors: [this.waveColor.value, this.secondaryColor.value]
            }
        };
        localStorage.setItem('customPresets', JSON.stringify(this.customPresets));
    }

    // Add new visualization methods
    drawTunnel(width, height) {
        const freqData = new Uint8Array(this.analyser.frequencyBinCount);
        this.analyser.getByteFrequencyData(freqData);
        
        const centerX = width / 2;
        const centerY = height / 2;
        const rings = 20;
        
        for (let i = rings; i > 0; i--) {
            const radius = (i / rings) * Math.min(width, height) / 2;
            const amplitude = freqData[i * 5] / 256;
            const distortion = amplitude * 50;
            
            this.ctx.beginPath();
            for (let angle = 0; angle < Math.PI * 2; angle += 0.1) {
                const x = centerX + Math.cos(angle) * (radius + Math.cos(angle * 6) * distortion);
                const y = centerY + Math.sin(angle) * (radius + Math.sin(angle * 6) * distortion);
                
                if (angle === 0) this.ctx.moveTo(x, y);
                else this.ctx.lineTo(x, y);
            }
            this.ctx.closePath();
            
            const gradient = this.ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius);
            gradient.addColorStop(0, this.waveColor.value);
            gradient.addColorStop(1, this.secondaryColor.value);
            
            this.ctx.strokeStyle = gradient;
            this.ctx.lineWidth = 2;
            this.ctx.stroke();
        }
    }

    drawFractal(width, height) {
        const freqData = new Uint8Array(this.analyser.frequencyBinCount);
        this.analyser.getByteFrequencyData(freqData);
        
        const drawBranch = (x, y, length, angle, depth) => {
            if (depth <= 0) return;
            
            const endX = x + Math.cos(angle) * length;
            const endY = y + Math.sin(angle) * length;
            
            const gradient = this.ctx.createLinearGradient(x, y, endX, endY);
            gradient.addColorStop(0, this.waveColor.value);
            gradient.addColorStop(1, this.secondaryColor.value);
            
            this.ctx.beginPath();
            this.ctx.moveTo(x, y);
            this.ctx.lineTo(endX, endY);
            this.ctx.strokeStyle = gradient;
            this.ctx.lineWidth = depth;
            this.ctx.stroke();
            
            const freqIndex = Math.floor((depth / 8) * freqData.length);
            const branchAngle = (freqData[freqIndex] / 256) * Math.PI / 2;
            
            drawBranch(endX, endY, length * 0.7, angle - branchAngle, depth - 1);
            drawBranch(endX, endY, length * 0.7, angle + branchAngle, depth - 1);
        };
        
        drawBranch(width/2, height, height/4, -Math.PI/2, 8);
    }

    drawKaleidoscope(width, height) {
        const freqData = new Uint8Array(this.analyser.frequencyBinCount);
        this.analyser.getByteFrequencyData(freqData);
        
        const centerX = width / 2;
        const centerY = height / 2;
        const segments = 12;
        const angleStep = (Math.PI * 2) / segments;
        
        this.ctx.save();
        this.ctx.translate(centerX, centerY);
        
        for (let i = 0; i < segments; i++) {
            this.ctx.rotate(angleStep);
            
            const gradient = this.ctx.createLinearGradient(0, 0, 0, height/2);
            gradient.addColorStop(0, this.waveColor.value);
            gradient.addColorStop(1, this.secondaryColor.value);
            
            this.ctx.beginPath();
            this.ctx.moveTo(0, 0);
            
            for (let j = 0; j < freqData.length/segments; j++) {
                const amplitude = freqData[i * segments + j] / 256;
                const x = (j / (freqData.length/segments)) * height/2;
                const y = amplitude * 100;
                this.ctx.lineTo(x, y);
            }
            
            this.ctx.strokeStyle = gradient;
            this.ctx.lineWidth = 2;
            this.ctx.stroke();
        }
        
        this.ctx.restore();
    }

    drawWaterfall(width, height) {
        if (!this.waterfallData) {
            this.waterfallData = [];
            this.waterfallIndex = 0;
        }
        
        const freqData = new Uint8Array(this.analyser.frequencyBinCount);
        this.analyser.getByteFrequencyData(freqData);
        
        // Add new frequency data
        this.waterfallData[this.waterfallIndex] = Array.from(freqData);
        this.waterfallIndex = (this.waterfallIndex + 1) % height;
        
        // Draw waterfall
        const imageData = this.ctx.createImageData(width, height);
        
        for (let y = 0; y < height; y++) {
            const dataIndex = (this.waterfallIndex - y + height) % height;
            if (!this.waterfallData[dataIndex]) continue;
            
            for (let x = 0; x < width; x++) {
                const freqIndex = Math.floor((x / width) * freqData.length);
                const value = this.waterfallData[dataIndex][freqIndex];
                
                const pixelIndex = (y * width + x) * 4;
                const color = this.getColorForValue(value);
                
                imageData.data[pixelIndex] = color.r;
                imageData.data[pixelIndex + 1] = color.g;
                imageData.data[pixelIndex + 2] = color.b;
                imageData.data[pixelIndex + 3] = 255;
            }
        }
        
        this.ctx.putImageData(imageData, 0, 0);
    }

    getColorForValue(value) {
        const color1 = this.hexToRgb(this.waveColor.value);
        const color2 = this.hexToRgb(this.secondaryColor.value);
        const ratio = value / 256;
        
        return {
            r: Math.round(color1.r * ratio + color2.r * (1 - ratio)),
            g: Math.round(color1.g * ratio + color2.g * (1 - ratio)),
            b: Math.round(color1.b * ratio + color2.b * (1 - ratio))
        };
    }

    hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : null;
    }

    setupAdvancedAudioEffects() {
        // Compressor
        this.compressor = this.audioContext.createDynamicsCompressor();
        this.compressorControls = {
            threshold: document.getElementById('compressorThreshold'),
            ratio: document.getElementById('compressorRatio'),
            knee: document.getElementById('compressorKnee')
        };

        // Distortion
        this.distortion = this.audioContext.createWaveShaper();
        this.distortionControls = {
            amount: document.getElementById('distortionAmount'),
            type: document.getElementById('distortionType')
        };

        // Filter
        this.filter = this.audioContext.createBiquadFilter();
        this.filterControls = {
            type: document.getElementById('filterType'),
            frequency: document.getElementById('filterFreq'),
            Q: document.getElementById('filterQ')
        };

        // Setup event listeners
        this.compressorControls.threshold.addEventListener('input', () => {
            this.compressor.threshold.value = parseFloat(this.compressorControls.threshold.value);
        });
        this.compressorControls.ratio.addEventListener('input', () => {
            this.compressor.ratio.value = parseFloat(this.compressorControls.ratio.value);
        });
        this.compressorControls.knee.addEventListener('input', () => {
            this.compressor.knee.value = parseFloat(this.compressorControls.knee.value);
        });

        this.distortionControls.amount.addEventListener('input', () => {
            this.updateDistortion();
        });
        this.distortionControls.type.addEventListener('change', () => {
            this.updateDistortion();
        });

        this.filterControls.type.addEventListener('change', () => {
            this.filter.type = this.filterControls.type.value;
        });
        this.filterControls.frequency.addEventListener('input', () => {
            this.filter.frequency.value = parseFloat(this.filterControls.frequency.value);
        });
        this.filterControls.Q.addEventListener('input', () => {
            this.filter.Q.value = parseFloat(this.filterControls.Q.value);
        });
    }

    updateDistortion() {
        const amount = parseFloat(this.distortionControls.amount.value);
        const type = this.distortionControls.type.value;
        const samples = 44100;
        const curve = new Float32Array(samples);

        switch(type) {
            case 'soft':
                for(let i = 0; i < samples; i++) {
                    const x = (i * 2) / samples - 1;
                    curve[i] = Math.tanh(x * amount);
                }
                break;
            case 'hard':
                for(let i = 0; i < samples; i++) {
                    const x = (i * 2) / samples - 1;
                    curve[i] = Math.sign(x) * (1 - Math.exp(-Math.abs(x) * amount));
                }
                break;
            case 'fuzz':
                for(let i = 0; i < samples; i++) {
                    const x = (i * 2) / samples - 1;
                    curve[i] = x < 0 ? -1 : 1;
                }
                break;
            case 'bitcrush':
                const bits = Math.max(1, 16 - amount / 6.25);
                for(let i = 0; i < samples; i++) {
                    const x = (i * 2) / samples - 1;
                    curve[i] = Math.round(x * Math.pow(2, bits)) / Math.pow(2, bits);
                }
                break;
        }

        this.distortion.curve = curve;
    }

    setupMIDI() {
        this.midiStatus = document.querySelector('.midi-status');
        this.midiMappings = document.querySelector('.midi-mappings');
        this.midiSetupBtn = document.getElementById('midiSetup');
        this.midiControls = new Map();

        this.midiSetupBtn.addEventListener('click', () => {
            if (navigator.requestMIDIAccess) {
                navigator.requestMIDIAccess()
                    .then(access => {
                        this.initializeMIDI(access);
                    })
                    .catch(error => {
                        this.midiStatus.textContent = 'MIDI access denied: ' + error;
                    });
            } else {
                this.midiStatus.textContent = 'MIDI not supported in this browser';
            }
        });
    }

    initializeMIDI(access) {
        const inputs = access.inputs.values();
        let deviceCount = 0;

        for (let input of inputs) {
            deviceCount++;
            input.onmidimessage = (message) => this.handleMIDIMessage(message);
        }

        this.midiStatus.textContent = `${deviceCount} MIDI device(s) connected`;

        access.onstatechange = (event) => {
            const port = event.port;
            const status = `MIDI ${port.type} ${port.name} ${port.state}`;
            this.midiStatus.textContent = status;
        };
    }

    handleMIDIMessage(message) {
        const [command, note, velocity] = message.data;
        
        // Note on
        if (command === 144 && velocity > 0) {
            this.triggerMIDIControl(note, velocity / 127);
        }
        // Control change
        else if (command === 176) {
            this.updateMIDIControl(note, velocity / 127);
        }
    }

    triggerMIDIControl(note, value) {
        if (this.midiControls.has(note)) {
            const control = this.midiControls.get(note);
            control.value = value;
            control.dispatchEvent(new Event('input'));
        }
    }

    updateMIDIControl(cc, value) {
        // Map MIDI CC to controls
        switch(cc) {
            case 1: // Modulation wheel
                this.reverbMixControl.value = value;
                this.updateEffects();
                break;
            case 7: // Volume
                this.volumeControl.value = value;
                this.gainNode.gain.value = value;
                break;
            // Add more CC mappings as needed
        }
    }

    setupRecording() {
        this.mediaRecorder = null;
        this.recordedChunks = [];
        this.isRecording = false;

        this.startRecordingBtn = document.getElementById('startRecording');
        this.stopRecordingBtn = document.getElementById('stopRecording');
        this.exportRecordingBtn = document.getElementById('exportRecording');
        this.recordingFormat = document.getElementById('recordingFormat');

        this.startRecordingBtn.addEventListener('click', () => this.startRecording());
        this.stopRecordingBtn.addEventListener('click', () => this.stopRecording());
        this.exportRecordingBtn.addEventListener('click', () => this.exportRecording());

        // Enable recording controls when audio is loaded
        this.startRecordingBtn.disabled = false;
    }

    startRecording() {
        this.recordedChunks = [];
        const dest = this.audioContext.createMediaStreamDestination();
        this.gainNode.connect(dest);

        this.mediaRecorder = new MediaRecorder(dest.stream, {
            mimeType: this.getSupportedMimeType()
        });

        this.mediaRecorder.ondataavailable = (e) => {
            if (e.data.size > 0) {
                this.recordedChunks.push(e.data);
            }
        };

        this.mediaRecorder.start();
        this.isRecording = true;
        this.startRecordingBtn.disabled = true;
        this.stopRecordingBtn.disabled = false;
    }

    stopRecording() {
        this.mediaRecorder.stop();
        this.isRecording = false;
        this.startRecordingBtn.disabled = false;
        this.stopRecordingBtn.disabled = true;
        this.exportRecordingBtn.disabled = false;
    }

    getSupportedMimeType() {
        const format = this.recordingFormat.value;
        const types = [
            `audio/${format}`,
            'audio/webm',
            'audio/ogg',
            'audio/wav'
        ];

        for (const type of types) {
            if (MediaRecorder.isTypeSupported(type)) {
                return type;
            }
        }

        return '';
    }

    async exportRecording() {
        const blob = new Blob(this.recordedChunks, {
            type: this.getSupportedMimeType()
        });

        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `recording.${this.recordingFormat.value}`;
        a.click();
        URL.revokeObjectURL(url);
    }

    // New visualization methods
    drawOscilloscope(width, height) {
        const data = new Float32Array(this.analyser.frequencyBinCount);
        this.analyser.getFloatTimeDomainData(data);

        this.ctx.beginPath();
        this.ctx.strokeStyle = this.waveColor.value;
        this.ctx.lineWidth = 2;

        const sliceWidth = width / data.length;
        let x = 0;

        for (let i = 0; i < data.length; i++) {
            const v = data[i] * height / 2;
            const y = height / 2 + v;

            if (i === 0) {
                this.ctx.moveTo(x, y);
            } else {
                this.ctx.lineTo(x, y);
            }

            x += sliceWidth;
        }

        this.ctx.stroke();
    }

    drawVortex(width, height) {
        const freqData = new Uint8Array(this.analyser.frequencyBinCount);
        this.analyser.getByteFrequencyData(freqData);

        const centerX = width / 2;
        const centerY = height / 2;
        const maxRadius = Math.min(width, height) / 2;

        this.ctx.save();
        this.ctx.translate(centerX, centerY);
        
        for (let i = 0; i < freqData.length; i += 4) {
            const angle = (i / freqData.length) * Math.PI * 2;
            const amplitude = freqData[i] / 256;
            const radius = amplitude * maxRadius;
            
            const x1 = Math.cos(angle) * radius;
            const y1 = Math.sin(angle) * radius;
            const x2 = Math.cos(angle + 0.2) * (radius * 0.8);
            const y2 = Math.sin(angle + 0.2) * (radius * 0.8);

            const gradient = this.ctx.createLinearGradient(x1, y1, x2, y2);
            gradient.addColorStop(0, this.waveColor.value);
            gradient.addColorStop(1, this.secondaryColor.value);

            this.ctx.beginPath();
            this.ctx.moveTo(x1, y1);
            this.ctx.lineTo(x2, y2);
            this.ctx.strokeStyle = gradient;
            this.ctx.lineWidth = 2 + amplitude * 3;
            this.ctx.stroke();
        }

        this.ctx.restore();
    }

    drawAurora(width, height) {
        const freqData = new Uint8Array(this.analyser.frequencyBinCount);
        this.analyser.getByteFrequencyData(freqData);

        this.ctx.globalAlpha = 0.3;

        for (let i = 0; i < freqData.length; i += 2) {
            const amplitude = freqData[i] / 256;
            const x = (i / freqData.length) * width;
            const hue = (i / freqData.length) * 360;

            const gradient = this.ctx.createLinearGradient(x, height, x, 0);
            gradient.addColorStop(0, `hsla(${hue}, 100%, 50%, 0)`);
            gradient.addColorStop(0.5, `hsla(${hue}, 100%, 50%, 0.5)`);
            gradient.addColorStop(1, `hsla(${hue}, 100%, 50%, 0)`);

            this.ctx.fillStyle = gradient;
            this.ctx.fillRect(x, 0, 2, height);

            const waveHeight = amplitude * height / 2;
            const yPos = height / 2 + Math.sin(x / 50 + this.gradientAngle) * waveHeight;

            this.ctx.beginPath();
            this.ctx.arc(x, yPos, 2, 0, Math.PI * 2);
            this.ctx.fillStyle = `hsla(${hue}, 100%, 75%, 0.8)`;
            this.ctx.fill();
        }

        this.ctx.globalAlpha = 1;
        this.gradientAngle += 0.02;
    }

    drawWaveform3D(width, height) {
        const freqData = new Uint8Array(this.analyser.frequencyBinCount);
        this.analyser.getByteFrequencyData(freqData);

        const centerX = width / 2;
        const centerY = height / 2;
        const perspective = 500;
        const rotation = this.gradientAngle;
        const layers = 20;

        for (let layer = layers; layer > 0; layer--) {
            const scale = 1 - layer / layers;
            const z = layer * 20;
            const opacity = scale;

            this.ctx.beginPath();
            
            for (let i = 0; i < freqData.length; i += 4) {
                const amplitude = (freqData[i] / 256) * height / 3;
                const x = (i / freqData.length) * width - width / 2;
                const y = amplitude;

                // Apply 3D rotation and perspective
                const rotX = x * Math.cos(rotation) - z * Math.sin(rotation);
                const rotZ = x * Math.sin(rotation) + z * Math.cos(rotation);
                const projectedX = (rotX * perspective) / (perspective + rotZ) + centerX;
                const projectedY = (y * perspective) / (perspective + rotZ) + centerY;

                if (i === 0) {
                    this.ctx.moveTo(projectedX, projectedY);
                } else {
                    this.ctx.lineTo(projectedX, projectedY);
                }
            }

            const gradient = this.ctx.createLinearGradient(0, centerY - height/4, 0, centerY + height/4);
            gradient.addColorStop(0, `${this.waveColor.value}${Math.round(opacity * 255).toString(16).padStart(2, '0')}`);
            gradient.addColorStop(1, `${this.secondaryColor.value}${Math.round(opacity * 255).toString(16).padStart(2, '0')}`);

            this.ctx.strokeStyle = gradient;
            this.ctx.lineWidth = 2;
            this.ctx.stroke();
        }

        this.gradientAngle += 0.01;
    }
}

// Initialize visualizer when page loads
window.addEventListener('load', () => {
    new WaveformVisualizer();
}); 