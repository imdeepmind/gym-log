import { db } from '@/db/schema';

export type NotificationStatus = 'granted' | 'denied' | 'default' | 'unsupported';

/**
 * Checks if the Web Notification API is supported by the current browser/OS.
 */
export function isNotificationSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window;
}

/**
 * Gets the current notification permission status.
 */
export function getNotificationPermission(): NotificationStatus {
  if (!isNotificationSupported()) {
    return 'unsupported';
  }
  return Notification.permission as NotificationStatus;
}

/**
 * Requests notification permission from the user.
 * Must be triggered by a direct user interaction (tap/click).
 */
export async function requestNotificationPermission(): Promise<NotificationStatus> {
  if (!isNotificationSupported()) {
    return 'unsupported';
  }

  try {
    const permission = await Notification.requestPermission();
    return permission as NotificationStatus;
  } catch (error) {
    console.error('Failed to request notification permission:', error);
    return 'denied';
  }
}

/**
 * Plays audio alert chime when timer completes.
 */
let audioCtx: AudioContext | null = null;

export function playTimerChime() {
  try {
    if (!audioCtx) {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        audioCtx = new AudioContextClass();
      }
    }

    if (audioCtx) {
      if (audioCtx.state === 'suspended') {
        audioCtx.resume();
      }

      const now = audioCtx.currentTime;

      // Two-tone rising chime (587Hz -> 880Hz, D5 -> A5)
      const osc1 = audioCtx.createOscillator();
      const gain1 = audioCtx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(587.33, now);
      gain1.gain.setValueAtTime(0.3, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
      osc1.connect(gain1);
      gain1.connect(audioCtx.destination);
      osc1.start(now);
      osc1.stop(now + 0.25);

      const osc2 = audioCtx.createOscillator();
      const gain2 = audioCtx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(880, now + 0.15);
      gain2.gain.setValueAtTime(0.35, now + 0.15);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.55);
      osc2.connect(gain2);
      gain2.connect(audioCtx.destination);
      osc2.start(now + 0.15);
      osc2.stop(now + 0.55);
    }
  } catch (e) {
    console.error('Audio chime error:', e);
  }

  // Trigger vibration if supported
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    try {
      navigator.vibrate([200, 100, 200, 100, 300]);
    } catch (e) {
      // Ignore vibration error
    }
  }
}

/**
 * Sends a system push notification.
 * Prefers Service Worker notification (best for PWAs, Android, and iOS 16.4+),
 * with fallback to window.Notification.
 */
export async function sendSystemNotification(options: {
  title: string;
  body: string;
  tag?: string;
}): Promise<boolean> {
  if (!isNotificationSupported() || Notification.permission !== 'granted') {
    return false;
  }

  const notificationOptions = {
    body: options.body,
    icon: '/favicon.svg',
    badge: '/favicon.svg',
    tag: options.tag || 'gymlog-timer-alert',
    renotify: true,
    vibrate: [200, 100, 200, 100, 300],
    data: { url: '/' },
  };

  try {
    // 1. Preferred: Service Worker Registration
    if ('serviceWorker' in navigator) {
      const reg = await Promise.race([
        navigator.serviceWorker.ready,
        new Promise<null>((resolve) => setTimeout(() => resolve(null), 1000)),
      ]);

      if (reg && 'showNotification' in reg) {
        await reg.showNotification(options.title, notificationOptions as any);
        return true;
      }
    }

    // 2. Fallback: Standard browser notification
    new Notification(options.title, notificationOptions as any);
    return true;
  } catch (err) {
    console.warn('Service worker notification failed, trying fallback:', err);
    try {
      new Notification(options.title, notificationOptions as any);
      return true;
    } catch (fallbackErr) {
      console.error('All notification attempts failed:', fallbackErr);
      return false;
    }
  }
}

/**
 * Triggers the full alert sequence: sound, vibration, and push notification.
 */
export async function triggerRestEndAlert(
  exerciseName?: string,
  isBetweenExercise?: boolean
): Promise<void> {
  // Check user settings from Dexie
  let soundEnabled = true;
  let vibrateEnabled = true;
  let notifsEnabled = true;

  try {
    const settings = await db.settings.toArray();
    const map = new Map(settings.map((s) => [s.key, s.value]));
    if (map.has('soundEnabled')) soundEnabled = Boolean(map.get('soundEnabled'));
    if (map.has('vibrateEnabled')) vibrateEnabled = Boolean(map.get('vibrateEnabled'));
    if (map.has('timerNotificationsEnabled')) {
      notifsEnabled = Boolean(map.get('timerNotificationsEnabled'));
    }
  } catch (e) {
    // Default to true
  }

  // Play audio chime and vibrate
  if (soundEnabled || vibrateEnabled) {
    playTimerChime();
  }

  // Send push notification if enabled
  if (notifsEnabled && isNotificationSupported() && Notification.permission === 'granted') {
    const title = isBetweenExercise ? 'Break Finished! 🔔' : 'Rest Time Over! ⚡';
    const body = isBetweenExercise
      ? exerciseName
        ? `Next up: ${exerciseName}. Ready for set 1!`
        : 'Break time is up! Ready for your next movement!'
      : exerciseName
      ? `${exerciseName} · Time to start your next set!`
      : 'Time to start your next set!';

    await sendSystemNotification({
      title,
      body,
      tag: 'gymlog-rest-timer',
    });
  }
}

