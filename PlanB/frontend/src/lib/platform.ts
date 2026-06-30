export function isMac() {
  return navigator.platform?.toLowerCase().includes('mac')
}

export function modKey() {
  return isMac() ? '⌘' : 'Ctrl'
}

export function modKeyDisplay(shortcut) {
  return shortcut.replace(/\bMod\b/g, modKey())
}
