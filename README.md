# Aifferte: Automating the Inbox for Small Businesses

If you run a small business, your inbox has a familiar pattern.

Not chaos — repetition.

The same questions come back again and again:

- *“How much does it cost?”*  
- *“What’s your return policy?”*  
- *“Can I cancel my subscription?”*

Individually, they’re quick to answer. But together, they quietly take up a lot of time.

Aifferte is built to handle exactly that.

---

## What is Aifferte?

Aifferte is AI-powered email automation for small businesses.

Instead of manually replying to repetitive questions, Aifferte reads incoming emails, understands what they’re asking, and prepares a response based on your own knowledge.

It doesn’t guess. It doesn’t improvise wildly. It works from your actual information — your pricing, your policies, your answers.

The result is simple:  
You stay in control, while the repetitive work disappears.

---

## How it works

At a high level, Aifferte follows a clear and predictable flow:

Poll inbox → Classify email → Retrieve knowledge → Generate reply → Save draft


Here’s what happens step by step:

1. It checks your inbox (Gmail or Outlook) for new emails  
2. It classifies each message — is this about pricing, policies, or something else?  
3. If it’s relevant, it pulls the right information from your knowledge base  
4. It uses that context to generate a response  
5. Instead of sending anything automatically, it saves the reply as a draft  

You can review and send it whenever you’re ready.

---

## Noise-free by design

Not every email deserves a response from Aifferte.

Some messages are irrelevant. Others are too vague. Some simply don’t match your configured knowledge base.

In those cases, Aifferte stays quiet.

That means:
- No unnecessary drafts  
- No incorrect assumptions  
- No inbox clutter  

Only useful output gets through.

---

## Tech stack

Aifferte is built with a modern, minimal stack:

| Layer | Technology |
|------|-----------|
| Runtime | Node.js + TypeScript |
| Framework | Express 5 |
| AI | OpenRouter API (mockable in development) |
| Inbox | Gmail / Outlook (mocked in development) |
| Database | Supabase (PostgreSQL) |

The focus is not on complexity, but on reliability and clarity.

## AI configuration

The app supports two AI modes:

- `mock`: uses the in-repo mock AI integration
- `openrouter`: calls the OpenRouter chat completions API for both classification and reply drafting

Copy [.env.example](.env.example) to `.env` and set these values:

- `AI_PROVIDER=mock|openrouter`
- `OPENROUTER_API_KEY`
- `OPENROUTER_CLASSIFY_MODEL`
- `OPENROUTER_REPLY_MODEL`
- `AI_TIMEOUT_MS`

Optional headers for OpenRouter attribution:

- `OPENROUTER_HTTP_REFERER`
- `OPENROUTER_APP_TITLE`

Suggested model split:

- Classification: a smaller, cheaper model with reliable JSON output
- Reply drafting: a stronger generation model

When `AI_PROVIDER=openrouter`, startup will fail fast if the required OpenRouter variables are missing.

---

## Why “Aifferte”?

The name combines **AI** with the Dutch word *offerte* — meaning a price quote.

Together, it reflects the core idea behind the project:

> Using AI to generate clear, structured, and reliable responses — like a well-prepared business offer.

---

Aifferte is still evolving, but the goal is straightforward:  
make email less repetitive, and more manageable.