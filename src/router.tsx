import { createHashRouter, Navigate } from 'react-router-dom';
import { ShellProvider } from '@/context/shell-context';
import { AuthSessionProvider } from '@/context/auth-session-context';
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
import { SiteBuilderFoundationPage } from '@/pages/site-builder-foundation-page';
import { SiteBuilderRedirectPage } from '@/pages/site-builder-redirect-page';
import { ClientPortalLayout } from '@/components/client-portal/client-portal-layout';
import { ClientPortalOverviewPage } from '@/pages/client-portal/client-portal-overview-page';
import { ClientPortalMessagesPage } from '@/pages/client-portal/client-portal-messages-page';
import { ClientPortalFilesPage } from '@/pages/client-portal/client-portal-files-page';
import { ClientPortalInvoicesPage } from '@/pages/client-portal/client-portal-invoices-page';
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
import { RbyanBrainPage } from '@/pages/rbyan-brain-page';
import { NotFoundPage } from '@/pages/not-found-page';
import { RouterErrorFallback } from '@/components/layout/router-error-fallback';

export const router = createHashRouter([
  {
    path: '/',
    element: (
      <ShellProvider>
        <AuthSessionProvider>
          <AppShell />
        </AuthSessionProvider>
      </ShellProvider>
    ),
    errorElement: (
      <ShellProvider>
        <AuthSessionProvider>
          <RouterErrorFallback />
        </AuthSessionProvider>
      </ShellProvider>
    ),
    children: [
      { index: true, element: <Navigate to="/dashboard" replace /> },
      { path: 'dashboard', element: <DashboardPage /> },
      { path: 'pipeline', element: <PipelinePage /> },
      { path: 'clients', element: <ClientsPage /> },
      { path: 'clients/:clientId', element: <ClientDetailPage /> },
      { path: 'projects', element: <ProjectsPage /> },
      { path: 'projects/:projectId/site', element: <SiteBuilderFoundationPage /> },
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
      { path: 'rbyan', element: <RbyanBrainPage /> },
      { path: 'ai-builder', element: <Navigate to="/rbyan" replace /> },
      { path: 'site-builder', element: <SiteBuilderRedirectPage /> },
      {
        path: 'client-portal',
        element: <ClientPortalLayout />,
        children: [
          { index: true, element: <ClientPortalOverviewPage /> },
          { path: 'messages', element: <ClientPortalMessagesPage /> },
          { path: 'files', element: <ClientPortalFilesPage /> },
          { path: 'invoices', element: <ClientPortalInvoicesPage /> },
        ],
      },
      { path: 'client-preview', element: <Navigate to="/client-portal" replace /> },
      { path: 'settings', element: <SettingsPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
]);
