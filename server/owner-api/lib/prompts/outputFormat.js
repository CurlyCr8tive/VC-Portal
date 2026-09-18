// server/owner-api/lib/prompts/outputFormat.js
//
// Shared output-formatting rule appended to every AI writing prompt.
//
// Why this exists: none of the five prompts said anything about format, so
// the model defaulted to Markdown — `# Candlelit Care — Executive Summary`,
// `**Problem**`, `**Results**`. Nothing downstream renders Markdown. The
// text is shown in a plain <textarea>, saved verbatim as the client-facing
// summary, and exported into Canva. So Tenyse's client opens a report and
// reads literal hash marks and asterisks around the headings.
//
// The fix belongs in the prompt rather than in a Markdown-stripping pass on
// the output: stripping symbols after the fact leaves the text still SHAPED
// like Markdown (stacked one-line headings, no connective prose), which
// reads like a stripped document rather than something written. Asking for
// prose in the first place produces prose.
//
// Section labels are still wanted — her case studies genuinely follow
// Problem / Solution / Results. They just need to be written as headings a
// person would type, not as syntax.

export const PLAIN_PROSE_RULES = `
FORMATTING — this text goes straight into a client-facing report and a Canva export, and nothing renders Markdown:
- Write plain prose. No Markdown syntax anywhere: no #, ##, **, __, backticks, bullet characters (*, -, •) or numbered-list markers.
- Do not open with a title line repeating the client and report name — that is already on the document.
- Where a section label genuinely helps (Problem, Solution, Results), write it as a word on its own line followed by a colon, e.g. "Problem:" — never "**Problem**" or "# Problem".
- Separate sections with a blank line, not with rules, dashes or symbols.
- Write figures as they should be read: $492,198 and 14.2M, not 492198 or 14200000.
- If you would have used a bulleted list, write it as a sentence instead.`;
