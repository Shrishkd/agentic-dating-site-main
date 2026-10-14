# AgentMatch — Final Project Deliverables

---

## 1. 200-Character Project Description

> **AgentMatch: AI agents read a person's public LinkedIn + Instagram, build an evidence-backed persona, go on multi-turn dates with other agents on their behalf, then rank who fits each person best.**

---

## 2. 3-Minute Video Recording Script

### **Title**: *AgentMatch: Autonomous AI Dating for Real People*
**Target Duration**: 3:00  
**Resolution**: 1080p 60fps  

---

### **[0:00 – 0:30] Scene 1: The Problem & The Vision**
- **Visual**: Screen opens on the AgentMatch landing page (`http://localhost:3000`). Soft glowing dark UI with animated hero elements.
- **Voiceover**:
  > *"Modern dating apps are broken. We spend hours swiping on superficial bios, only to end up with mismatched conversations and dating burnout.*  
  > *What if your personal AI agent could represent you, date potential matches on your behalf based on your real public persona, and tell you with genuine mathematical certainty who you actually connect with?*  
  > *Welcome to **AgentMatch** — an autonomous agentic matchmaking platform powered by Google Gemini and Apify."*

---

### **[0:30 – 1:00] Scene 2: Link Intake & Deep Persona Synthesis**
- **Visual**: Navigate to `/people`. Show the single and bulk profile paste inputs. Click into a candidate profile (e.g., *Chloe Dupont* or *David Kim* at `/people/[id]`).
- **Action**: Hover over the trait score sliders (Introvert/Extrovert, Spontaneity, Ambition), dealbreaker tags, and expand the **Evidence Citations Accordion**.
- **Voiceover**:
  > *"It all begins with public profile URLs. We intake public LinkedIn and Instagram links without requiring user passwords or authenticated cookies.*  
  > *Our Gemini-powered analyzer evaluates career trajectory, aesthetic style, communication cadence, and core values.*  
  > *Notice that every single psychological trait and dealbreaker is grounded with an exact evidence citation to public posts — zero hallucinations."*

---

### **[1:00 – 1:45] Scene 3: The Autonomous Speed Dating Floor**
- **Visual**: Navigate to `/dates`. Show the active dating floor. Click **"Run Speed Date"** or click into a completed date replay (`/dates/[id]`).
- **Action**: Scroll through the 6-turn dialogue between two agents with turn-by-turn speech bubbles, avatars, and venue backdrop.
- **Voiceover**:
  > *"Next, the agents meet on the autonomous dating floor. The engine first synthesizes a bespoke venue matching their mutual vibe — like 'Rye & Record Ferment Bar'.*  
  > *Then, the agents engage in a 6-turn back-and-forth conversation in real-time via Server-Sent Events.*  
  > *They share jokes, probe each other's career philosophies, test lifestyle compatibility, and react authentically to conversational cues."*

---

### **[1:45 – 2:30] Scene 4: Asymmetric Scorecards & Pairwise Compatibility Matrix**
- **Visual**: Scroll to the bottom of the date replay to reveal the bilateral scorecards. Then switch to the **Rankings & Matrix page** (`/rankings`).
- **Action**: Point out the #1 Match Gold Badge, show score breakdown (`Gave: 91 | Received: 88`), read the Gemini match explanation, and hover over the 2D Pairwise Heatmap Matrix.
- **Voiceover**:
  > *"At the end of the date, each agent independently grades the other across overall chemistry, lifestyle fit, and values alignment.*  
  > *Because attraction isn't always symmetrical, our engine calculates compatibility using a weighted formula: 60% of how much they liked the match, plus 40% of how much the match liked them.*  
  > *On the Rankings page, users can explore their top matches with Gemini-generated connection reasons, or view the complete pool in an interactive 2D Heatmap Matrix."*

---

### **[2:30 – 3:00] Scene 5: Instant Demo Mode & Wrap-Up**
- **Visual**: Click **"⚡ Demo Mode"** in the top navigation (`/demo`). Seamlessly switch between the 4 tabs (*Overview*, *Date Transcripts*, *Compatibility*, *Heatmap*).
- **Voiceover**:
  > *"AgentMatch is engineered for reliability. It features exponential backoff, SHA-256 database caching, and a zero-dependency Instant Demo Mode so anyone can evaluate the platform offline.*  
  > *Stop swiping. Let your AI agent find your genuine match. Thank you!"*

---

## 3. Technical Scraping Stack Summary (≤500 chars)

> Apify cloud actors via REST, no logins or cookies: harvestapi/linkedin-profile-scraper (headline, about, experience, education, volunteering, causes, honors, recommendations) and apify/instagram-profile-scraper (bio, 12 latest posts: captions, hashtags, locations, images). Raw JSON cached in Supabase Postgres via Prisma; Gemini 3.x reads both sources plus post images and outputs a cited persona. Next.js 14 + TypeScript, SSE for live dates.

---

## 4. End-to-End Verification Matrix

| Phase | Description | Key Deliverables | Status |
|---|---|---|---|
| **Phase 1** | Project Setup & Core LLM Engine | Next.js 14, Tailwind, Prisma schema (6 tables), SHA-256 LLM cache, `/api/health` | **Verified ✅** |
| **Phase 2** | Link Intake & Candidate Pool | URL validation, single/bulk intake form, 25-candidate limit counter, `/people` table | **Verified ✅** |
| **Phase 3** | Scraping Pipeline | Apify LinkedIn & Instagram cookie-less actors, DB caching, private profile handling | **Verified ✅** |
| **Phase 4** | Multimodal Persona Analysis | Gemini 2.5 structured persona generator, trait scores, dealbreakers, `/people/[id]` with evidence drawer | **Verified ✅** |
| **Phase 5** | Autonomous Dating Engine | Dynamic venue synthesis, 6-turn LLM chat loop, SSE stream `/api/dates/stream`, bilateral scorecards, `/dates` & `/dates/[id]` | **Verified ✅** |
| **Phase 6** | Rankings & Compatibility Matrix | Weighted formula ($0.6 \times \text{Gave} + 0.4 \times \text{Received}$), fit categories, Gemini match explanations, 2D Heatmap Matrix at `/rankings` | **Verified ✅** |
| **Phase 7** | Full Run Pipeline & Demo Mode | Orchestrated runner (`lib/pipeline/runner.ts`), SSE pipeline streaming, static snapshot `data/demo-snapshot.json`, `/demo` instant showcase | **Verified ✅** |
| **Phase 8** | Polish, Skeletons & Production Docs | Privacy banner, UI skeletons, error boundary `error.tsx`, 404 `not-found.tsx`, comprehensive `README.md` with Mermaid diagram | **Verified ✅** |
| **Phase 9** | Verification & Final Deliverables | Final deliverables doc, 3-minute video script, 200-character description, technical scraping summary | **Verified ✅** |
