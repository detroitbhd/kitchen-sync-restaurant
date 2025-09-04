import { ref } from 'vue'

export function useNotificationSounds() {
  let audioContext: AudioContext | null = null
  const activeSounds: Record<string, any> = {}
  const userHasInteracted = ref(false)

  // Set up user interaction listener to enable audio
  const setupUserInteractionListener = () => {
    if (userHasInteracted.value) return

    const enableAudio = async () => {
      if (userHasInteracted.value) return
      
      try {
        await initAudioContext()
        userHasInteracted.value = true
        
        // Remove listeners after first interaction
        document.removeEventListener('click', enableAudio)
        document.removeEventListener('keydown', enableAudio)
        document.removeEventListener('touchstart', enableAudio)
      } catch (error) {
        // Silently handle audio initialization errors
      }
    }

    // Listen for any user interaction
    document.addEventListener('click', enableAudio, { once: true })
    document.addEventListener('keydown', enableAudio, { once: true })
    document.addEventListener('touchstart', enableAudio, { once: true })
  }

  // Initialize audio context with user interaction
  const initAudioContext = async () => {
    if (!audioContext) {
      audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
    }
    
    if (audioContext.state === 'suspended') {
      await audioContext.resume()
    }
    
    return audioContext
  }

  // Only initialize interaction listener, don't create audio context yet
  if (typeof document !== 'undefined') {
    setupUserInteractionListener()
  }

  /* Create a pleasant notification sound with multiple tones */
  const playNotificationSound = async (orderId: string | number) => {
    // Try to initialize audio context (may require user gesture to actually play).
    // Previously we returned early if the user hadn't interacted; instead attempt to init
    // and resume so browsers that allow it will play. If we can't run audio, bail silently.
    try {
      await initAudioContext()
    } catch (e) {
      // Continue - initAudioContext may still allow checks below
    }
    try {
      const ctx = await initAudioContext()
      if (!ctx) {
        throw new Error('Failed to initialize audio context')
      }

      // If suspended, attempt to resume (may fail if no user gesture)
      if (ctx.state === 'suspended') {
        try { await ctx.resume() } catch (e) { /* resume may fail without gesture */ }
      }

      if (ctx.state !== 'running') {
        // Can't play via WebAudio; bail quietly. The app still shows glow. 
        return
      }

      const key = String(orderId)
      if (activeSounds[key]) {
        return // already playing
      }
      
      // Create Uber-style two-tone notification chime
      const osc1 = ctx.createOscillator() // First tone (higher)
      const osc2 = ctx.createOscillator() // Second tone (lower)
      
      const gain1 = ctx.createGain()
      const gain2 = ctx.createGain()
      const masterGain = ctx.createGain()
      
      // Set up frequencies for Uber-style two-tone chime
      osc1.type = 'sine'
      osc2.type = 'sine'
      
      osc1.frequency.value = 880.00 // A5 (first tone - higher pitch)
      osc2.frequency.value = 659.25 // E5 (second tone - lower pitch)
      
      // Connect oscillators to their gains
      osc1.connect(gain1)
      osc2.connect(gain2)
      
      // Connect gains to master gain
      gain1.connect(masterGain)
      gain2.connect(masterGain)
      
      // Connect master gain to destination
      masterGain.connect(ctx.destination)
      
      // Set initial volumes
      gain1.gain.value = 0
      gain2.gain.value = 0
      masterGain.gain.value = 0.4

      // Start oscillators
      osc1.start()
      osc2.start()

      const soundData = {
        osc1, osc2,
        gain1, gain2, masterGain,
        stopped: false,
        pulseTimeout: null as any,
        autoStopTimeout: null as any
      }
      
      activeSounds[key] = soundData

      const pulse = () => {
        if (soundData.stopped || !activeSounds[key]) {
          return
        }
        
        const t = ctx.currentTime
        
        // Cancel any scheduled changes
        gain1.gain.cancelScheduledValues(t)
        gain2.gain.cancelScheduledValues(t)
        
        // Set starting volume to 0
        gain1.gain.setValueAtTime(0, t)
        gain2.gain.setValueAtTime(0, t)
        
        // Uber-style two-tone chime sequence
        // First tone (higher pitch) - quick rise and fall
        gain1.gain.linearRampToValueAtTime(0.6, t + 0.1)
        gain1.gain.linearRampToValueAtTime(0, t + 0.25)
        
        // Second tone (lower pitch) - starts slightly after first tone
        gain2.gain.linearRampToValueAtTime(0, t + 0.15)
        gain2.gain.linearRampToValueAtTime(0.5, t + 0.25)
        gain2.gain.linearRampToValueAtTime(0, t + 0.4)
        
        // Schedule next pulse
        soundData.pulseTimeout = window.setTimeout(pulse, 1500)
      }

      // Start the first pulse
      pulse()

      // Auto-stop after 5 seconds
      soundData.autoStopTimeout = window.setTimeout(() => {
        stopNotificationSound(orderId)
      }, 5000)

    } catch (err) {
      console.warn('Failed to play notification sound:', err)
    }
  }

  const stopNotificationSound = (orderId: string | number) => {
    try {
      const key = String(orderId)
      const soundData = activeSounds[key]
      if (!soundData) {
        return
      }
      
      // Mark as stopped
      soundData.stopped = true
      
      // Clear timeouts
      if (soundData.pulseTimeout) {
        clearTimeout(soundData.pulseTimeout)
        soundData.pulseTimeout = null
      }
      if (soundData.autoStopTimeout) {
        clearTimeout(soundData.autoStopTimeout)
        soundData.autoStopTimeout = null
      }
      
      // Stop and disconnect all oscillators
      try { 
        soundData.osc1.stop()
        soundData.osc1.disconnect()
      } catch (e) { /* ignore */ }
      
      try { 
        soundData.osc2.stop()
        soundData.osc2.disconnect()
      } catch (e) { /* ignore */ }
      
      // Disconnect gain nodes
      try { 
        soundData.gain1.disconnect()
        soundData.gain2.disconnect()
        soundData.masterGain.disconnect()
      } catch (e) { /* ignore */ }
      
      // Remove from active sounds
      delete activeSounds[key]
    } catch (err) {
      console.warn('Failed to stop notification sound:', err)
    }
  }

  const stopAllSounds = () => {
    Object.keys(activeSounds).forEach(orderId => {
      stopNotificationSound(orderId)
    })
  }

  return {
    playNotificationSound,
    stopNotificationSound,
    stopAllSounds
  }
}