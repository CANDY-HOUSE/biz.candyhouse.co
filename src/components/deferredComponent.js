import { lazy, Suspense } from 'react';
import { Box, CircularProgress } from '@mui/material';

// Keep the loading boundary inside the destination so navigation and the APP shell stay mounted.
export default function deferredComponent(load) {
  const Component = lazy(load);
  return function DeferredComponent(props) {
    return (
      <Suspense
        fallback={
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
            <CircularProgress size={24} />
          </Box>
        }
      >
        <Component {...props} />
      </Suspense>
    );
  };
}
