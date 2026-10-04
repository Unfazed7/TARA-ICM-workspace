/**
 * Assumptions panel (D-46, spec 24): the Rationale of this stage or both stages, grouped by
 * topic, needs-you first. Opening a card highlights what it affects on the diagram.
 */

import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Check, X } from 'lucide-react';
import { stagesApi } from '@/lib/stagesApi';
import type { Question, RationaleItem, RegisterEntry, StageKey } from '@/types/stages';
import { type Card, groupCards, needsYou } from './assumptions';
import { SourceQuote } from './DetailsDrawer';
import { TOPIC_WORDS } from './words';

interface Props {
  assessmentId: string;
  stage: StageKey;
  view: StageKey | 'all';
  onView: (view: StageKey | 'all') => void;
  cards: Card[];
  questions: Map<string, Question>;
  docs: Map<string, RegisterEntry>;
  openId: string | null;
  onOpen: (card: Card | null) => void;
  filterName: string | null;
  onClearFilter: () => void;
  onClose: () => void;
}

export function AssumptionsPanel({ assessmentId, stage, view, onView, cards, questions, docs, openId, onOpen, filterName, onClearFilter, onClose }: Props) {
  const groups = groupCards(cards);
  const needs = cards.filter(needsYou).length;
  return (
    <aside aria-label="Assumptions" className="flex w-[440px] shrink-0 flex-col gap-4 overflow-y-auto border-l-2 border-foreground bg-muted/40 p-5">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Assumptions</h2>
        <button type="button" aria-label="Close assumptions" onClick={onClose} className="flex h-11 w-11 items-center justify-center rounded-md border border-foreground bg-card hover:bg-accent">
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
      <div role="group" aria-label="Which stages" className="flex overflow-hidden rounded-md border border-foreground">
        {([stage, 'all'] as const).map((v) => (
          <button
            key={v}
            type="button"
            aria-pressed={view === v}
            onClick={() => onView(v)}
            className={`min-h-[40px] flex-1 ${view === v ? 'bg-primary font-semibold text-primary-foreground' : 'bg-card hover:bg-accent'}`}
          >
            {v === 'all' ? 'All stages' : 'This stage'}
          </button>
        ))}
      </div>
      <p className="m-0 flex gap-4 text-muted-foreground">
        <span><b className="text-foreground">{needs}</b> need you</span>
        <span><b className="text-foreground">{cards.length - needs}</b> other</span>
      </p>
      {filterName && (
        <div className="flex items-center justify-between gap-2 rounded-md border border-border bg-card px-3 py-2">
          <span>Only those about <b>{filterName}</b></span>
          <button type="button" onClick={onClearFilter} className="underline underline-offset-4">Show all</button>
        </div>
      )}
      {!cards.length && <p className="text-muted-foreground">Nothing to show here.</p>}
      {groups.map((g) => (
        <section key={g.topic} className="flex flex-col gap-1.5" aria-label={TOPIC_WORDS[g.topic]}>
          <h3 className="aegis-label m-0">{TOPIC_WORDS[g.topic]}</h3>
          {g.cards.map((c) =>
            c.id === openId ? (
              <OpenCard key={c.id} assessmentId={assessmentId} card={c} question={c.item.question_id ? questions.get(c.item.question_id) : undefined} docs={docs} onClose={() => onOpen(null)} />
            ) : (
              <button
                key={c.id}
                type="button"
                onClick={() => onOpen(c)}
                className="flex w-full items-start gap-2.5 rounded-md border border-border bg-card px-3 py-2.5 text-left hover:border-foreground"
              >
                <Dot card={c} />
                <span>{c.item.title}</span>
              </button>
            ),
          )}
        </section>
      ))}
    </aside>
  );
}

function Dot({ card }: { card: Card }) {
  const status = card.item.review.status;
  if (status === 'confirmed') return <Check className="mt-1 h-3.5 w-3.5 shrink-0 text-primary" aria-label="Confirmed" />;
  if (status === 'disputed') return <X className="mt-1 h-3.5 w-3.5 shrink-0 text-signal-ink" aria-label="Disputed" />;
  return needsYou(card) ? (
    <span className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full bg-signal" aria-label="Needs you" />
  ) : (
    <span className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full border-[1.5px] border-muted-foreground" aria-label="Information" />
  );
}

