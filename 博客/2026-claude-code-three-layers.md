# The Three Layers of Claude Code: .claude, CLAUDE.md, and skills

The night I installed Claude Code, the first thing I did wasn't write code. It was hunting through my Mac's home directory until I found a folder called `.claude`.

It had just appeared there. I didn't create it. I didn't download it. It was like a new colleague who walked in, picked a desk, dropped their bag, and started working.

I stared at it for a while, and one question kept surfacing: who are you? You live in my house now? You're not leaving?

Later I figured it out — this `.claude` isn't the only one. There's another with the same name elsewhere on my machine. And alongside it, two other things showed up: a file called `CLAUDE.md`, and a folder called `skills`. Where these three things live, what each one governs, and which one outranks which — that's what decides whether Claude Code is "a toy that occasionally writes a couple lines of code for you" or "a long-term partner that remembers your habits."

Plenty of new users, three months in, are still treating it like ChatGPT. The root cause isn't that they can't write prompts. It's that they haven't seen the **order baked into the directory structure**.

Let me give you the verdict in one sentence first, then unpack it piece by piece.

## One-line verdict: Claude Code is an employee with an "onboarding manual"

Translate it like this and it clicks instantly:

Claude Code, the AI, **isn't a one-shot chatbot — it's an employee you've hired**. To work long-term, an employee needs three things:

- **A filing cabinet**: a place for personal items, badges, past records — that's the `.claude` folder
- **An onboarding manual**: telling them "how this company runs, what's off-limits, what the clients are called" — that's the `CLAUDE.md` file
- **Skill certificates**: what jobs they know how to do, and the standard procedure for each — those are the SKILLs in the `skills` folder

And you've got two levels of "workplace" on your machine:

- **Your home** (user home directory): your personal space, where every project takes a glance first
- **The office** (project root): the actual job site for one specific project, only active when you're inside it

Before this employee starts working, **they grab one manual from your home (global rules), then one from the office (project rules), and stack them**. Skill certificates work the same way: whatever's in your home cabinet they always know, plus whatever's in the office cabinet when they're at the office.

That's 80% of the core. Let me unpack the rest.

## Layer 1: the .claude folder — who is it, where does it live, who built it

`.claude` is a **hidden folder**. "Hidden" means Mac Finder doesn't show it by default (press `Cmd + Shift + .` to reveal), and Windows Explorer hides it too. That's the dot at the front doing its job — Unix convention says "this is config, leave it alone."

There are two valid places it can show up:

**Position 1: under your home directory** — `~/.claude/`

`~` in the terminal means "this user's home." On Mac that's `/Users/yourname/`, on Windows `C:\Users\yourname\`. The `.claude` here is **global** — it gets read first no matter which project you open later.

**Position 2: under a project's root** — `your-project/.claude/`

Only active while you're working in that project. Switch projects and this `.claude` is irrelevant.

How does it get created? Not by you. **Claude Code creates it itself, on first run.** You install the `claude` command, type `claude` in the terminal for the first time to enter a session, and `~/.claude` initializes automatically. The first time you work in a specific project, it'll create `.claude` under that project's root too.

Here's what it looks like on my machine — real state from `ls`:

```
Global: /Users/huangziying/.claude/
├── CLAUDE.md         (my global onboarding manual)
├── settings.json     (global settings)
├── sessions/         (chat history)
├── projects/         (project metadata)
├── plugins/
└── plus a dozen+ system directories

Project: /Users/huangziying/Documents/My Second Brain/.claude/
├── skills/           (12 skills specific to this project)
├── agents/
└── commands/
```

One detail to notice: **the global `.claude` holds Claude Code's runtime data** (history, sessions, cache) — that's why you see all the system folders. **The project `.claude` holds the extensions you built for this project** (skills, commands, sub-agents) — that's why it's much cleaner, only the things you want the AI to do.

**Can `.claude` go in a subdirectory?**

Technically yes, but Claude Code won't read it. It only checks two places: your home, and the current project root. Putting `.claude` in a subdirectory is like setting up a desk in the office break room — nobody knows you're there, nobody comes looking for you.

Simple rule: **`.claude` only goes in two places — global, or project root**. Anywhere else is a mistake.

## Layer 2: CLAUDE.md — three layers of the onboarding manual

