/**
 * Assumptions (D-46, D-51, spec 24): the Rationale of the current stage only, grouped by topic,
 * needs-you first. This is the content; the page decides where it sits (a sheet on 01, the side
 * panel on 02). Opening a card highlights what it affects on the diagram.
 */

import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'framer-motion';
import { stagesApi } from '@/lib/stagesApi';
import { useMotionPreset } from '@/lib/motion';
import { cn } from '@/lib/utils';
import type { Question, RationaleItem, RegisterEntry } from '@/types/stages';
import { type Card, groupCards, needsYou } from './assumptions';
import { SourceQuote } from './DetailsDrawer';
import { TOPIC_WORDS } from './words';

interface Props {
  assessmentId: string;
  cards: Card[];
  questions: Map<string, Question>;
  docs: Map<string, RegisterEntry>;
  openId: string | null;
  onOpen: (card: Card | null) => void;
  filterName?: string | null;
  onClearFilter?: () => void;
}

export function AssumptionsList({ assessmentId, cards, questions, docs, openId, onOpen, filterName, onClearFilter }: Props) {
  const groups = groupCards(cards);
  return (
    <div className="flex flex-col">
      {filterName && (
        <div className="flex items-center justify-between gap-2 border-b border-rule bg-state-blue px-5 py-2 text-[13px] text-state-blue-foreground">
          <span>Only those about <b className="font-semibold">{filterName}</b></span>
          <button type="button" onClick={onClearFilter} className="font-medium underline underline-offset-4">Show all</button>
        </div>
      )}
      {!cards.length && (
        <div className="flex flex-col gap-1.5 px-5 py-6">
          <span className="text-[15px] font-medium">Nothing to review for this stage</span>
          <span className="text-[13px] text-muted-foreground">Each stage keeps its own assumptions.</span>
        </div>
      )}
      {groups.map((g) => (
        <section key={g.topic} aria-label={TOPIC_WORDS[g.topic]}>
          <h3 className="aegis-label m-0 border-b border-rule bg-muted px-5 py-2 font-medium">
            {TOPIC_WORDS[g.topic]} · {g.cards.length}
          </h3>
          {g.cards.map((c) => (
            <CardRow
              key={c.id}
              assessmentId={assessmentId}
              card={c}
              open={c.id === openId}
              question={c.item.question_id ? questions.get(c.item.question_id) : undefined}
              docs={docs}
              onToggle={() => onOpen(c.id === openId ? null : c)}
            />
          ))}
        </section>
      ))}
    </div>
  );
}

function chipOf(card: Card): { text: string; cls: string } {
  const status = card.item.review.status;
  if (status === 'confirmed') return { text: 'Confirmed', cls: 'bg-state-green text-state-green-foreground' };
  if (status === 'disputed') return { text: 'Disputed', cls: 'bg-state-red text-state-red-foreground' };
  return needsYou(card) ? { text: 'Needs you', cls: 'bg-state-yellow text-state-yellow-foreground' } : { text: 'Noted', cls: 'bg-state-grey text-state-grey-foreground' };
}

function CardRow({ assessmentId, card, open, question, docs, onToggle }: { assessmentId: string; card: Card; open: boolean; question?: Question; docs: Map<string, RegisterEntry>; onToggle: () => void }) {
  const chip = chipOf(card);
  const sub = [card.found.length ? 'Carried over from Stage 01' : '', question && question.status === 'open' ? 'Open question' : ''].filter(Boolean).join(' · ');
  const { easeOut } = useMotionPreset();
  return (
    <article className={cn('border-b border-rule', needsYou(card) && 'aegis-open-edge')}>
      <button
        type="button"
        aria-expanded={open}
        onClick={onToggle}
        className="grid w-full grid-cols-[minmax(0,1fr)_auto] items-start gap-2.5 px-5 py-3 text-left transition-colors hover:bg-accent"
      >
        <span className="flex min-w-0 flex-col gap-1.5">
          <span className="text-[14px] font-medium leading-snug">{card.item.title}</span>
          <span className="flex flex-wrap items-center gap-1.5">
            <span className={cn('rounded-full px-2 py-0.5 text-[11px] font-medium uppercase tracking-[.05em]', chip.cls)}>{chip.text}</span>
            {sub && <span className="text-xs text-muted-foreground">{sub}</span>}
          </span>
        </span>
        <span className="aegis-mono w-[18px] text-center text-lg leading-tight text-muted-foreground" aria-hidden="true">{open ? '−' : '+'}</span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} transition={easeOut} className="overflow-hidden">
            <OpenCard assessmentId={assessmentId} card={card} question={question} docs={docs} />
          </motion.div>
        )}
      </AnimatePresence>
    </article>
  );
}

