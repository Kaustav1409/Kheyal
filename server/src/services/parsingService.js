const chrono = require('chrono-node');

const EFFORT_REGEX = /(?:~|\bapprox(?:imately)?\s*)?(\d+(?:\.\d+)?)\s*(?:hours?|hrs?|h)\b/i;
const AMBIGUOUS_DATE_REGEX = /\b([0-1]?[0-9])[/-]([0-3]?[0-9])\b/;
const KNOWN_SUBJECTS_REGEX = /\b(DBMS|OS|ML|DAA|AI|CN|DSA|OOP|Physics|Chemistry|Maths|Mathematics|Economics|Biology|History|English)\b/i;

/**
 * Parses natural-language deadline text.
 * Implements day-first convention (chrono.en.GB) and local time handling.
 *
 * @param {string} text - Raw natural language input from student
 * @param {object} [options]
 * @param {Date} [options.referenceDate] - Baseline time (default: NOW)
 * @returns {object} preview object containing title, subject, dueAt, hasDueTime, effortHours, and warnings
 */
function parseDeadlineText(text, options = {}) {
  if (!text || typeof text !== 'string') {
    return {
      title: '',
      subject: null,
      dueAt: null,
      hasDueTime: false,
      effortHours: null,
      warnings: ['Empty input text'],
    };
  }

  const warnings = [];
  let remainingText = text.trim();

  // 1. Extract effort hours
  let effortHours = null;
  const effortMatch = remainingText.match(EFFORT_REGEX);
  if (effortMatch) {
    effortHours = parseFloat(effortMatch[1]);
    // Remove the effort snippet from the text
    remainingText = remainingText.replace(effortMatch[0], ' ');
  }

  // 2. Detect ambiguous numeric dates (e.g. 05/11 vs 11/05 where both numbers <= 12)
  const ambMatch = text.match(AMBIGUOUS_DATE_REGEX);
  if (ambMatch) {
    const num1 = parseInt(ambMatch[1], 10);
    const num2 = parseInt(ambMatch[2], 10);
    if (num1 <= 12 && num2 <= 12 && num1 !== num2) {
      warnings.push(`Ambiguous date format detected; interpreted day-first (${num1}/${num2} as Day ${num1}).`);
    }
  }

  // 3. Parse date and time with day-first convention
  const referenceDate = options.referenceDate || new Date();
  const parsedResults = chrono.en.GB.parse(remainingText, referenceDate);

  let dueAt = null;
  let hasDueTime = false;

  if (parsedResults.length > 0) {
    const parsed = parsedResults[0];
    const isHourCertain = parsed.start.isCertain('hour');

    if (isHourCertain) {
      dueAt = parsed.start.date().toISOString();
      hasDueTime = true;
    } else {
      // Date-only: Treat as due at 23:59:00.000 local time
      const dateOnly = parsed.start.date();
      dateOnly.setHours(23, 59, 0, 0);
      dueAt = dateOnly.toISOString();
      hasDueTime = false;
      warnings.push('Time nahi diya — end of day (11:59 PM) maan liya. Reminders: raat 10:30 aur subah 7:00.');
    }

    // Remove the parsed date text from the title
    remainingText =
      remainingText.slice(0, parsed.index) +
      ' ' +
      remainingText.slice(parsed.index + parsed.text.length);
  } else {
    warnings.push('Date samajh nahi aayi ya nahi di gayi. Reminders ke liye date hona zaroori hai.');
  }

  // 4. Extract subject heuristic
  let subject = null;
  const subjectMatch = text.match(KNOWN_SUBJECTS_REGEX);
  if (subjectMatch) {
    subject = subjectMatch[1].toUpperCase();
  }

  // 5. Clean up title
  let title = remainingText
    .replace(/\b(by|due|on|at|before|in|for)\s*$/i, '') // trailing prepositions
    .replace(/^\s*(by|due|on|at|before|in|for)\s*/i, '') // leading prepositions
    .replace(/\s+/g, ' ')
    .trim();

  // Remove trailing punctuation (commas, dashes)
  title = title.replace(/[,\-:;]+$/, '').trim();

  if (!title) {
    title = text.trim();
  }

  return {
    title,
    subject,
    dueAt,
    hasDueTime,
    effortHours,
    warnings,
  };
}

module.exports = {
  parseDeadlineText,
};

