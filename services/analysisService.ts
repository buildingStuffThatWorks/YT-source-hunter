import { AnalysisResult } from '../types';

// Regex Patterns
const PATTERNS = {
  SOURCE: /(name|source|sauce|anime|movie|title|track|song)\s*[:=-]\s*(.+)/i,
  HELPER: /it['’]?s\s*([A-Z][a-z]+(\s[A-Z][a-z]+)*)/,
  BRACKET: /\[(.*?)\]/,
  QUESTION: /(what|name|sauce)\?/i,
};

export const analyzeComment = (text: string): AnalysisResult => {
  let score = 0;
  const highlights: { start: number; end: number; type: 'source' | 'helper' | 'bracket' }[] = [];

  // 1. The Answer (High Score)
  const sourceMatch = text.match(PATTERNS.SOURCE);
  if (sourceMatch) {
    score += 80;
    if (sourceMatch.index !== undefined) {
       // Highlight the value part (group 2)
       const fullMatch = sourceMatch[0];
       const key = sourceMatch[1];
       // Approximate location of value
       const valueStart = sourceMatch.index + fullMatch.indexOf(sourceMatch[2]);
       highlights.push({
         start: valueStart,
         end: valueStart + sourceMatch[2].length,
         type: 'source'
       });
    }
  }

  // 2. The Helper (Medium Score)
  const helperMatch = text.match(PATTERNS.HELPER);
  if (helperMatch) {
    score += 50;
    // Highlight the title part
    if (helperMatch.index !== undefined) {
      const fullMatch = helperMatch[0];
      const titleStart = helperMatch.index + fullMatch.indexOf(helperMatch[1]);
       highlights.push({
         start: titleStart,
         end: titleStart + helperMatch[1].length,
         type: 'helper'
       });
    }
  }

  // 3. The Bracket (Medium Score)
  const bracketMatch = text.match(PATTERNS.BRACKET);
  if (bracketMatch) {
    score += 40;
    if (bracketMatch.index !== undefined) {
      highlights.push({
        start: bracketMatch.index,
        end: bracketMatch.index + bracketMatch[0].length,
        type: 'bracket'
      });
    }
  }

  // 4. The Question (Small Bump, mostly context)
  if (PATTERNS.QUESTION.test(text)) {
    score += 10;
  }

  // Cap score at 100
  return {
    score: Math.min(score, 100),
    highlights
  };
};

export const getHighlightedText = (text: string, highlights: AnalysisResult['highlights']) => {
  // Simple highlighter for display purposes (returns HTML string logic handled in component)
  // This function is a placeholder; logic is better handled in React component rendering to avoid XSS risks easily.
  return text; 
};
