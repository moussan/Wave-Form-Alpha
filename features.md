# Waveform Visualizer Features Documentation

## Visualization Effects

### 1. Oscilloscope
```javascript
drawOscilloscope(width, height)
```
A classic audio waveform display that shows the raw audio signal in real-time.

**Features:**
- Real-time waveform display
- High-precision signal visualization
- Single-color rendering with adjustable line width
- Perfect for analyzing audio signals and waveforms

### 2. Vortex
```javascript
drawVortex(width, height)
```
A circular visualization that creates a spinning vortex effect based on audio frequencies.

**Features:**
- Dynamic line thickness based on amplitude
- Gradient coloring between primary and secondary colors
- Circular pattern with varying radius
- Smooth rotation effect

### 3. Aurora
```javascript
drawAurora(width, height)
```
A colorful, flowing visualization that creates an aurora-like effect using audio data.

**Features:**
- Multi-colored gradient effects
- Particle system with dynamic movement
- Wave-like motion synchronized to audio
- Semi-transparent layering for depth
- Smooth color transitions

### 4. 3D Waveform
```javascript
drawWaveform3D(width, height)
```
A three-dimensional representation of the audio waveform.

**Features:**
- Multiple layers creating depth perception
- Dynamic rotation
- Perspective projection
- Opacity-based depth cueing
- Gradient coloring with transparency

## Audio Effects

### 1. Compressor
```javascript
setupAdvancedAudioEffects()
```
Dynamic range compression with adjustable parameters:
- Threshold: -60dB to 0dB
- Ratio: 1:1 to 20:1
- Knee: 0 to 40dB

### 2. Distortion
Multiple distortion types with adjustable intensity:
- Soft Clip: Smooth saturation
- Hard Clip: Aggressive clipping
- Fuzz: Full-wave rectification
- Bit Crush: Sample rate/bit depth reduction

### 3. Filter
Configurable audio filter with multiple modes:
- Low Pass: Reduces high frequencies
- High Pass: Reduces low frequencies
- Band Pass: Isolates frequency range
- Adjustable frequency (20Hz to 20kHz)
- Q factor control (0 to 10)

## MIDI Support

### 1. Device Connection
```javascript
setupMIDI()
```
**Features:**
- Automatic MIDI device detection
- Real-time device status display
- Multiple device support
- Connection state monitoring

### 2. Control Mapping
```javascript
handleMIDIMessage(message)
```
**Default MIDI CC Mappings:**
- CC 1 (Modulation Wheel): Controls reverb mix
- CC 7 (Volume): Controls main volume
- Customizable note triggers
- Real-time parameter control

## Recording Capabilities

### 1. Recording Controls
```javascript
setupRecording()
```
**Features:**
- Start/Stop recording functionality
- Format selection (WAV, MP3, OGG)
- Export capabilities
- Recording status indication

### 2. Export Options
```javascript
exportRecording()
```
**Features:**
- Multiple format support
- Automatic mime-type detection
- Direct download of recordings
- Blob URL handling

### 3. Recording Format Support
```javascript
getSupportedMimeType()
```
**Features:**
- Automatic format fallback
- Browser compatibility checking
- Multiple format support
- Quality preservation

## Usage Examples

### 1. Using the Oscilloscope
1. Select "Oscilloscope" from the visualization mode dropdown
2. Adjust the primary color for waveform display
3. Best for analyzing waveform shape and amplitude

### 2. Applying Audio Effects
1. Use the Compressor to control dynamic range
2. Add distortion for creative sound shaping
3. Apply filters to shape the frequency content

### 3. MIDI Control
1. Click "Setup MIDI" to connect MIDI devices
2. Use modulation wheel for reverb control
3. Use volume slider for amplitude control

### 4. Recording
1. Select desired format from the dropdown
2. Click "Start Recording" to begin
3. Use "Stop Recording" when finished
4. Click "Export" to download the recording

## Keyboard Shortcuts

- **Space**: Play/Pause
- **Left Arrow**: Seek backward 5 seconds
- **Right Arrow**: Seek forward 5 seconds
- **Up Arrow**: Increase volume
- **Down Arrow**: Decrease volume
- **L**: Toggle loop
- **M**: Toggle mute
- **R/r**: Increase/decrease reverb mix
- **D/d**: Increase/decrease delay mix
- **Ctrl + S**: Save current preset
- **Ctrl + O**: Load custom preset
- **Ctrl + 1-5**: Quick save preset to slot
- **?**: Show keyboard shortcuts

## Presets

### Built-in Presets
- Default
- Neon
- Minimal
- Rainbow
- Matrix

### Custom Presets
- Save and load your own presets
- Quick save slots (1-5)
- Stores:
  - EQ settings
  - Effect parameters
  - Visualization settings
  - Color choices 