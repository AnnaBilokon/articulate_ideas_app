# Learning Coach App — Product & Build Plan

Oct 1, 2026 · @Anna

## Overview

The app is a personal learning coach: it teaches a topic in short chunks, makes you recall and explain it, pushes you to think critically about it, grades you, and schedules reviews so you keep what you learn. Features are chosen by the strength of the research behind them (see "Research-backed feature map"). Everything you learn is saved in a searchable, tagged knowledge base you return to.

**Who it's for:** only you. There is no sign-in or user accounts; the app is built around one person's daily habit.

**Core goals**

1. Understand a topic deeply, not just read about it.
2. Remember it for months, through spaced recall.
3. Explain it clearly in your own words (articulation).
4. Keep everything in one knowledge base, organized by tags.
5. Discover what to learn next, either close to your interests or deliberately new.
6. Think critically about what you learn: question assumptions, weigh evidence, and argue the other side.

**The key design idea:** the app owns all state (topics, answers, scores, schedules). Claude is a stateless teacher and grader the app calls. This removes the "Claude can't remember past chats" problem from your original prompt.

## Learning principles

Every feature should make you recall or explain more. If it doesn't, it's decoration.

| Principle | What it means | How the app uses it |
| --- | --- | --- |
| Retrieval practice | Testing yourself beats rereading | Brain dump, quiz and explain are the core loop; the dump is required before the card unlocks |
| Spaced repetition | Reviews at growing intervals | Day 1/3/7/14/30/60 by default, adaptive per question, FSRS later |
| Generation effect | Writing an answer beats recognizing it | Free-text answers, not multiple choice |
| Chunking | Small pieces prevent overload | Lessons in 300-400 word chunks with a "Ready for next?" gate |
| Self-explanation | Explaining builds understanding | Teach-back (Explain mode) graded on Claim, Why, Example, Limit, So what; Claude then asks 1-2 follow-up questions about the gaps (protégé effect) |
| Pretesting | Guessing first makes answers stick | 2-3 questions before the lesson starts |
| Interleaving | Mixing topics improves retention | Daily review mixes questions from several topics |
| Calibration | Knowing what you know | Confidence rating (1-3) before each answer; calibration chart over time |
| Hypercorrection | Confident mistakes are corrected best | A wrong answer given with confidence 3 is flagged, the correct answer shown clearly, and the question re-asked sooner |
| Elaboration | Linking new ideas to old ones | "Connects to" on each card, related-topic links, synthesis prompts |
| Sleep consolidation | Memory is stabilized during sleep | Optional bedtime review of today's topic and a recall check the next morning |
| Critical thinking | Reasoning skills improve with structured practice | Think deeper questions; weekly drill: pre-mortem, argument map, steelman, bias spotting |
| Try first, then hint | Tools that think for you weaken retention | You always answer, guess or attempt before Claude explains; hints are opt-in and come after an attempt |

## Research-backed feature map

The features come from learning science and cognitive psychology, grouped by strength of evidence. Build the strongest first.