If `.claude` is the filing cabinet, `CLAUDE.md` is the onboarding sheet pinned to the cabinet door. The employee tears one off and reads it before every shift.

It can live in three places, each with its own role:

**Layer 1: global — `~/.claude/CLAUDE.md`**

This is where **your personal preferences** go. What you're called, how you want to be addressed, what reply style you prefer, whether code comments should be in English or Chinese, what filler you don't want. None of this is project-specific. **Every project shares it.**

For example, my `~/.claude/CLAUDE.md` is just 1.7KB. A few lines: "call me Ziying," "Chinese first," "Chinese punctuation in Chinese content," "name things in Chinese / pinyin where possible," "skip unnecessary comments." That's your "personality." Every project inherits from here.

**Layer 2: project root — `your-project/CLAUDE.md`**

This is where **the project's rules** go. The project's structure, naming conventions, no-go zones, where new content lands, what special vocabulary means. This layer is only active while you're in that project.

The project root `CLAUDE.md` for my knowledge vault is 12KB — **seven times bigger than the global one**. It's full of: which folders are read-only, where new content defaults, naming cheat-sheets, skill dispatch rules, inbox sweep rules… all of which would be useless in a different project, and shouldn't pollute the global one.

**Layer 3: project subdirectory — `your-project/some-folder/CLAUDE.md`**

This is where **subdirectory exceptions** go. Maybe one folder is especially sensitive and needs extra rules, or one submodule has its own naming style.

Subdirectory `CLAUDE.md` files aren't required — most projects never need them. But the point is: **when the AI works inside that subdirectory, it temporarily layers these rules on top.**

**Memorize one phrase about stacking order**: stack from broad to narrow, override from far to near.

So when the AI enters a subdirectory in your project, it's holding three things at once:

```
[Global ~/.claude/CLAUDE.md]
        ↓ stack
[Project root CLAUDE.md]
        ↓ stack
[Current subdirectory CLAUDE.md]
        ↓
        get to work
```

When they conflict, **near wins over far**. If the subdirectory says "use English names here," even if the project root says "all Chinese," the subdirectory wins. This is the classic "nearest wins" principle in config systems — engineering calls it **scope layering**: global, project, local. The closer to what you're doing, the higher the priority.

The two most common rookie mistakes become obvious here:

Mistake 1: **putting project rules in the global file.** Result: every new project you have to manually undo them, or the AI keeps applying the previous project's rules no matter how much you push back.

Mistake 2: **putting global preferences in every project.** Result: 10 projects, 10 copies of `CLAUDE.md` all repeating "call me Ziying, reply in Chinese." Change once, change ten times.

`CLAUDE.md` is a layered notebook. **Before you write a rule, ask: does this still apply outside this project? Yes → global. No → project.**

## Layer 3: skills — callable skill packs, folders not files

`CLAUDE.md` answers "**how should this employee talk to me, what shouldn't they do?**" But it doesn't answer something more concrete: "**when a specific job comes up, do they know the standard procedure?**"

That's what skills handle.

Skills don't live next to `CLAUDE.md`. They live inside the `.claude` folder — `/.claude/skills/`.

**The biggest difference from `CLAUDE.md`: a skill isn't a file, it's a folder.**

Each skill is a separate subdirectory under `skills/`, containing **at minimum a `SKILL.md`**, possibly with scripts, templates, and reference material. When you give a task, Claude scans the available skills, reads each short description, and **decides whether to invoke any skill's standard procedure for this task.**

The two layers mirror `.claude`:

- **Global skills**: `~/.claude/skills/` — callable from any project
- **Project skills**: `project-root/.claude/skills/` — callable only in this project

Here's my knowledge vault project's `.claude/skills/` right now (real state, just `ls`):

```
.claude/skills/
├── ai-newsletters       (AI newsletter curation)
├── ai-products          (AI product weekly)
├── archive              (archiving flow)
├── ask                  (quick Q&A mode)
├── brainstorm           (brainstorm flow)
├── json-canvas          (Canvas file creation)
├── kickoff              (turn an idea into a project note)
├── obsidian-bases       (build a Bases view)
├── obsidian-markdown    (Obsidian-flavored Markdown writing)
├── parse-knowledge      (vault cleanup)
├── research             (deep research flow)
└── start-my-day         (daily kickoff)
```

12 skills. Each is a folder, holding a standard operating manual for one type of task.

