# AgentMatch 💖🤖
> **Autonomous AI Dating Simulation Platform for Real People**  
> *AI agents analyze public LinkedIn & Instagram profiles, date on behalf of real people, and calculate genuine mutual compatibility rankings.*

---

## 🌟 Overview

Modern dating is plagued by swipe fatigue, superficial bios, and mismatched conversations. **AgentMatch** reimagines matchmaking by deploying **autonomous AI agents** representing real people:

1. **Intake**: Provide public LinkedIn and Instagram profile URLs.
2. **Deep Persona Synthesis**: Google Gemini multimodally analyzes career trajectory, communication style, humor, aesthetic tastes, and deal-breakers with exact evidence citations.
3. **Multi-Turn Dating Floor**: Agents meet in tailored, dynamically selected venues and converse across 6 authentic turns.
4. **Asymmetric Scoring & Matrix**: Each agent grades the interaction independently across 5 dimensions (0–100). The system computes weighted mutual compatibility rankings ($0.6 \times \text{Gave} + 0.4 \times \text{Received}$) and generates a 2D pairwise heatmap.
5. **Zero-API Demo Showcase**: A pre-computed showcase mode allows instant evaluation with zero API dependencies.

---

## 🏗️ System Architecture

```mermaid
flowchart TD
    subgraph Intake ["1. Profile Intake"]
        A[LinkedIn URL] --> C[Link Validator & Parser]
        B[Instagram URL] --> C
    end

    subgraph Scraping ["2. Public Scraping Pipeline (Apify)"]
        C --> D[Apify LinkedIn Actor]
        C --> E[Apify Instagram Actor]
        D --> F[(Raw Data DB Storage)]
        E --> F
    end

    subgraph AI ["3. Multimodal Persona Synthesis"]
        F --> G[LLM Rate Limiter & SHA-256 Cache]
        G --> H[Gemini 2.5 Flash / Pro Analyzer]
        H --> I[(Structured Profile & Evidence Citations)]
    end

    subgraph DatingFloor ["4. Autonomous Dating Floor"]
        I --> J[Venue Selection Engine]
        J --> K[6-Turn Back-and-Forth Dialogue Loop]
        K --> L[Asymmetric Bilateral Scorecards]
        L --> M[(Completed Dates DB Storage)]
    end

    subgraph Matrix ["5. Rankings & Compatibility Matrix"]
        M --> N[Weighted Compatibility Calculator]
        N --> O[Top Mutual Spark Pairs]
        N --> P[2D Pairwise Heatmap Matrix]
        N --> Q[Gemini Match Explanations]
    end
```

---

## 🧠 Core Engine Components

### 1. Public Scraping Pipeline (Apify)
- **Cookie-less Extraction**: Extracts strictly public data without authenticating user sessions or storing credentials.
- **LinkedIn Worker**: Scrapes work history, skills, educational background, summary bio, and certifications.
- **Instagram Worker**: Scrapes recent public captions, tagged interests, bio, and post counts. Handles private accounts gracefully by setting `instagram_private: true` and relying on LinkedIn evidence.
- **Deduplication & Caching**: Scraped raw payloads are stored in the `raw_data` SQLite/PostgreSQL table to prevent redundant scraping.

### 2. Rate-Limited LLM Engine (`lib/llm/`)
- **Exponential Backoff & Jitter**: Automatically retries 429 rate limits and 503 service overloads with randomized backoff.
- **SHA-256 DB Cache**: Prompts and system instructions are hashed; responses are saved to the `llm_cache` table to guarantee instant responses on cache hits and zero cost for repeated runs.
- **Key Rotation**: Supports comma-delimited `GEMINI_API_KEY=key1,key2,key3` for round-robin load distribution.
- **Model Flexibility**:
  - `GEMINI_MODEL_ANALYSIS` (default: `gemini-2.5-flash`): Strict JSON extraction for structured personas.
  - `GEMINI_MODEL_DATING` (default: `gemini-2.5-flash`): Creative conversational dialogue and bilateral scoring.

### 3. Dating Engine & Compatibility Formula
Each date executes across 6 consecutive turns:
1. **Venue Synthesis**: Based on combined hobbies and aesthetic vibes (e.g. *"Rye & Record Ferment Bar"*, *"Independent Bookstore Cafe"*).
2. **Multi-Turn Chat**: Back-and-forth dialogue respecting each persona's communication style, humor, and conversational pace.
3. **Bilateral Asymmetric Scorecards**: Evaluates:
   - **Overall Score** (0–100)
   - **Conversational Chemistry** (0–100)
   - **Lifestyle Alignment** (0–100)
   - **Values Alignment** (0–100)
   - **Second Date Decision** (`YES`, `MAYBE`, `NO`)
   - **Highlights & Red Flags**

