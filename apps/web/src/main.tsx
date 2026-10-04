import { DispatchPage, DispatchDetailPage } from './features/dispatch/dispatch.js';
import { FinanceListPage, FinanceNewPage, FinanceDetailPage } from './features/finance/finance.js';
import {
  IntegrationPage,
  IntegrationProvisionPage,
  IntegrationDetailPage,
  IntegrationDeliveryPage,
} from './features/integration/integration.js';
import {
  TreasuryListPage,
  TreasurySendPage,
  TreasuryDetailPage,
} from './features/finance/treasury-transfers/treasury.js';
import React from 'react';
import ReactDOM from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Direction } from 'radix-ui';
import '@shahn/ui/styles.css';
import { Shell, Home, MissingPage } from './app.js';
import {
  ShipmentNewPage,
  ShipmentDetailPage,
  ShipmentCorrectionPage,
} from './features/shipments/shipments.js';
import { ParcelMonitorPage } from './features/preparation/preparation.js';
import { BrandsPage, BrandSetupPage } from './features/brands/brands.js';
import {
  InventoryPage,
  ReceiptPage,
  ReceiptDetailPage,
  VariantHistoryPage,
} from './features/inventory/inventory.js';
import { ProductsPage, ProductEditPage } from './features/products/products.js';
import {
  EmployeesPage,
  EmployeeNewPage,
  EmployeeDetailPage,
} from './features/employees/employees.js';
import {
  ReferenceHome,
  ReferencePage,
  TariffsPage,
} from './features/reference-data/reference-data.js';
import {
  AccessShell,
  AccessHome,
  Login,
  UsersPage,
  UserDetail,
  RolesPage,
  Support,
  AuthComplete,
} from './features/access/access.js';
const router = createBrowserRouter([
  {
    element:
      import.meta.env.DEV && import.meta.env['VITE_FOUNDATION_PREVIEW'] === 'true' ? (
        <Shell />
      ) : (
        <AccessShell />
      ),
    hydrateFallbackElement: <p role="status">جارٍ فتح صفحة العرض…</p>,
    children: [
      {
        path: '/',
        element:
          import.meta.env.DEV && import.meta.env['VITE_FOUNDATION_PREVIEW'] === 'true' ? (
            <Home />
          ) : (
            <AccessHome />
          ),
      },
      { path: '/login', element: <Login /> },
      { path: '/auth-complete', element: <AuthComplete /> },
      { path: '/administration/users', element: <UsersPage /> },
      { path: '/administration/users/:id', element: <UserDetail /> },
      { path: '/administration/roles', element: <RolesPage /> },
      { path: '/support', element: <Support /> },
      { path: '/support/login', element: <Login support /> },
      { path: '/brands', element: <BrandsPage /> },
      { path: '/dispatch', element: <DispatchPage /> },
      { path: '/dispatch/:id', element: <DispatchDetailPage /> },
      { path: '/integration', element: <IntegrationPage /> },
      { path: '/integration/provision', element: <IntegrationProvisionPage /> },
      { path: '/integration/delivery', element: <IntegrationDeliveryPage /> },
      { path: '/integration/commands/:id', element: <IntegrationDetailPage kind="commands" /> },
      { path: '/integration/events/:id', element: <IntegrationDetailPage kind="events" /> },
      { path: '/treasury/transfers', element: <TreasuryListPage screen="send" /> },
      { path: '/treasury/transfers/new', element: <TreasurySendPage /> },
      { path: '/treasury/transfers/:id', element: <TreasuryDetailPage screen="send" /> },
      { path: '/treasury/receipts', element: <TreasuryListPage screen="receive" /> },
      { path: '/treasury/receipts/:id', element: <TreasuryDetailPage screen="receive" /> },
      ...(['accounts', 'expenses', 'movements'] as const).flatMap((screen) => {
        const prefix = screen === 'expenses' ? '/expenses' : '/finance/' + screen;
        return [
          { path: prefix, element: <FinanceListPage screen={screen} /> },
          { path: prefix + '/new', element: <FinanceNewPage screen={screen} /> },
          { path: prefix + '/:id', element: <FinanceDetailPage screen={screen} /> },
        ];
      }),
      { path: '/employees', element: <EmployeesPage /> },
      { path: '/employees/new', element: <EmployeeNewPage /> },
      { path: '/employees/:id', element: <EmployeeDetailPage /> },
      { path: '/shipments/new', element: <ShipmentNewPage /> },
      { path: '/shipments/:reference', element: <ShipmentDetailPage /> },
      { path: '/shipments/:reference/correction', element: <ShipmentCorrectionPage /> },
      { path: '/preparation/orders/new', element: <ShipmentNewPage stockOnly /> },
      { path: '/preparation', element: <ParcelMonitorPage /> },
      { path: '/inventory', element: <InventoryPage /> },
      { path: '/inventory/receipts/new', element: <ReceiptPage /> },
      { path: '/inventory/receipts/:id', element: <ReceiptDetailPage /> },
      { path: '/inventory/variants/:id', element: <VariantHistoryPage /> },
      { path: '/brands/:id/products', element: <ProductsPage /> },
      { path: '/products/:id/edit', element: <ProductEditPage /> },
      { path: '/brands/new', element: <BrandSetupPage /> },
      { path: '/brands/tariffs', element: <TariffsPage /> },
      { path: '/brands/:id', element: <BrandSetupPage /> },
      { path: '/settings/reference-data', element: <ReferenceHome /> },
      { path: '/settings/reference-data/:kind', element: <ReferencePage /> },
      ...(import.meta.env.DEV && import.meta.env['VITE_ENABLE_KERNEL_TRIAL'] === 'true'
        ? [
            {
              path: '/development/kernel',
              lazy: async () => ({
                Component: (await import('./features/kernel/trial.js')).KernelTrial,
              }),
            },
          ]
        : []),
      ...(import.meta.env.DEV && import.meta.env.VITE_ENABLE_DEMOS === 'true'
        ? [
            {
              path: '/demo/list',
              lazy: async () => ({ Component: (await import('./demo-pages.js')).DemoList }),
            },
            {
              path: '/demo/form',
              lazy: async () => ({ Component: (await import('./demo-pages.js')).DemoFormPage }),
            },
            {
              path: '/demo/timeline',
              lazy: async () => ({ Component: (await import('./demo-pages.js')).DemoTimeline }),
            },
          ]
        : []),
      { path: '*', element: <MissingPage /> },
    ],
  },
]);
const queryClient = new QueryClient();
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Direction.Provider dir="rtl">
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    </Direction.Provider>
  </React.StrictMode>,
);
