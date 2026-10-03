import React from 'react';
import ReactDOM from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Direction } from 'radix-ui';
import '@shahn/ui/styles.css';
import { Shell, Home, MissingPage } from './app.js';
const router = createBrowserRouter([
  {
    element: <Shell />,
    hydrateFallbackElement: <p role="status">جارٍ فتح صفحة العرض…</p>,
    children: [
      { path: '/', element: <Home /> },
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
