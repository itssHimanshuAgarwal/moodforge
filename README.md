# MoodForge

**You know the sound. You just can't say it.**

MoodForge lets you discover music through emotion, generate it with AI, and edit it by voice.

---

## The Problem

Every AI music tool has the same interface: a text box. Type what you want. Get a song. Don't like it? Type again.

People don't think about music in words. They think in feelings. When forced to describe sound in a prompt, they fail. Creators spend 4-5 hours editing after generation. The average user regenerates 5-10 times per project hoping something lands.

We call this the **intent articulation gap** — you know what you want when you hear it, but you can't describe it in words.

---

## What We Built

### 1. Discover

An interactive emotional radar based on the **GEMS framework** (Geneva Emotional Music Scale) — 9 scientifically validated dimensions. Drag dots for Wonder, Transcendence, Tenderness, Nostalgia, Peacefulness, Joy, Power, Tension, and Sadness. The system searches 8,000 analyzed tracks and plays the closest match in real time.

When you find what you want, the system generates a detailed prompt — tempo, key, timbre, texture, emotional targets.

### 2. Generate

That prompt feeds into the **ElevenLabs Music API**. Because it's built from 60+ analyzed parameters (not guesswork), the first generation is dramatically closer to what you wanted.

### 3. Edit

Speak what's wrong. "Make the drums less busy." "Make it feel sadder." "Add warmth." GPT-4o parses your words into precise musical edits. Only the targeted part regenerates. Everything else stays locked.

---

## Tech Stack

| Component | Technology |
|-----------|-----------|
| Frontend | React, TypeScript, Tailwind CSS, shadcn/ui |
| Music visualization | WaveSurfer.js |
| Music generation | ElevenLabs Music API |
| Intent parsing | OpenAI GPT-4o |
| Backend | Lovable Cloud |
| Database | PostgreSQL |

---

## Setup

```bash
git clone https://github.com/rossmckegney/moodforge.git
cd moodforge
npm install

# Start development server
npm run dev
# Open http://localhost:5173
```

---

## Environment Variables

This project requires the following API keys (stored as environment variables):

| Variable | Required For | Source |
|----------|--------------|--------|
| `ELEVENLABS_API_KEY` | Music generation | ElevenLabs |
| `OPENAI_API_KEY` | Voice intent parsing | OpenAI |

To configure:
1. Create accounts at [ElevenLabs](https://elevenlabs.io) and [OpenAI](https://openai.com)
2. Get your API keys from their respective dashboards
3. Add them to your environment or deploy environment configuration

**Note:** These keys are accessed via `Deno.env.get()` in edge functions — they are never hardcoded in the source code.

---

## Analysis Engine

8,000 tracks from the Free Music Archive analyzed against 60+ neuroscience metrics from 4 peer-reviewed papers:

- **Emotions:** 9 GEMS dimensions, 13 Cowen emotions, valence/arousal
- **Psychoacoustics:** roughness, sharpness, loudness, dissonance
- **Harmony:** chord progressions, tension curves, key detection
- **Rhythm:** groove, syncopation, danceability
- **Complexity:** entropy, surprisal, compressibility
- **BRECVEMA:** mechanisms for how music triggers emotional responses
- **Frisson:** predictors for when music gives you chills

---

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

---

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

---

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID) and click on Share -> Publish.

---

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/features/custom-domain#custom-domain)
