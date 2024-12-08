const fileInput = document.getElementById('fileInput');
const lyricsInput = document.getElementById('lyricsInput');
const toggleBar = document.getElementById('toggleBar');
const toggleRadial = document.getElementById('toggleRadial');
const canvas = document.getElementById('visualizerCanvas');
const lyricsDisplay = document.getElementById('lyricsDisplay');
const ctx = canvas.getContext('2d');

let audioContext, analyser, bufferSource;
let dataArray, previousDataArray;
let currentVisualizer = 'bar';
let lyrics = [];
let currentLyricIndex = 0;

// Set canvas size
function setCanvasSize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
window.addEventListener('resize', setCanvasSize);
setCanvasSize();

fileInput.addEventListener('change', handleFileSelect);
lyricsInput.addEventListener('change', handleLyricsSelect);
toggleBar.addEventListener('click', () => (currentVisualizer = 'bar'));
toggleRadial.addEventListener('click', () => (currentVisualizer = 'radial'));

function handleFileSelect(event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function (e) {
            const audioData = e.target.result;
            // Initialize AudioContext and decode the audio
            initAudioContext();
            audioContext.decodeAudioData(audioData)
                .then(buffer => playAudio(buffer))
                .catch(error => console.error('Error decoding audio:', error));
        };
        reader.readAsArrayBuffer(file);
    }
}

function handleLyricsSelect(event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function (e) {
            const lyricsText = e.target.result;
            parseLyrics(lyricsText);
        };
        reader.readAsText(file);
    }
}

function parseLyrics(lyricsText) {
    const lines = lyricsText.split('\n');
    lyrics = lines.map(line => {
        const match = line.match(/\[(\d{2}):(\d{2}\.\d{2})\](.*)/);
        if (match) {
            const minutes = parseInt(match[1]);
            const seconds = parseFloat(match[2]);
            const text = match[3].trim();
            const timestamp = minutes * 60 + seconds;
            return { timestamp, text };
        }
        return null;
    }).filter(item => item !== null);
}

function initAudioContext() {
    if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        analyser = audioContext.createAnalyser();
        analyser.fftSize = 256;
        dataArray = new Uint8Array(analyser.frequencyBinCount);
        previousDataArray = new Float32Array(analyser.frequencyBinCount);
    }

    // Resume the AudioContext if it's suspended
    if (audioContext.state === 'suspended') {
        audioContext.resume();
    }
}

function playAudio(buffer) {
    if (bufferSource) {
        bufferSource.stop(); // Stop previous audio if any
        bufferSource.disconnect();
    }

    bufferSource = audioContext.createBufferSource();
    bufferSource.buffer = buffer;

    // Connect audio nodes
    bufferSource.connect(analyser);
    analyser.connect(audioContext.destination);

    // Start playing audio
    bufferSource.start();
    visualize();
}

function visualize() {
    requestAnimationFrame(visualize);
    analyser.getByteFrequencyData(dataArray);

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (currentVisualizer === 'bar') drawBars();
    if (currentVisualizer === 'waveform') drawWaveform();
    if (currentVisualizer === 'radial') drawRadialSpectrum();

    // Smooth transition of data (easing effect)
    for (let i = 0; i < dataArray.length; i++) {
        previousDataArray[i] += (dataArray[i] - previousDataArray[i]) * 0.2; // Smooth step
    }

    // Update lyrics display based on audio currentTime
    const currentTime = audioContext.currentTime;
    updateLyricsDisplay(currentTime);
}

function updateLyricsDisplay(currentTime) {
    // Find the lyric line corresponding to the current time
    for (let i = currentLyricIndex; i < lyrics.length; i++) {
        if (currentTime >= lyrics[i].timestamp) {
            lyricsDisplay.textContent = lyrics[i].text;
            currentLyricIndex = i;
        } else {
            break;
        }
    }
}

// Gradient color variables
let gradientStart = "#ff0000";
let gradientEnd = "#0000ff";
let useGradient = true; // Default to gradient
let brightness = 1;

// Update gradient colors and toggle
document.getElementById('colorStart').addEventListener('input', (event) => {
    gradientStart = event.target.value;
    console.log(`Gradient start color changed to: ${gradientStart}`);
});

document.getElementById('colorEnd').addEventListener('input', (event) => {
    gradientEnd = event.target.value;
    console.log(`Gradient end color changed to: ${gradientEnd}`);
});

document.getElementById('brightnessSlider').addEventListener('input', (event) => {
    brightness = parseFloat(event.target.value);
    console.log(`Brightness level set to: ${brightness}`);
});

// Updated drawBars function to use brightness
function drawBars() {
    const barWidth = canvas.width / dataArray.length;
    const gradient = useGradient
        ? createLinearGradient(ctx, 0, canvas.height, canvas.width, 0, adjustColor(gradientStart, brightness), adjustColor(gradientEnd, brightness))
        : adjustColor(visualizerColor, brightness);

    dataArray.forEach((value, index) => {
        const barHeight = previousDataArray[index];
        const x = index * barWidth;
        const y = canvas.height - barHeight;

        ctx.fillStyle = gradient;
        ctx.shadowBlur = 20;
        ctx.shadowColor = gradientStart;

        ctx.fillRect(x, y, barWidth, barHeight);
    });
}

