import { labItems } from '../components/BetaLab'

/**
 * Names the green version gives to shared lab tools. Imported at the very top of the entry file, before any screen:
 * some screens copy the tools' names when they are loaded, so the new name has to be in place by then.
 * The shared deal room tool is called "טינדר של הדירות" (Itzik, 12.11.2026).
 */
export const ROOM_NAME = 'טינדר של הדירות'

const room = labItems.find((x) => x.id === 'room')
if (room) room.title = ROOM_NAME