#### Compatibility Ranking Formula
$$\text{Composite Score} = 0.6 \times (\text{Score Given}) + 0.4 \times (\text{Score Received})$$

- **Mutual Spark**: Both agents scored each other $\ge 75\%$.
- **High Compatibility**: Weighted composite $\ge 75\%$.
- **One-Sided Interest**: Divergence $|\text{Score Given} - \text{Score Received}| \ge 25$.
- **Good Potential**: Weighted composite $55\% - 74\%$.
- **Low Alignment**: Weighted composite $< 55\%$.

---

## 🚀 Quickstart & Setup

### Prerequisites
- Node.js 18.x or 20.x
- NPM or PNPM
- Google Gemini API Key ([Google AI Studio](https://aistudio.google.com/))
- Apify API Token ([Apify Console](https://console.apify.com/))

### Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/your-username/agentmatch.git
   cd agentmatch
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure Environment Variables**:
   Create a `.env.local` file in the root directory:
   ```env
   # Database (SQLite default or PostgreSQL)
   DATABASE_URL="file:./dev.db"

   # Google Gemini LLM
   GEMINI_API_KEY="your_gemini_api_key_here"
   GEMINI_MODEL_ANALYSIS="gemini-2.5-flash"
   GEMINI_MODEL_DATING="gemini-2.5-flash"

   # Apify Scraper
   APIFY_API_TOKEN="your_apify_api_token_here"

   # App Config
   NEXT_PUBLIC_APP_URL="http://localhost:3000"
   ```

4. **Initialize Database Schema**:
   ```bash
   npx prisma db push
   ```

5. **Start Development Server**:
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## ⚡ Instant Showcase Demo Mode

Want to test AgentMatch immediately without Apify credits or API keys?

Navigate to:
```
http://localhost:3000/demo
```
The demo mode reads from `data/demo-snapshot.json` and renders:
- 4 pre-analyzed candidate personas with trait sliders and evidence citations.
- 6-turn speed date replays with dynamic venues and scorecards.
- Mutual compatibility rankings and 2D pairwise heatmap matrix.
- A **"Restore to Live App"** button that hydrates your local SQLite database in one click.

---

## 📡 API Reference

| Endpoint | Method | Description |
|---|---|---|
| `/api/health` | `GET` | System diagnostics & API key status |
| `/api/people` | `GET`, `POST` | List all candidates or add single/bulk profiles |
| `/api/people/[id]` | `GET`, `DELETE` | Retrieve candidate details or delete profile |
| `/api/scrape/[id]` | `POST` | Trigger Apify scraping for a candidate |
| `/api/analyze/[id]` | `POST` | Run Gemini persona synthesis on scraped data |
| `/api/dates` | `GET`, `POST` | List completed dates or trigger a new speed date |
| `/api/dates/[id]` | `GET` | Get full date transcript and scorecards |
| `/api/dates/stream` | `GET` | SSE stream for real-time turn-by-turn date simulation |
| `/api/rankings` | `GET`, `POST` | Get or recalculate compatibility matrix and rankings |
| `/api/pipeline/run` | `GET` | SSE stream running end-to-end pipeline (Scrape &rarr; Analyze &rarr; Date &rarr; Rank) |
| `/api/demo/export` | `GET` | Export live database to `data/demo-snapshot.json` |
| `/api/demo/seed` | `POST` | Populate live database with initial analyzed pool |

---

## 🔒 Privacy & Ethical AI Manifesto

- **Public Profiles Only**: AgentMatch only extracts information publicly available on LinkedIn and Instagram.
- **No Private Credentials**: Users never enter account passwords, session tokens, or private messages.
- **Evidence-Grounded**: Every persona trait and preference is tied to explicit public evidence citations to prevent hallucination.
- **Transparent Reasoning**: Complete date transcripts and score breakdowns are visible to users.

---

## 🛠️ Tech Stack

- **Framework**: [Next.js 14 (App Router)](https://nextjs.org/)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/) & [Lucide Icons](https://lucide.dev/)
- **ORM / Database**: [Prisma](https://www.prisma.io/) (SQLite / PostgreSQL)
- **AI / LLM**: [Google Gemini SDK (@google/genai)](https://ai.google.dev/)
- **Web Scraping**: [Apify Client SDK](https://apify.com/)
- **Real-time Streaming**: Server-Sent Events (SSE)

---

## 📄 License

MIT License &copy; 2026 AgentMatch. All rights reserved.
