// All the user-facing text in one place. Edit here, not in components.
// Keeps wording consistent across the app.

export const EMPTY_STATES = {
  journal: {
    title: 'No entries yet',
    body: 'Tap the mic and tell me about your day. I’ll handle the rest.'
  },
  todos: {
    title: 'Nothing on the list',
    body: 'Add your first task above. Small wins count.'
  },
  goals: {
    title: 'No goals set',
    body: 'Daily, weekly, monthly — start with one. You can always add more.'
  },
  finance: {
    title: 'No transactions yet',
    body: 'Connect your bank to see this week’s spending here.'
  },
  insights: {
    title: 'Your first insights drop on Sunday',
    body: 'I look back at your week and find patterns you’d miss on your own.'
  },
  calendar: {
    title: 'No events this week',
    body: 'A quiet week. Or your calendar isn’t connected yet.'
  },
  email: {
    title: 'Inbox zero, kind of',
    body: 'Nothing important right now. Connect Gmail to see what matters.'
  },
  screenTime: {
    title: 'No screen time data',
    body: 'We’ll start tracking once you log a session.'
  }
} as const

export const ERROR_MESSAGES = {
  generic: 'Something went wrong. Try again in a moment.',
  network: 'Can’t reach the server. Check your connection.',
  unauthorized: 'You’ve been signed out. Sign back in to continue.',
  micPermission: 'Microphone access is blocked. Enable it in your browser settings.',
  speechUnsupported: 'Voice recording isn’t supported in this browser. Try Chrome or Safari.',
  plaidDisconnected: 'Your bank connection expired. Reconnect to keep transactions flowing.',
  plaidLinkFailed: 'Couldn’t connect to your bank. Try again, or pick a different account.',
  googleAuthFailed: 'Couldn’t sign in with Google. Try again.',
  saveFailed: 'Couldn’t save that. Your changes weren’t lost — try again.',
  loadFailed: 'Couldn’t load this section. Pull to refresh.',
  claudeUnavailable: 'Insights couldn’t generate right now. We’ll retry on Sunday.'
} as const

export const CONFIRMATIONS = {
  deleteEntry: 'Delete this entry? This can’t be undone.',
  deleteTodo: 'Remove this task?',
  deleteGoal: 'Delete this goal? Your progress will be cleared too.',
  disconnectBank: 'Disconnect your bank? Past transactions stay, new ones stop syncing.'
} as const
