import { createHashRouter, Navigate } from 'react-router-dom';
import { ShellProvider } from '@/context/shell-context';
import { AppShell } from '@/components/layout/app-shell';
import { DashboardPage } from '@/pages/dashboard-page';
import { PipelinePage } from '@/pages/pipeline-page';
import { ClientsPage } from '@/pages/clients-page';
import { ClientDetailPage } from '@/pages/client-detail-page';
import { ProjectsPage } from '@/pages/projects-page';
import { ProjectDetailPage } from '@/pages/project-detail-page';
import { InvoicesPage } from '@/pages/invoices-page';
import { InvoiceDetailPage } from '@/pages/invoice-detail-page';
import { MessagesPage } from '@/pages/messages-page';
import { SettingsPage } from '@/pages/settings-page';
import { SiteBuilderPage } from '@/pages/site-builder-page';
import { ClientPortalPage } from '@/pages/client-portal-page';
import { TasksPage } from '@/pages/tasks-page';
import { ActivityPage } from '@/pages/activity-page';
import { FilesPage } from '@/pages/files-page';
import { ContractsPage } from '@/pages/contracts-page';
import { ProposalsPage } from '@/pages/proposals-page';
import { FormsPage } from '@/pages/forms-page';
import { PaymentsPage } from '@/pages/payments-page';
import { ExpensesPage } from '@/pages/expenses-page';
import { TimeTrackingPage } from '@/pages/time-tracking-page';
import { CalendarPage } from '@/pages/calendar-page';
import { ReportsPage } from '@/pages/reports-page';

export const router = createHashRouter([
  {
    path: '/',
    element: (
      <ShellProvider>
        <AppShell />
      </ShellProvider>
    ),
    children: [
      { index: true, element: <Navigate to="/dashboard" replace /> },
      { path: 'dashboard', element: <DashboardPage /> },
      { path: 'pipeline', element: <PipelinePage /> },
      { path: 'clients', element: <ClientsPage /> },
      { path: 'clients/:clientId', element: <ClientDetailPage /> },
      { path: 'projects', element: <ProjectsPage /> },
      { path: 'projects/:projectId/site', element: <SiteBuilderPage /> },
      { path: 'projects/:projectId', element: <ProjectDetailPage /> },
      { path: 'tasks', element: <TasksPage /> },
      { path: 'calendar', element: <CalendarPage /> },
      { path: 'invoices', element: <InvoicesPage /> },
      { path: 'invoices/:invoiceId', element: <InvoiceDetailPage /> },
      { path: 'payments', element: <PaymentsPage /> },
      { path: 'time-tracking', element: <TimeTrackingPage /> },
      { path: 'expenses', element: <ExpensesPage /> },
      { path: 'messages', element: <MessagesPage /> },
      { path: 'contracts', element: <ContractsPage /> },
      { path: 'proposals', element: <ProposalsPage /> },
      { path: 'forms', element: <FormsPage /> },
      { path: 'files', element: <FilesPage /> },
      { path: 'activity', element: <ActivityPage /> },
      { path: 'reports', element: <ReportsPage /> },
      { path: 'site-builder', element: <Navigate to="/projects" replace /> },
      { path: 'client-portal', element: <ClientPortalPage /> },
      { path: 'settings', element: <SettingsPage /> },
    ],
  },
]);
