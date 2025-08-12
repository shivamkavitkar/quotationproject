import type { RouteObject } from 'react-router';

import { lazy, Suspense } from 'react';
import { Outlet } from 'react-router-dom';
import { varAlpha } from 'minimal-shared/utils';

import Box from '@mui/material/Box';
import LinearProgress, { linearProgressClasses } from '@mui/material/LinearProgress';

import { AuthLayout } from 'src/layouts/auth';
import { DashboardLayout } from 'src/layouts/dashboard';

// --- Existing Page Imports ---
export const DashboardPage = lazy(() => import('src/pages/dashboard'));
export const UserPage = lazy(() => import('src/pages/user'));
export const SignInPage = lazy(() => import('src/pages/sign-in'));
export const ProductsPage = lazy(() => import('src/pages/products'));
export const Page404 = lazy(() => import('src/pages/page-not-found'));

// --- NEW QUOTATION PAGE IMPORTS ---
// Ensure these paths are correct based on your folder structure:
// src/sections/quotations/view/
// src/sections/quotationform/create/
// src/sections/quotations/preview/

export const QuotationsViewPage = lazy(() => import('src/sections/quotations/view'));
// The CreateQuotationPage component will now handle both creation AND editing
export const CreateQuotationPage = lazy(() => import('src/sections/quotationform/create'));
export const QuotationPreviewPage = lazy(() => import('src/sections/preview/previewss'));
export const CompaniesPage = lazy(() => import('src/sections/address'));


// --- REMOVED: Delete/Edit page imports ---
// No separate DeleteConfirmationPage component/route. Deletion is handled directly from the QuotationsViewPage list.
// No separate QuotationEditPage component/route. CreateQuotationPage handles editing.


const renderFallback = () => (
  <Box
    sx={{
      display: 'flex',
      flex: '1 1 auto',
      alignItems: 'center',
      justifyContent: 'center',
    }}
  >
    <LinearProgress
      sx={{
        width: 1,
        maxWidth: 320,
        bgcolor: (theme) => varAlpha(theme.vars.palette.text.primaryChannel, 0.16),
        [`& .${linearProgressClasses.bar}`]: { bgcolor: 'text.primary' },
      }}
    />
  </Box>
);

export const routesSection: RouteObject[] = [
  {
    element: (
      <DashboardLayout>
        <Suspense fallback={renderFallback()}>
          <Outlet /> {/* This is where child routes are rendered */}
        </Suspense>
      </DashboardLayout>
    ),
    children: [
      // Pass a dummy toggleSidebar function to satisfy required props
      { index: true, element: <DashboardPage  /> },
      { path: 'user', element: <UserPage  /> },
      { path: 'products', element: <ProductsPage  /> },

      // --- NEW QUOTATION ROUTES ---
      // This is the main list view for quotations
      { path: 'quotations', element: <QuotationsViewPage  /> },
      // Route for creating a new quotation
      { path: 'quotations/create', element: <CreateQuotationPage  /> },
      // Route for previewing a specific quotation (dynamic parameter :quot_no)
      { path: 'quotation/preview/:quot_no', element: <QuotationPreviewPage  /> },

    
      // This route will use the same CreateQuotationPage component for editing
      { path: 'quotation/edit/:quot_no', element: <CreateQuotationPage  /> }, 
       { path: 'companies', element: <CompaniesPage  /> },
    ],
  },
  {
    path: 'sign-in',
    element: (
      <AuthLayout>
        <SignInPage />
      </AuthLayout>
    ),
  },
  {
    path: '404',
    element: <Page404 />,
  },
  {
    path: '*',
    element: <Page404 />,
  },
];