document.addEventListener('DOMContentLoaded', function () {
    // Production mode flag - set to true for production
    const PRODUCTION_MODE = true;

    // Simple logger that can be toggled for production
    const logger = {
        log: function (message, ...args) {
            if (!PRODUCTION_MODE) {
                console.log(message, ...args);
            }
        },
        error: function (message, ...args) {
            // Always log errors even in production
            console.error(message, ...args);
        },
        warn: function (message, ...args) {
            if (!PRODUCTION_MODE) {
                console.warn(message, ...args);
            }
        }
    };

    // DOM elements
    const playerNameInput = document.getElementById('player-name');
    const bkashNumberInput = document.getElementById('bkash-number');
    const validationMessage = document.getElementById('validation-message');
    const addPlayerButton = document.getElementById('add-player');
    const currentPlayerName = document.getElementById('current-player-name');
    const spinButton = document.getElementById('spin-button');
    const playersListElement = document.getElementById('players-list');
    const viewWinnersButton = document.getElementById('view-winners');
    const winnersModal = document.getElementById('winners-modal');
    const closeModalButton = document.querySelector('.close');
    const canvas = document.getElementById('wheel');
    const shareWinButton = document.getElementById('share-win-btn');
    const muteButton = document.getElementById('mute-button');

    // Game state
    const ctx = canvas.getContext('2d');
    let players = [];
    let currentPlayerIndex = -1;
    let isSpinning = false;
    let gameCompleted = false;
    let currentUser = null;
    let spinCount = 0;

    // Global variables for sound management
    let spinSound = null;
    let winSound = null;
    let audioContext = null;
    let isSoundMuted = false;

    // Load game session data
    function loadSessionData() {
        try {
            // Try to load current user data from sessionStorage
            const sessionData = sessionStorage.getItem('luckyWheelSession');

            if (sessionData) {
                const parsedData = JSON.parse(sessionData);
                logger.log('Loaded session data:', parsedData);

                if (parsedData.currentPlayerIndex !== undefined) {
                    currentPlayerIndex = parsedData.currentPlayerIndex;
                }

                if (parsedData.currentUserId) {
                    // We'll restore the full user object when players are loaded
                    logger.log('Found saved user ID in session:', parsedData.currentUserId);
                }

                if (parsedData.spinCount !== undefined) {
                    spinCount = parsedData.spinCount;
                    // spinCountElement.textContent = spinCount;
                }
            }
        } catch (e) {
            logger.error('Error loading session data:', e);
        }
    }

    // Save current session data
    function saveSessionData() {
        try {
            const sessionData = {
                currentPlayerIndex: currentPlayerIndex,
                currentUserId: currentUser ? currentUser.id : null,
                spinCount: spinCount,
                timestamp: Date.now()
            };

            sessionStorage.setItem('luckyWheelSession', JSON.stringify(sessionData));
            logger.log('Session data saved:', sessionData);
        } catch (e) {
            logger.error('Error saving session data:', e);
        }
    }

    // Set up audio management
    setupAudio();

    // Initialize audio with more robust loading
    function setupAudio() {
        try {
            logger.log('Setting up audio...');

            // Create audio context
            if (window.AudioContext || window.webkitAudioContext) {
                audioContext = new (window.AudioContext || window.webkitAudioContext)();
                logger.log('AudioContext created successfully');
            } else {
                logger.warn('Web Audio API not supported in this browser');
            }

            // Load sound effects with proper error handling
            spinSound = new Audio();
            spinSound.src = 'assets/wheel-spin.mp3';
            spinSound.preload = 'auto';

            winSound = new Audio();
            winSound.src = 'assets/win-sound.mp3';
            winSound.preload = 'auto';

            logger.log('Audio files set up, attempting to preload');

            // Add a load event listener
            spinSound.addEventListener('canplaythrough', () => {
                logger.log('Spin sound loaded successfully');
            });

            winSound.addEventListener('canplaythrough', () => {
                logger.log('Win sound loaded successfully');
            });

            // Add error listeners
            spinSound.addEventListener('error', (e) => {
                logger.error('Error loading spin sound:', e);
            });

            winSound.addEventListener('error', (e) => {
                logger.error('Error loading win sound:', e);
            });

            // Try loading
            spinSound.load();
            winSound.load();

            // Add a click handler to the document to enable audio
            document.addEventListener('click', enableAudio, { once: true });

            // Set up mute button
            if (muteButton) {
                muteButton.addEventListener('click', toggleMute);
            }
        } catch (error) {
            logger.error('Error setting up audio:', error);
        }
    }

    // Enable audio (called after user interaction)
    function enableAudio() {
        logger.log('User interaction detected, enabling audio...');
        try {
            // Resume AudioContext if it exists and is suspended
            if (audioContext && audioContext.state === 'suspended') {
                audioContext.resume().then(() => {
                    logger.log('AudioContext resumed successfully');
                });
            }

            // Try to play a silent sound to enable audio
            const silentSound = new Audio();
            silentSound.src = 'data:audio/mp3;base64,SUQzBAAAAAABEVRYWFgAAAAtAAADY29tbWVudABCaWdTb3VuZEJhbmsuY29tIC8gTGFTb25vdGhlcXVlLm9yZwBURU5DAAAAHQAAA1N3aXRjaCBQbHVzIMKpIE5DSCBTb2Z0d2FyZQBUSVQyAAAABgAAAzIyMzUAVFNTRQAAAA8AAANMYXZmNTcuODMuMTAwAAAAAAAAAAAAAAD/80DEAAAAA0gAAAAATEFNRTMuMTAwVVVVVVVVVVVVVUxBTUUzLjEwMFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVf/zQsRbAAADSAAAAABVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVf/zQMSkAAADSAAAAABVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV';
            silentSound.play().catch(e => logger.log('Silent sound playback error:', e));

            // Try to play and immediately pause the actual sounds
            // This helps with mobile browsers
            spinSound.play().then(() => {
                spinSound.pause();
                spinSound.currentTime = 0;
                logger.log('Spin sound activated');
            }).catch(e => logger.log('Could not activate spin sound:', e));

            winSound.play().then(() => {
                winSound.pause();
                winSound.currentTime = 0;
                logger.log('Win sound activated');
            }).catch(e => logger.log('Could not activate win sound:', e));
        } catch (error) {
            logger.error('Error enabling audio:', error);
        }
    }

    // Advanced play sound function with fallbacks
    function playSound(sound) {
        if (!sound || isSoundMuted) return;

        logger.log('Attempting to play sound...');

        try {
            // First try: simple play
            sound.currentTime = 0;
            let playPromise = sound.play();

            // Handle promise (new browsers return promise from play())
            if (playPromise !== undefined) {
                playPromise.then(() => {
                    logger.log('Sound playing successfully');
                }).catch(error => {
                    logger.warn('Could not play sound directly:', error);

                    // Second try: after user interaction
                    document.addEventListener('click', function playAfterClick() {
                        sound.play().catch(e => logger.error('Still cannot play sound:', e));
                        document.removeEventListener('click', playAfterClick);
                    }, { once: true });

                    // Show a message to the user
                    showSoundEnableMessage();
                });
            }
        } catch (error) {
            logger.error('Error playing sound:', error);
        }
    }

    // Show a message to enable sound
    function showSoundEnableMessage() {
        const soundMsg = document.createElement('div');
        soundMsg.className = 'sound-message';
        soundMsg.innerHTML = 'Click anywhere to enable sounds';
        document.body.appendChild(soundMsg);

        setTimeout(() => {
            soundMsg.remove();
        }, 3000);
    }

    // Toggle mute function
    function toggleMute() {
        isSoundMuted = !isSoundMuted;
        const muteButton = document.getElementById('mute-button');

        if (muteButton) {
            if (isSoundMuted) {
                muteButton.innerHTML = '🔇';
                muteButton.setAttribute('title', 'Unmute');
            } else {
                muteButton.innerHTML = '🔊';
                muteButton.setAttribute('title', 'Mute');

                // Try playing a test sound when unmuted
                try {
                    const testSound = new Audio('data:audio/mp3;base64,SUQzBAAAAAABEVRYWFgAAAAtAAADY29tbWVudABCaWdTb3VuZEJhbmsuY29tIC8gTGFTb25vdGhlcXVlLm9yZwBURU5DAAAAHQAAA1N3aXRjaCBQbHVzIMKpIE5DSCBTb2Z0d2FyZQBUSVQyAAAABgAAAzIyMzUAVFNTRQAAAA8AAANMYXZmNTcuODMuMTAwAAAAAAAAAAAAAAD/80DEAAAAA0gAAAAATEFNRTMuMTAwVVVVVVVVVVVVVUxBTUUzLjEwMFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVf/zQsRbAAADSAAAAABVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVf/zQMSkAAADSAAAAABVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV');
                    testSound.volume = 0.1;
                    testSound.play().catch(e => logger.log('Test sound play error:', e));
                } catch (e) {
                    logger.log('Could not play test sound:', e);
                }
            }
        }

        // Also check and update the volume of existing sounds
        if (spinSound) spinSound.muted = isSoundMuted;
        if (winSound) winSound.muted = isSoundMuted;

        logger.log('Sound is now', isSoundMuted ? 'muted' : 'unmuted');
    }

    // Load saved players from localStorage (as backup for database)
    function loadSavedPlayers() {
        try {
            const savedPlayers = localStorage.getItem('luckyWheelPlayers');
            if (savedPlayers) {
                logger.log('Found saved players in localStorage');
                return JSON.parse(savedPlayers);
            }
        } catch (e) {
            logger.error('Error loading saved players:', e);
        }
        return [];
    }

    // Save players to localStorage (as backup for database)
    function savePlayers(playersToSave) {
        try {
            localStorage.setItem('luckyWheelPlayers', JSON.stringify(playersToSave));
        } catch (e) {
            logger.error('Error saving players:', e);
        }
    }

    // Initialize with players from database and localStorage
    async function initializeLeaderboard() {
        logger.log('Initializing leaderboard...');

        // Load session data first
        loadSessionData();

        // Track if we need to restore the current user
        const sessionUserId = JSON.parse(sessionStorage.getItem('luckyWheelSession') || '{}').currentUserId;

        try {
            // First try to get players from database
            logger.log('Fetching players from database...');
            const dbPlayers = await fetchPlayers();

            if (dbPlayers && dbPlayers.length > 0) {
                logger.log('Found', dbPlayers.length, 'players in database!');

                // Use database players (the source of truth)
                players = dbPlayers.map(dbPlayer => ({
                    id: dbPlayer.id,
                    name: dbPlayer.name,
                    bkashNumber: dbPlayer.bkashNumber,
                    encryptedBkashNumber: dbPlayer.encryptedBkashNumber,
                    score: dbPlayer.score,
                    hasPlayed: true
                }));

                // If we have a saved user ID, restore the current user
                if (sessionUserId) {
                    logger.log('Restoring user from session with ID:', sessionUserId);
                    const savedUser = players.find(p => p.id === sessionUserId);

                    if (savedUser) {
                        currentUser = savedUser;
                        // Find this user's index in the players array
                        const userIndex = players.findIndex(p => p.id === sessionUserId);
                        if (userIndex >= 0) {
                            currentPlayerIndex = userIndex;
                            // Update UI to show current player with encrypted bKash
                            const encryptedNumber = savedUser.encryptedBkashNumber || formatEncryptedBkash(savedUser.bkashNumber);
                            currentPlayerName.textContent = `${savedUser.name} (${encryptedNumber})`;
                            spinButton.disabled = false;

                            // Add the edit button for the current player
                            addEditNameButton();

                            logger.log('Successfully restored user:', savedUser.name);
                        }
                    } else {
                        logger.log('Saved user not found in player list, session will be reset');
                        currentPlayerIndex = -1;
                        sessionStorage.removeItem('luckyWheelSession');
                    }
                }

                // Save to localStorage as backup
                savePlayers(players);

                // Update leaderboard immediately
                displayLeaderboard(players);
                return;
            } else {
                logger.log('No players found in database, checking localStorage...');
            }
        } catch (error) {
            logger.error('Error fetching from database:', error);
            logger.log('Falling back to localStorage...');
        }

        // Fallback to localStorage if database failed or had no players
        const savedPlayers = loadSavedPlayers();
        if (savedPlayers && savedPlayers.length > 0) {
            logger.log('Loading', savedPlayers.length, 'players from localStorage');
            players = savedPlayers;

            // If we have a saved user ID, restore the current user
            if (sessionUserId) {
                logger.log('Restoring user from local storage with ID:', sessionUserId);
                const savedUser = players.find(p => p.id === sessionUserId);

                if (savedUser) {
                    currentUser = savedUser;
                    // Find this user's index in the players array
                    const userIndex = players.findIndex(p => p.id === sessionUserId);
                    if (userIndex >= 0) {
                        currentPlayerIndex = userIndex;
                        // Update UI to show current player with encrypted bKash
                        const encryptedNumber = savedUser.encryptedBkashNumber || formatEncryptedBkash(savedUser.bkashNumber);
                        currentPlayerName.textContent = `${savedUser.name} (${encryptedNumber})`;
                        spinButton.disabled = false;

                        // Add the edit button for the current player
                        addEditNameButton();

                        logger.log('Successfully restored user from localStorage:', savedUser.name);
                    }
                }
            }

            // Show initial leaderboard with saved players
            displayLeaderboard(players);
        } else {
            logger.log('No players found in localStorage either.');
            displayLeaderboard([]);
        }
    }

    // Display specific players in the leaderboard (utility function)
    function displayLeaderboard(playersToDisplay) {
        logger.log('Displaying', playersToDisplay.length, 'players in leaderboard');

        // Clear current list
        while (playersListElement.firstChild) {
            playersListElement.removeChild(playersListElement.firstChild);
        }

        if (!playersToDisplay || playersToDisplay.length === 0) {
            logger.log('No players to display');
            const emptyMessage = document.createElement('p');
            emptyMessage.className = 'empty-message';
            emptyMessage.textContent = 'No players yet.';
            playersListElement.appendChild(emptyMessage);
            return;
        }

        // Sort by score (highest first)
        const sortedPlayers = [...playersToDisplay].sort((a, b) => b.score - a.score);

        // Add each player to the list
        sortedPlayers.forEach((player, index) => {
            const playerItem = document.createElement('div');
            playerItem.className = 'player-item';

            const playerInfoDiv = document.createElement('div');
            playerInfoDiv.className = 'player-info';

            const nameSpan = document.createElement('span');
            nameSpan.className = 'player-name';
            nameSpan.textContent = player.name;

            const bkashSpan = document.createElement('span');
            bkashSpan.className = 'player-bkash';
            // Use the encrypted bKash number if available, otherwise encrypt it client-side
            const encryptedNumber = player.encryptedBkashNumber ||
                (player.bkashNumber ? formatEncryptedBkash(player.bkashNumber) : 'Unknown');
            bkashSpan.textContent = encryptedNumber;

            const scoreSpan = document.createElement('span');
            scoreSpan.className = 'player-score';
            scoreSpan.textContent = player.score > 0 ? `৳${player.score}` : '৳0';

            playerInfoDiv.appendChild(nameSpan);
            playerInfoDiv.appendChild(bkashSpan);

            playerItem.appendChild(playerInfoDiv);
            playerItem.appendChild(scoreSpan);

            playersListElement.appendChild(playerItem);
        });
    }

    // Initialize leaderboard immediately
    initializeLeaderboard();

    // Enable View Winners button by default
    viewWinnersButton.disabled = false;

    // Prize configuration with values between 50-200 tk, higher values are rare
    const prizes = [
        { text: "৳50", value: 50, color: "#00B8BA" },
        { text: "৳75", value: 75, color: "#0080B8" },
        { text: "৳60", value: 60, color: "#00B8BA" },
        { text: "৳50", value: 50, color: "#FFCC00" },
        { text: "৳80", value: 80, color: "#0080B8" },
        { text: "৳55", value: 55, color: "#00B8BA" },
        { text: "৳100", value: 100, color: "#FFCC00" }, // Uncommon higher value
        { text: "৳65", value: 65, color: "#0080B8" },
        { text: "৳70", value: 70, color: "#00B8BA" },
        { text: "৳150", value: 150, color: "#FFCC00" }, // Rare higher value
        { text: "৳90", value: 90, color: "#0080B8" },
        { text: "৳200", value: 200, color: "#FFCC00" } // Very rare highest value
    ];

    const wheelRadius = canvas.width / 2;
    const centerX = wheelRadius;
    const centerY = wheelRadius;

    // Initialize wheel to match the reference image
    function drawWheel() {
        const canvas = document.getElementById('wheel');
        const ctx = canvas.getContext('2d');
        const width = canvas.width;
        const height = canvas.height;
        const centerX = width / 2;
        const centerY = height / 2;
        const radius = Math.min(width, height) / 2 - 10;

        // Clear the canvas
        ctx.clearRect(0, 0, width, height);

        // Draw futuristic outer ring with glowing effect
        const gradient = ctx.createRadialGradient(centerX, centerY, radius - 20, centerX, centerY, radius + 5);
        gradient.addColorStop(0, 'rgba(0, 217, 255, 0)');
        gradient.addColorStop(0.8, 'rgba(0, 217, 255, 0.6)');
        gradient.addColorStop(1, 'rgba(0, 217, 255, 0)');

        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
        ctx.strokeStyle = gradient;
        ctx.lineWidth = 10;
        ctx.stroke();

        // Draw a thinner inner ring with different color
        const innerGradient = ctx.createRadialGradient(centerX, centerY, radius - 25, centerX, centerY, radius - 15);
        innerGradient.addColorStop(0, 'rgba(180, 0, 255, 0)');
        innerGradient.addColorStop(0.8, 'rgba(180, 0, 255, 0.6)');
        innerGradient.addColorStop(1, 'rgba(180, 0, 255, 0)');

        ctx.beginPath();
        ctx.arc(centerX, centerY, radius - 20, 0, 2 * Math.PI);
        ctx.strokeStyle = innerGradient;
        ctx.lineWidth = 5;
        ctx.stroke();

        // Draw segments
        const segmentAngle = 2 * Math.PI / prizes.length;

        for (let i = 0; i < prizes.length; i++) {
            // Calculate start and end angles for this segment
            const startAngle = i * segmentAngle;
            const endAngle = (i + 1) * segmentAngle;

            // Draw segment path
            ctx.beginPath();
            ctx.moveTo(centerX, centerY);
            ctx.arc(centerX, centerY, radius - 30, startAngle, endAngle);
            ctx.lineTo(centerX, centerY);
            ctx.closePath();

            // Create futuristic gradient for segment
            const segmentGradient = ctx.createRadialGradient(
                centerX, centerY, 0,
                centerX, centerY, radius
            );

            // Get base color for this segment
            const baseColor = prizes[i].color;
            const lighterColor = lightenColor(baseColor, 20);
            const darkerColor = darkenColor(baseColor, 20);

            segmentGradient.addColorStop(0, darkerColor);
            segmentGradient.addColorStop(0.7, baseColor);
            segmentGradient.addColorStop(1, lighterColor);

            ctx.fillStyle = segmentGradient;
            ctx.fill();

            // Add subtle segment separator lines
            ctx.beginPath();
            ctx.moveTo(centerX, centerY);
            ctx.arc(centerX, centerY, radius - 30, startAngle, startAngle);
            ctx.lineTo(centerX, centerY);
            ctx.strokeStyle = 'rgba(0, 217, 255, 0.5)';
            ctx.lineWidth = 1;
            ctx.stroke();

            // Add inner segment arc with glow effect
            ctx.beginPath();
            ctx.arc(centerX, centerY, radius - 65, startAngle, endAngle);
            ctx.strokeStyle = 'rgba(0, 217, 255, 0.3)';
            ctx.lineWidth = 1;
            ctx.stroke();

            // Draw segment text
            ctx.save();

            // Position text in the middle of the segment
            const textAngle = startAngle + segmentAngle / 2;
            const textRadius = radius - 50;
            const textX = centerX + textRadius * Math.cos(textAngle);
            const textY = centerY + textRadius * Math.sin(textAngle);

            // Rotate text to align with segment
            ctx.translate(textX, textY);
            ctx.rotate(textAngle + Math.PI / 2);

            // Set text styles
            ctx.fillStyle = 'white';
            ctx.font = 'bold 16px Poppins, Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';

            // Add text glow effect
            ctx.shadowColor = 'rgba(0, 217, 255, 0.8)';
            ctx.shadowBlur = 5;

            // Draw prize amount - remove the extra ৳ symbol since it's already in the prizes[i].text
            ctx.fillText(prizes[i].text, 0, 0);

            ctx.restore();
        }

        // Draw center circle
        const centerGradient = ctx.createRadialGradient(
            centerX, centerY, 0,
            centerX, centerY, 30
        );
        centerGradient.addColorStop(0, '#00ff9e');
        centerGradient.addColorStop(0.7, '#00a97b');
        centerGradient.addColorStop(1, '#005d40');

        ctx.beginPath();
        ctx.arc(centerX, centerY, 30, 0, 2 * Math.PI);
        ctx.fillStyle = centerGradient;
        ctx.fill();

        // Add glow effect to center
        ctx.beginPath();
        ctx.arc(centerX, centerY, 30, 0, 2 * Math.PI);
        ctx.strokeStyle = 'rgba(0, 255, 158, 0.6)';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Add center pattern
        ctx.beginPath();
        for (let i = 0; i < 8; i++) {
            const angle = i * Math.PI / 4;
            const x1 = centerX + 15 * Math.cos(angle);
            const y1 = centerY + 15 * Math.sin(angle);
            const x2 = centerX + 28 * Math.cos(angle);
            const y2 = centerY + 28 * Math.sin(angle);

            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
        }
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Draw indicator at the top
        ctx.beginPath();
        ctx.moveTo(centerX, centerY - radius + 25);
        ctx.lineTo(centerX - 10, centerY - radius + 5);
        ctx.lineTo(centerX + 10, centerY - radius + 5);
        ctx.closePath();
        ctx.fillStyle = '#00ff9e';
        ctx.fill();

        // Add glow to indicator
        ctx.shadowColor = 'rgba(0, 255, 158, 0.8)';
        ctx.shadowBlur = 10;
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.shadowBlur = 0;
    }

    // Helper function to lighten a color
    function lightenColor(color, percent) {
        const num = parseInt(color.replace('#', ''), 16);
        const amt = Math.round(2.55 * percent);
        const r = Math.min(255, (num >> 16) + amt);
        const g = Math.min(255, ((num >> 8) & 0x00FF) + amt);
        const b = Math.min(255, (num & 0x0000FF) + amt);
        return `#${(1 << 24 | r << 16 | g << 8 | b).toString(16).slice(1)}`;
    }

    // Helper function to darken a color
    function darkenColor(color, percent) {
        const num = parseInt(color.replace('#', ''), 16);
        const amt = Math.round(2.55 * percent);
        const r = Math.max(0, (num >> 16) - amt);
        const g = Math.max(0, ((num >> 8) & 0x00FF) - amt);
        const b = Math.max(0, (num & 0x0000FF) - amt);
        return `#${(1 << 24 | r << 16 | g << 8 | b).toString(16).slice(1)}`;
    }

    // Spin the wheel and calculate the result
    async function spinWheel() {
        if (isSpinning || !currentUser) return;

        // Try to play the spin sound
        playSound(spinSound);

        isSpinning = true;
        spinButton.disabled = true;

        // Increment spin count and update UI
        spinCount++;
        // spinCountElement.textContent = spinCount;

        // Get the current player
        const currentPlayer = players[currentPlayerIndex];

        // Check if this is a returning player with an existing score
        const isReturningPlayer = currentPlayer && currentPlayer.hasPlayed && currentPlayer.score > 0;
        let selectedIndex = 0;

        if (isReturningPlayer) {
            // For returning players, find the segment that matches their previous score
            logger.log('Returning player detected with score:', currentPlayer.score);

            // Find the matching prize index, or closest match
            let bestMatchIndex = 0;
            let smallestDifference = Infinity;

            for (let i = 0; i < prizes.length; i++) {
                if (prizes[i].value === currentPlayer.score) {
                    // Perfect match
                    bestMatchIndex = i;
                    break;
                }

                // Keep track of closest match
                const difference = Math.abs(prizes[i].value - currentPlayer.score);
                if (difference < smallestDifference) {
                    smallestDifference = difference;
                    bestMatchIndex = i;
                }
            }

            selectedIndex = bestMatchIndex;
            logger.log('Found matching prize at index:', selectedIndex, 'with value:', prizes[selectedIndex].value);
        } else {
            // Determine a random result (weighted for prizes)
            const segments = prizes.length;
            const prizeWeights = prizes.map(prize => {
                if (prize.value >= 200) return 1;  // Extremely rare (1%)
                if (prize.value >= 150) return 3;  // Very rare (3%)
                if (prize.value >= 100) return 8;  // Rare (8%)
                if (prize.value >= 80) return 15;  // Uncommon (15%)
                if (prize.value >= 65) return 20;  // Common (20%)
                return 25;  // Most common (25% for lowest values 50-60)
            });

            const totalWeight = prizeWeights.reduce((a, b) => a + b, 0);
            let random = Math.random() * totalWeight;

            for (let i = 0; i < prizeWeights.length; i++) {
                random -= prizeWeights[i];
                if (random <= 0) {
                    selectedIndex = i;
                    break;
                }
            }
        }

        // Store the selected prize for later reference
        const selectedPrize = prizes[selectedIndex];
        logger.log('Selected prize before animation:', selectedPrize.text, 'value:', selectedPrize.value);

        // Calculate rotation - Make sure we land exactly on the selected segment
        const segments = prizes.length;
        const segmentAngle = 360 / segments;

        // Calculate the angle precisely to ensure we stop at the center of the selected segment
        const segmentPosition = 360 - (segmentAngle * selectedIndex) - (segmentAngle / 2);
        const extraRotations = 2; // 2 rotations for a quick but visible spin
        const finalRotation = extraRotations * 360 + segmentPosition;

        logger.log('Segment angle:', segmentAngle, 'Selected index:', selectedIndex);
        logger.log('Final position calculation:', segmentPosition, 'Final rotation:', finalRotation);

        // Animation parameters
        const duration = 2000; // 2 seconds total spin time
        const initialRotation = 0;

        let currentRotation = initialRotation;
        let currentSpeed = 10; // Fixed speed value

        // Basic animation without special effects during spin
        function animate() {
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            // Convert degrees to radians for rotation
            const rotationInRadians = (currentRotation * Math.PI) / 180;

            // Rotate canvas to draw wheel
            ctx.save();
            ctx.translate(centerX, centerY);
            ctx.rotate(rotationInRadians);
            ctx.translate(-centerX, -centerY);

            // Draw the wheel (simplified version without special effects)
            const outerBorderWidth = 6;
            const innerCircleRadius = 40;
            const effectiveRadius = wheelRadius - outerBorderWidth - 2;

            // Draw blue background circle
            ctx.beginPath();
            ctx.arc(centerX, centerY, wheelRadius, 0, 2 * Math.PI);
            const bgGradient = ctx.createRadialGradient(
                centerX, centerY, innerCircleRadius,
                centerX, centerY, wheelRadius
            );
            bgGradient.addColorStop(0, '#1a3a47');
            bgGradient.addColorStop(1, '#0d1f26');
            ctx.fillStyle = bgGradient;
            ctx.fill();

            // Draw white border
            ctx.strokeStyle = '#FFFFFF';
            ctx.lineWidth = outerBorderWidth;
            ctx.stroke();

            // Draw black outer ring
            ctx.beginPath();
            ctx.arc(centerX, centerY, wheelRadius - outerBorderWidth / 2, 0, 2 * Math.PI);
            ctx.strokeStyle = '#000000';
            ctx.lineWidth = 2;
            ctx.stroke();

            // Draw all wheel segments
            for (let i = 0; i < prizes.length; i++) {
                const startAngle = i * (2 * Math.PI / prizes.length);
                const endAngle = (i + 1) * (2 * Math.PI / prizes.length);

                // Draw segment
                ctx.beginPath();
                ctx.moveTo(centerX, centerY);
                ctx.arc(centerX, centerY, effectiveRadius, startAngle, endAngle);
                ctx.lineTo(centerX, centerY);

                // Create gradient
                const gradient = ctx.createRadialGradient(
                    centerX, centerY, innerCircleRadius,
                    centerX, centerY, effectiveRadius
                );
                gradient.addColorStop(0, lightenColor(prizes[i].color, 20));
                gradient.addColorStop(1, prizes[i].color);
                ctx.fillStyle = gradient;
                ctx.fill();

                // Add segment border
                ctx.strokeStyle = '#000000';
                ctx.lineWidth = 1;
                ctx.stroke();

                // Draw text
                ctx.save();
                ctx.translate(centerX, centerY);
                const textAngle = startAngle + (endAngle - startAngle) / 2;
                ctx.rotate(textAngle);

                // Text styling
                ctx.textAlign = 'right';
                ctx.font = 'bold 14px Arial';
                ctx.fillStyle = '#FFFFFF';
                ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
                ctx.shadowBlur = 2;
                ctx.shadowOffsetX = 1;
                ctx.shadowOffsetY = 1;

                // Position text
                const textRadius = (innerCircleRadius + effectiveRadius) / 2 + 25;
                ctx.fillText(prizes[i].text, textRadius, 5);
                ctx.restore();
            }

            // Draw center circle
            const centerGradient = ctx.createRadialGradient(
                centerX - 10, centerY - 10, 0,
                centerX, centerY, innerCircleRadius
            );
            centerGradient.addColorStop(0, '#ffffff');
            centerGradient.addColorStop(0.7, '#f0f8ff');
            centerGradient.addColorStop(1, '#e0f0ff');

            ctx.beginPath();
            ctx.arc(centerX, centerY, innerCircleRadius, 0, 2 * Math.PI);
            ctx.fillStyle = centerGradient;
            ctx.fill();
            ctx.strokeStyle = '#aacce0';
            ctx.lineWidth = 3;
            ctx.stroke();

            ctx.beginPath();
            ctx.arc(centerX, centerY, innerCircleRadius, 0, 2 * Math.PI);
            ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
            ctx.lineWidth = 1;
            ctx.stroke();

            ctx.restore();

            // Calculate elapsed time and progress
            const elapsedTime = Date.now() - startTime;
            const progress = Math.min(elapsedTime / duration, 1);

            // Easing function for natural deceleration
            const easeOut = function (t) {
                return 1 - Math.pow(1 - t, 3);
            };

            // Calculate the target rotation based on progress
            const targetRotation = initialRotation + finalRotation * easeOut(progress);

            // Update rotation to the target
            currentRotation = targetRotation;

            if (progress < 1) {
                // Continue animation until duration is complete
                requestAnimationFrame(animate);
            } else {
                // Animation complete - ensure we stop at exactly the right position
                currentRotation = initialRotation + finalRotation;

                // Redraw one last time at final position
                requestAnimationFrame(() => {
                    // Draw final frame
                    ctx.clearRect(0, 0, canvas.width, canvas.height);
                    ctx.save();
                    ctx.translate(centerX, centerY);
                    ctx.rotate((currentRotation * Math.PI) / 180);
                    ctx.translate(-centerX, -centerY);

                    // Draw wheel at final position (same as above)
                    // ... drawing code ...
                    ctx.restore();

                    // Animation complete
                    isSpinning = false;

                    // Show highlight effect now that spinning is done
                    highlightWinningSegment(selectedIndex);

                    // Re-enable spin button
                    spinButton.disabled = false;

                    // Process the result
                    handleSpinResult(selectedPrize, currentPlayer, isReturningPlayer);
                });
            }
        }

        // Start the animation with current timestamp
        const startTime = Date.now();
        animate();
    }

    // Force update player score for new users
    async function forceUpdatePlayerScore(playerId, playerName, score) {
        logger.log('FORCE UPDATE SCORE for player:', playerName, 'ID:', playerId, 'Score:', score);

        try {
            // 1. Update local player data
            const playerIndex = players.findIndex(p => p.id === playerId);
            if (playerIndex >= 0) {
                // Update the player object
                players[playerIndex].score = score;
                players[playerIndex].hasPlayed = true;

                // Save to localStorage
                savePlayers(players);
                logger.log('Local player data updated successfully');

                // Force update the UI 
                document.getElementById('prize-amount').innerText = `৳${score}`;
                document.getElementById('prize-message').style.display = 'block';
            } else {
                logger.error('Player not found in local array:', playerId);
            }

            // 2. Update server database directly
            const endpoint = `/api/users/${playerId}/score`;
            logger.log('Sending direct database update to:', endpoint);

            const response = await fetch(endpoint, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    score,
                    force: true // Add a force flag to skip any server-side checks
                })
            });

            if (!response.ok) {
                throw new Error(`API error: ${response.status}`);
            }

            const data = await response.json();

            if (data.success) {
                logger.log('Database updated successfully:', data);
                // Refresh the leaderboard
                updateLeaderboard();
                return true;
            } else {
                logger.error('API returned error:', data.message);
                return false;
            }
        } catch (error) {
            logger.error('Error in forceUpdatePlayerScore:', error);
            return false;
        }
    }

    // Handle spin result after animation completes
    function handleSpinResult(prizeWon, currentPlayer, isReturningPlayer) {
        logger.log('Handling spin result:', prizeWon);

        // Show the prize
        // Removed since the prize message elements were removed
        /*
        const prizeMessage = document.getElementById('prize-message');
        if (prizeMessage) {
            prizeMessage.style.display = 'block';
            document.getElementById('prize-amount').innerText = prizeWon.text;
            prizeMessage.classList.add('show');
        }
        */

        // Play win sound
        playSound(winSound);

        // If this is a returning player and prize matches existing score, just show dialog
        if (isReturningPlayer && currentPlayer.score === prizeWon.value) {
            logger.log('Prize matches existing score for returning player:', currentPlayer.name);
            logger.log('Calling showWinDialog with:', currentPlayer.name, prizeWon.value, prizeWon.text, false);
            showWinDialog(currentPlayer.name, prizeWon.value, prizeWon.text, false);
            return;
        }

        // Update player score in database
        updatePlayerScore(currentPlayer.id, prizeWon.value).then(result => {
            if (result) {
                logger.log('Score updated successfully for player:', currentPlayer.name);

                // Update UI with new score
                // Removed since the prize message elements were removed
                /*
                const prizeMessage = document.getElementById('prize-message');
                if (prizeMessage) {
                    prizeMessage.style.display = 'block';
                    document.getElementById('prize-amount').innerText = prizeWon.text;
                }
                */

                // Show win dialog
                logger.log('Calling showWinDialog with:', currentPlayer.name, prizeWon.value, prizeWon.text, true);
                showWinDialog(currentPlayer.name, prizeWon.value, prizeWon.text, true);

                // Update leaderboard
                updateLeaderboard();

                // Move to next player
                setTimeout(() => {
                    if (players.length > 1) {
                        setNextPlayer();
                    }
                }, 1000);

                // Check if all players have spun
                checkGameCompletion();
            } else {
                logger.error('Failed to update score for player:', currentPlayer.name);
                // Enable the spin button again in case of error
                spinButton.disabled = false;
                isSpinning = false;
            }
        });
    }

    // Function to highlight the winning segment with a pulsating glow effect
    function highlightWinningSegment(segmentIndex) {
        // Draw the same wheel but with the winning segment highlighted
        const highlightAnimation = (timestamp) => {
            // Get the current time for pulsating effect
            const phase = (timestamp % 1000) / 1000; // 0 to 1 every second
            const pulseFactor = 0.7 + 0.3 * Math.sin(phase * Math.PI * 2); // Pulsating between 0.7 and 1.0

            // Clear and redraw the wheel
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            // Wheel styling constants 
            const outerBorderWidth = 6;
            const innerCircleRadius = 40;
            const effectiveRadius = wheelRadius - outerBorderWidth - 2;

            // Calculate segment angles
            const segmentAngle = (2 * Math.PI) / prizes.length;

            // Draw dark blue background circle
            ctx.beginPath();
            ctx.arc(centerX, centerY, wheelRadius, 0, 2 * Math.PI);

            // Create radial gradient for blue background
            const bgGradient = ctx.createRadialGradient(
                centerX, centerY, innerCircleRadius,
                centerX, centerY, wheelRadius
            );
            bgGradient.addColorStop(0, '#1a3a47');
            bgGradient.addColorStop(1, '#0d1f26');

            ctx.fillStyle = bgGradient;
            ctx.fill();

            // Draw white border
            ctx.strokeStyle = '#FFFFFF';
            ctx.lineWidth = outerBorderWidth;
            ctx.stroke();

            // Draw black outer ring
            ctx.beginPath();
            ctx.arc(centerX, centerY, wheelRadius - outerBorderWidth / 2, 0, 2 * Math.PI);
            ctx.strokeStyle = '#000000';
            ctx.lineWidth = 2;
            ctx.stroke();

            // Draw all wheel segments
            for (let i = 0; i < prizes.length; i++) {
                const startAngle = i * segmentAngle;
                const endAngle = (i + 1) * segmentAngle;
                const isWinningSegment = (i === segmentIndex);

                // Draw segment
                ctx.beginPath();
                ctx.moveTo(centerX, centerY);
                ctx.arc(centerX, centerY, effectiveRadius, startAngle, endAngle);
                ctx.lineTo(centerX, centerY);

                // Create gradient for segments
                const gradient = ctx.createRadialGradient(
                    centerX, centerY, innerCircleRadius,
                    centerX, centerY, effectiveRadius
                );

                if (isWinningSegment) {
                    // Make winning segment brighter and add glow effect
                    const brightenFactor = 30 + 20 * pulseFactor; // Pulsating brightness
                    gradient.addColorStop(0, lightenColor(prizes[i].color, brightenFactor));
                    gradient.addColorStop(1, lightenColor(prizes[i].color, 10));

                    // Draw glow effect around winning segment
                    ctx.save();
                    ctx.beginPath();
                    ctx.moveTo(centerX, centerY);
                    ctx.arc(centerX, centerY, effectiveRadius + 2, startAngle, endAngle);
                    ctx.lineTo(centerX, centerY);
                    ctx.shadowColor = 'rgba(255, 215, 0, 0.8)';
                    ctx.shadowBlur = 15 * pulseFactor;
                    ctx.strokeStyle = '#FFD700';
                    ctx.lineWidth = 3;
                    ctx.stroke();
                    ctx.restore();
                } else {
                    // Regular segments are slightly darkened
                    gradient.addColorStop(0, lightenColor(prizes[i].color, 20));
                    gradient.addColorStop(1, prizes[i].color);
                }

                ctx.fillStyle = gradient;
                ctx.fill();

                // Add segment border
                ctx.strokeStyle = isWinningSegment ? '#FFD700' : '#000000';
                ctx.lineWidth = isWinningSegment ? 2 : 1;
                ctx.stroke();

                // Draw text
                ctx.save();
                ctx.translate(centerX, centerY);
                const textAngle = startAngle + (endAngle - startAngle) / 2;
                ctx.rotate(textAngle);

                // For smaller segments, text needs better positioning
                ctx.textAlign = 'right';
                ctx.font = isWinningSegment ? 'bold 16px Arial' : 'bold 14px Arial';
                ctx.fillStyle = '#FFFFFF';

                // Draw text with a shadow for better visibility
                ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
                ctx.shadowBlur = 2;
                ctx.shadowOffsetX = 1;
                ctx.shadowOffsetY = 1;

                // Adjust text position based on segment size
                const textRadius = prizes.length <= 8
                    ? (innerCircleRadius + effectiveRadius) / 2 + 30
                    : (innerCircleRadius + effectiveRadius) / 2 + 20;

                ctx.fillText(prizes[i].text, textRadius, 5);
                ctx.restore();
            }

            // Draw center circle - bright white with light blue edge as in the reference image
            const centerGradient = ctx.createRadialGradient(
                centerX - 10, centerY - 10, 0,
                centerX, centerY, innerCircleRadius
            );
            centerGradient.addColorStop(0, '#ffffff');
            centerGradient.addColorStop(0.7, '#f0f8ff');
            centerGradient.addColorStop(1, '#e0f0ff');

            ctx.beginPath();
            ctx.arc(centerX, centerY, innerCircleRadius, 0, 2 * Math.PI);
            ctx.fillStyle = centerGradient;
            ctx.fill();

            // Draw center circle border
            ctx.strokeStyle = '#aacce0';
            ctx.lineWidth = 3;
            ctx.stroke();

            // Draw a thin black line around the center circle
            ctx.beginPath();
            ctx.arc(centerX, centerY, innerCircleRadius, 0, 2 * Math.PI);
            ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
            ctx.lineWidth = 1;
            ctx.stroke();

            // Continue animation for 2 seconds
            if (performance.now() - highlightStartTime < 2000) {
                requestAnimationFrame(highlightAnimation);
            } else {
                // After highlight effect, redraw the normal wheel
                drawWheel();

                // Debug: Check if the player's score was properly updated
                if (players[currentPlayerIndex]) {
                    logger.log('FINAL CHECK - Player:', players[currentPlayerIndex].name);
                    logger.log('FINAL CHECK - Score:', players[currentPlayerIndex].score);
                    logger.log('FINAL CHECK - HasPlayed:', players[currentPlayerIndex].hasPlayed);

                    // Force one last update of the leaderboard
                    updateLeaderboard();
                }
            }
        };

        // Start the highlighting effect
        const highlightStartTime = performance.now();
        requestAnimationFrame(highlightAnimation);
    }

    // Validate bKash number
    async function validateBkashNumber() {
        const bkashNumber = bkashNumberInput.value.trim();

        if (bkashNumber === '') {
            setValidationMessage('Please enter a bKash number!', 'error');
            return false;
        }

        // Validate bKash number format (should be 11 digits starting with 01)
        const bkashRegex = /^01\d{9}$/;
        if (!bkashRegex.test(bkashNumber)) {
            setValidationMessage('Invalid bKash number format! Should be 11 digits starting with 01', 'error');
            return false;
        }

        try {
            // First check if the user exists in the local players array (faster)
            const existingLocalPlayer = players.find(p => p.bkashNumber === bkashNumber);
            if (existingLocalPlayer) {
                playerNameInput.value = existingLocalPlayer.name;
                playerNameInput.disabled = true;
                setValidationMessage('This bKash number is already registered. Welcome back!', 'success');
                return true;
            }

            // If not found locally, check with the server
            const response = await fetch('/api/validate-user', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ bkashNumber })
            });

            const data = await response.json();

            // Handle the case when a user is found on the server
            if (data.user) {
                playerNameInput.value = data.user.name;
                playerNameInput.disabled = true;
                setValidationMessage('This bKash number is already registered. Welcome back!', 'success');
                return true;
            }

            if (!data.valid) {
                setValidationMessage(data.message || 'Invalid bKash number', 'error');
                return false;
            }

            setValidationMessage('bKash number is valid!', 'success');
            return true;
        } catch (error) {
            logger.error('Error validating bKash number:', error);

            // Try to still check locally in case of network error
            const existingLocalPlayer = players.find(p => p.bkashNumber === bkashNumber);
            if (existingLocalPlayer) {
                playerNameInput.value = existingLocalPlayer.name;
                playerNameInput.disabled = true;
                setValidationMessage('This bKash number is already registered. Welcome back!', 'success');
                return true;
            }

            setValidationMessage('Network error, please try again.', 'error');
            return false;
        }
    }

    // Set validation message with specific style
    function setValidationMessage(message, type) {
        validationMessage.textContent = message;
        validationMessage.className = `validation-message ${type}`;
    }

    // Helper function to format encrypted bKash number
    function formatEncryptedBkash(bkashNumber) {
        if (!bkashNumber) return 'Unknown';
        return bkashNumber.substring(0, 2) + '*'.repeat(bkashNumber.length - 4) + bkashNumber.substring(bkashNumber.length - 2);
    }

    // Add a new player
    async function addPlayer() {
        const name = playerNameInput.value.trim();
        const bkashNumber = bkashNumberInput.value.trim();

        if (name === '') {
            setValidationMessage('Please enter a name!', 'error');
            return;
        }

        if (bkashNumber === '') {
            setValidationMessage('Please enter a bKash number!', 'error');
            return;
        }

        // Validate bKash number first
        const isValid = await validateBkashNumber();
        if (!isValid && !playerNameInput.disabled) {
            return;
        }

        try {
            // Check if we're dealing with a returning user first
            const isReturningUser = playerNameInput.disabled;

            if (isReturningUser) {
                logger.log('Processing returning user with bKash:', bkashNumber, 'and new name:', name);

                // First check in local players array
                let existingPlayer = players.find(p => p.bkashNumber === bkashNumber);

                if (!existingPlayer) {
                    // Not found locally, try the server
                    try {
                        const response = await fetch('/api/users');
                        const data = await response.json();

                        if (data.success && data.users) {
                            existingPlayer = data.users.find(u => u.bkashNumber === bkashNumber);
                        }
                    } catch (err) {
                        logger.error('Error fetching users from API:', err);
                        // Continue with local data
                    }
                }

                if (existingPlayer) {
                    // Found the player, set as current user
                    currentUser = existingPlayer;

                    // If new name is different, update it in the database first
                    if (name !== existingPlayer.name) {
                        logger.log('Updating name from', existingPlayer.name, 'to', name);
                        try {
                            // Update name in database
                            const updateResponse = await fetch(`/api/users/${existingPlayer.id}/name`, {
                                method: 'PUT',
                                headers: {
                                    'Content-Type': 'application/json'
                                },
                                body: JSON.stringify({ name })
                            });

                            const updateData = await updateResponse.json();
                            if (updateData.success) {
                                logger.log('Name updated successfully in database');
                                // Update the current user with the new name
                                currentUser.name = name;
                                existingPlayer.name = name;
                            } else {
                                logger.error('Failed to update name in database:', updateData.message);
                            }
                        } catch (error) {
                            logger.error('Error updating name:', error);
                            // Continue with local update even if API fails
                        }
                    }

                    // Add to players array if not already there
                    const existingPlayerIndex = players.findIndex(p =>
                        p.id === existingPlayer.id || p.bkashNumber === existingPlayer.bkashNumber);

                    if (existingPlayerIndex >= 0) {
                        // Update existing entry - always use the newest name
                        players[existingPlayerIndex] = {
                            ...players[existingPlayerIndex],
                            id: existingPlayer.id || players[existingPlayerIndex].id,
                            name: name, // Always use the new name
                            bkashNumber: existingPlayer.bkashNumber || bkashNumber,
                            encryptedBkashNumber: existingPlayer.encryptedBkashNumber ||
                                formatEncryptedBkash(existingPlayer.bkashNumber || bkashNumber),
                            score: existingPlayer.score || players[existingPlayerIndex].score || 0,
                            hasPlayed: existingPlayer.hasPlayed || players[existingPlayerIndex].hasPlayed || false
                        };
                    } else {
                        // Add new entry
                        players.push({
                            id: existingPlayer.id,
                            name: name, // Always use the new name
                            bkashNumber: existingPlayer.bkashNumber || bkashNumber,
                            encryptedBkashNumber: existingPlayer.encryptedBkashNumber ||
                                formatEncryptedBkash(existingPlayer.bkashNumber || bkashNumber),
                            score: existingPlayer.score || 0,
                            hasPlayed: existingPlayer.hasPlayed || false
                        });
                    }

                    // Save to localStorage
                    savePlayers(players);

                    // Reset inputs
                    playerNameInput.value = '';
                    bkashNumberInput.value = '';
                    playerNameInput.disabled = false;

                    // Update leaderboard
                    updateLeaderboard();

                    // Set as current player if no player is set
                    if (currentPlayerIndex === -1) {
                        currentPlayerIndex = existingPlayerIndex >= 0 ?
                            existingPlayerIndex : players.length - 1;
                        const encryptedNumber = currentUser.encryptedBkashNumber || formatEncryptedBkash(currentUser.bkashNumber);
                        currentPlayerName.textContent = `${currentUser.name} (${encryptedNumber})`;
                        spinButton.disabled = false;

                        // Add edit button
                        addEditNameButton();
                    }

                    // Save session data
                    saveSessionData();

                    setValidationMessage('Welcome back! Ready to spin!', 'success');
                    return;
                } else {
                    logger.warn('Returning user flag set but user not found in database or local storage');
                    // Fall through to create a new user
                }
            }

            // Register new user
            logger.log('Registering new user:', name, 'with bKash:', bkashNumber);
            const response = await fetch('/api/users', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ name, bkashNumber })
            });

            const data = await response.json();

            if (data.success) {
                currentUser = data.user;

                // Add to local players array
                const newPlayer = {
                    id: currentUser.id,
                    name: currentUser.name,
                    bkashNumber: currentUser.bkashNumber,
                    encryptedBkashNumber: currentUser.encryptedBkashNumber ||
                        formatEncryptedBkash(currentUser.bkashNumber),
                    score: 0,
                    hasPlayed: false
                };

                players.push(newPlayer);

                // Save to localStorage
                savePlayers(players);

                // Clear inputs
                playerNameInput.value = '';
                bkashNumberInput.value = '';

                // Update leaderboard
                updateLeaderboard();

                // Set current player if not set
                if (currentPlayerIndex === -1) {
                    currentPlayerIndex = players.length - 1;
                    const encryptedNumber = currentUser.encryptedBkashNumber || formatEncryptedBkash(currentUser.bkashNumber);
                    currentPlayerName.textContent = `${currentUser.name} (${encryptedNumber})`;
                    spinButton.disabled = false;

                    // Add edit button
                    addEditNameButton();
                }

                // Save session data
                saveSessionData();

                setValidationMessage('Player registered successfully!', 'success');
            } else {
                setValidationMessage(data.message || 'Failed to register player', 'error');
            }
        } catch (error) {
            logger.error('Error adding player:', error);
            setValidationMessage('Network error, please try again.', 'error');
        }
    }

    // Set next player
    function setNextPlayer() {
        currentPlayerIndex++;

        if (currentPlayerIndex < players.length) {
            // Set current user to the next player
            currentUser = players[currentPlayerIndex];
            // Display name and encrypted bKash number
            const encryptedNumber = currentUser.encryptedBkashNumber || formatEncryptedBkash(currentUser.bkashNumber);
            currentPlayerName.textContent = `${currentUser.name} (${encryptedNumber})`;

            // Add edit button next to player name if not already there
            addEditNameButton();

            spinButton.disabled = false;

            // Save the updated session data
            saveSessionData();
            logger.log('Advanced to next player:', currentUser.name);
        } else {
            currentPlayerName.textContent = '-';
            // Remove edit button if present
            removeEditNameButton();
            spinButton.disabled = true;
            currentUser = null;

            // Game is completed, clear session data
            sessionStorage.removeItem('luckyWheelSession');
            logger.log('No more players, session cleared');
        }
    }

    // Add an edit button next to the current player name
    function addEditNameButton() {
        // First remove any existing edit button to avoid duplicates
        removeEditNameButton();

        if (!currentUser) return;

        const editButton = document.createElement('button');
        editButton.id = 'edit-name-button';
        editButton.className = 'edit-button';
        editButton.innerHTML = '<i class="fas fa-pencil-alt"></i>'; // Assuming FontAwesome
        if (!document.querySelector('.fas')) {
            // Fallback if FontAwesome is not available
            editButton.textContent = '✏️';
        }
        editButton.title = 'Edit Name';

        // Style the button
        editButton.style.marginLeft = '10px';
        editButton.style.padding = '4px 8px';
        editButton.style.backgroundColor = '#00B8BA';
        editButton.style.color = 'white';
        editButton.style.border = 'none';
        editButton.style.borderRadius = '4px';
        editButton.style.cursor = 'pointer';

        // Add click event
        editButton.addEventListener('click', showEditNameDialog);

        // Find the correct element to append to
        // First try the current-player-info class
        let playerInfoElement = document.querySelector('.current-player-info');

        // If that doesn't exist, try finding the parent of currentPlayerName
        if (!playerInfoElement && currentPlayerName && currentPlayerName.parentElement) {
            playerInfoElement = currentPlayerName.parentElement;
        }

        // If we still can't find a container, insert after the currentPlayerName directly
        if (playerInfoElement) {
            playerInfoElement.appendChild(editButton);
        } else if (currentPlayerName) {
            // Create a wrapper if needed
            const wrapper = document.createElement('span');
            wrapper.style.display = 'inline-flex';
            wrapper.style.alignItems = 'center';

            // Clone current player name element
            const originalParent = currentPlayerName.parentElement;
            const nameClone = currentPlayerName.cloneNode(true);

            // Insert wrapper in place of original name
            if (originalParent) {
                wrapper.appendChild(nameClone);
                wrapper.appendChild(editButton);
                originalParent.replaceChild(wrapper, currentPlayerName);
            } else {
                // Fallback - insert after
                currentPlayerName.insertAdjacentElement('afterend', editButton);
            }
        }

        logger.log('Edit button added successfully');
    }

    // Remove the edit button
    function removeEditNameButton() {
        const existingButton = document.getElementById('edit-name-button');
        if (existingButton) {
            existingButton.remove();
        }
    }

    // Show dialog to edit name
    function showEditNameDialog() {
        if (!currentUser) return;

        // Create modal container
        const modalContainer = document.createElement('div');
        modalContainer.className = 'modal-container';
        modalContainer.id = 'edit-name-modal';

        // Style the modal container
        modalContainer.style.position = 'fixed';
        modalContainer.style.top = '0';
        modalContainer.style.left = '0';
        modalContainer.style.width = '100%';
        modalContainer.style.height = '100%';
        modalContainer.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
        modalContainer.style.display = 'flex';
        modalContainer.style.justifyContent = 'center';
        modalContainer.style.alignItems = 'center';
        modalContainer.style.zIndex = '1000';

        // Create modal content
        const modalContent = document.createElement('div');
        modalContent.className = 'modal-content';

        // Style the modal content
        modalContent.style.backgroundColor = '#0a4d68';
        modalContent.style.padding = '20px';
        modalContent.style.borderRadius = '10px';
        modalContent.style.maxWidth = '400px';
        modalContent.style.width = '90%';
        modalContent.style.boxShadow = '0 4px 15px rgba(0, 0, 0, 0.3)';
        modalContent.style.border = '2px solid #00ccbb';

        // Create modal header
        const modalHeader = document.createElement('h3');
        modalHeader.textContent = 'Edit Name';
        modalHeader.style.color = 'white';
        modalHeader.style.marginTop = '0';
        modalHeader.style.borderBottom = '1px solid #00ccbb';
        modalHeader.style.paddingBottom = '10px';

        // Create input field
        const nameInput = document.createElement('input');
        nameInput.type = 'text';
        nameInput.id = 'edit-name-input';
        nameInput.value = currentUser.name;
        nameInput.placeholder = 'Enter new name';

        // Style the input
        nameInput.style.width = '100%';
        nameInput.style.padding = '10px';
        nameInput.style.marginBottom = '15px';
        nameInput.style.marginTop = '15px';
        nameInput.style.boxSizing = 'border-box';
        nameInput.style.border = '1px solid #ddd';
        nameInput.style.borderRadius = '4px';

        // Create button container
        const buttonContainer = document.createElement('div');
        buttonContainer.style.display = 'flex';
        buttonContainer.style.justifyContent = 'space-between';

        // Create save button
        const saveButton = document.createElement('button');
        saveButton.textContent = 'Save';
        saveButton.className = 'primary-button';

        // Style save button
        saveButton.style.padding = '8px 16px';
        saveButton.style.backgroundColor = '#00ccbb';
        saveButton.style.color = 'white';
        saveButton.style.border = 'none';
        saveButton.style.borderRadius = '4px';
        saveButton.style.cursor = 'pointer';

        // Create cancel button
        const cancelButton = document.createElement('button');
        cancelButton.textContent = 'Cancel';
        cancelButton.className = 'secondary-button';

        // Style cancel button
        cancelButton.style.padding = '8px 16px';
        cancelButton.style.backgroundColor = '#888';
        cancelButton.style.color = 'white';
        cancelButton.style.border = 'none';
        cancelButton.style.borderRadius = '4px';
        cancelButton.style.cursor = 'pointer';

        // Add event listeners
        saveButton.addEventListener('click', function () {
            updatePlayerName(nameInput.value.trim());
            modalContainer.remove();
        });

        cancelButton.addEventListener('click', function () {
            modalContainer.remove();
        });

        // Add validation - pressing Enter in input also saves
        nameInput.addEventListener('keypress', function (e) {
            if (e.key === 'Enter') {
                updatePlayerName(nameInput.value.trim());
                modalContainer.remove();
            }
        });

        // Close when clicking outside the modal
        modalContainer.addEventListener('click', function (e) {
            if (e.target === modalContainer) {
                modalContainer.remove();
            }
        });

        // Assemble modal
        buttonContainer.appendChild(cancelButton);
        buttonContainer.appendChild(saveButton);

        modalContent.appendChild(modalHeader);
        modalContent.appendChild(nameInput);
        modalContent.appendChild(buttonContainer);

        modalContainer.appendChild(modalContent);

        // Add to document
        document.body.appendChild(modalContainer);

        // Focus the input field
        nameInput.focus();
        nameInput.select();
    }

    // Update player name in local storage and UI
    async function updatePlayerName(newName) {
        if (!currentUser || !newName || newName.trim() === '') return;

        const oldName = currentUser.name;

        // Name is the same, no need to update
        if (oldName === newName) return;

        logger.log(`Updating player name from "${oldName}" to "${newName}"`);

        try {
            // First try to update on the server
            let serverUpdateSuccessful = false;
            try {
                await updatePlayerNameOnServer(currentUser.id, newName);
                serverUpdateSuccessful = true;
                logger.log('Server update successful');
            } catch (err) {
                logger.error('Server update failed:', err);
                // We'll still continue with local updates even if server fails
            }

            // Update in current user object
            currentUser.name = newName;

            // Update in players array (find by ID to ensure correct player is updated)
            const playerIndex = players.findIndex(p => p.id === currentUser.id);
            if (playerIndex >= 0) {
                players[playerIndex].name = newName;
                logger.log(`Updated player at index ${playerIndex} in players array`);
            } else {
                logger.warn('Player not found in players array');
            }

            // Save to localStorage
            savePlayers(players);
            logger.log('Updated players saved to localStorage');

            // Update the UI
            const encryptedNumber = currentUser.encryptedBkashNumber || formatEncryptedBkash(currentUser.bkashNumber);
            currentPlayerName.textContent = `${newName} (${encryptedNumber})`;

            // Update the edit button (if needed)
            addEditNameButton();

            // Save session data with updated user
            saveSessionData();
            logger.log('Session data updated with new name');

            // Update the leaderboard to reflect the change
            await updateLeaderboard();
            logger.log('Leaderboard updated with new name');

            // Special handling for server update failure
            if (!serverUpdateSuccessful) {
                logger.warn('Note: Name was updated locally but not on the server. Changes may be lost on page reload.');

                // Try a different approach to force a fetch update
                try {
                    // Make a direct PUT to update the user
                    const forcedUpdateResponse = await fetch(`/api/users/${currentUser.id}`, {
                        method: 'PUT',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            id: currentUser.id,
                            name: newName,
                            bkashNumber: currentUser.bkashNumber,
                            score: currentUser.score || 0,
                            hasPlayed: currentUser.hasPlayed || false
                        })
                    });

                    if (forcedUpdateResponse.ok) {
                        logger.log('Forced user update successful');
                        serverUpdateSuccessful = true;
                    }
                } catch (e) {
                    console.error('Forced update also failed:', e);
                }
            }

            // Show success message with appropriate warning
            if (serverUpdateSuccessful) {
                alert(`Name successfully changed to "${newName}"`);
            } else {
                alert(`Name changed to "${newName}" locally, but could not update the server. Changes may be lost when the page is refreshed.`);
            }
        } catch (error) {
            console.error('Error updating name:', error);
            alert('Error updating name. Please try again.');
        }
    }

    // Update player name on server
    async function updatePlayerNameOnServer(userId, newName) {
        if (!userId) throw new Error('Invalid user ID');

        console.log(`Attempting to update name on server for user ID: ${userId} to new name: "${newName}"`);

        try {
            // Make sure endpoint matches your API's actual endpoint
            const endpoint = `/api/users/${userId}/name`;
            console.log('Sending request to:', endpoint);

            const response = await fetch(endpoint, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ name: newName })
            });

            // Log the raw response for debugging
            console.log('Server response status:', response.status);

            // Handle non-OK responses
            if (!response.ok) {
                const errorText = await response.text();
                console.error('Server error response:', errorText);
                throw new Error(`API error: ${response.status} - ${errorText}`);
            }

            // Parse the response
            const data = await response.json();
            console.log('Server response data:', data);

            if (!data.success) {
                console.error('API returned failure:', data.message);
                throw new Error(data.message || 'Failed to update name on server');
            }

            console.log('Name successfully updated on server');
            return data;
        } catch (error) {
            console.error('Error in updatePlayerNameOnServer:', error);

            // Check if this is a network error (potentially due to missing API endpoint)
            if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
                console.warn('Network error - the API endpoint may not exist or server is unreachable');

                // For development: Try to update directly in our fetch cache or use a fallback endpoint
                // This is a workaround for development environments where the API may not be fully implemented
                try {
                    // Try a fallback to a generic user update endpoint
                    const fallbackEndpoint = `/api/users/${userId}`;
                    console.log('Trying fallback endpoint:', fallbackEndpoint);

                    const fallbackResponse = await fetch(fallbackEndpoint, {
                        method: 'PUT',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({ name: newName })
                    });

                    if (fallbackResponse.ok) {
                        const data = await fallbackResponse.json();
                        console.log('Fallback update successful:', data);
                        return data;
                    }
                } catch (fallbackError) {
                    console.error('Fallback update also failed:', fallbackError);
                }
            }

            throw error;
        }
    }

    // Update player score in database (only if this is their first time playing)
    async function updatePlayerScore(userId, score) {
        console.log(`Updating player ${userId} score to ${score}`);

        try {
            // Fix the API endpoint from /api/players/ to /api/users/
            const response = await fetch(`/api/users/${userId}/score`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ score: score })
            });

            if (!response.ok) {
                throw new Error(`HTTP error ${response.status}`);
            }

            const data = await response.json();
            console.log('Score update response:', data);

            // Update local data
            for (let i = 0; i < players.length; i++) {
                if (players[i].id === userId) {
                    players[i].score = score;
                    players[i].hasPlayed = true; // Set hasPlayed to true
                    break;
                }
            }

            // Update display
            // Removed since the prize message elements were removed
            /* 
            document.getElementById('prize-amount').innerText = `৳${score}`;
            document.getElementById('prize-message').style.display = 'block';
            */

            // Save players data
            savePlayers(players);

            return data;
        } catch (error) {
            console.error('Error updating player score:', error);

            // Even if server update fails, update local data
            for (let i = 0; i < players.length; i++) {
                if (players[i].id === userId) {
                    players[i].score = score;
                    players[i].hasPlayed = true;
                    break;
                }
            }
            savePlayers(players);

            // Return a dummy success response so the game can continue
            return { success: true, message: "Local update only" };
        }
    }

    // Get user by ID
    async function getUserById(userId) {
        try {
            const allUsers = await fetchPlayers();
            return allUsers.find(user => user.id === userId);
        } catch (error) {
            console.error('Error getting user by ID:', error);
            return null;
        }
    }

    // Fetch all players from database
    async function fetchPlayers() {
        try {
            console.log('Fetching players from API...');
            const response = await fetch('/api/users');
            const data = await response.json();

            if (!data.success) {
                console.error('API returned error:', data.message);
                throw new Error(data.message || 'Failed to fetch players');
            }

            console.log('API returned', data.users ? data.users.length : 0, 'players');
            console.log('Player data sample:', data.users && data.users.length > 0 ? data.users[0] : 'No players');

            return data.users;
        } catch (error) {
            console.error('Error fetching players:', error);
            return [];
        }
    }

    // Update leaderboard - Always show all participants from database
    async function updateLeaderboard() {
        console.log('Updating leaderboard...');

        try {
            // Fetch ALL players from server
            console.log('Fetching players for leaderboard...');
            const dbPlayers = await fetchPlayers();
            console.log('Leaderboard received', dbPlayers.length, 'players from API');

            // Update local players array with latest scores
            console.log('Current local players:', players.length);
            dbPlayers.forEach(dbPlayer => {
                const localPlayer = players.find(p => p.id === dbPlayer.id);
                if (localPlayer) {
                    localPlayer.score = dbPlayer.score;
                } else {
                    // Add this past participant to the local array if they're not already there
                    // This ensures we display ALL participants, not just those from the current session
                    players.push({
                        id: dbPlayer.id,
                        name: dbPlayer.name,
                        bkashNumber: dbPlayer.bkashNumber,
                        encryptedBkashNumber: dbPlayer.encryptedBkashNumber,
                        score: dbPlayer.score,
                        hasPlayed: true
                    });
                }
            });

            // Save to localStorage
            savePlayers(players);

            // Use our new display function to show all players
            displayLeaderboard(dbPlayers.length > 0 ? dbPlayers : players);

        } catch (error) {
            console.error('Error updating leaderboard:', error);
            // Try to use local players as fallback
            if (players && players.length > 0) {
                console.log('Using local players as fallback');
                displayLeaderboard(players);
            } else {
                const errorMessage = document.createElement('p');
                errorMessage.className = 'empty-message error';
                errorMessage.textContent = 'Error loading players. Please refresh the page.';
                playersListElement.appendChild(errorMessage);
            }
        }
    }

    // Check if game is completed
    function checkGameCompletion() {
        // Game is completed if all players have played
        if (currentPlayerIndex >= players.length) {
            gameCompleted = true;
            viewWinnersButton.disabled = false;
        }
    }

    // Fetch top winners from database
    async function fetchWinners() {
        try {
            const response = await fetch('/api/winners');
            const data = await response.json();

            if (!data.success) {
                throw new Error(data.message || 'Failed to fetch winners');
            }

            return data.winners;
        } catch (error) {
            console.error('Error fetching winners:', error);
            return [];
        }
    }

    // Display winners
    async function showWinners() {
        try {
            const winnersData = await fetchWinners();

            if (!winnersData || winnersData.length === 0) {
                alert('No winners data available yet.');
                return;
            }

            // Sort winners by score in descending order
            winnersData.sort((a, b) => b.score - a.score);

            // Get top 3 or fewer
            const topWinners = winnersData.slice(0, 3);

            // Fill in winner positions
            const positions = ['first', 'second', 'third'];

            // Reset all positions first
            positions.forEach(pos => {
                document.querySelector(`#${pos}-place .winner-name`).textContent = '-';
                document.querySelector(`#${pos}-place .winner-bkash`).textContent = '';
                document.querySelector(`#${pos}-place .winner-score`).textContent = '৳0';
            });

            // Fill in available winners
            topWinners.forEach((winner, index) => {
                if (index < positions.length) {
                    const position = positions[index];
                    const element = document.getElementById(`${position}-place`);

                    if (element) {
                        element.querySelector('.winner-name').textContent = winner.name;
                        element.querySelector('.winner-bkash').textContent = formatEncryptedBkash(winner.bkash);
                        element.querySelector('.winner-score').textContent = `৳${winner.score}`;

                        // Add a highlight animation to the trophy
                        const trophy = element.querySelector('.trophy i');
                        trophy.classList.add('fa-bounce');
                        setTimeout(() => {
                            trophy.classList.remove('fa-bounce');
                        }, 2000);
                    }
                }
            });

            // Show modal with proper styling
            const modal = document.getElementById('winners-modal');
            modal.style.display = 'flex';

            // Create confetti for winners
            createConfetti();

            // Add close handler
            const closeButton = document.querySelector('.close');
            closeButton.addEventListener('click', function () {
                modal.style.display = 'none';

                // Clear confetti
                const confettiContainer = document.querySelector('.confetti-container');
                if (confettiContainer) {
                    confettiContainer.innerHTML = '';
                }
            });

            // Close when clicking outside the modal content
            window.addEventListener('click', function (e) {
                if (e.target === modal) {
                    modal.style.display = 'none';

                    // Clear confetti
                    const confettiContainer = document.querySelector('.confetti-container');
                    if (confettiContainer) {
                        confettiContainer.innerHTML = '';
                    }
                }
            });

        } catch (error) {
            console.error('Error showing winners:', error);
            alert('Error showing winners. Please try again.');
        }
    }

    // Create confetti animation
    function createConfetti() {
        const confettiContainer = document.querySelector('.confetti-container');
        const colors = ['#FFD700', '#00CCBB', '#0A4D68', '#FF6B6B', '#4BC0C0'];

        for (let i = 0; i < 100; i++) {
            const confetti = document.createElement('div');
            confetti.className = 'confetti-piece';
            confetti.style.width = `${Math.random() * 10 + 5}px`;
            confetti.style.height = `${Math.random() * 10 + 5}px`;
            confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
            confetti.style.position = 'absolute';
            confetti.style.top = '0';
            confetti.style.left = `${Math.random() * 100}%`;
            confetti.style.transform = 'rotate(0deg)';
            confetti.style.opacity = '1';
            confetti.style.animation = `confetti-fall ${Math.random() * 3 + 2}s linear forwards`;

            confettiContainer.appendChild(confetti);

            // Add animation keyframes
            const style = document.createElement('style');
            style.innerHTML = `
                @keyframes confetti-fall {
                    0% {
                        transform: translateY(0) rotate(0deg);
                        opacity: 1;
                    }
                    100% {
                        transform: translateY(${Math.random() * 300 + 300}px) rotate(${Math.random() * 360}deg);
                        opacity: 0;
                    }
                }
            `;
            document.head.appendChild(style);
        }
    }

    // Close modal
    function closeModal() {
        winnersModal.style.display = 'none';

        // Clear confetti
        const confettiContainer = document.querySelector('.confetti-container');
        while (confettiContainer.firstChild) {
            confettiContainer.removeChild(confettiContainer.firstChild);
        }
    }

    // Function to show win dialog
    function showWinDialog(playerName, prizeAmount, prizeText, isNewWin) {
        console.log('Showing win dialog for:', playerName, 'Prize:', prizeText);

        const winDialog = document.getElementById('win-dialog');
        const winPlayerName = document.getElementById('win-player-name');
        const winPrizeAmount = document.getElementById('win-prize-amount');
        const winTitle = document.getElementById('win-title');

        // Set content
        winPlayerName.textContent = playerName;
        winPrizeAmount.textContent = prizeText;

        // Set title based on if this is a new win or returning player
        winTitle.textContent = isNewWin ? 'Congratulations!' : 'Welcome Back!';

        // Create confetti for win dialog
        createWinConfetti();

        // Show dialog with proper styling AND add the class
        winDialog.style.display = 'flex';
        winDialog.style.opacity = '1';
        winDialog.style.visibility = 'visible';
        winDialog.classList.add('show'); // Make sure the show class is added

        console.log('Win dialog should be visible now');

        // Play win sound
        playSound(winSound);

        // Set up event listeners for buttons
        const closeButton = document.getElementById('win-close-btn');
        const shareButton = document.getElementById('share-win-btn');
        const downloadButton = document.getElementById('download-win-btn');

        // Close dialog when clicking close button
        const closeListener = function (e) {
            console.log('Closing win dialog');
            winDialog.classList.remove('show'); // Remove the show class first

            setTimeout(() => {
                winDialog.style.display = 'none';
                winDialog.style.opacity = '0';
                winDialog.style.visibility = 'hidden';
            }, 300); // Short delay to allow for animation

            // Clean up listeners
            closeButton.removeEventListener('click', closeListener);
            shareButton.removeEventListener('click', shareClickListener);
            downloadButton.removeEventListener('click', downloadClickListener);

            // Clear confetti
            const confettiContainer = document.querySelector('.win-confetti-container');
            if (confettiContainer) {
                confettiContainer.innerHTML = '';
            }
        };

        closeButton.addEventListener('click', closeListener);

        // Share button handler
        const shareClickListener = function () {
            shareWin(playerName, prizeAmount);
        };
        shareButton.addEventListener('click', shareClickListener);

        // Download button handler
        const downloadClickListener = function () {
            downloadWinImage(playerName, prizeAmount);
        };
        downloadButton.addEventListener('click', downloadClickListener);

        // Close when clicking outside the dialog content
        window.addEventListener('click', function shareModalClose(e) {
            if (e.target === winDialog) {
                closeListener();
                window.removeEventListener('click', shareModalClose);
            }
        });
    }

    // Function to create confetti effect for win dialog
    function createWinConfetti() {
        const confettiContainer = document.querySelector('.win-confetti-container');
        const colors = ['#FF8C00', '#FFD700', '#64CCC5', '#00CCBB', '#E91E63', '#FFC0CB', '#9C27B0', '#2196F3'];

        // Clear any existing confetti
        confettiContainer.innerHTML = '';

        // Create confetti pieces with different shapes
        for (let i = 0; i < 120; i++) {
            const confetti = document.createElement('div');
            const color = colors[Math.floor(Math.random() * colors.length)];
            const size = Math.random() * 10 + 5;
            const shape = Math.random() > 0.5 ? 'circle' : 'square';
            let borderRadius = '0';

            if (shape === 'circle') {
                borderRadius = '50%';
            } else if (Math.random() > 0.5) {
                // Sometimes create star-like shapes for squares
                borderRadius = `${Math.random() * 50}% ${Math.random() * 50}% ${Math.random() * 50}% ${Math.random() * 50}%`;
            }

            // Use different animation durations and delays for more natural effect
            const duration = Math.random() * 4 + 2;
            const delay = Math.random() * 2;

            confetti.style.cssText = `
                position: absolute;
                width: ${size}px;
                height: ${size}px;
                background-color: ${color};
                border-radius: ${borderRadius};
                top: ${-50}px;
                left: ${Math.random() * 100}%;
                opacity: ${Math.random() * 0.7 + 0.3};
                transform: rotate(${Math.random() * 360}deg);
                pointer-events: none;
                animation: confettiFall ${duration}s linear ${delay}s forwards;
                z-index: 1000;
            `;

            confettiContainer.appendChild(confetti);
        }

        // Add some special larger confetti pieces
        for (let i = 0; i < 15; i++) {
            const specialConfetti = document.createElement('div');
            const color = colors[Math.floor(Math.random() * colors.length)];
            const size = Math.random() * 15 + 15;

            // These are special shapes - hearts, stars, or moons
            const shapes = ['❤️', '⭐', '🌙', '🎉', '✨'];
            const shape = shapes[Math.floor(Math.random() * shapes.length)];

            specialConfetti.innerHTML = shape;
            specialConfetti.style.cssText = `
                position: absolute;
                font-size: ${size}px;
                top: ${-50}px;
                left: ${Math.random() * 100}%;
                opacity: ${Math.random() * 0.7 + 0.5};
                transform: rotate(${Math.random() * 360}deg);
                pointer-events: none;
                animation: confettiFallSpecial ${Math.random() * 5 + 3}s linear ${Math.random() * 2}s forwards;
                z-index: 1001;
                text-shadow: 0 0 5px rgba(0,0,0,0.3);
            `;

            confettiContainer.appendChild(specialConfetti);
        }

        // Add the confetti animation styles if they don't exist
        if (!document.getElementById('confetti-style')) {
            const style = document.createElement('style');
            style.id = 'confetti-style';
            style.innerHTML = `
                @keyframes confettiFall {
                    0% {
                        transform: translateY(0) rotate(0deg);
                    }
                    100% {
                        transform: translateY(${window.innerHeight}px) rotate(360deg);
                    }
                }
                
                @keyframes confettiFallSpecial {
                    0% {
                        transform: translateY(0) rotate(0deg) scale(1);
                    }
                    50% {
                        transform: translateY(${window.innerHeight / 2}px) rotate(180deg) scale(1.5);
                    }
                    100% {
                        transform: translateY(${window.innerHeight}px) rotate(360deg) scale(0.5);
                    }
                }
            `;
            document.head.appendChild(style);
        }
    }

    // Function to share win on social media or copy to clipboard
    function shareWin(playerName, prizeAmount) {
        // Show loading indicator
        const loadingToast = document.createElement('div');
        loadingToast.classList.add('toast-notification', 'loading-toast');
        loadingToast.innerHTML = `
            <div class="loading-spinner"></div>
            <span>Preparing share image...</span>
        `;
        document.body.appendChild(loadingToast);
        setTimeout(() => loadingToast.classList.add('show'), 10);

        // Get the current player to obtain the encrypted bKash number
        const currentPlayer = players[currentPlayerIndex];
        const encryptedNumber = currentPlayer ?
            (currentPlayer.encryptedBkashNumber || formatEncryptedBkash(currentPlayer.bkashNumber)) : '';

        // Generate image for sharing
        generateWinImage(playerName, prizeAmount, encryptedNumber, function (blob) {
            // Remove loading indicator
            loadingToast.classList.remove('show');
            setTimeout(() => document.body.removeChild(loadingToast), 300);

            if (blob) {
                const file = new File([blob], `eid-salami-${playerName.replace(/\s+/g, '-')}.png`, { type: 'image/png' });

                // Check if Web Share API supports sharing files
                if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
                    // Share the file
                    navigator.share({
                        title: 'Eid Salami Spin Wheel',
                        text: `🎉 I received ৳${prizeAmount} as Eid salami from the Spin Wheel game!`,
                        files: [file],
                        url: window.location.href
                    }).then(() => {
                        console.log('Shared image successfully');
                        // Show success toast
                        const successToast = document.createElement('div');
                        successToast.classList.add('toast-notification', 'success-toast');
                        successToast.innerHTML = `
                            <i class="fas fa-check-circle"></i>
                            <span>Shared successfully!</span>
                        `;
                        document.body.appendChild(successToast);
                        setTimeout(() => {
                            successToast.classList.add('show');
                            setTimeout(() => {
                                successToast.classList.remove('show');
                                setTimeout(() => {
                                    document.body.removeChild(successToast);
                                }, 300);
                            }, 2000);
                        }, 10);
                    }).catch(error => {
                        console.error('Error sharing image:', error);
                        // Fallback to text sharing if image sharing fails
                        shareTextFallback(playerName, prizeAmount);
                    });
                } else {
                    // Fallback to text sharing if file sharing not supported
                    shareTextFallback(playerName, prizeAmount);
                }
            } else {
                // Fallback to text sharing if image generation fails
                shareTextFallback(playerName, prizeAmount);
            }
        });
    }

    // Function to download the win image
    function downloadWinImage(playerName, prizeAmount) {
        // Show loading indicator
        const loadingToast = document.createElement('div');
        loadingToast.classList.add('toast-notification', 'loading-toast');
        loadingToast.innerHTML = `
            <div class="loading-spinner"></div>
            <span>Preparing download image...</span>
        `;
        document.body.appendChild(loadingToast);
        setTimeout(() => loadingToast.classList.add('show'), 10);

        // Get the current player to obtain the encrypted bKash number
        const currentPlayer = players[currentPlayerIndex];
        const encryptedNumber = currentPlayer ?
            (currentPlayer.encryptedBkashNumber || formatEncryptedBkash(currentPlayer.bkashNumber)) : '';

        generateWinImage(playerName, prizeAmount, encryptedNumber, function (blob) {
            // Remove loading indicator
            loadingToast.classList.remove('show');
            setTimeout(() => document.body.removeChild(loadingToast), 300);

            if (blob) {
                const url = URL.createObjectURL(blob);
                const downloadLink = document.createElement('a');
                downloadLink.href = url;
                downloadLink.download = `eid-salami-${playerName.replace(/\s+/g, '-')}.png`;
                document.body.appendChild(downloadLink);
                downloadLink.click();
                document.body.removeChild(downloadLink);

                // Clean up the object URL after use
                setTimeout(() => URL.revokeObjectURL(url), 1000);

                // Show success toast instead of alert
                const successToast = document.createElement('div');
                successToast.classList.add('toast-notification', 'success-toast');
                successToast.innerHTML = `
                    <i class="fas fa-check-circle"></i>
                    <span>Salami image downloaded successfully!</span>
                `;
                document.body.appendChild(successToast);
                setTimeout(() => {
                    successToast.classList.add('show');
                    setTimeout(() => {
                        successToast.classList.remove('show');
                        setTimeout(() => {
                            document.body.removeChild(successToast);
                        }, 300);
                    }, 2000);
                }, 10);
            } else {
                console.error('Failed to create salami image for download');

                // Show error toast instead of alert
                const errorToast = document.createElement('div');
                errorToast.classList.add('toast-notification', 'error-toast');
                errorToast.innerHTML = `
                    <i class="fas fa-exclamation-circle"></i>
                    <span>Failed to create image. Please try again.</span>
                `;
                document.body.appendChild(errorToast);
                setTimeout(() => {
                    errorToast.classList.add('show');
                    setTimeout(() => {
                        errorToast.classList.remove('show');
                        setTimeout(() => {
                            document.body.removeChild(errorToast);
                        }, 300);
                    }, 2000);
                }, 10);
            }
        });
    }

    // Generates an image with the win information
    function generateWinImage(playerName, prizeAmount, encryptedNumber, callback) {
        // Create a canvas with better dimensions for social sharing
        const canvas = document.createElement('canvas');
        canvas.width = 1080;
        canvas.height = 1080;
        const ctx = canvas.getContext('2d');

        // Set rich gradient background
        const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
        gradient.addColorStop(0, '#053B50');
        gradient.addColorStop(0.7, '#176B87');
        gradient.addColorStop(1, '#04293A');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Add decorative pattern overlay - subtle dots and circles
        drawPatternOverlay(ctx, canvas.width, canvas.height);

        // Add decorative corners
        drawDecorationCorners(ctx, canvas.width, canvas.height);

        // Draw main content container - increased padding and better positioning
        const contentWidth = canvas.width - 180;
        const contentHeight = canvas.height - 350;
        const contentX = (canvas.width - contentWidth) / 2;
        const contentY = 220;

        // Content area with glow
        ctx.shadowColor = 'rgba(0, 204, 187, 0.3)';
        ctx.shadowBlur = 30;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
        ctx.beginPath();
        ctx.roundRect(contentX, contentY, contentWidth, contentHeight, 20);
        ctx.fill();

        // Reset shadow
        ctx.shadowBlur = 0;

        // Add border glow
        ctx.strokeStyle = 'rgba(0, 204, 187, 0.7)';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.roundRect(contentX, contentY, contentWidth, contentHeight, 20);
        ctx.stroke();

        // Add title banner - better positioning
        const bannerHeight = 90;
        const bannerWidth = contentWidth + 80;
        const bannerX = (canvas.width - bannerWidth) / 2;
        const bannerY = 140;

        // Banner with shadow
        ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
        ctx.shadowBlur = 15;
        ctx.shadowOffsetY = 5;

        // Draw banner background
        const bannerGradient = ctx.createLinearGradient(bannerX, bannerY, bannerX + bannerWidth, bannerY);
        bannerGradient.addColorStop(0, '#0A4D68');
        bannerGradient.addColorStop(1, '#088395');
        ctx.fillStyle = bannerGradient;

        ctx.beginPath();
        ctx.roundRect(bannerX, bannerY, bannerWidth, bannerHeight, 15);
        ctx.fill();

        // Reset shadow
        ctx.shadowBlur = 0;
        ctx.shadowOffsetY = 0;

        // Add banner border
        ctx.strokeStyle = '#00CCBB';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(bannerX, bannerY, bannerWidth, bannerHeight, 15);
        ctx.stroke();

        // Add title to banner
        ctx.font = 'bold 46px Rakkas, Arial';
        ctx.fillStyle = 'white';
        ctx.textAlign = 'center';
        ctx.fillText('Eid Salami Spin Wheel', canvas.width / 2, bannerY + bannerHeight / 2 + 15);

        // Add decorative stars at the top
        drawStar(ctx, bannerX + 50, bannerY + bannerHeight / 2, 20, 5, '#FFD700');
        drawStar(ctx, bannerX + bannerWidth - 50, bannerY + bannerHeight / 2, 20, 5, '#FFD700');

        // Add congratulations text with glow effect - improved spacing
        ctx.shadowColor = 'rgba(255, 215, 0, 0.7)';
        ctx.shadowBlur = 15;
        ctx.font = 'bold 58px Poppins, Arial';
        ctx.fillStyle = '#FFD700';
        ctx.fillText('Your Salami!', canvas.width / 2, contentY + 70);
        ctx.shadowBlur = 0;

        // Add player name with nice styling - better spacing
        const nameY = contentY + 160;

        // Create name tag background
        let measureTextWidth = Math.min(contentWidth * 0.8, ctx.measureText(playerName).width + 120);
        const nameTagWidth = Math.max(measureTextWidth, 300); // Ensure minimum width
        const nameTagHeight = 70;
        const nameTagX = (canvas.width - nameTagWidth) / 2;

        ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
        ctx.beginPath();
        ctx.roundRect(nameTagX, nameY - 45, nameTagWidth, nameTagHeight, 15);
        ctx.fill();

        // Name with shadow
        ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
        ctx.shadowBlur = 5;
        ctx.font = 'bold 42px Poppins, Arial';
        ctx.fillStyle = 'white';

        // Truncate name if too long
        const maxNameWidth = nameTagWidth - 40;
        let displayName = playerName;
        let nameWidth = ctx.measureText(displayName).width;
        if (nameWidth > maxNameWidth) {
            while (nameWidth > maxNameWidth && displayName.length > 0) {
                displayName = displayName.substring(0, displayName.length - 1);
                nameWidth = ctx.measureText(displayName + '...').width;
            }
            displayName += '...';
        }
        ctx.fillText(displayName, canvas.width / 2, nameY);
        ctx.shadowBlur = 0;

        // Add encrypted bKash number with icon if available - improved spacing
        let bkashY = nameY + 65;
        if (encryptedNumber) {
            ctx.font = '26px Poppins, Arial';
            ctx.fillStyle = '#00CCBB';

            // Draw bKash icon (simple representation)
            const iconSize = 24;
            const textWidth = ctx.measureText(`(${encryptedNumber})`).width;
            const iconX = canvas.width / 2 - textWidth / 2 - iconSize - 5;
            const iconY = bkashY - iconSize / 2;

            // Draw rounded rect for icon background
            ctx.fillStyle = '#E2136E'; // bKash brand color
            ctx.beginPath();
            ctx.roundRect(iconX, iconY - 8, iconSize, iconSize, 5);
            ctx.fill();

            // Add 'b' for bKash
            ctx.fillStyle = 'white';
            ctx.font = 'bold 20px Arial';
            ctx.fillText('b', iconX + iconSize / 2 - 5, iconY + iconSize / 2 + 5);

            // Draw bKash number
            ctx.fillStyle = '#00CCBB';
            ctx.font = '26px Poppins, Arial';
            ctx.fillText(`(${encryptedNumber})`, canvas.width / 2, bkashY);
        }

        // Add "You received" text with ribbon effect - better spacing
        const wonY = nameY + (encryptedNumber ? 140 : 100);

        // Draw ribbon
        const ribbonWidth = 220;
        const ribbonHeight = 50;
        const ribbonX = (canvas.width - ribbonWidth) / 2;
        const ribbonY = wonY - 30;

        // Ribbon body
        ctx.fillStyle = '#64CCC5';
        ctx.beginPath();
        ctx.moveTo(ribbonX, ribbonY);
        ctx.lineTo(ribbonX + ribbonWidth, ribbonY);
        ctx.lineTo(ribbonX + ribbonWidth + 20, ribbonY + ribbonHeight / 2);
        ctx.lineTo(ribbonX + ribbonWidth, ribbonY + ribbonHeight);
        ctx.lineTo(ribbonX, ribbonY + ribbonHeight);
        ctx.lineTo(ribbonX - 20, ribbonY + ribbonHeight / 2);
        ctx.closePath();
        ctx.fill();

        // Ribbon text
        ctx.font = 'bold 30px Poppins, Arial';
        ctx.fillStyle = '#053B50';
        ctx.fillText('YOU RECEIVED', canvas.width / 2, wonY);

        // Add salami amount with impressive styling - improved spacing
        const salamiY = wonY + 150;

        // Create a more impressive salami display - completely redesigned
        const salamiX = canvas.width / 2;
        const salamiBackY = salamiY - 15;

        // Draw outer starburst effect for dramatic background
        const starburstOuterRadius = 150;
        const starburstInnerRadius = 70;
        const starburstPoints = 16;
        const starburstRotation = Math.PI / starburstPoints;

        // Gold starburst gradient
        const starburstGradient = ctx.createRadialGradient(
            salamiX, salamiBackY, starburstInnerRadius,
            salamiX, salamiBackY, starburstOuterRadius
        );
        starburstGradient.addColorStop(0, 'rgba(255, 215, 0, 0.7)');
        starburstGradient.addColorStop(0.5, 'rgba(255, 215, 0, 0.3)');
        starburstGradient.addColorStop(1, 'rgba(255, 215, 0, 0)');

        ctx.fillStyle = starburstGradient;

        // Draw starburst
        ctx.beginPath();
        for (let i = 0; i < starburstPoints * 2; i++) {
            const radius = i % 2 === 0 ? starburstOuterRadius : starburstInnerRadius;
            const angle = (i * Math.PI / starburstPoints) + starburstRotation;
            const x = salamiX + radius * Math.cos(angle);
            const y = salamiBackY + radius * Math.sin(angle);

            if (i === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        }
        ctx.closePath();
        ctx.fill();

        // Draw main salami circle
        const salamiCircleSize = 100;

        // Add shadow to circle
        ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
        ctx.shadowBlur = 20;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 10;

        // Draw gradient circle
        const circleGradient = ctx.createRadialGradient(
            salamiX, salamiBackY - 10, 0,
            salamiX, salamiBackY, salamiCircleSize
        );
        circleGradient.addColorStop(0, '#FFC107');
        circleGradient.addColorStop(1, '#E65100');

        ctx.fillStyle = circleGradient;
        ctx.beginPath();
        ctx.arc(salamiX, salamiBackY, salamiCircleSize, 0, Math.PI * 2);
        ctx.fill();

        // Reset shadow
        ctx.shadowBlur = 0;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;

        // Add salami inner circle for more dimension
        ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
        ctx.beginPath();
        ctx.arc(salamiX, salamiBackY, salamiCircleSize - 15, 0, Math.PI * 2);
        ctx.fill();

        // Add reflective highlight
        const highlightGradient = ctx.createLinearGradient(
            salamiX - 50, salamiBackY - 50,
            salamiX + 50, salamiBackY + 50
        );
        highlightGradient.addColorStop(0, 'rgba(255, 255, 255, 0.4)');
        highlightGradient.addColorStop(0.5, 'rgba(255, 255, 255, 0)');
        highlightGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');

        ctx.fillStyle = highlightGradient;
        ctx.beginPath();
        ctx.arc(salamiX, salamiBackY, salamiCircleSize, 0, Math.PI * 2);
        ctx.fill();

        // Add outer ring
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(salamiX, salamiBackY, salamiCircleSize + 5, 0, Math.PI * 2);
        ctx.stroke();

        // Add salami text with better styling
        ctx.shadowColor = 'rgba(0, 0, 0, 0.7)';
        ctx.shadowBlur = 4;
        ctx.shadowOffsetX = 2;
        ctx.shadowOffsetY = 2;

        // Add Taka symbol separately for better control
        ctx.font = 'bold 40px Poppins, Arial';
        ctx.fillStyle = 'white';
        ctx.textAlign = 'center';

        // Position text based on amount size
        const amountStr = `${prizeAmount}`;
        const symbolWidth = ctx.measureText('৳').width;
        const amountWidth = ctx.measureText(amountStr).width;
        const totalWidth = symbolWidth + amountWidth + 5; // 5px spacing

        // Drawing Taka symbol
        ctx.fillText('৳', salamiX - totalWidth / 2 + symbolWidth / 2, salamiBackY + 15);

        // Drawing amount with larger font
        ctx.font = 'bold 65px Poppins, Arial';
        ctx.fillText(amountStr, salamiX + symbolWidth / 2 + 5, salamiBackY + 20);

        // Reset shadow
        ctx.shadowBlur = 0;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;

        // Add payment timing note with elegant styling - improved spacing
        const noteY = salamiY + 150;
        const noteText = 'Your salami will be sent to your bKash wallet within 24 hours.';

        // Measure and adjust text if needed
        ctx.font = 'italic 22px Poppins, Arial';
        const noteTextWidth = ctx.measureText(noteText).width;

        // Draw note background with better sizing
        const noteWidth = Math.min(contentWidth - 80, noteTextWidth + 80);
        const noteHeight = 50;
        const noteX = (canvas.width - noteWidth) / 2;

        // Create soft background with gradient
        const noteGradient = ctx.createLinearGradient(noteX, noteY, noteX + noteWidth, noteY);
        noteGradient.addColorStop(0, 'rgba(255, 255, 255, 0.12)');
        noteGradient.addColorStop(0.5, 'rgba(255, 255, 255, 0.2)');
        noteGradient.addColorStop(1, 'rgba(255, 255, 255, 0.12)');

        ctx.fillStyle = noteGradient;
        ctx.beginPath();
        ctx.roundRect(noteX, noteY - 30, noteWidth, noteHeight, 10);
        ctx.fill();

        // Add subtle border
        ctx.strokeStyle = 'rgba(0, 204, 187, 0.6)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.roundRect(noteX, noteY - 30, noteWidth, noteHeight, 10);
        ctx.stroke();

        // Draw note text
        ctx.font = 'italic 22px Poppins, Arial';
        ctx.fillStyle = '#64CCC5';
        ctx.fillText(noteText, canvas.width / 2, noteY);

        // Add call to action with button styling - better positioning
        const ctaY = contentY + contentHeight - 50;

        // Remove CTA button and text

        // Add Eid salami message with enhanced design - better positioning
        drawEnhancedSalamiMessage(ctx, canvas.width, canvas.height);

        // Add floating decorative elements (fewer to reduce clutter)
        drawFloatingElements(ctx, canvas.width, canvas.height);

        // Convert canvas to blob and return via callback
        canvas.toBlob(callback, 'image/png');
    }

    // Helper function to draw pattern overlay - make more subtle
    function drawPatternOverlay(ctx, width, height) {
        // Create subtle pattern
        ctx.globalAlpha = 0.03; // More subtle
        for (let i = 0; i < width; i += 50) {
            for (let j = 0; j < height; j += 50) {
                if ((i + j) % 100 === 0) {
                    ctx.fillStyle = 'white';
                    ctx.beginPath();
                    ctx.arc(i, j, 2, 0, Math.PI * 2);
                    ctx.fill();
                }
            }
        }
        ctx.globalAlpha = 1.0;
    }

    // Draw decorative corners
    function drawDecorationCorners(ctx, width, height) {
        const cornerSize = 100;

        // Draw decorative corners
        drawCorner(ctx, 0, 0, cornerSize, 0);
        drawCorner(ctx, width, 0, cornerSize, 1);
        drawCorner(ctx, 0, height, cornerSize, 2);
        drawCorner(ctx, width, height, cornerSize, 3);
    }

    // Helper function to draw a decorative corner
    function drawCorner(ctx, x, y, size, position) {
        ctx.save();

        // Determine corner position and transform
        if (position === 0) { // Top left
            ctx.translate(x, y);
        } else if (position === 1) { // Top right
            ctx.translate(x, y);
            ctx.rotate(Math.PI / 2);
        } else if (position === 2) { // Bottom left
            ctx.translate(x, y);
            ctx.rotate(Math.PI * 3 / 2);
        } else { // Bottom right
            ctx.translate(x, y);
            ctx.rotate(Math.PI);
        }

        // Draw corner decoration
        ctx.strokeStyle = 'rgba(255, 215, 0, 0.4)';
        ctx.lineWidth = 3;

        // Curved corner line
        ctx.beginPath();
        ctx.moveTo(0, size / 2);
        ctx.quadraticCurveTo(0, 0, size / 2, 0);
        ctx.stroke();

        // Corner ornament
        ctx.beginPath();
        ctx.arc(size / 3, size / 3, size / 6, 0, Math.PI * 2);
        ctx.stroke();

        ctx.restore();
    }

    // Helper function to draw floating decorative elements - fewer elements
    function drawFloatingElements(ctx, width, height) {
        // Draw several stars - reduced count
        for (let i = 0; i < 5; i++) {
            const x = Math.random() * width;
            const y = Math.random() * height;
            const size = Math.random() * 12 + 8;
            drawStar(ctx, x, y, size, 5, `rgba(255, 215, 0, ${Math.random() * 0.2 + 0.1})`);
        }

        // Draw circles - reduced count
        for (let i = 0; i < 8; i++) {
            const x = Math.random() * width;
            const y = Math.random() * height;
            const radius = Math.random() * 15 + 5;

            ctx.fillStyle = `rgba(100, 204, 197, ${Math.random() * 0.15 + 0.05})`;
            ctx.beginPath();
            ctx.arc(x, y, radius, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    // Enhanced function to draw the Eid salami message - better positioning
    function drawEnhancedSalamiMessage(ctx, width, height) {
        // Create a styled area for the Eid salami message
        ctx.save();

        // Position in bottom right with nice angle, moved away from other elements
        const messageX = width - 220;
        const messageY = height - 180;
        ctx.translate(messageX, messageY);
        ctx.rotate(Math.PI / 20); // Slight rotation for style

        // Add shadow for depth
        ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
        ctx.shadowBlur = 15;
        ctx.shadowOffsetX = 5;
        ctx.shadowOffsetY = 5;

        // Message background - golden gradient
        const msgGradient = ctx.createLinearGradient(-150, -40, 150, 40);
        msgGradient.addColorStop(0, '#FFD700');
        msgGradient.addColorStop(1, '#FFC107');

        ctx.fillStyle = msgGradient;

        // Draw rounded rectangle with scalloped edge
        const msgWidth = 280;
        const msgHeight = 70;

        ctx.beginPath();
        ctx.roundRect(-msgWidth / 2, -msgHeight / 2, msgWidth, msgHeight, 15);
        ctx.fill();

        // Reset shadow
        ctx.shadowBlur = 0;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;

        // Add decorative border
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 3]);
        ctx.beginPath();
        ctx.roundRect(-msgWidth / 2, -msgHeight / 2, msgWidth, msgHeight, 15);
        ctx.stroke();
        ctx.setLineDash([]);

        // Write text - smaller fonts to prevent overflow
        ctx.fillStyle = '#053B50';
        ctx.font = 'bold 14px Poppins, Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Send Eid salami to:', 0, -20);

        ctx.font = 'bold 22px Poppins, Arial';
        ctx.fillText('01725700009', 0, 15);

        // Add emoji with style
        ctx.font = '18px Arial';
        ctx.fillText('😉', 100, 15);

        // Add a stylized hand icon
        drawStylizedHand(ctx, -90, 0);

        ctx.restore();
    }

    // Helper function to draw a stylized hand
    function drawStylizedHand(ctx, x, y) {
        ctx.save();
        ctx.translate(x, y);

        // Draw a simple but recognizable hand shape
        ctx.fillStyle = '#053B50';
        ctx.beginPath();

        // Palm
        ctx.ellipse(0, 0, 15, 10, 0, 0, Math.PI * 2);
        ctx.fill();

        // Fingers (simplified)
        ctx.beginPath();
        ctx.ellipse(-8, -11, 5, 8, -Math.PI / 3, 0, Math.PI * 2);
        ctx.fill();

        ctx.beginPath();
        ctx.ellipse(0, -14, 5, 8, -Math.PI / 6, 0, Math.PI * 2);
        ctx.fill();

        ctx.beginPath();
        ctx.ellipse(8, -12, 5, 8, Math.PI / 6, 0, Math.PI * 2);
        ctx.fill();

        // Coin
        ctx.fillStyle = '#FFD700';
        ctx.beginPath();
        ctx.arc(15, -5, 10, 0, Math.PI * 2);
        ctx.fill();

        // Coin detail
        ctx.strokeStyle = '#053B50';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(15, -5, 6, 0, Math.PI * 2);
        ctx.stroke();

        ctx.restore();
    }

    // Fallback to sharing text if image sharing fails
    function shareTextFallback(playerName, prizeAmount) {
        // Create text to share
        const text = `🎉 I received ৳${prizeAmount} as Eid salami from the Spin Wheel game!`;

        // Create a temporary modal for share options if sharing API not available
        if (!navigator.share) {
            // Create share options modal
            const shareModal = document.createElement('div');
            shareModal.classList.add('share-modal');
            shareModal.innerHTML = `
                <div class="share-modal-content">
                    <span class="share-close">&times;</span>
                    <h3>Share Your Win</h3>
                    <div class="share-text-container">
                        <p>${text}</p>
                    </div>
                    <div class="share-options">
                        <button class="share-option copy-option">
                            <i class="fas fa-copy"></i>
                            <span>Copy Text</span>
                        </button>
                        <a href="https://wa.me/?text=${encodeURIComponent(text)}" target="_blank" class="share-option whatsapp-option">
                            <i class="fab fa-whatsapp"></i>
                            <span>WhatsApp</span>
                        </a>
                        <a href="https://t.me/share/url?url=${encodeURIComponent(window.location.href)}&text=${encodeURIComponent(text)}" target="_blank" class="share-option telegram-option">
                            <i class="fab fa-telegram"></i>
                            <span>Telegram</span>
                        </a>
                        <a href="https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}" target="_blank" class="share-option twitter-option">
                            <i class="fab fa-twitter"></i>
                            <span>Twitter</span>
                        </a>
                    </div>
                </div>
            `;
            document.body.appendChild(shareModal);

            // Add event listeners
            const closeBtn = shareModal.querySelector('.share-close');
            closeBtn.addEventListener('click', () => {
                document.body.removeChild(shareModal);
            });

            // Copy text functionality
            const copyBtn = shareModal.querySelector('.copy-option');
            copyBtn.addEventListener('click', () => {
                navigator.clipboard.writeText(text)
                    .then(() => {
                        // Show visual feedback
                        copyBtn.classList.add('copied');
                        copyBtn.querySelector('span').textContent = 'Copied!';
                        setTimeout(() => {
                            copyBtn.classList.remove('copied');
                            copyBtn.querySelector('span').textContent = 'Copy Text';
                        }, 2000);
                    })
                    .catch(err => {
                        console.error('Failed to copy text:', err);
                    });
            });

            // Close when clicking outside
            window.addEventListener('click', function shareModalClose(e) {
                if (e.target === shareModal) {
                    document.body.removeChild(shareModal);
                    window.removeEventListener('click', shareModalClose);
                }
            });

        } else {
            // Try using Web Share API for text
            navigator.share({
                title: 'Eid Salami Spin Wheel',
                text: text,
                url: window.location.href
            }).catch(error => {
                console.error('Error sharing text:', error);
                // Fallback to copying text to clipboard with visual feedback
                navigator.clipboard.writeText(text)
                    .then(() => {
                        // Create and show a toast notification
                        const toast = document.createElement('div');
                        toast.classList.add('toast-notification');
                        toast.innerHTML = `
                            <i class="fas fa-check-circle"></i>
                            <span>Share text copied to clipboard!</span>
                        `;
                        document.body.appendChild(toast);

                        // Remove after animation
                        setTimeout(() => {
                            toast.classList.add('show');
                            setTimeout(() => {
                                toast.classList.remove('show');
                                setTimeout(() => {
                                    document.body.removeChild(toast);
                                }, 300);
                            }, 2000);
                        }, 10);
                    })
                    .catch(err => {
                        console.error('Failed to copy text:', err);
                    });
            });
        }
    }

    // Helper function to draw decorative elements
    function drawDecorations(ctx, width, height) {
        // Draw stars
        for (let i = 0; i < 15; i++) {
            const x = Math.random() * width;
            const y = Math.random() * height * 0.5;
            const radius = Math.random() * 3 + 1;

            ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
            ctx.beginPath();
            ctx.arc(x, y, radius, 0, Math.PI * 2);
            ctx.fill();

            // Add glow
            ctx.shadowColor = 'white';
            ctx.shadowBlur = 5;
            ctx.beginPath();
            ctx.arc(x, y, radius, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0;
        }

        // Draw moon
        ctx.fillStyle = '#ffd700';
        ctx.beginPath();
        ctx.arc(width - 80, 80, 40, 0, Math.PI * 2);
        ctx.fill();

        // Draw moon shadow
        ctx.fillStyle = '#0a4d68';
        ctx.beginPath();
        ctx.arc(width - 60, 65, 40, 0, Math.PI * 2);
        ctx.fill();

        // Draw simplified wheel
        drawSimplifiedWheel(ctx, 85, height - 85, 60);
    }

    // Helper function to draw a star
    function drawStar(ctx, cx, cy, radius, spikes, color) {
        ctx.beginPath();
        ctx.fillStyle = color;

        let rot = Math.PI / 2 * 3;
        const step = Math.PI / spikes;

        ctx.moveTo(cx, cy - radius);

        for (let i = 0; i < spikes; i++) {
            ctx.lineTo(cx + Math.cos(rot) * radius, cy + Math.sin(rot) * radius);
            rot += step;

            ctx.lineTo(cx + Math.cos(rot) * radius * 0.4, cy + Math.sin(rot) * radius * 0.4);
            rot += step;
        }

        ctx.lineTo(cx, cy - radius);
        ctx.closePath();
        ctx.fill();
    }

    // Helper function to draw a simplified wheel
    function drawSimplifiedWheel(ctx, cx, cy, radius) {
        const colors = ['#00B8BA', '#0080B8', '#FFCC00'];
        const segments = 8;

        // Draw wheel segments
        for (let i = 0; i < segments; i++) {
            const startAngle = (i * 2 * Math.PI) / segments;
            const endAngle = ((i + 1) * 2 * Math.PI) / segments;

            ctx.beginPath();
            ctx.moveTo(cx, cy);
            ctx.arc(cx, cy, radius, startAngle, endAngle);
            ctx.closePath();

            ctx.fillStyle = colors[i % colors.length];
            ctx.fill();

            ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
            ctx.lineWidth = 1;
            ctx.stroke();
        }

        // Draw center circle
        ctx.beginPath();
        ctx.arc(cx, cy, radius * 0.2, 0, 2 * Math.PI);
        ctx.fillStyle = 'white';
        ctx.fill();
        ctx.strokeStyle = '#00ccbb';
        ctx.lineWidth = 2;
        ctx.stroke();
    }

    // Function to show and animate the salami message
    function showSalamiMessage() {
        const salamiMessage = document.querySelector('.salami-message');

        // Add a class to highlight it
        salamiMessage.classList.add('salami-highlight');

        // Make it more noticeable
        salamiMessage.style.transform = 'rotate(0deg) scale(1.1)';
        salamiMessage.style.boxShadow = '0 5px 25px rgba(255, 215, 0, 0.6)';

        // Reset after some time
        setTimeout(() => {
            salamiMessage.classList.remove('salami-highlight');
            salamiMessage.style.transform = '';
            salamiMessage.style.boxShadow = '';
        }, 3000);

        // Add click handler to copy number
        const salamiNumber = document.querySelector('.salami-number');
        salamiNumber.style.cursor = 'pointer';
        salamiNumber.title = 'Click to copy';

        // Remove existing listeners (if any)
        const newSalamiNumber = salamiNumber.cloneNode(true);
        salamiNumber.parentNode.replaceChild(newSalamiNumber, salamiNumber);

        // Add click to copy functionality
        newSalamiNumber.addEventListener('click', function () {
            navigator.clipboard.writeText('01725700009')
                .then(() => {
                    const originalText = newSalamiNumber.textContent;
                    newSalamiNumber.textContent = 'Copied!';
                    setTimeout(() => {
                        newSalamiNumber.textContent = originalText;
                    }, 1500);
                })
                .catch(err => {
                    console.error('Failed to copy bKash number:', err);
                });
        });
    }

    // Event Listeners
    addPlayerButton.addEventListener('click', addPlayer);
    playerNameInput.addEventListener('keypress', function (e) {
        if (e.key === 'Enter') {
            addPlayer();
        }
    });

    spinButton.addEventListener('click', spinWheel);
    viewWinnersButton.addEventListener('click', showWinners);
    closeModalButton.addEventListener('click', closeModal);
    bkashNumberInput.addEventListener('input', validateBkashNumber);

    // Close modal when clicking outside
    window.addEventListener('click', function (e) {
        if (e.target === winnersModal) {
            closeModal();
        }
    });

    // Save session data before page unload
    window.addEventListener('beforeunload', function () {
        if (currentUser) {
            console.log('Saving session data before page unload');
            saveSessionData();
        }
    });

    // Initial wheel draw
    drawWheel();

    // Show the floating salami message
    showSalamiMessage();
});
