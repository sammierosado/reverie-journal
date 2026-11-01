/** Original writing prompts, offered only when asked for. */
export const WRITING_PROMPTS: readonly string[] = [
  'What did the light look like today, and where did it fall?',
  'Write to someone you were five years ago. What would you warn them about, and what would you let them discover?',
  'Which sentence from a book has followed you around lately?',
  'Describe a small mercy you received this week.',
  'What are you carrying that is not yours to carry?',
  'If tonight’s sky could answer one question, what would you ask it?',
  'Name a feeling you have no word for. Describe its weather.',
  'What did you almost say today?',
  'Write about a room you have loved and left.',
  'What would you do with an unscheduled, unwatched afternoon?',
  'Which of your habits is a kind of prayer?',
  'Describe the last time you felt entirely at home in your body.',
  'What are you outgrowing?',
  'Write the opening line of the novel about your life this month.',
  'What does rest look like when it is not earned?',
  'Who taught you to notice beautiful things?',
  'Write about something you have forgiven, or are still trying to.',
  'What is the oldest object you own, and what has it witnessed?',
  'If your worry were a character, how would they dress? What do they want?',
  'Describe a moment today that you want to remember precisely.',
  'What does your intuition keep whispering that you keep talking over?',
  'Write about a door you closed gently.',
  'Which season are you in, regardless of the calendar?',
  'What would you write in the margins of your own life so far?',
  'Describe a scent that brings someone back.',
  'What small ritual could make tomorrow softer?',
  'Where did you feel brave today, even quietly?',
  'Write about a fallen thing that became more beautiful for falling.',
  'What are you waiting for permission to do?',
  'Make a list of everything that went right today, however small.',
]

export function randomPrompt(exclude?: string | null): string {
  const pool = WRITING_PROMPTS.filter((p) => p !== exclude)
  return pool[Math.floor(Math.random() * pool.length)] ?? WRITING_PROMPTS[0]!
}
