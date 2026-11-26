// Usage: MPSfx.play('correct'); MPSfx.toggleMute();
(function () {
  'use strict';

  const KEY = 'maktaba:sfx:muted';
  let muted = false;
  let unlocked = false;
  let audioContext = null;
  let warned = false;

  try {
    muted = window.localStorage.getItem(KEY) === '1';
  } catch (error) {
    console.warn('MPSfx could not read its mute setting; using the in-memory setting.', error);
  }

  function saveMuted() {
    try {
      window.localStorage.setItem(KEY, muted ? '1' : '0');
    } catch (error) {
      console.warn('MPSfx could not persist its mute setting.', error);
    }
  }

  function unlock() {
    unlocked = true;
    if (audioContext && audioContext.state === 'suspended') {
      audioContext.resume().catch(error => {
        if (!warned) {
          warned = true;
          console.warn('MPSfx could not resume Web Audio.', error);
        }
      });
    }
  }

  document.addEventListener('pointerdown', unlock, { once: true });
  document.addEventListener('keydown', unlock, { once: true });

  function context() {
    if (!unlocked) return null;
    if (!audioContext) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) {
        if (!warned) {
          warned = true;
          console.warn('MPSfx is unavailable because this browser does not support Web Audio.');
        }
        return null;
      }
      try {
        audioContext = new AudioContextClass();
      } catch (error) {
        if (!warned) {
          warned = true;
          console.warn('MPSfx could not initialize Web Audio.', error);
        }
        return null;
      }
    }
    if (audioContext.state === 'suspended') {
      audioContext.resume().catch(error => {
        if (!warned) {
          warned = true;
          console.warn('MPSfx could not resume Web Audio.', error);
        }
      });
    }
    return audioContext;
  }

  function tone(frequency, start, duration, type, volume) {
    const ctx = context();
    if (!ctx) return;
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    const beginsAt = ctx.currentTime + start;
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, beginsAt);
    gain.gain.setValueAtTime(0.0001, beginsAt);
    gain.gain.exponentialRampToValueAtTime(volume, beginsAt + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, beginsAt + duration);
    oscillator.connect(gain);
    gain.connect(ctx.destination);
    oscillator.start(beginsAt);
    oscillator.stop(beginsAt + duration + 0.02);
  }

  function play(name) {
    if (muted || !unlocked) return;
    switch (name) {
      case 'correct':
        tone(660, 0, 0.11, 'sine', 0.06);
        tone(880, 0.08, 0.12, 'sine', 0.05);
        break;
      case 'wrong':
        tone(240, 0, 0.14, 'triangle', 0.05);
        tone(180, 0.09, 0.16, 'triangle', 0.04);
        break;
      case 'win':
        [523, 659, 784, 1046].forEach((frequency, index) => tone(frequency, index * 0.09, 0.2, 'triangle', 0.06));
        break;
      case 'lose':
        [392, 330, 262].forEach((frequency, index) => tone(frequency, index * 0.12, 0.2, 'sine', 0.05));
        break;
      case 'click':
        tone(520, 0, 0.06, 'triangle', 0.04);
        break;
      default:
        console.warn(`MPSfx ignored unknown sound: ${name}`);
    }
  }

  window.MPSfx = {
    play,
    isMuted: () => muted,
    setMuted(value) {
      muted = Boolean(value);
      saveMuted();
      return muted;
    },
    toggleMute() {
      muted = !muted;
      saveMuted();
      return muted;
    }
  };
})();
