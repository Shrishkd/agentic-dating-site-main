import { AgentProfileAnalysis } from "../agents/types";

/**
 * Agent pre-screen ("swipe") stage.
 *
 * Before spending LLM calls on full dates, every agent scans the whole pool and scores
 * each candidate against its person's hobbies, interests, values, needs and lifestyle.
 * The best-scoring candidates get a real date; the rest keep their pre-screen estimate.
 */

const STOPWORDS = new Set(
  "a an and are as at be but by for from has have in into is it its of on or that the their them they this to with who what when where will would your you very more most also just like love loves enjoy enjoys partner someone person people life time work things being able other others through about over".split(
    " "
  )
);

function tokens(list: Array<string | undefined>): Set<string> {
  const out = new Set<string>();
  for (const item of list) {
    if (!item) continue;
    for (const w of item.toLowerCase().split(/[^a-z0-9]+/)) {
      if (w.length >= 4 && !STOPWORDS.has(w)) out.add(w.replace(/(ing|ers|er|s)$/, ""));
    }
  }
  return out;
}

function overlap(a: Set<string>, b: Set<string>): { score: number; shared: string[] } {
  if (a.size === 0 || b.size === 0) return { score: 0, shared: [] };
  const shared = Array.from(a).filter((x) => b.has(x));
  return { score: shared.length / Math.sqrt(a.size * b.size), shared };
}

export interface PrescreenResult {
  score: number; // 0-100 estimate of how well `b` fits what `a` wants
  shared: string[];
}

/**
 * How well candidate B fits what A's agent is looking for (asymmetric).
 */
export function prescreen(a: AgentProfileAnalysis, b: AgentProfileAnalysis): PrescreenResult {
  const aWants = tokens([a.looking_for, ...(a.needs || []), ...(a.values || [])]);
  const bIs = tokens([b.summary, b.lifestyle, b.communication_style, ...(b.values || []), ...(b.hobbies || [])]);
  const aDoes = tokens([...(a.hobbies || []), ...(a.interests || [])]);
  const bDoes = tokens([...(b.hobbies || []), ...(b.interests || [])]);
  const aVals = tokens(a.values || []);
  const bVals = tokens(b.values || []);
  const aBreakers = tokens(a.deal_breakers || []);

  const wants = overlap(aWants, bIs);
  const hobbies = overlap(aDoes, bDoes);
  const values = overlap(aVals, bVals);
  const breakers = overlap(aBreakers, bIs);

  const raw = 0.4 * hobbies.score + 0.35 * wants.score + 0.25 * values.score - 0.3 * breakers.score;
  const score = Math.max(20, Math.min(90, Math.round(45 + raw * 120)));
  const shared = Array.from(new Set([...hobbies.shared, ...values.shared, ...wants.shared])).slice(0, 6);
  return { score, shared };
}

export interface ScheduledDate {
  personAId: string;
  personBId: string;
  mutualPrescreen: number;
  shared: string[];
}

/**
 * Builds a balanced date schedule: every agent goes on ~datesPerPerson dates with the
 * candidates it rated highest (and who rated it back), so no one is left out.
 */
export function buildDatingSchedule(
  people: Array<{ id: string; profile: AgentProfileAnalysis }>,
  datesPerPerson: number
): ScheduledDate[] {
  const n = people.length;
  if (n < 2) return [];
  const k = Math.min(datesPerPerson, n - 1);

  const candidates: ScheduledDate[] = [];
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const ab = prescreen(people[i].profile, people[j].profile);
      const ba = prescreen(people[j].profile, people[i].profile);
      candidates.push({
        personAId: people[i].id,
        personBId: people[j].id,
        mutualPrescreen: Math.round((ab.score + ba.score) / 2),
        shared: Array.from(new Set([...ab.shared, ...ba.shared])).slice(0, 6),
      });
    }
  }

  // Everyone dates everyone when the pool is small enough.
  if (k >= n - 1) return candidates;

  candidates.sort((x, y) => y.mutualPrescreen - x.mutualPrescreen);
  const degree = new Map<string, number>(people.map((p) => [p.id, 0]));
  const chosen = new Set<ScheduledDate>();

  // Pass 1: greedy b-matching on the best mutual pre-screens.
  for (const c of candidates) {
    if (degree.get(c.personAId)! < k && degree.get(c.personBId)! < k) {
      chosen.add(c);
      degree.set(c.personAId, degree.get(c.personAId)! + 1);
      degree.set(c.personBId, degree.get(c.personBId)! + 1);
    }
  }

  // Pass 2: anyone still short gets their best remaining candidates (partner may go to k+1).
  for (const p of people) {
    for (const c of candidates) {
      if (degree.get(p.id)! >= k) break;
      if (chosen.has(c)) continue;
      if (c.personAId !== p.id && c.personBId !== p.id) continue;
      const other = c.personAId === p.id ? c.personBId : c.personAId;
      if (degree.get(other)! > k) continue;
      chosen.add(c);
      degree.set(p.id, degree.get(p.id)! + 1);
      degree.set(other, degree.get(other)! + 1);
    }
  }

  return Array.from(chosen);
}

export function getDatesPerPerson(): number {
  const v = parseInt(process.env.DATES_PER_PERSON || "5", 10);
  return Number.isFinite(v) && v > 0 ? v : 5;
}

/**
 * Runs async jobs with a fixed concurrency.
 */
export async function runWithConcurrency<T>(
  items: T[],
  concurrency: number,
  fn: (item: T, index: number) => Promise<void>
): Promise<void> {
  let next = 0;
  const workers = Array.from({ length: Math.max(1, Math.min(concurrency, items.length)) }, async () => {
    while (next < items.length) {
      const idx = next++;
      await fn(items[idx], idx);
    }
  });
  await Promise.all(workers);
}
