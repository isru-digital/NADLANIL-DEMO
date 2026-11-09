/**
 * A one-time clean start for the green demo: the first time a browser opens this version after the update, what an
 * earlier session left behind (a test join and payment, a built agent page) is removed, so the demo opens as it
 * should. It must be the FIRST import of the green entry, because the agent store reads the browser's storage the
 * moment it is loaded. To clean every browser again later, change the number in FLAG.
 */
const FLAG = 'nadlanup-clean-start-1'
const KEYS = ['brokers-demo-state-v5', 'nadlanup-agent-v1']

try {
  if (!localStorage.getItem(FLAG)) {
    KEYS.forEach((k) => localStorage.removeItem(k))
    localStorage.setItem(FLAG, '1')
  }
} catch {
  /* storage unavailable: nothing to clean */
}

export {}
