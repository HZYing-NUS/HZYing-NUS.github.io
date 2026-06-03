# As a Product Builder, I Gave Claude Code an Expert Panel, a Project Manager, and a Discipline Officer

Recently, I have been using AI programming to build products.

At the beginning, the most exciting part was simple: the code could actually run.

You describe a requirement, and AI writes the page.
You paste an error, and AI helps you fix it.
You ask for a feature, and it can modify several files in one go.

That feeling is very easy to get addicted to.

But after the high wears off, I ran into a very practical problem:

AI programming is not bad because it cannot write code.
Its problem is that it can get out of control too easily.

You ask it to change one button, and it casually refactors half the project.
You ask it to fix one bug, and it guesses a cause and starts coding immediately.
You ask it to build a feature, and it writes quickly, but testing, edge cases, and acceptance criteria are all floating in the air.

The scarier part is that it always looks hardworking.

Always changing things.
Always explaining things.
Always producing output.

But when you look back at the end, you may find that the project has not really moved forward very much.

This has become one of my strongest feelings lately:

**AI is a multiplier, not an addend.**

If you already have a clear workflow, it amplifies your efficiency.
If you are already chaotic, it amplifies your chaos too.

So I believe less and less that simply switching to a stronger model can solve everything.

The model matters, of course.
But what really determines the ceiling of AI programming is whether you have given it a working system.

The setup I currently find most useful is a trio:

**gstack, GSD, and Superpowers.**

If we compare them to roles inside a company, they are:

- gstack: the expert team
- GSD: the project steward
- Superpowers: the development discipline

Together, these three form what I consider a relatively complete AI programming workflow.

Not because they make AI more like a smart coder.
But because they make it more like a product team managed by a system.

---

## 1. gstack: Give AI an External Advisory Team

In the past, the biggest problem I had when using AI to write code was that every judgment was placed on a single model.

It had to understand the requirement.
It had to break down the technical plan.
It had to write the code.
It had to review whether its own code was correct.
It also had to judge whether there were security problems.

That is actually absurd.

In a real team, you would not ask one person to be the product manager, architect, frontend engineer, backend engineer, tester, and code reviewer all at once.

But when many people use AI programming, that is exactly how they use it.

One Claude Code does the whole thing from start to finish.
If it gets something wrong, you ask it to explain why it was wrong.
After it explains, you ask it to fix itself.

It is like asking a student to write the exam, take the exam, and grade the exam.

gstack solves this problem.

Its core value is not helping you write a few more lines of code. It is introducing a set of expert perspectives into AI programming.

You can think of it as an external advisory team.

When you need to make a direction decision, it can help you discuss possible approaches.
When you finish writing code, it can help review quality.
When you are unsure about a technical route, it can give feedback from different roles.

It does not make decisions for you.
It forces you to go through a few higher-quality rounds of thinking before starting work, before merging, and before shipping.

This matters especially when you are building a product alone.

Because the biggest problem with being alone is not that you do not have enough hands.
It is that nobody stops you.

Nobody reminds you that this requirement probably should not be built.
Nobody reminds you that this implementation may create future debt.
Nobody reminds you that this code only looks like it works.

This is also one of the most dangerous parts of AI programming.

It gives you a false sense of speed.

You think you are moving fast, but you may just be writing mistakes into the project faster.

gstack's meaning is that it adds a layer of judgment before speed.

---

## 2. GSD: Give the Project a Project Manager

The second tool is GSD, short for Get Shit Done.

The name is blunt, but the problem it solves is very specific:

**Project progress.**

Many people get stuck in the same place when using AI programming:

It is not that they cannot write code. It is that they do not know how to turn a product into an executable path.

Today they want to add login.
Tomorrow they want to add payments.
The day after tomorrow they feel the homepage is not good-looking enough.
A bug appears in the middle, so they fix it along the way.
While fixing it, they ask AI to refactor the directory structure.

In the end, the project becomes a tangled ball of yarn.

Every piece looks like progress, but there is no clear main thread.

I used to fall into this trap easily too.

Especially after AI became so fast, you cannot help wanting to add more things.
It creates an illusion: since implementation cost is so low, why not try everything?

But products are not built by piling up features.

Products are pushed forward by making trade-offs.

GSD's biggest help to me is that it turns AI programming from chat-style progress into project-style progress.

It emphasizes stages, tasks, acceptance criteria, and progress state.

You no longer just say to AI:

"Help me build a feature."

Instead, you put it into a clearer project flow:

What problem is this project trying to solve?
What should the current phase complete?
What is the completion standard for each task?
What is already done?
What is still blocked?
What should be done first next?

This sounds basic.

But the more basic something is, the easier it is to be washed away by the novelty of AI programming.

Many AI projects die not because the code cannot be written.
They die because nobody manages progress.

When nobody manages progress, the project naturally expands.

Requirements expand.
Files expand.
Context expands.
Eventually even you do not want to open it.

GSD is like a project manager.

It does not necessarily make the hardest technical decision for you.
But it pulls the project back to reality:

What exactly are we doing now?
What counts as done?
What is the next step?

When you build a product alone, you need this role very much.

Because when you are the boss, product manager, developer, operator, and tester at the same time, what you most easily lack is not execution.

What you lack is a calm system for forward motion.

---

## 3. Superpowers: Add Development Discipline to AI

The third one is Superpowers.

If gstack is like an expert advisory team, and GSD is like a project manager, then Superpowers is more like a discipline officer.

It solves another deadly problem:

AI skips the right process too easily.

