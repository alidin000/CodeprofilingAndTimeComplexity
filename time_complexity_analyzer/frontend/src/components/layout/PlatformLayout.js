import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Box } from '@mui/material';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import SidebarNav from './SidebarNav';
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
    <Box sx={{ display: 'flex', flex: 1, minHeight: '100vh', width: '100%', position: 'relative' }}>
      {/* Desktop: orbital dock — fixed, does not consume flex width */}
      <Box
        sx={{
          display: { xs: 'none', md: 'flex' },
          position: 'fixed',
          left: 14,
          top: '50%',
          transform: 'translateY(-50%)',
          zIndex: 25,
          pointerEvents: 'auto',
        }}
      >
        <SidebarNav variant="floating" />
      </Box>

      <Box
        sx={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          minWidth: 0,
          minHeight: '100vh',
          pl: { xs: 0, md: '92px' },
        }}
      >
        <TopChrome />
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
