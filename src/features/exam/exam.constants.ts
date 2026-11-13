/** The four SOAP parts (label and hint: messages exam.soap.<name>; letters stay S/O/A/P in both languages). */
export const SOAP_FIELDS = [
  { name: 'subjective', letter: 'S' },
  { name: 'objective', letter: 'O' },
  { name: 'assessment', letter: 'A' },
  { name: 'plan', letter: 'P' },
] as const;

/** Roles that open the exam page (RLS limits clinical reads to the same roles). */
export const EXAM_VIEWER_ROLES = ['doctor', 'nurse', 'owner'] as const;
