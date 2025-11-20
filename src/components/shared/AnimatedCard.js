import React from 'react';
import { Card, CardContent } from '@mui/material';
import { styled } from '@mui/system';

const StyledCard = styled(Card)(({ theme }) => ({
  position: 'relative',
  overflow: 'hidden',
  transition: 'all 0.3s ease-in-out',
  '&:hover': {
    transform: 'translateY(-5px)',
    boxShadow: theme.shadows[8],
  },
  '&::after': {
    content: '""',
    position: 'absolute',
    top: 0,
    right: 0,
    width: '100%',
    height: '3px',
    background: 'linear-gradient(90deg, #3f51b5 0%, #2196f3 100%)',
    transform: 'scaleX(0)',
    transformOrigin: 'left',
    transition: 'transform 0.3s ease-in-out',
  },
  '&:hover::after': {
    transform: 'scaleX(1)',
  },
}));

const AnimatedCard = ({ children, ...props }) => {
  return (
    <StyledCard {...props}>
      <CardContent>{children}</CardContent>
    </StyledCard>
  );
};

export default AnimatedCard;