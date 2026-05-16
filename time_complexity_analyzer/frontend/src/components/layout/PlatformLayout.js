import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Box } from '@mui/material';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import TopChrome from './TopChrome';
import Footer from '../Footer';
import CommandPalette from '../CommandPalette';

export default function PlatformLayout() {
  const location = useLocation();
  const reduceMotion = useReducedMotion();

  const motionProps = reduceMotion
    ? {
        initial: { opacity: 1, y: 0 },
        animate: { opacity: 1, y: 0 },
        exit: { opacity: 1, y: 0 },
        transition: { duration: 0 },
      }
    : {
        initial: { opacity: 0, y: 10 },
        animate: { opacity: 1, y: 0 },
        exit: { opacity: 0, y: -8 },
        transition: { duration: 0.28, ease: [0.16, 1, 0.3, 1] },
      };

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        flex: 1,
        minHeight: '100vh',
        width: '100%',
        position: 'relative',
      }}
    >
      <Box sx={{ flexShrink: 0, width: '100%', zIndex: (t) => t.zIndex.appBar }}>
        <TopChrome />
      </Box>

      <Box
        sx={{
          position: 'relative',
          zIndex: 3,
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          minWidth: 0,
          minHeight: 0,
        }}
      >
        <Box
          component="main"
          sx={{
            flex: 1,
            overflow: 'auto',
            px: { xs: 1, sm: 1.5, md: 2 },
            py: { xs: 1.25, md: 1.75 },
          }}
        >
          <AnimatePresence mode="wait">
            <motion.div key={location.pathname} style={{ minHeight: '100%' }} {...motionProps}>
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </Box>
        <Footer />
      </Box>
      <CommandPalette />
    </Box>
  );
}
