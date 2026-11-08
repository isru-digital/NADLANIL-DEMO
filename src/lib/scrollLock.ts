/**
 * Locks the page scroll while one or more pop-ups are open. A counter makes it safe when two pop-ups overlap
 * for a moment (the beta lab handing over to the deal room): the original value comes back only when the last one closes.
 */
let locks = 0
let saved = ''

export function lockScroll(): () => void {
  if (locks === 0) {
    saved = document.body.style.overflow
    document.body.style.overflow = 'hidden'
  }
  locks += 1
  let released = false
  return () => {
    if (released) return
    released = true
    locks -= 1
    if (locks === 0) document.body.style.overflow = saved
  }
}