/**
 * Dispatches an immediate test notification.
 */
export async function sendTestNotification(): Promise<boolean> {
  playTimerChime();
  return sendSystemNotification({
    title: 'GymLog Notifications Active! 🏋️',
    body: "You'll get an alert like this when your rest or break timer ends.",
    tag: 'gymlog-test',
  });
}

// ============================================================================
// Background Timer Worker & Scheduler
// ============================================================================
// Uses an inline Web Worker to avoid aggressive browser tab background throttling,
// with a window.setTimeout fallback.
// ============================================================================

let timerWorker: Worker | null = null;
let windowTimeoutId: number | null = null;
let currentSessionId: string | null = null;
let hasFiredForCurrentSession = false;

function getTimerWorker(): Worker | null {
  if (timerWorker) return timerWorker;
  if (typeof window === 'undefined' || !window.Worker) return null;

  try {
    const workerScript = `
      var timerId = null;
      self.onmessage = function(e) {
        if (e.data.type === 'START') {
          if (timerId) clearTimeout(timerId);
          var delay = Math.max(0, e.data.endsAt - Date.now());
          timerId = setTimeout(function() {
            self.postMessage({ type: 'TIMER_DONE', sessionId: e.data.sessionId });
          }, delay);
        } else if (e.data.type === 'CANCEL') {
          if (timerId) clearTimeout(timerId);
          timerId = null;
        }
      };
    `;
    const blob = new Blob([workerScript], { type: 'application/javascript' });
    const url = URL.createObjectURL(blob);
    timerWorker = new Worker(url);

    timerWorker.onmessage = (e) => {
      if (e.data.type === 'TIMER_DONE') {
        handleTimerElapsed(e.data.sessionId);
      }
    };
    return timerWorker;
  } catch (e) {
    console.warn('Web Worker creation failed, using main thread timer:', e);
    return null;
  }
}

let activeExerciseName: string | undefined = undefined;
let activeIsBetweenExercise: boolean | undefined = undefined;

function handleTimerElapsed(sessionId: string) {
  if (sessionId !== currentSessionId) return;
  if (hasFiredForCurrentSession) return;

  hasFiredForCurrentSession = true;
  triggerRestEndAlert(activeExerciseName, activeIsBetweenExercise);
}

/**
 * Schedules a rest timer completion alert.
 * Synchronizes with Web Worker and setTimeout.
 */
export function scheduleRestNotification(
  endsAt: number,
  exerciseName?: string,
  isBetweenExercise?: boolean
): void {
  const sessionId = `${endsAt}-${Date.now()}`;
  currentSessionId = sessionId;
  hasFiredForCurrentSession = false;
  activeExerciseName = exerciseName;
  activeIsBetweenExercise = isBetweenExercise;

  const delay = Math.max(0, endsAt - Date.now());

  // 1. Post to Web Worker
  const worker = getTimerWorker();
  if (worker) {
    worker.postMessage({
      type: 'START',
      endsAt,
      sessionId,
    });
  }

  // 2. Set window timeout fallback
  if (windowTimeoutId) {
    window.clearTimeout(windowTimeoutId);
  }
  windowTimeoutId = window.setTimeout(() => {
    handleTimerElapsed(sessionId);
  }, delay);
}

/**
 * Cancels any scheduled rest notification.
 */
export function cancelRestNotification(): void {
  currentSessionId = null;
  hasFiredForCurrentSession = true;

  if (timerWorker) {
    timerWorker.postMessage({ type: 'CANCEL' });
  }
  if (windowTimeoutId) {
    window.clearTimeout(windowTimeoutId);
    windowTimeoutId = null;
  }
}

/**
 * Manually signals that the timer elapsed from the UI component,
 * ensuring the alert fires if the background timers haven't fired yet.
 */
export function markRestTimerElapsed(
  exerciseName?: string,
  isBetweenExercise?: boolean
): void {
  if (!hasFiredForCurrentSession) {
    hasFiredForCurrentSession = true;
    triggerRestEndAlert(exerciseName, isBetweenExercise);
  }
  cancelRestNotification();
}
