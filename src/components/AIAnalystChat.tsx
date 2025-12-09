import React from 'react'

// Minimal props interface matching usage in `Reports.tsx`.
export interface AIAnalystChatProps {
  campaigns?: any[]
  contacts?: any[]
  sendingPatterns?: any
  subjectAnalysis?: any
  engagementSegments?: any
}

// AI is disabled in the active codebase. Keep a typed placeholder that
// accepts the original props so callers (like `Reports.tsx`) remain type-safe.
export default function AIAnalystChat(_props: AIAnalystChatProps): React.ReactElement | null {
  return null
}
