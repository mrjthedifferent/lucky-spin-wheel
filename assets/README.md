# Sound Assets for the Lucky Spin Wheel

This directory contains the sound effects used in the Lucky Spin Wheel game.

## Current Sound Files

The game currently uses two sound effects:
- `wheel-spin.mp3`: Played when the wheel starts spinning.
- `win-sound.mp3`: Played when a player wins.

## Using Your Own Sound Files

To use custom sound files:

1. Replace the existing files with your own while keeping the same file names:
   - `wheel-spin.mp3`
   - `win-sound.mp3`

2. Alternatively, you can edit the URLs in `script.js` to use different sound files:
   ```javascript
   // Find these lines in script.js
   const spinSoundURL = 'https://assets.mixkit.co/active_storage/sfx/2006/2006-preview.mp3';
   const winSoundURL = 'https://assets.mixkit.co/active_storage/sfx/270/270-preview.mp3';
   
   // Replace with your local files
   const spinSoundURL = 'assets/your-spin-sound.mp3';
   const winSoundURL = 'assets/your-win-sound.mp3';
   ```

## Recommended Sound File Properties

For optimal performance:
- Format: MP3 or OGG
- Duration: 1-5 seconds (spin sound), 1-3 seconds (win sound)
- File size: Less than 200KB per file
- Sample rate: 44.1kHz
- Bitrate: 128kbps - 192kbps

## Free Sound Resources

If you need free sound effects, consider these resources:
1. [Mixkit](https://mixkit.co/free-sound-effects/) - Free sounds with simple licensing
2. [Freesound](https://freesound.org/) - Community-based sound repository
3. [SoundBible](https://soundbible.com/) - Free sound clips
4. [Zapsplat](https://www.zapsplat.com/) - Free sound effects library
