// All sound is synthesised with WebAudio — no audio files, no network requests.
// A low engine hum, a two-tone police siren, gunshots, pickups and a mission jingle,
// plus a quiet sunset pad that loops under the city.

export function createAudio() {
  let ctx = null;
  let master = null;
  let muted = false;
  let engineOsc = null;
  let engineGain = null;
  let sirenOsc = null;
  let sirenGain = null;
  let sirenTimer = 0;
  let sirenHigh = false;
  let padStarted = false;

  function ensure() {
    if (ctx) return true;
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      ctx = new AudioContext();
      master = ctx.createGain();
      master.gain.value = 0.5;
      master.connect(ctx.destination);
    } catch {
      return false;
    }
    return true;
  }

  function tone(freq, dur, type, vol, slideTo) {
    if (!ensure() || muted) return;
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type || 'sine';
    osc.frequency.setValueAtTime(freq, t);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    gain.gain.setValueAtTime(vol || 0.2, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
    osc.connect(gain);
    gain.connect(master);
    osc.start(t);
    osc.stop(t + dur + 0.05);
  }

  function noiseBurst(dur, vol, lowpass) {
    if (!ensure() || muted) return;
    const t = ctx.currentTime;
    const len = Math.floor(ctx.sampleRate * dur);
    const buffer = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < len; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = lowpass || 1200;
    const gain = ctx.createGain();
    gain.gain.value = vol || 0.3;
    src.connect(filter);
    filter.connect(gain);
    gain.connect(master);
    src.start(t);
  }

  function startPad() {
    if (!ensure() || padStarted) return;
    padStarted = true;
    const chords = [[220, 277, 330], [174, 220, 262], [196, 247, 294], [165, 220, 277]];
    let chordIndex = 0;
    function playChord() {
      if (muted) { setTimeout(playChord, 4000); return; }
      const chord = chords[chordIndex % chords.length];
      chordIndex += 1;
      for (const freq of chord) {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.0001, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.035, ctx.currentTime + 1.5);
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 3.9);
        osc.connect(gain);
        gain.connect(master);
        osc.start();
        osc.stop(ctx.currentTime + 4);
      }
      setTimeout(playChord, 4000);
    }
    playChord();
  }

  function setEngine(running, speedNorm) {
    if (!ensure()) return;
    if (running && !engineOsc) {
      engineOsc = ctx.createOscillator();
      engineOsc.type = 'sawtooth';
      engineOsc.frequency.value = 55;
      engineGain = ctx.createGain();
      engineGain.gain.value = 0.0;
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 420;
      engineOsc.connect(filter);
      filter.connect(engineGain);
      engineGain.connect(master);
      engineOsc.start();
    }
    if (engineOsc) {
      const target = muted ? 0 : (running ? 0.03 + speedNorm * 0.06 : 0.0);
      engineGain.gain.setTargetAtTime(target, ctx.currentTime, 0.1);
      engineOsc.frequency.setTargetAtTime(55 + speedNorm * 110, ctx.currentTime, 0.1);
    }
  }

  function setSiren(on, dt) {
    if (!ensure()) return;
    if (on && !sirenOsc) {
      sirenOsc = ctx.createOscillator();
      sirenOsc.type = 'sine';
      sirenOsc.frequency.value = 700;
      sirenGain = ctx.createGain();
      sirenGain.gain.value = 0.0;
      sirenOsc.connect(sirenGain);
      sirenGain.connect(master);
      sirenOsc.start();
    }
    if (!sirenOsc) return;
    if (on) {
      sirenTimer += dt;
      if (sirenTimer > 0.45) {
        sirenTimer = 0;
        sirenHigh = !sirenHigh;
        sirenOsc.frequency.setTargetAtTime(sirenHigh ? 950 : 700, ctx.currentTime, 0.05);
      }
      sirenGain.gain.setTargetAtTime(muted ? 0 : 0.045, ctx.currentTime, 0.1);
    } else {
      sirenGain.gain.setTargetAtTime(0, ctx.currentTime, 0.1);
    }
  }

  return {
    unlock() { if (ensure() && ctx.state === 'suspended') ctx.resume(); startPad(); },
    setMuted(value) { muted = value; if (master) master.gain.value = muted ? 0 : 0.5; },
    isMuted() { return muted; },
    setEngine,
    setSiren,
    gunshot() { noiseBurst(0.14, 0.4, 2500); tone(160, 0.12, 'square', 0.12, 60); },
    pickup() { tone(660, 0.12, 'sine', 0.2); setTimeout(() => tone(990, 0.18, 'sine', 0.2), 110); },
    crash() { noiseBurst(0.3, 0.4, 700); },
    missionDone() { [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => tone(f, 0.25, 'triangle', 0.22), i * 130)); },
    busted() { [392, 330, 262, 196].forEach((f, i) => setTimeout(() => tone(f, 0.35, 'sawtooth', 0.14), i * 170)); },
    click() { tone(880, 0.06, 'sine', 0.15); },
  };
}
