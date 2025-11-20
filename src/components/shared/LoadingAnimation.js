import React from 'react';
import { Box, CircularProgress } from '@mui/material';
import { styled } from '@mui/system';

const LoadingContainer = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  minHeight: '200px',
  position: 'relative',
}));

const StyledCircularProgress = styled(CircularProgress)(({ theme }) => ({
  position: 'relative',
  '&::before': {
    content: '""',
    position: 'absolute',
    top: -4,
    left: -4,
    right: -4,
    bottom: -4,
    borderRadius: '50%',
    background: 'rgba(63, 81, 181, 0.1)',
    animation: 'pulse 2s infinite',
  },
  '@keyframes pulse': {
    '0%': {
      transform: 'scale(1)',
      opacity: 0.6,
    },
    '50%': {
      transform: 'scale(1.2)',
      opacity: 0.3,
    },
    '100%': {
      transform: 'scale(1)',
      opacity: 0.6,
    },
  },
}));

const LoadingAnimation = ({ size = 40, ...props }) => {
  return (
    <LoadingContainer {...props}>
      <StyledCircularProgress size={size} />
    </LoadingContainer>
  );
};

export default LoadingAnimation;