function OpenCard({ assessmentId, card, question, docs }: { assessmentId: string; card: Card; question?: Question; docs: Map<string, RegisterEntry> }) {
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

  const field = 'aegis-well rounded-[10px] px-3 py-2.5 text-sm';
  return (
    <div className="flex flex-col gap-3 px-5 pb-4 text-sm">
      <Part title="What I found">{[...card.found, card.item].map((i) => <p key={i.rationale_id} className="m-0 text-foreground/90">{i.concluded}</p>)}</Part>
      {(sources.length > 0 || notes.length > 0) && (
        <Part title="Why">
          {sources.map((s, n) => <SourceQuote key={n} quote={s.quote} doc={docs.get(s.doc_id)?.client_doc_ref || s.doc_id} location={s.location} />)}
          {notes.map((n) => <p key={n} className="m-0 text-muted-foreground">{n}</p>)}
        </Part>
      )}
      <div className="flex flex-col gap-1 rounded-[10px] border border-state-yellow-border bg-state-yellow px-3 py-2.5">
        <span className="aegis-label text-state-yellow-foreground">What I assumed</span>
        <p className="m-0 text-[hsl(var(--aegis-decide-text))]">{card.item.assumed}</p>
      </div>
      <Part title="What would change it"><p className="m-0 text-foreground/90">{card.item.would_change}</p></Part>

      {question && question.status === 'open' && (
        <div className="flex flex-col gap-2 rounded-xl border border-state-blue-border bg-state-blue p-3.5">
          <span className="aegis-label text-state-blue-foreground">Open question</span>
          <label htmlFor={`answer-${question.question_id}`} className="font-medium text-[hsl(204_51%_22%)]">{question.text}</label>
          <textarea id={`answer-${question.question_id}`} rows={2} value={answer} onChange={(e) => setAnswer(e.target.value)} className={field} placeholder="Your answer, or what the client said" />
          <button type="button" disabled={busy || answer.trim().length < 3} onClick={sendAnswer} className="min-h-10 self-start rounded-[10px] bg-primary px-3.5 font-medium text-primary-foreground transition-transform hover:bg-primary/90 active:scale-[0.98] disabled:opacity-50">
            Answer
          </button>
        </div>
      )}
      {question && question.status === 'answered' && (
        <Part title="Your answer"><p className="m-0">{question.answer} <span className="text-muted-foreground">(kept on record)</span></p></Part>
      )}

      {review.status !== 'unreviewed' ? (
        <div className="flex flex-wrap items-center gap-2.5">
          <p className="m-0">
            {review.status === 'confirmed' ? 'You confirmed this.' : 'You disputed this.'}
            {review.note ? ` "${review.note}"` : ''}
          </p>
          <button type="button" disabled={busy} onClick={() => setReview('unreviewed')} className="font-medium underline underline-offset-4">Undo</button>
        </div>
      ) : disputing ? (
        <div className="flex flex-col gap-2">
          <label htmlFor={`note-${card.id}`} className="font-medium">What is wrong?</label>
          <textarea id={`note-${card.id}`} rows={2} value={note} onChange={(e) => setNote(e.target.value)} className={field} />
          <div className="flex gap-2">
            <button type="button" disabled={busy || note.trim().length < 3} onClick={() => setReview('disputed')} className="min-h-10 rounded-[10px] bg-primary px-3.5 font-medium text-primary-foreground active:scale-[0.98] disabled:opacity-50">Send dispute</button>
            <button type="button" onClick={() => setDisputing(false)} className="min-h-10 rounded-[10px] border border-border bg-card px-3.5 font-medium hover:bg-accent">Cancel</button>
          </div>
        </div>
      ) : (
        <div className="flex gap-2">
          <button type="button" disabled={busy} onClick={() => setReview('confirmed')} className="min-h-10 rounded-[10px] bg-primary px-3.5 font-medium text-primary-foreground transition-transform hover:bg-primary/90 active:scale-[0.98] disabled:opacity-50">Confirm</button>
          <button type="button" disabled={busy} onClick={() => setDisputing(true)} className="min-h-10 rounded-[10px] border border-border bg-card px-3.5 font-medium hover:bg-accent active:scale-[0.98]">Dispute</button>
        </div>
      )}
      {error && <p className="m-0 text-state-red-foreground" role="alert">{error}</p>}
    </div>
  );
}

function Part({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="aegis-label">{title}</span>
      {children}
    </div>
  );
}

export type { RationaleItem };
