import { MAX_CHUNK_WORDS } from "@/lib/schemas";

// How every lesson part is written, for lessons from research and from the
// learner's own material. The learner recalls each part's main idea right
// after reading it, so a part holds one idea.
export const CHUNK_RULES = `How to write each chunk (the learner recalls its main idea right after reading it):
- One main idea per chunk, named by its title. If describing the chunk needs "and", split it.
- In each chunk: the idea stated plainly; why it's true or how it works, in a "because" sentence; one concrete example from everyday life or work. Add a simple analogy where it helps.
- The first chunk opens with one or two sentences on what the topic is and why it matters, before any detail.
- 150-250 words per chunk, never more than ${MAX_CHUNK_WORDS}.
- Match the learner's level: new to it → only the core ideas, no exceptions or edge cases; knows the basics → add the main caveats; knows it well → add trade-offs, exceptions and links to related ideas.`;
