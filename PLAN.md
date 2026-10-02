# Learning Coach App — Product & Build Plan

Oct 1, 2026 · @Anna

## Overview

The app is a personal learning coach: it teaches a topic in short chunks, makes you recall and explain it, grades you, and schedules reviews so you keep what you learn. Everything you learn is saved in a searchable, tagged knowledge base you return to.

**Who it's for:** only you. There is no sign-in or user accounts; the app is built around one person's daily habit.

**Core goals**

1. Understand a topic deeply, not just read about it.
2. Remember it for months, through spaced recall.
3. Explain it clearly in your own words (articulation).
4. Keep everything in one knowledge base, organized by tags.
5. Discover what to learn next, either close to your interests or deliberately new.

**The key design idea:** the app owns all state (topics, answers, scores, schedules). Claude is a stateless teacher and grader the app calls. This removes the "Claude can't remember past chats" problem from your original prompt.

## Learning principles

Every feature should make you recall or explain more. If it doesn't, it's decoration.

| Principle | What it means | How the app uses it |
| --- | --- | --- |
| Retrieval practice | Testing yourself beats rereading | Brain dump, quiz and explain are the core loop; the dump is required before the card unlocks |
| Spaced repetition | Reviews at growing intervals | Day 1/3/7/14/30/60 by default, adaptive per question, FSRS later |
| Generation effect | Writing an answer beats recognizing it | Free-text answers, not multiple choice |
| Chunking | Small pieces prevent overload | Lessons in 300-400 word chunks with a "Ready for next?" gate |
| Self-explanation | Explaining builds understanding | Explain mode graded on Claim, Why, Example, Limit, So what |
| Pretesting | Guessing first makes answers stick | 2-3 questions before the lesson starts |
| Interleaving | Mixing topics improves retention | Daily review mixes questions from several topics |
| Calibration | Knowing what you know | Confidence rating (1-3) before each answer |
| Elaboration | Linking new ideas to old ones | "Connects to" on each card, related-topic links, synthesis prompts |

## What to start with

Start with the full loop for one topic: create, learn, recall, save, review. A plain app that makes you recall on schedule beats a pretty one that doesn't.

**MVP (build first, about 5-6 weeks part-time)**

- [ ] Simple password lock on the deployed app (one password in an environment variable) so strangers can't use your API key or see your notes
- [ ] Create a topic: title, your questions, level, tags
- [ ] Research with web search, with sources saved
- [ ] Chunked lesson with "Ready for next?"
- [ ] Brain dump with feedback (got right, missed, got wrong)
- [ ] Topic Card generated and saved, including recall questions with key points
- [ ] Quiz: one question at a time, confidence 1-3, score out of 5, re-ask misses at the end
- [ ] Explain mode with the Claim/Why/Example/Limit/So what feedback
- [ ] Per-question review schedule and a "Today" screen
- [ ] Library: topic pages, tags, and search by keyword and by meaning (an embedding saved with each card)
- [ ] Simple suggestions: "More like this" and "Try something new" (version 1, described below)