function OpenCard({ assessmentId, card, question, docs, onClose }: { assessmentId: string; card: Card; question?: Question; docs: Map<string, RegisterEntry>; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [disputing, setDisputing] = useState(false);
  const [note, setNote] = useState('');
  const [answer, setAnswer] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const items = [card.item, ...card.found];
  const sources = items.flatMap((i) => i.why.sources || []);
  const notes = items.map((i) => i.why.note).filter(Boolean) as string[];
  const review = card.item.review;

  const refresh = () => queryClient.invalidateQueries({ predicate: (q) => q.queryKey[1] === assessmentId && ['rationale', 'stage02'].includes(String(q.queryKey[0])) });

  async function setReview(status: 'confirmed' | 'disputed' | 'unreviewed') {
    setBusy(true);
    setError('');
    try {
      // A merged card is one decision for the analyst, so its Stage 01 items get the same review.
      for (const i of items) await stagesApi.review(assessmentId, i.stage, i.rationale_id, status, status === 'disputed' ? note.trim() : undefined);
      setDisputing(false);
      await refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function sendAnswer() {
    if (!question) return;
    setBusy(true);
    setError('');
    try {
      await stagesApi.answer(assessmentId, question.question_id, answer.trim());
      setAnswer('');
      await refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <article className={`flex flex-col gap-3 rounded-md border-2 bg-card p-3.5 ${needsYou(card) ? 'border-signal' : 'border-foreground'}`}>
      <button type="button" onClick={onClose} className="flex items-start gap-2.5 text-left" aria-expanded="true">
        <Dot card={card} />
        <b>{card.item.title}</b>
      </button>
      {card.found.length > 0 && <div className="aegis-label">Found in Stage 01, applied in Stage 02</div>}
      <Part title="What I found">{[...card.found, card.item].map((i) => <p key={i.rationale_id} className="m-0">{i.concluded}</p>)}</Part>
      {(sources.length > 0 || notes.length > 0) && (
        <Part title="Why">
          {sources.map((s, n) => <SourceQuote key={n} quote={s.quote} doc={docs.get(s.doc_id)?.client_doc_ref || s.doc_id} location={s.location} />)}
          {notes.map((n) => <p key={n} className="m-0 text-muted-foreground">{n}</p>)}
        </Part>
      )}
      <Part title="What I assumed"><p className="m-0">{card.item.assumed}</p></Part>
      <Part title="What would change it"><p className="m-0">{card.item.would_change}</p></Part>

      {question && question.status === 'open' && (
        <div className="flex flex-col gap-2 rounded-md border border-border p-3">
          <div className="aegis-label text-signal-ink">Assumed until answered</div>
          <label htmlFor={`answer-${question.question_id}`} className="m-0">{question.text}</label>
          <textarea
            id={`answer-${question.question_id}`}
            rows={2}
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            className="rounded-md border border-input px-2.5 py-2"
            placeholder="Your answer, or what the client said"
          />
          <button type="button" disabled={busy || answer.trim().length < 3} onClick={sendAnswer} className="self-start rounded-md border border-foreground px-4 py-2 hover:bg-accent disabled:opacity-50">
            Answer
          </button>
        </div>
      )}
      {question && question.status === 'answered' && (
        <Part title="Your answer"><p className="m-0">{question.answer} <span className="text-muted-foreground">(kept on record)</span></p></Part>
      )}

      {review.status !== 'unreviewed' ? (
        <div className="flex flex-col gap-2">
          <p className="m-0">
            {review.status === 'confirmed' ? 'You confirmed this.' : 'You disputed this.'}
            {review.note ? ` "${review.note}"` : ''}
          </p>
          <button type="button" disabled={busy} onClick={() => setReview('unreviewed')} className="self-start underline underline-offset-4">Undo</button>
        </div>
      ) : disputing ? (
        <div className="flex flex-col gap-2">
          <label htmlFor={`note-${card.id}`}>What is wrong?</label>
          <textarea id={`note-${card.id}`} rows={2} value={note} onChange={(e) => setNote(e.target.value)} className="rounded-md border border-input px-2.5 py-2" />
          <div className="flex gap-2">
            <button type="button" disabled={busy || note.trim().length < 3} onClick={() => setReview('disputed')} className="rounded-md bg-primary px-4 py-2 font-semibold text-primary-foreground disabled:opacity-50">Send dispute</button>
            <button type="button" onClick={() => setDisputing(false)} className="rounded-md border border-border px-4 py-2">Cancel</button>
          </div>
        </div>
      ) : (
        <div className="flex gap-2">
          <button type="button" disabled={busy} onClick={() => setReview('confirmed')} className="rounded-md bg-primary px-4 py-2 font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50">Confirm</button>
          <button type="button" disabled={busy} onClick={() => setDisputing(true)} className="rounded-md border border-foreground px-4 py-2 hover:bg-accent">Dispute</button>
        </div>
      )}
      {error && <p className="m-0 text-signal-ink" role="alert">{error}</p>}
      <p className="m-0 text-[13px] text-muted-foreground">What this affects is highlighted on the item definition.</p>
    </article>
  );
}

function Part({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="aegis-label">{title}</div>
      {children}
    </div>
  );
}

export type { RationaleItem };
