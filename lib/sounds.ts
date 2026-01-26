/**
 * Sound Effects for Demo
 * Plays subtle sounds on key interactions
 */

// Sound URLs (using free sounds or data URIs)
const SOUNDS = {
  notification: "/sounds/notification.mp3",
  success: "/sounds/success.mp3", 
  message: "/sounds/message.mp3",
}

// Fallback: Generate sounds programmatically using Web Audio API
let audioContext: AudioContext | null = null

function getAudioContext(): AudioContext {
  if (!audioContext) {
    audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()
  }
  return audioContext
}

/**
 * Play a notification sound
 */
export function playNotificationSound() {
  try {
    // Try to play MP3 first
    const audio = new Audio(SOUNDS.notification)
    audio.volume = 0.3
    audio.play().catch(() => {
      // Fallback to Web Audio API beep
      playBeep(800, 0.1, 0.2)
    })
  } catch {
    playBeep(800, 0.1, 0.2)
  }
}

/**
 * Play a success/completion sound
 */
export function playSuccessSound() {
  try {
    const audio = new Audio(SOUNDS.success)
    audio.volume = 0.25
    audio.play().catch(() => {
      playChime()
    })
  } catch {
    playChime()
  }
}

/**
 * Play a message received sound
 */
export function playMessageSound() {
  try {
    const audio = new Audio(SOUNDS.message)
    audio.volume = 0.2
    audio.play().catch(() => {
      playBeep(600, 0.08, 0.15)
    })
  } catch {
    playBeep(600, 0.08, 0.15)
  }
}

/**
 * Generate a simple beep using Web Audio API
 */
function playBeep(frequency: number = 800, duration: number = 0.1, volume: number = 0.3) {
  try {
    const ctx = getAudioContext()
    const oscillator = ctx.createOscillator()
    const gainNode = ctx.createGain()
    
    oscillator.connect(gainNode)
    gainNode.connect(ctx.destination)
    
    oscillator.frequency.value = frequency
    oscillator.type = "sine"
    
    gainNode.gain.setValueAtTime(volume, ctx.currentTime)
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration)
    
    oscillator.start(ctx.currentTime)
    oscillator.stop(ctx.currentTime + duration)
  } catch (e) {
    console.warn("Could not play sound:", e)
  }
}

/**
 * Generate a pleasant chime (two-tone)
 */
function playChime() {
  playBeep(523.25, 0.15, 0.2) // C5
  setTimeout(() => playBeep(659.25, 0.2, 0.15), 100) // E5
}

/**
 * Check if sound is supported
 */
export function isSoundSupported(): boolean {
  return typeof window !== "undefined" && 
    (typeof Audio !== "undefined" || typeof AudioContext !== "undefined")
}