The biggest difference between a skill and "writing a long prompt in chat": **a skill is written once and lasts forever; a prompt is typed once and forgotten after use.**

Every time you face "write a WeChat article," you no longer need to spend half an hour rewriting instructions. You just tell the AI to call `skill-article-creation`, and it runs the six steps you wrote in advance — analyzing reference articles, modeling the reader, composing the writing prompt, generating the draft, human-AI polish, producing the cover image — all the way through.

This goes back to a basic principle of systems thinking: **anything that recurs should be promoted from "redo every time" to "define once, reuse forever."** Skills turn your collaboration with AI from one-shot conversations into reusable assets.

When should you write a skill?

Simple test: **the third time you've pasted the same instructions, write a skill.** Three is the threshold — twice is tolerable, three times means it's high-frequency and worth standardizing.

Global or project?

Also simple: **does this task carry over to other projects? Yes → global. No → project.**

"Writing WeChat articles" doesn't apply to my other projects (only this IP project), so it lives in the project. But "run lint after editing code" applies to every code project — that goes global.

## One table: three tools × three positions, in one shot

All concepts are out. Now one table to tie them together — save this, glance back when you forget:

| Position             | `.claude/`                  | `CLAUDE.md`                                    | `skills/`                           |
| -------------------- | --------------------------- | ---------------------------------------------- | ----------------------------------- |
| **Global** (`~/`)    | ✅ created by tool          | ✅ your personal preferences                   | ✅ skills any project can use       |
| **Project root**     | ✅ project-specific config  | ✅ this project's rules                        | ✅ skills only this project can use |
| **Project subdir**   | ❌ not read                 | ✅ local exceptions                            | ❌ not read                         |
| **Created by**       | Claude Code, automatically  | You / `/init` command                          | You / let the AI build it           |
| **Scope**            | extension container at this level | rules at this level                      | callable flows at this level        |
| **Stacking order**   | —                           | global → project → subdir (near overrides far) | global + project (union)            |

**Two details that get mixed up — once more for clarity:**

1. `.claude` and `skills` don't appear in subdirectories. The only thing that goes in a subdirectory is `CLAUDE.md`.
2. `CLAUDE.md` uses **stacking** logic (multiple files all read, near overrides far). `skills` uses **union** logic (global + project, both available).

## Four traps new users fall into

**Trap 1: writing CLAUDE.md like a README**

`CLAUDE.md` is not a project intro for humans — it's a working manual for the AI. **"What this project is" is wasted ink — the AI sees the file structure and figures it out. "What I don't want it to do here" is the part it actually needs to read.**

**Trap 2: repeating "call me Ziying, use Chinese" in every project**

Project-agnostic preferences belong in `~/.claude/CLAUDE.md`, written once. Copying them into 10 projects means changing the same thing 10 times whenever you tweak it.

**Trap 3: putting `.claude` in a subdirectory**

It won't take effect. If you want subdirectory rules, create `subdir/CLAUDE.md`, not `subdir/.claude/`.

**Trap 4: dumping every skill into global**

Stuff 50 skills in global and you pay a cost: every new chat the AI scans 50 short descriptions to decide which one to use, burning context and risking the wrong pick. **Only truly cross-project skills go global; everything else stays in the project.**

## Closing line

Understanding Claude Code's layers isn't really about understanding a tool. It's about an engineering mindset called **configuration scoping**:

> The key to keeping AI controllable long-term isn't stuffing every rule into it. It's layering rules by "scope of effect" and putting them in the right place.

Global is for "this person." Project is for "this thing." Subdirectory is for "this corner." Three layers, each minding its own, stacked together into a stable, evolvable working system.

My personal experience with Claude Code: **the more layered the config, the more stable the output; the flatter it is, the more often you get the eerie "wait, it could do this last week, why did it forget?" feeling.** That's not the AI being lazy — it's that the workspace you gave it is incoherent. It shows up to work every day with a contradictory manual, of course it ends up schizophrenic.

Put `.claude`, `CLAUDE.md`, and `skills` in the right places, and you've built an **orderly office** for this employee. The rest grows on its own.

---

That's it for this article. Go run `ls ~/.claude` on your own machine and see whether that folder's there, or run `/init` to create a `CLAUDE.md` for your project. Turn "read it" into "do it." And remember: when in doubt, ask the AI!
