import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button, buttonClassName } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { useAppStore } from '@/store/useAppStore';

type Props = {
  open: boolean;
  /** Persist dismissal and close — called from Esc, overlay, or final buttons. */
  onComplete: () => void;
};

export function WelcomeOnboardingModal({ open, onComplete }: Props) {
  const [step, setStep] = useState(0);
  const user = useAppStore((s) => s.users[s.currentUserId]);

  const name = user?.name?.split(' ')[0] ?? 'there';

  return (
    <Modal open={open} onClose={onComplete} title="Welcome">
      {step === 0 ? (
        <div className="space-y-4 text-sm leading-relaxed text-slate-600">
          <p className="text-lg font-semibold text-slate-900">Welcome to CustomSite, {name}</p>
          <p>
            This workspace helps you manage and build client websites, plus invoicing, contracts, and messages — in one place.
          </p>
          <div className="rounded-lg border border-slate-200 bg-slate-50/80 p-3 text-[13px]">
            <p className="font-semibold text-slate-800">Build &amp; deliver</p>
            <p className="mt-1">Projects, AI Builder, Site builder, Clients, Messages, Files, Invoices</p>
            <p className="mt-3 font-semibold text-slate-800">Operations &amp; money</p>
            <p className="mt-1">Tasks, Calendar, Activity, Payments, Expenses, Billable hours</p>
            <p className="mt-3 font-semibold text-slate-800">Contracts &amp; admin</p>
            <p className="mt-1">Contracts, Reports, Settings</p>
          </div>
          <p className="text-[13px] text-slate-500">
            Tip: use <span className="font-semibold text-slate-700">Quick create</span> in the top bar to add a client, project, invoice, or task without hunting through pages.
          </p>
          <p className="text-[13px] text-slate-500">
            <span className="font-semibold text-slate-700">Build Helper</span> (header or Settings) walks new teammates through their first client site with a right-side checklist.
          </p>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" onClick={() => setStep(1)}>
              Next →
            </Button>
          </div>
        </div>
      ) : null}

      {step === 1 ? (
        <div className="space-y-4 text-sm leading-relaxed text-slate-600">
          <p className="text-lg font-semibold text-slate-900">Start with a client</p>
          <p>Your usual flow: add a client → create a project → open Site builder or AI Builder to ship the site.</p>
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            <Link
              to="/clients"
              className={buttonClassName('primary', 'inline-flex w-full justify-center sm:w-auto')}
              onClick={onComplete}
            >
              Show me how →
            </Link>
            <Button type="button" variant="secondary" className="w-full sm:w-auto" onClick={() => setStep(2)}>
              I&apos;ll explore on my own →
            </Button>
          </div>
        </div>
      ) : null}

      {step === 2 ? (
        <div className="space-y-4 text-sm leading-relaxed text-slate-600">
          <p className="text-lg font-semibold text-slate-900">Your AI builder is Bryan the Brain</p>
          <p>
            In the sidebar it&apos;s labeled <span className="font-semibold text-slate-800">AI Builder</span> so anyone can spot it. Bryan reads plain-English prompts and writes or updates site code while you watch the preview.
          </p>
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            <Link to="/rbyan" className={buttonClassName('primary', 'inline-flex w-full justify-center sm:w-auto')} onClick={onComplete}>
              Open AI Builder →
            </Link>
            <Link
              to="/dashboard"
              className={buttonClassName('secondary', 'inline-flex w-full justify-center sm:w-auto')}
              onClick={onComplete}
            >
              Done — take me to the dashboard
            </Link>
          </div>
        </div>
      ) : null}
    </Modal>
  );
}
