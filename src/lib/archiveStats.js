export const ARCHIVE_DATE_LABEL = 'April 11, 2026'
export const ARCHIVE_STATUS_LABEL = 'Archived after splashdown'
export const ARCHIVE_SOCIAL_NOTE =
  'This site is archived and the social stats below are frozen from the live mission run.'

export const ARCHIVED_PEAK_VIEWERS = 135

export const ARCHIVED_REACTION_COUNTS = Object.freeze({
  '👀': 58032,
  '🚀': 140561,
  '🌕': 140558,
  '❤️': 69702,
  '🙌': 55561,
  '✨': 55555,
})

export const ARCHIVED_TOTAL_REACTIONS = Object.values(ARCHIVED_REACTION_COUNTS)
  .reduce((sum, count) => sum + count, 0)