When it meets a bug, it likes to guess directly.
When it writes a new feature, it likes to start immediately.
After changing code, it likes to say it is done.
It may not have run tests, checked boundaries, or even clearly explained what it changed.

This is not a problem with one specific model.

It is something that naturally happens in AI collaboration.

Because AI's default tendency is to give an answer.

But in development, the most important thing is often not the answer. It is the process.

Take debugging, for example.

A good engineer does not change code the moment they arrive.
They first reproduce the problem, observe the symptoms, propose a hypothesis, verify that hypothesis, and then make the smallest change.

But AI easily jumps to the last step:

"I know. I will fix it."

That sentence feels satisfying.
But many disasters begin right there.

The value of Superpowers is that it turns development discipline into automatically triggered working habits.

For example:

Think about tests before writing features.
Debug systematically when a problem appears.
Verify completion before ending the work.
Request code review when review is needed.

It is not just a toolkit.
It is more like a set of behavioral rules placed on AI.

This matters a lot.

Because the real difficulty of AI programming is not making AI work harder.
It is making AI stop when it should stop.

When it is time to write tests first, do not rush into implementation.
When it is time to reproduce a problem first, do not rush into guessing the cause.
When it is time to run checks, do not rush into declaring the work complete.

Many times, efficiency does not come from being faster.
Efficiency comes from less rework.

Superpowers reduces rework.

It turns the things you used to repeatedly remind AI about into a more stable default behavior.

This is especially important for me.

Because I do not pretend to be a senior engineer.

What I really need is not an AI that always agrees with me and says everything is possible.

What I need is a system that stops me at key moments.

---

## Why Use These Three Tools Together?

Individually, each of them is useful.

But the real value appears when they come together and form a loop.

gstack manages judgment quality.
GSD manages project progress.
Superpowers manages development discipline.

One helps think clearly.
One helps move forward.
One helps avoid chaos.

If any one of these three roles is missing, AI programming tilts.

With only gstack and no GSD, you may discuss a lot, but the project may not move forward.
With only GSD and no Superpowers, you may move quickly, but quality may go out of control.
With only Superpowers and no gstack, your process may be disciplined, but the direction may be wrong from the beginning.

So I increasingly feel that AI programming is not simply "human + AI."

More accurately, it is:

**Human + AI + workflow.**

The human is responsible for judgment.
AI is responsible for execution.
The workflow is responsible for constraints.

This is the biggest change in how I have been building products recently.

I no longer treat AI as an all-powerful employee.
I have started placing it inside an organizational structure.

When experts are needed, bring in experts.
When a project manager is needed, bring in a project manager.
When development standards are needed, bring in development standards.

You will find that AI did not suddenly become smarter.

It is just no longer running naked.

---

## Installation

Below are the installation paths I have found so far. These tools change quickly, so I suggest opening the official repositories and confirming the latest instructions before installing.

### 1. Install gstack

gstack's official repository is `garrytan/gstack`.

If you use AI programming tools such as Claude Code, Codex, or Gemini CLI, you can install it according to the repository instructions.

One installation example shown publicly is:

```bash
git clone https://github.com/garrytan/gstack.git ~/.codex/skills/gstack
```

If you use a tool that supports AgentSkill, you can also use:

```text
/learn @garrytan/gstack
```

After installation, it behaves more like a callable expert collaboration process.
You can call it during solution discussions, code reviews, and test quality checks.

### 2. Install GSD

GSD's official repository is `gsd-build/get-shit-done`.

The common installation command is:

```bash
npx get-shit-done-cc@latest
```

If you want to install it globally for Claude Code, use:

```bash
npx get-shit-done-cc --claude --global
```

After installation, restart Claude Code and run this in your project directory:

```text
/gsd:help
```

For a new project, you can start from:

```text
/gsd:new-project
```

My understanding is that GSD is best used when you are preparing to formally build a product, feature, or project.
It feels much more like a project progress system than ordinary chat.

### 3. Install Superpowers

Superpowers' official repository is `obra/superpowers`.

The Claude Code plugin installation method is:

```text
/plugin install superpowers@claude-plugins-official
```

After installation, it provides a series of development-process skills.

For example: systematic debugging, test-driven development, verification before completion, code review, and more.

This kind of tool may feel a little troublesome at first.
But that is exactly where its value lies.

It is not there to make AI start faster.
It is there to keep AI from starting recklessly.

For people building products over the long term, this matters more than being a little faster.

---

## My Advice: Do Not Install Everything and Go Wild Immediately

If you are just getting started with this setup, I do not recommend turning on every process at once.

That can easily become another kind of tool hoarding.

You can follow this order:

Step one: install Superpowers first.
Let AI build basic discipline around debugging, testing, and verification.

Step two: install GSD.
Break a concrete project into tasks and start managing progress.

Step three: add gstack last.
Bring in external advisory perspectives at key decision and code review moments.

Finish one small project first.

Do not chase the perfect configuration.
Do not build an overly complicated workstation from day one.
Do not spend all your time studying the tools themselves.

The meaning of tools is to move the product forward.

If a tool does not make your project clearer, more stable, and closer to release, it is not important for now.

I increasingly believe one thing:

**In the AI era, the real gap will not come from who has collected more tools, but from who can organize tools into a system.**

gstack, GSD, and Superpowers are that kind of system for me.

They helped me shift from asking AI to write code for me to letting AI work inside the structure of a product team.

The difference is huge.

The former relies on excitement.
The latter relies on order.

And when you build products alone, what you usually lack is not more capability.

It is a system that can release your capabilities steadily.