// Updated drawRadialSpectrum function to use brightness
function drawRadialSpectrum() {
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const radius = Math.min(canvas.width, canvas.height) / 4;
    const angleStep = (2 * Math.PI) / dataArray.length;

    dataArray.forEach((value, index) => {
        const barHeight = previousDataArray[index] / 2;
        const angle = index * angleStep;
        const x1 = centerX + radius * Math.cos(angle);
        const y1 = centerY + radius * Math.sin(angle);
        const x2 = centerX + (radius + barHeight) * Math.cos(angle);
        const y2 = centerY + (radius + barHeight) * Math.sin(angle);

        const gradient = useGradient
            ? createLinearGradient(ctx, x1, y1, x2, y2, adjustColor(gradientStart, brightness), adjustColor(gradientEnd, brightness))
            : adjustColor(visualizerColor, brightness);

        ctx.strokeStyle = gradient;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
    });
}

// Utility function to adjust color brightness
function adjustColor(color, brightness) {
    // Parse the color into RGB
    const match = color.match(/^#([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i);
    if (!match) return color; // Return original color if invalid
    const [_, r, g, b] = match.map((hex) => parseInt(hex, 16));

    // Apply brightness scaling
    const adjustedR = Math.min(255, r * brightness);
    const adjustedG = Math.min(255, g * brightness);
    const adjustedB = Math.min(255, b * brightness);

    // Return adjusted color as hex
    return `rgba(${adjustedR}, ${adjustedG}, ${adjustedB}, 1)`;
}

// Utility function to create a linear gradient
function createLinearGradient(ctx, x0, y0, x1, y1, color1, color2) {
    const gradient = ctx.createLinearGradient(x0, y0, x1, y1);
    gradient.addColorStop(0, color1);
    gradient.addColorStop(1, color2);
    return gradient;
}

document.getElementById('imginput').addEventListener('change', function(event) {
    const file = event.target.files[0];
    const reader = new FileReader();
    const canvas = document.getElementById('visualizerCanvas');
    const ctx = canvas.getContext('2d');

    reader.onload = function(e) {
        // Set the background image of the canvas
        const img = new Image();
        img.onload = function() {
            canvas.style.backgroundImage = `url(${e.target.result})`;
            canvas.style.backgroundSize = 'cover';  // Cover the whole canvas
            canvas.style.backgroundPosition = 'center'; // Center the image
        };
        img.src = e.target.result;
    };

    // Read the image as a Data URL
    if (file) {
        reader.readAsDataURL(file);
    }
});

const audiorefresh = document.getElementById("refreshButton");

audiorefresh.addEventListener("click", () => {
    fileInput.value = ""; 
    if (bufferSource) {
        bufferSource.stop(); 
        bufferSource.disconnect(); 
        bufferSource = null;
    }
    currentVisualizer = 'bar'; 
    currentLyricIndex = 0; 
    lyricsDisplay.textContent = ""; 
});

const playPauseButton = document.getElementById('playPauseButton');
let isPlaying = false;
let startTime = 0; // Tracks when the audio starts
let pausedTime = 0; // Tracks the audio's paused time
let buffer = null; // Global buffer to store decoded audio data

playPauseButton.addEventListener('click', () => {
    if (!buffer) {
        alert("Please select an audio file first!");
        return;
    }

    if (isPlaying) {
        pauseAudio();
    } else {
        resumeAudio();
    }
});

function pauseAudio() {
    if (bufferSource) {
        bufferSource.stop();
        bufferSource.disconnect();
        pausedTime = audioContext.currentTime - startTime; // Save the paused time
        isPlaying = false;
        playPauseButton.textContent = 'Play';
    }
}

function resumeAudio() {
    if (buffer) { // Ensure buffer is loaded
        initAudioContext(); // Ensure AudioContext is active
        bufferSource = audioContext.createBufferSource();
        bufferSource.buffer = buffer; // Use the global buffer

        // Reconnect audio nodes
        bufferSource.connect(analyser);
        analyser.connect(audioContext.destination);

        // Resume playback from paused time
        bufferSource.start(0, pausedTime);
        startTime = audioContext.currentTime - pausedTime; // Update start time
        isPlaying = true;
        playPauseButton.textContent = 'Pause';
        visualize(); // Restart visualization
    }
}

function playAudio(decodedBuffer) {
    if (bufferSource) {
        bufferSource.stop();
        bufferSource.disconnect();
    }

    // Store the decoded audio in the global buffer
    buffer = decodedBuffer;

    bufferSource = audioContext.createBufferSource();
    bufferSource.buffer = buffer;

    // Connect audio nodes
    bufferSource.connect(analyser);
    analyser.connect(audioContext.destination);

    // Start playing audio
    bufferSource.start(0);
    startTime = audioContext.currentTime; // Reset start time
    pausedTime = 0; // Reset paused time
    isPlaying = true;
    playPauseButton.textContent = 'Pause';
    visualize(); // Start visualization
}

function setCanvasSize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    lyricsDisplay.style.fontSize = `${Math.max(14, window.innerWidth / 60)}px`; // Scale lyrics text
}