**Version 2 (after you've used the MVP for 2-3 weeks)**

- Dashboard: streak, retention per topic, weak spots, calibration, review calendar
- Smarter suggestions using the stored embeddings and your scores
- Voice input for dumps and explanations
- Constraint drills: one sentence, 60 seconds, explain to a 12-year-old, to a skeptic
- Interleaved reviews and a daily review cap
- Learn from a source: paste an article or transcript
- Markdown export

**Later**

- FSRS scheduling, leech detection, mistake journal
- Topic map (knowledge graph), synthesis prompts
- Debate/steelman mode, clarity metrics over time, phrase bank
- Reminders, PWA install, audio review mode, Anki export
- "Ask my library" chat

**Why this order:** the MVP proves the habit works. Dashboards and smart features only matter once you have weeks of real data.

## Knowledge base, tags and topic suggestions

The knowledge base is your database with a good interface on top. Every finished topic becomes a permanent page you can browse, search and test yourself on. Each card also gets an embedding when it's saved, so search by meaning works from day one and grows with your library; nothing needs migrating later.

### Topic page

- Topic Card: one-sentence summary, paragraph, analogy, common mistake or counterpoint, connects to
- Your questions and their answers
- Sources and the "researched on" date, with a "refresh facts" button
- Your best explanation so far, plus earlier versions
- Your own notes (editable)
- Recall questions with score history
- Tags, related topics, mastery level, next review date
- Buttons: Test me now, Hide-and-reveal view, Explain, Simpler, Deeper, Connect

### Tags

- Claude suggests 3-5 tags when you create a topic; you confirm or edit them.
- Keep tags flat (e.g. `psychology`, `economics`, `decision-making`). Group them into optional collections later.
- Show existing tags first when suggesting, so you don't get `psychology` and `psych` as duplicates. Add a merge-tags action.
- Each tag has a page: its topics, average retention, and questions due.
- Tags feed the suggestion engine and the dashboard ("you're strong in economics, weak in statistics").

### Topic suggestions

Suggestions come in four modes, so you choose between comfort and exploration.

| Mode | What it suggests | Signals used |
| --- | --- | --- |
| More like this | Topics close to what you enjoyed | Tags with high interest ratings, "connects to" fields, your own questions |
| Fill the gaps | Prerequisites or foundations behind your weak spots | Low quiz scores, missed key points, topics you struggled with |
| Bridge | A topic that links two you already know | Pairs of learned topics from different tags |
| Try something new | Topics outside your usual areas | Tags you have never used, fields far from your history |

**Signals to collect from day one**

- Interest rating after each topic: "How interesting was this? 1-3"
- Tags and mastery per topic
- Quiz scores and missed key points
- Dismissed suggestions, with an optional reason ("not interested", "already know it", "too hard")
- Your stated interests from a short onboarding (5-10 areas)

**Version 1 (no embeddings):** send Claude a compact profile with each topic's title, tags, interest rating and mastery, plus dismissed suggestions and the chosen mode. Ask for 5 suggestions as JSON: title, why it fits, mode, tags, difficulty, 3 starter questions. Cache the results for a day to save cost.

**Version 2 (embeddings):** use the card embeddings already stored since Phase 4. "More like this" picks the nearest unlearned ideas; "Try something new" picks the farthest. Add an exploration slider (e.g. 80% familiar, 20% new) that sets the daily mix.

**Topic inbox:** accepted suggestions and your own ideas go to a "Want to learn" list, so nothing gets lost. Starting a topic from the inbox prefills its title, tags and starter questions.

## User flows and screens

The app has two main flows: learning a new topic and reviewing old ones. The home screen always opens on what's due today.

### Learn flow

1. **Start:** type a topic, or pick one from suggestions or your inbox. Add your questions, level and tags.
2. **Pretest:** answer 2-3 quick questions before learning (guessing is fine).
3. **Research:** Claude searches the web and builds the lesson. Show sources.
4. **Lesson:** answers to your questions plus up to 3 "Suggested" questions, in 300-400 word chunks. "Ready for next?" between chunks. Simpler and Deeper buttons on each chunk.
5. **Brain dump:** the lesson is hidden. Write everything you remember. Get feedback: right, missed, wrong.
6. **Topic Card:** unlocks after the dump. Read it once.
7. **Quiz:** recall questions one at a time, confidence 1-3 before answering, score out of 5, misses re-asked at the end.
8. **Explain (optional):** explain the whole topic and get structured feedback with a tighter version.
9. **Finish:** rate interest 1-3, confirm tags, see your next review date.

### Review flow

1. Home shows "N questions due" across topics.
2. Start review: questions come one at a time, mixed across topics.
3. Each answer is graded against key points; the schedule updates.
4. End screen: score, weak spots, next review date.

### Screens

| Screen | Purpose | Phase |
| --- | --- | --- |
| Today (home) | Reviews due, continue unfinished topic, suggestions | MVP |
| New topic | Title, questions, level, tags | MVP |
| Learning session | Pretest, lesson chunks, dump, card, quiz, explain | MVP |
| Review session | Mixed due questions | MVP |
| Library | Browse and search topics, filter by tag and mastery | MVP |
| Topic page | Card, notes, history, test me now | MVP |
| Discover | Suggestions in four modes, topic inbox | MVP (simple), V2 (smart) |
| Dashboard | Stats and progress | V2 |
| Settings | Daily cap, reminders, export, interests | V2 |

## Tech stack and architecture

Use one TypeScript web app, one Postgres database, and the Claude API called only from your server. This keeps costs near zero at personal scale.

| Layer | Choice | Why |
| --- | --- | --- |
| Frontend + backend | Next.js (App Router) + TypeScript | One codebase, server routes for API calls |
| UI | Tailwind CSS + shadcn/ui | Fast, clean components |
| Database | Supabase (Postgres) | Hosted database you can reach from any computer, cron jobs, pgvector later; no auth needed |
| AI | Claude API (Anthropic SDK) | Teaching, grading, suggestions; web search tool for research |
| Validation | Zod | Check every JSON response from Claude before saving |
| Scheduling | Simple intervals first, then `ts-fsrs` | Adaptive spaced repetition |
| Charts | Recharts | Dashboard graphs |
| Hosting | Vercel | Free tier is enough for one user |
| Email reminders | Resend (V2) | One daily "reviews due" email |

### Architecture rules

1. **The app owns state; Claude owns language.** Claude never stores or calculates schedules. Each call gets exactly the context it needs.
2. **Structured output only.** Every Claude call returns JSON matching a Zod schema. Invalid JSON gets one automatic retry.
3. **Answer keys at creation.** Each recall question gets 2-5 key points when the card is made. Grading compares your answer with those points.
4. **Research once, review many times.** Web search runs only when creating or refreshing a topic. Reviews use the saved card.
5. **Right model per job.** A stronger model for research and card creation; a smaller, cheaper one for quiz grading and suggestions. Cache the long system prompts.
6. **Keep the API key on the server.** Never call Claude from the browser.
7. **Save every attempt.** Raw answers, scores, confidence, feedback and timestamps power the dashboard and suggestions.
8. **Stream long responses.** Lessons stream into the page so you aren't staring at a spinner.

**Embeddings:** Anthropic doesn't offer an embeddings model, so use Voyage AI or Supabase's built-in model (runs in a Supabase Edge Function, no extra account). Vectors are stored in Postgres with the pgvector extension, so there's no separate vector database. Cost is a fraction of a cent per topic.

**Request path:** browser → Next.js server route → loads data from Supabase → calls Claude → validates JSON → saves to Supabase → returns to the page.

## Data model

Fifteen tables cover the MVP and V2. Every table also has `id` and `created_at`; no `user_id` is needed. Keep the Supabase service key on the server only, and leave row-level security on with no public policies so nobody can read the tables from outside.

| Table | Key fields | Phase |
| --- | --- | --- |
| settings | one row: interests\[\], daily\_review\_cap, exploration\_ratio | MVP |
| topics | title, level, status (inbox, learning, learned), interest\_rating, mastery\_level, researched\_at | MVP |
| tags | name (unique) | MVP |
| topic\_tags | topic\_id, tag\_id | MVP |
| user\_questions | topic\_id, text, is\_suggested, answer | MVP |
| sources | topic\_id, url, title | MVP |
| lesson\_chunks | topic\_id, position, content | MVP |
| topic\_cards | topic\_id, one\_sentence, paragraph, analogy, counterpoint, connects\_to\[\], notes, embedding (vector) | MVP |
| recall\_questions | topic\_id, text, key\_points\[\], type (why, how, compare, apply) | MVP |
| review\_state | question\_id, due\_at, interval\_days, step, stability, difficulty, last\_score | MVP |
| attempts | question\_id, mode (quiz, review), answer, confidence, score, feedback (json), duration\_sec | MVP |
| dumps | topic\_id, text, feedback (json) | MVP |
| explanations | topic\_id, text, drill\_type, feedback (json), score | MVP |
| suggestions | title, mode, reason, tags\[\], starter\_questions\[\], status (shown, accepted, dismissed), dismiss\_reason | MVP |
| topic\_links | topic\_a, topic\_b, relation, source (user or claude) | V2 |

**V2 additions:** a `mistake_cause` column on `attempts`, and a full-text `tsvector` index across cards, notes and answers (this one is cheap enough to add in the MVP).

## AI pipeline

Ten Claude calls run the whole app. Each one has its own short system prompt, a fixed input, and a JSON output schema.

| Call | When | Input | Output (JSON) | Model tier |
| --- | --- | --- | --- | --- |
| research\_and\_lesson | New topic | Title, your questions, level | Answers, up to 3 suggested questions, lesson chunks, sources | Strong + web search |
| pretest | Before lesson | Title, level | 2-3 questions | Small |
| build\_card | After lesson | Lesson, answers | Topic Card, 10-15 recall questions with key points, 3-5 tags | Strong |
| grade\_dump | After brain dump | Card + key points, your dump | right\[\], missed\[\], wrong\[\], short summary | Strong |
| grade\_answer | Each quiz or review answer | Question, key points, your answer | score 0-5, points hit, points missed, feedback, mistake cause | Small |
| grade\_explain | Explain mode | Card, your explanation, drill type | Claim/Why/Example/Limit/So what notes, vague parts, tighter version, score | Strong |
| simpler / deeper | Button on a chunk | Chunk, card | Rewritten chunk | Small / Strong |
| connect | Connect button | Two cards | How they link, one bridge question | Small |
| suggest\_topics | Discover screen, daily | Learning profile, mode, dismissed list | 5 suggestions with reason, tags, starter questions | Small |
| refresh\_facts | Refresh button | Card, sources | Changes found, updated card | Strong + web search |

One extra non-Claude call, embed\_card, runs whenever a card is created or edited: it sends the one-sentence summary, paragraph and tags to the embedding model and saves the vector. Search by meaning embeds your query the same way and asks Postgres for the closest cards.

### Prompt rules (carry over from your original coach prompt)

- Plain language, short sentences, concrete examples.
- Say when something is uncertain or debated.
- Warm and direct; no flattery.
- Feedback is specific: quote the part of your answer that is wrong or vague.

### Grading rubric for answers (0-5)

- **5:** all key points, accurate, clear
- **4:** most key points, small gaps
- **3:** about half the key points, or right idea stated vaguely
- **2:** one key point, or partly wrong
- **1:** attempted but mostly wrong
- **0:** blank or "I don't know"

Give the grader the rubric and the key points every time. Test it on 20 sample answers you write yourself before trusting it.

## Scheduling

Each recall question has its own schedule. A topic review is just the set of that topic's questions due today.

**MVP rule (simple adaptive ladder):** the steps are 1, 3, 7, 14, 30 and 60 days, then every 120 days.

| Score | What happens |
| --- | --- |
| 4-5 | Move up one step |
| 3 | Stay on the same step |
| 0-2 | Back to step 1 (Day 1) |
| Score 4-5 but confidence 1 | Stay on the same step (a lucky guess) |

**Daily cap:** show at most 20 questions a day (setting). Overflow moves to the next days, oldest first, so a missed week doesn't create an 80-question wall.

**Interleaving:** when building today's review, mix topics instead of grouping them.

**Mastery level per topic:** Seen (lesson done) → Recalled (quiz average 3+) → Explained (explain score 4+) → Applied (you logged a real use).

**V2: switch to FSRS** with the `ts-fsrs` library. Map scores to its ratings (0-2 = Again, 3 = Hard, 4 = Good, 5 = Easy). It adapts intervals to how fast you forget each question. Keep the step ladder as a fallback until you trust it.

**Leech rule (later):** 4+ failures on one question triggers "rewrite, split, or add a mnemonic."

## Roadmap

The MVP takes about 6 weeks part-time (10-15 hours a week), then 2-3 weeks of real use before building V2. Each phase ends with a "done when" test.

### Phase 0: Setup and validation (days 1-3)

- [ ] Create accounts: GitHub, Supabase, Vercel, Anthropic Console (API key, spending limit), Voyage AI if you won't use Supabase's built-in embedding model
- [ ] Create the Next.js + TypeScript project with Tailwind and shadcn/ui; deploy a blank page
- [ ] Learn 2-3 topics using your coach prompt in Claude chat; note what annoys you
- [ ] Write the JSON schemas for the lesson, card and grading outputs

**Done when:** a blank app is live on Vercel and you have tested your prompts by hand.

### Phase 1: Learn flow (weeks 1-2)

- [ ] MVP tables in Supabase and the password lock
- [ ] New topic form: title, questions, level, tags
- [ ] research\_and\_lesson call with web search; save chunks and sources
- [ ] Lesson screen with chunks, "Ready for next?", Simpler and Deeper
- [ ] Pretest before the lesson
- [ ] build\_card call; save the card, recall questions, key points and tags

**Done when:** you can create a topic, read the lesson and see a saved Topic Card.

### Phase 2: Recall and grading (week 3)

- [ ] Brain dump screen and grade\_dump
- [ ] Quiz screen: one question, confidence 1-3, grade\_answer, re-ask misses
- [ ] Explain screen and grade\_explain
- [ ] Save every attempt
- [ ] Test the grader on 20 of your own sample answers

**Done when:** you finish a full session and the scores feel fair.

### Phase 3: Scheduling and Today (week 4)

- [ ] review\_state per question with the step ladder
- [ ] Today screen: due count, start review, continue unfinished topic
- [ ] Review session with interleaving and the daily cap
- [ ] Next review date shown at the end of every session

**Done when:** questions come back on the right days and you've used it 5 days in a row.

### Phase 4: Library, semantic search and suggestions v1 (weeks 5-6)

- [ ] Library with tag filters and full-text search
- [ ] Enable pgvector; add the embedding column to topic\_cards
- [ ] embed\_card on every card save and edit; backfill topics made in Phases 1-3
- [ ] One search box that combines keyword and meaning results
- [ ] "Related topics" on each topic page (closest cards by meaning)
- [ ] Topic page with notes, history and Test me now
- [ ] Tag pages and merge tags
- [ ] Interest rating at the end of each topic; onboarding interests
- [ ] Discover screen: four suggestion modes and the topic inbox

**Done when:** you can find any past topic in seconds, even with words that aren't in it, and accept a suggestion into a new session.

### Use it (2-3 weeks)

- [ ] Learn at least 8 topics and do daily reviews
- [ ] Keep a list of friction points and wishes

### Phase 5: V2 (weeks 9-13)

- [ ] Dashboard: streak, retention per topic and tag, weak spots, calibration chart, review calendar
- [ ] Voice input for dumps and explanations
- [ ] Constraint drills in Explain mode
- [ ] Smarter suggestions from the stored embeddings, with the exploration slider
- [ ] Learn from a pasted source
- [ ] Markdown export; daily reminder email

### Phase 6: Later

- [ ] FSRS, leech detection, mistake journal
- [ ] Topic map and weekly synthesis prompts
- [ ] Debate mode, clarity metrics, phrase bank
- [ ] PWA install, audio review, Anki export, "Ask my library"

## Best practices and pitfalls

The biggest risk is building features instead of using the app. Ship the MVP, use it daily, and let real friction decide what comes next.

| Pitfall | Fix |
| --- | --- |
| Lessons too long; you skim | Hard limit of 400 words per chunk, gated |
| Skipping the brain dump | Card stays locked until the dump is done |
| Inconsistent AI grades | Key points saved at creation, fixed rubric, test on sample answers |
| Wrong facts from AI | Show sources, "flag as wrong" button, refresh facts, editable cards |
| Review backlog after a break | Daily cap and spread-out overflow |
| Library becomes a graveyard | Home opens on Today, topic pages open in recall view |
| Suggestions get repetitive | Track dismissals, keep a "Try something new" share in the mix |
| Tag chaos | Suggest existing tags first, limit to 5, merge tool |
| API cost creep | Small model for grading, prompt caching, research only once, spending limit in the console |
| Gamification over learning | Reward recall quality and mastery, not speed or volume |
| Lock-in | Markdown export so your knowledge is always yours |

### Working with AI coding tools

- Give the coding assistant this plan plus one phase at a time, not the whole roadmap.
- Ask for the database migration first, then server routes, then screens.
- Commit to Git after every working step so you can roll back.

### Moving this plan to another computer

- Download this doc as Markdown, Word or PDF, or open its link on the other computer.
- Keep a copy as `PLAN.md` in your project repository so it travels with the code and your coding tools can read it.
- Tick off the checkboxes in the roadmap as you go.
