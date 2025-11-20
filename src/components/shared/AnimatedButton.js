import React from 'react';
import { Button } from '@mui/material';
import { styled } from '@mui/system';

const StyledButton = styled(Button)(({ theme }) => ({
  position: 'relative',
  overflow: 'hidden',
  transition: 'all 0.3s ease-in-out',
  '&::before': {
    content: '""',
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    width: 0,
    height: 0,
    background: 'rgba(255, 255, 255, 0.1)',
    borderRadius: '50%',
    transition: 'width 0.6s ease-out, height 0.6s ease-out',
  },
  '&:hover': {
    transform: 'translateY(-2px)',
    boxShadow: theme.shadows[4],
    '&::before': {
      width: '300px',
      height: '300px',
    },
  },
  '&:active': {
    transform: 'translateY(1px)',
  },
}));

const AnimatedButton = ({ children, ...props }) => {
  return <StyledButton {...props}>{children}</StyledButton>;
};

export default AnimatedButton;