| Tier | Feature | Evidence | Where it lives |
| --- | --- | --- | --- |
| 1 | Spaced repetition | Ebbinghaus; Cepeda et al., 2006 | Phase 3 step ladder, FSRS later |
| 1 | Active recall, "answer first, then reveal" | Testing effect (Roediger & Karpicke, 2006) | Brain dump, quiz, reviews; the card stays locked until the dump |
| 1 | Interleaving | Rohrer; Bjork | Mixed daily reviews (Phase 3) |
| 1 | Self-explanation and "why" questions | Dunlosky et al., 2013 | "Why" recall questions; teach-back |
| 1 | Teach-back (Feynman technique) | Generation and protégé effects | Explain mode with follow-up questions (Phase 2) |
| 1 | Confidence ratings and calibration | Metacognition research; hypercorrection effect | Confidence 1-3 (Phase 2), confident misses re-asked sooner (Phase 3), calibration chart (V2) |
| 2 | Sleep-aware scheduling | Diekelmann & Born, 2010; Walker | Bedtime review and morning check (V2) |
| 2 | Pretesting | Kornell et al. | Before the lesson (Phase 1, still to build) |
| 2 | Method of loci and visual mnemonics | Dresler et al., 2017 | Mnemonic and memory-palace helper for hard questions (Later) |
| 2 | Argument mapping | van Gelder; Harrell | Weekly drill (V2) |
| 2 | Consider-the-opposite and steelmanning | Lord et al. | Devil's advocate on Think deeper answers (V2) |
| 2 | Calibrated forecasting | Tetlock; Brier scores | Predictions journal (Later) |
| 2 | Bias spotting | Modest transfer, so tie it to your own decisions | Weekly drill plus a decision journal (V2) |
| 2 | Pre-mortems | Gary Klein | Weekly drill (V2) |
| 3 | Exercise prompts | Erickson et al., 2011; modest effects | Optional nudge (Later) |
| 3 | Focus sessions | Moderate evidence, mixed study quality | Optional focus timer before a session (Later) |
| 3 | Daily free-recall journal | Retrieval + generation + metacognition | "What did I learn today?" (V2) |
| 3 | Light gamification | Helps adherence | Streaks that reward recall quality, not volume (V2 dashboard) |

**Deliberately not building**

- Generic "brain training" games (n-back, puzzles): gains rarely transfer (Melby-Lervåg & Hulme).
- Learning styles (visual vs. auditory learners): largely debunked.
- AI that does the thinking for you: cognitive offloading weakens retention. Claude asks and guides; you attempt first, and hints come after (see "Try first, then hint").

## What to start with

Start with the full loop for one topic: create, learn, recall, save, review. A plain app that makes you recall on schedule beats a pretty one that doesn't.

**MVP (build first, about 5-6 weeks part-time)**

- [x] Simple password lock on the deployed app (one password in an environment variable) so strangers can't use your API key or see your notes
- [x] Create a topic: title, your questions, level, tags
- [x] Research with web search, with sources saved
- [x] Learn from your own material: paste notes, an article or a transcript instead of web research; doubtful statements are flagged (pulled forward from V2)
- [x] Chunked lesson with "Ready for next?"
- [ ] Pretest: 2-3 guesses before the lesson
- [x] Brain dump with feedback (got right, missed, got wrong)
- [x] Topic Card generated and saved, including recall questions with key points
- [x] Think deeper: 5-6 open critical-thinking questions per topic with things to consider (added)
- [x] Delete a topic (added)
- [x] Quiz: one question at a time, confidence 1-3, score out of 5, re-ask misses at the end
- [ ] Teach-back (Explain mode) with the Claim/Why/Example/Limit/So what feedback and 1-2 follow-up questions on the gaps
- [ ] Per-question review schedule and a "Today" screen; confident misses come back sooner
- [ ] Library: topic pages, tags, and search by keyword and by meaning (an embedding saved with each card)
- [ ] Simple suggestions: "More like this" and "Try something new" (version 1, described below)

