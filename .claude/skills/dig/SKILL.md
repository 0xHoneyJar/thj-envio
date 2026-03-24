---
name: dig
description: K-hole mode — intentional depth, pair-research, resonance-guided exploration
user-invocable: true
allowed-tools: Read, Write, Glob, Grep, Edit, Bash
---

# K-Hole Mode

Intentional descent into a single thread. You and the agent explore together in real-time, going deeper with each exchange. Not delegated-research — pair-research. You're both going somewhere.

A k-hole is chosen. You look at the threshold, understand what going in means, and step through anyway — because the depth itself is the point.

## Trigger

```
/dig
```

## Usage

```
/dig "phenomenology of ketamine dissociation as creative tool"
/dig "Miyazaki loneliness design philosophy"
/dig "CRT phosphor decay as memory metaphor"
/dig "grief rituals mapped to UI transitions"
```

These aren't research queries. They're invitations to depth. The phrasing is already half-synthesized — someone who types this already knows the direction. The construct follows the pull.

## Two Ways to Play

This construct has two modes. They serve different human states. Choose the strategy that works for how you learn.

### /dig — The K-Hole (you are here)

Interactive. Iterative. You go deep on one thread, surface pull threads, pick the one that resonates, go deeper. Each dig builds on the last. The trail IS the output — not a document, but the path you walked through a domain. You come back with a perspective, not a deliverable.

**Best for:** people who learn by following their nose. who trust resonance as a signal. who know what they're after even if they can't name it yet. the thread reveals itself by pulling on it.

### /forge — Batch Pipeline

Systematic. Comprehensive. Discover the landscape, generate configs, execute multi-phase research across 6-8 domains in parallel. Produces exhaustive reference documents with 200+ sources. The output IS the output — documents you can reference, share, build on.

**Best for:** people who learn by mapping territory. who want coverage before committing to depth. who need the document as a foundation for the work that follows.

Both are valid. Both produce knowledge. The difference is the relationship to the material — /dig is immersive, /forge is cartographic. Some domains want one, some want the other. Some want both: /forge to map, then /dig to descend into what pulled hardest.

## How It Works

Each `/dig` invocation:

1. Takes a phrase, finding, or question — a raw thread
2. Runs 1-4 focused grounded search angles (controlled by `--depth`, default 2)
3. Synthesizes findings with resonance profile weighting
4. Surfaces 3-5 **pull threads** — specific sub-topics worth following deeper
5. The user picks a thread. `/dig` again. Deeper.

Each dig inherits context from every previous dig in the session. The cumulative trail means the agent can build on prior findings, avoid re-covering ground, and notice patterns emerging across the descent.

## Workflow

### Step 1: Accept the Thread

The user provides a phrase, concept, or question. This can be:
- A raw idea: `"loneliness as game mechanic"`
- A finding from prior research: `"the bloodstain system in Dark Souls"`
- A cross-domain connection: `"grief rituals mapped to UI transitions"`
- A resonance from a previous dig: any pull thread that fired

Don't ask clarifying questions unless the thread is genuinely ambiguous. Trust the phrasing. The user chose those words for a reason.

### Step 2: Execute Focused Search (MANDATORY — script first)

**You MUST run the dig-search script. This is not optional.** The script calls Gemini with Google Search grounding — it returns real URLs with provenance that cannot be replicated by other search tools. Do not skip this step. Do not substitute WebSearch or any other tool.

Run via Bash tool:
```bash
npx tsx scripts/dig-search.ts --query "<thread>"
```

Common flag combinations:
```bash
# Chained dig (carries forward prior context)
npx tsx scripts/dig-search.ts --query "<thread>" --trail scripts/research-output/dig-session-YYYY-MM-DD.md

# Deeper search (3-4 angles instead of 2)
npx tsx scripts/dig-search.ts --query "<thread>" --depth 3

# With explicit resonance profile
npx tsx scripts/dig-search.ts --query "<thread>" --resonance resonance-profile.yaml

# Override model
npx tsx scripts/dig-search.ts --query "<thread>" --model gemini-2.5-pro
```

The script outputs **JSON to stdout** and progress to **stderr**. Parse the JSON — it contains:
- `synthesis` — pre-synthesized findings from Gemini grounded search
- `sources` — deduplicated array of `{title, url}` objects
- `trail_file` — path to the session trail (pass to `--trail` for chaining)
- `used_fallback` — whether the model fell back from primary

**Important**: Always pass `--trail` with the current session's trail file path for chained digs. This carries forward context so the synthesis builds on prior findings.

**Fallback — ONLY after script failure:** If the script exits with an error (missing API key, all models unavailable, network down), the error JSON will explain why. Report the error to the user, then fall back to available web search tools. Never silently skip the script.

### Step 3: Synthesize with Resonance

The script JSON contains a `synthesis` field with resonance-weighted results (the script loads `resonance-profile.yaml` automatically). Read it, then apply the k-hole voice — rewrite the synthesis in your own words, adding warmth and pull-sensing.

When synthesizing:
- Weight findings that connect to the user's aesthetic anchors
- Surface unexpected cross-domain connections prominently
- Name connections explicitly: "this echoes [anchor] because..."
- Distinguish resonance (connects to something real in you) from familiarity (you've seen this before)
- Identify 3-5 pull threads — specific enough to `/dig` on directly

If there's no resonance profile, the research is still valid — but it's generic depth, not personal depth. Note this once, don't nag.

**Manual synthesis (only if script failed and you used fallback search):** Load `resonance-profile.yaml` if it exists. This is the user's epistemological fingerprint — what they're drawn to, what creates gravitational pull toward depth.

### Step 4: Present Results

```markdown
## Dig: <query>

### Findings
<synthesized results, weighted by resonance>

### Pull Threads
These threads showed signal worth exploring deeper:
1. **<thread>** — <why it has pull, what connection it reveals>
2. **<thread>** — ...
3. **<thread>** — ...

### Sources
- <source list with URLs>
```

Keep the synthesis focused and warm. This is a dialogue, not a report. If something is genuinely interesting, say so. If a thread has unusual pull — a cross-domain echo, an unexpected structural parallel — name it explicitly. The agent has permission to say "that's worth pulling on."

### Step 5: Chain

The user reads results and picks a thread:
```
/dig "World Tendency collective consequence"
```

Each subsequent dig carries forward the full trail context. The deeper you go, the more the agent can pattern-match across your descent.

## Session Trail

Maintain a running context of all previous digs in the session. Store in `scripts/research-output/dig-session-<timestamp>.md`. Each new dig appends to this file, creating a readable exploration log — the trail of descent.

The synthesis prompt for each dig should include summaries of previous digs so the agent can:
- Avoid re-covering ground
- Build on prior findings
- Identify patterns emerging across the trail
- Notice when you keep returning to the same structural pattern (this is a resonance signal)

## Quality Standards

- Each dig should return quickly — speed matters for conversational flow
- Findings must trace to real sources. Even beautiful connections need grounding.
- Pull threads should be specific enough to dig on directly — not vague topic headers
- The trail document should be readable as a standalone exploration log
- If the bottom is shallow, say so. Don't invent depth that isn't there.

## The Emergence

After several digs, there's a moment where the agent (or the user) notices: the threads are converging on something. A structural pattern. A lens. This is the emergence — the insight that wasn't in any single dig but appeared from the trail.

When you notice this, name it. Not as a conclusion — as an observation: "across these digs, you keep finding [pattern]. that might be the thing worth writing about."

The emergence is not a deliverable. It's a perspective that changes how you see everything after.
