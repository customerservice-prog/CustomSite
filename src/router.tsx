import { createHashRouter, Navigate } from 'react-router-dom';
import { ShellProvider } from '@/context/shell-context';
import { AppShellLayout } from '@/components/layout/app-shell';
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
import { ModuleTablePage } from '@/pages/module-table-page';

export const router = createHashRouter([
  {
    path: '/',
    element: (
      <ShellProvider>
        <AppShellLayout />
      </ShellProvider>
    ),
    children: [
      { index: true, element: <Navigate to="/dashboard" replace /> },
      { path: 'dashboard', element: <DashboardPage /> },
      { path: 'pipeline', element: <PipelinePage /> },
      { path: 'clients', element: <ClientsPage /> },
      { path: 'clients/:clientId', element: <ClientDetailPage /> },
      { path: 'projects', element: <ProjectsPage /> },
      { path: 'projects/:projectId', element: <ProjectDetailPage /> },
      { path: 'tasks', element: <ModuleTablePage module="tasks" /> },
      { path: 'calendar', element: <ModuleTablePage module="calendar" /> },
      { path: 'invoices', element: <InvoicesPage /> },
      { path: 'invoices/:invoiceId', element: <InvoiceDetailPage /> },
      { path: 'payments', element: <ModuleTablePage module="payments" /> },
      { path: 'time-tracking', element: <ModuleTablePage module="time-tracking" /> },
      { path: 'expenses', element: <ModuleTablePage module="expenses" /> },
      { path: 'messages', element: <MessagesPage /> },
      { path: 'contracts', element: <ModuleTablePage module="contracts" /> },
      { path: 'proposals', element: <ModuleTablePage module="proposals" /> },
      { path: 'forms', element: <ModuleTablePage module="forms" /> },
      { path: 'files', element: <ModuleTablePage module="files" /> },
      { path: 'activity', element: <ModuleTablePage module="activity" /> },
      { path: 'reports', element: <ModuleTablePage module="reports" /> },
      { path: 'site-builder', element: <SiteBuilderPage /> },
      { path: 'client-portal', element: <ClientPortalPage /> },
      { path: 'settings', element: <SettingsPage /> },
    ],
  },
]);