**Version 2 (after you've used the MVP for 2-3 weeks)**

- Weekly critical-thinking drill, rotating: pre-mortem, argument map (claim, reasons, evidence, objections, rebuttals), steelman, bias spotting; Claude critiques your work
- Think deeper answers: write an answer, get feedback, then Claude argues the other side (consider-the-opposite)
- Decision journal: log real decisions; bias-spotting drills and pre-mortems use them
- Daily free-recall journal: "What did I learn today?" written without notes, compared with your cards
- Sleep-aware reviews: optional bedtime review of today's topic, recall check the next morning
- Dashboard: streak, retention per topic, weak spots, calibration chart (over- and underconfidence), review calendar
- Smarter suggestions using the stored embeddings and your scores
- Voice input for dumps and explanations
- Constraint drills: one sentence, 60 seconds, explain to a 12-year-old, to a skeptic
- Interleaved reviews and a daily review cap
- Simpler and Deeper buttons on lesson chunks
- Markdown export

**Later**

- FSRS scheduling, leech detection, mistake journal
- Mnemonics and a guided memory-palace builder for questions you keep missing
- Predictions journal: forecasts with probabilities, scored with Brier scores when they resolve
- Topic map (knowledge graph), synthesis prompts
- Debate mode, clarity metrics over time, phrase bank
- Optional wellbeing nudges: a short focus timer before sessions, an exercise reminder (weaker evidence, keep light)
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
3. **Research or your material:** Claude searches the web and builds the lesson (sources shown), or builds it from the notes, article or transcript you pasted, flagging doubtful statements in a "Worth double-checking" part.
4. **Lesson:** answers to your questions plus up to 3 "Suggested" questions, in 300-400 word chunks. "Ready for next?" between chunks. Simpler and Deeper buttons on each chunk.
5. **Brain dump:** the lesson is hidden. Write everything you remember. Get feedback: right, missed, wrong.
6. **Topic Card:** unlocks after the dump. Read it once.
7. **Quiz:** recall questions one at a time, confidence 1-3 before answering, score out of 5, misses re-asked at the end. A confident miss is flagged and shown clearly.
8. **Teach-back (optional):** explain the whole topic as if to a learner. Get structured feedback, a tighter version, and 1-2 follow-up questions about the gaps; answer them.
9. **Think deeper (optional):** open questions on assumptions, evidence, counterarguments, implications, perspectives and transfer. Think first, then open the hints. (V2: write an answer, get feedback, and Claude argues the other side.)
10. **Finish:** rate interest 1-3, confirm tags, see your next review date.

### Review flow

1. Home shows "N questions due" across topics.
2. Start review: questions come one at a time, mixed across topics.
3. Each answer is graded against key points; the schedule updates.
4. End screen: score, weak spots, next review date.

### Screens

| Screen | Purpose | Phase |
| --- | --- | --- |
| Today (home) | Reviews due, continue unfinished topic, suggestions | MVP |
| New topic | Title, research or your own material, questions, level, tags | MVP |
| Learning session | Pretest, lesson chunks, dump, card, quiz, teach-back, think deeper | MVP |
| Review session | Mixed due questions | MVP |
| Library | Browse and search topics, filter by tag and mastery | MVP |
| Topic page | Card, notes, history, test me now | MVP |
| Discover | Suggestions in four modes, topic inbox | MVP (simple), V2 (smart) |
| Weekly drill | Pre-mortem, argument map, steelman, bias spotting, with Claude's critique | V2 |
| Journal | Daily "What did I learn today?" recall, decision log | V2 |
| Dashboard | Stats, progress, calibration | V2 |
| Settings | Daily cap, reminders, bedtime review, export, interests | V2 |

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
9. **Try first, then hint.** Claude asks and guides rather than answers. Every exercise takes your attempt before showing feedback, model answers or hints.

**Embeddings:** Anthropic doesn't offer an embeddings model, so use Voyage AI or Supabase's built-in model (runs in a Supabase Edge Function, no extra account). Vectors are stored in Postgres with the pgvector extension, so there's no separate vector database. Cost is a fraction of a cent per topic.

**Request path:** browser → Next.js server route → loads data from Supabase → calls Claude → validates JSON → saves to Supabase → returns to the page.

## Data model

These tables cover the MVP, V2 and later. Every table also has `id` and `created_at`; no `user_id` is needed. Keep the Supabase secret key on the server only, and leave row-level security on with no public policies so nobody can read the tables from outside.

| Table | Key fields | Phase |
| --- | --- | --- |
| settings | one row: interests\[\], daily\_review\_cap, exploration\_ratio | MVP |
| topics | title, level, status (inbox, learning, learned), interest\_rating, mastery\_level, researched\_at, source\_text (your pasted material) | MVP |
| pretest\_answers | topic\_id, position, question, answer | MVP |
| critical\_questions | topic\_id, position, text, kind (assumptions, evidence, counterargument, implications, perspectives, transfer), considerations\[\] | MVP |
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
| critical\_answers | critical\_question\_id, answer, feedback (json), counterargument | V2 |
| drills | type (pre\_mortem, argument\_map, steelman, bias\_spotting), topic\_id or decision\_id, input (json), feedback (json) | V2 |
| journal\_entries | date, kind (daily\_recall, decision), text, feedback (json) | V2 |
| predictions | claim, probability, resolve\_by, outcome, brier\_score | Later |

**V2 additions:** a `mistake_cause` column on `attempts`, `follow_ups` (json) on `explanations` for teach-back, and a full-text `tsvector` index across cards, notes and answers (this one is cheap enough to add in the MVP). A confident miss needs no new column: it's an attempt with confidence 3 and a score of 0-2.

## AI pipeline

A small set of Claude calls runs the whole app. Each one has its own short system prompt, a fixed input, and a JSON output schema.

| Call | When | Input | Output (JSON) | Model tier |
| --- | --- | --- | --- | --- |
| research\_and\_lesson | New topic | Title, your questions, level | Answers, up to 3 suggested questions, lesson chunks, sources | Strong + web search |
| lesson\_from\_material | New topic with pasted material | Your material, questions, level | Same as above, plus doubtful statements (shown as a "Worth double-checking" chunk) | Strong |
| pretest | Before lesson | Title, level | 2-3 questions | Small |
| build\_card | After lesson | Lesson, answers | Topic Card, 10-15 recall questions with key points, 3-5 tags | Strong |
| build\_critical | After the card | Card, lesson | 5-6 Think deeper questions with kind and things to consider | Strong |
| grade\_dump | After brain dump | Card + key points, your dump | right\[\], missed\[\], wrong\[\], short summary | Strong |
| grade\_answer | Each quiz or review answer | Question, key points, your answer | score 0-5, points hit, points missed, feedback, mistake cause | Small |
| grade\_explain | Teach-back | Card, your explanation, drill type | Claim/Why/Example/Limit/So what notes, vague parts, tighter version, score, 1-2 follow-up questions | Strong |
| critique\_critical (V2) | Think deeper answer | Question, considerations, your answer | Strengths, gaps, the strongest counterargument | Strong |
| grade\_drill (V2) | Weekly drill, journal | Drill type, your work, related cards | Feedback specific to the drill (missed failure modes, weak links in the argument, biases spotted or missed) | Strong |
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
| Score 0-2 with confidence 3 (confident miss) | Back to step 1, shown with the correct answer side by side with yours, re-asked at the end of the session and again the next day (hypercorrection) |

**Daily cap:** show at most 20 questions a day (setting). Overflow moves to the next days, oldest first, so a missed week doesn't create an 80-question wall.

**Interleaving:** when building today's review, mix topics instead of grouping them.

**Sleep-aware reviews (V2):** after you learn a topic, offer an optional 5-minute bedtime review of its hardest questions, then a short recall check the next morning before the normal schedule takes over. Both are opt-in in settings.

**Mastery level per topic:** Seen (lesson done) → Recalled (quiz average 3+) → Explained (explain score 4+) → Applied (you logged a real use).

**V2: switch to FSRS** with the `ts-fsrs` library. Map scores to its ratings (0-2 = Again, 3 = Hard, 4 = Good, 5 = Easy). It adapts intervals to how fast you forget each question. Keep the step ladder as a fallback until you trust it.

**Leech rule (later):** 4+ failures on one question triggers "rewrite, split, or add a mnemonic."

## Roadmap

The MVP takes about 6 weeks part-time (10-15 hours a week), then 2-3 weeks of real use before building V2. Each phase ends with a "done when" test.

### Phase 0: Setup and validation (days 1-3)

- [x] Create accounts: GitHub, Supabase, Vercel, Anthropic Console (API key, spending limit), Voyage AI if you won't use Supabase's built-in embedding model
- [x] Create the Next.js + TypeScript project with Tailwind and shadcn/ui; deploy a blank page
- [ ] Learn 2-3 topics using your coach prompt in Claude chat; note what annoys you
- [x] Write the JSON schemas for the lesson, card and grading outputs

**Done when:** a blank app is live on Vercel and you have tested your prompts by hand.

### Phase 1: Learn flow (weeks 1-2)

- [x] MVP tables in Supabase and the password lock
- [x] New topic form: title, questions, level, tags
- [x] research\_and\_lesson call with web search; save chunks and sources
- [x] lesson\_from\_material: build the lesson from pasted notes, an article or a transcript (added)
- [x] Lesson screen with chunks and "Ready for next?"
- [ ] Simpler and Deeper buttons on chunks (moved to V2)
- [ ] Pretest before the lesson
- [x] build\_card call; save the card, recall questions, key points and tags
- [x] build\_critical: Think deeper questions after the card (added)
- [x] Delete a topic (added)

**Done when:** you can create a topic, read the lesson and see a saved Topic Card. **Done**, except the pretest.

### Phase 2: Recall and grading (week 3)

- [x] Brain dump screen and grade\_dump; the card unlocks after the dump
- [x] Quiz screen: one question, confidence 1-3, grade\_answer, re-ask misses; confident misses flagged
- [ ] Teach-back screen and grade\_explain, with 1-2 follow-up questions on the gaps
- [ ] Save every attempt
- [ ] Test the grader on 20 of your own sample answers

**Done when:** you finish a full session and the scores feel fair.

### Phase 3: Scheduling and Today (week 4)

- [ ] review\_state per question with the step ladder, including the confident-miss rule
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

Critical thinking and metacognition first, since they build on what you'll already have:

- [ ] Weekly critical-thinking drill: pre-mortem, argument map, steelman, bias spotting, with grade\_drill feedback
- [ ] Think deeper answers with critique\_critical feedback and Claude's strongest counterargument
- [ ] Decision journal; bias-spotting drills and pre-mortems draw on it
- [ ] Daily free-recall journal ("What did I learn today?")
- [ ] Dashboard: streak, retention per topic and tag, weak spots, calibration chart (over- and underconfidence), review calendar
- [ ] Sleep-aware reviews: bedtime review and next-morning check

Then the rest:

- [ ] Voice input for dumps and explanations
- [ ] Constraint drills in teach-back
- [ ] Simpler and Deeper buttons on lesson chunks
- [ ] Smarter suggestions from the stored embeddings, with the exploration slider
- [ ] Markdown export; daily reminder email

### Phase 6: Later

- [ ] FSRS, leech detection, mistake journal
- [ ] Mnemonics and a memory-palace builder for leeches
- [ ] Predictions journal with Brier scores
- [ ] Topic map and weekly synthesis prompts
- [ ] Debate mode, clarity metrics, phrase bank
- [ ] Optional focus timer and exercise nudge
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
| AI does the thinking for you | Try first, then hint: every exercise takes your attempt before feedback or model answers |
| Wrong facts in your own material | "Worth double-checking" part in the lesson; check flagged statements before drilling them |
| Features without evidence creep in | Check new ideas against the research-backed feature map; no brain-training games, no learning styles |
| Lock-in | Markdown export so your knowledge is always yours |

### Working with AI coding tools

- Give the coding assistant this plan plus one phase at a time, not the whole roadmap.
- Ask for the database migration first, then server routes, then screens.
- Commit to Git after every working step so you can roll back.

### Moving this plan to another computer

- Download this doc as Markdown, Word or PDF, or open its link on the other computer.
- Keep a copy as `PLAN.md` in your project repository so it travels with the code and your coding tools can read it.
- Tick off the checkboxes in the roadmap as you go.
