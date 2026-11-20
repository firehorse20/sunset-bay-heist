// Keyboard and pointer input for Sunset Bay Heist. Held keys give movement and driving
// state; one-shot presses (enter a car, shoot, reload, pause, mute) are queued as bit
// flags and taken once by the loop, so a press between two frames is never lost.

export const ACTION_ENTER_CAR = 1;
export const ACTION_SHOOT = 2;
export const ACTION_RELOAD = 4;
export const ACTION_PAUSE = 8;
export const ACTION_MUTE = 16;

export function createInput(canvas) {
  const keys = new Set();
  let actions = 0;
  let dragYaw = 0;
  let dragPitch = 0;
  let dragging = false;
  let lastX = 0;
  let lastY = 0;

  window.addEventListener('keydown', (event) => {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(event.code)) event.preventDefault();
    if (event.repeat) return;
    keys.add(event.code);
    if (event.code === 'KeyE') actions |= ACTION_ENTER_CAR;
    else if (event.code === 'KeyF') actions |= ACTION_SHOOT;
    else if (event.code === 'KeyR') actions |= ACTION_RELOAD;
    else if (event.code === 'KeyP' || event.code === 'Escape') actions |= ACTION_PAUSE;
    else if (event.code === 'KeyM') actions |= ACTION_MUTE;
  });
  window.addEventListener('keyup', (event) => keys.delete(event.code));
  window.addEventListener('blur', () => keys.clear());

  canvas.addEventListener('pointerdown', (event) => {
    dragging = true;
    lastX = event.clientX;
    lastY = event.clientY;
    canvas.setPointerCapture(event.pointerId);
  });
  canvas.addEventListener('pointermove', (event) => {
    if (!dragging) return;
    dragYaw += (event.clientX - lastX) * 0.005;
    dragPitch += (event.clientY - lastY) * 0.004;
    lastX = event.clientX;
    lastY = event.clientY;
  });
  canvas.addEventListener('pointerup', () => { dragging = false; });

  return {
    held(code) { return keys.has(code); },
    forward() { return (keys.has('KeyW') || keys.has('ArrowUp') ? 1 : 0) - (keys.has('KeyS') || keys.has('ArrowDown') ? 1 : 0); },
    strafe() { return (keys.has('KeyD') || keys.has('ArrowRight') ? 1 : 0) - (keys.has('KeyA') || keys.has('ArrowLeft') ? 1 : 0); },
    run() { return keys.has('ShiftLeft') || keys.has('ShiftRight'); },
    handbrake() { return keys.has('Space'); },
    takeDrag() { const d = { yaw: dragYaw, pitch: dragPitch }; dragYaw = 0; dragPitch = 0; return d; },
    takeActions() { const taken = actions; actions = 0; return taken; },
  };
}
