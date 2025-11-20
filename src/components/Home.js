import React from 'react';
import { Button, Typography, Box, Container, Grid, useTheme } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import AnimatedBackground from './shared/AnimatedBackground';
import AnimatedButton from './shared/AnimatedButton';
import AnimatedCard from './shared/AnimatedCard';
import { slideUp, slideDown, fadeIn } from './shared/animations';

// Feature cards data
const useResponsive = () => {
  const theme = useTheme();
  const isMobile = !theme.breakpoints.up('sm')();
  const isTablet = !theme.breakpoints.up('md')();
  const isDesktop = theme.breakpoints.up('lg')();

  return {
    isMobile,
    isTablet,
    isDesktop,
  };
};

const features = [
  {
    title: 'Real-time Collaboration',
    description: 'Code together with your team in real-time. See changes as they happen.',
    icon: '🔄',
  },
  {
    title: 'Multiple Languages',
    description: 'Support for various programming languages with syntax highlighting.',
    icon: '📝',
  },
  {
    title: 'Secure Sharing',
    description: 'Share your workspace securely with team members and collaborators.',
    icon: '🔒',
  },
];

const Home = () => {
  const navigate = useNavigate();
  const theme = useTheme();

  const handleGetStarted = () => {
    navigate('/login');
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <AnimatedBackground />
      
      {/* Hero Section */}
      <Container maxWidth="lg">
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: { xs: '80vh', sm: '90vh' },
            position: 'relative',
            textAlign: 'center',
            gap: { xs: 2, sm: 4 },
            pt: { xs: 4, sm: 0 },
          }}
        >
          <Typography
            variant="h1"
            component="h1"
            sx={{
              color: theme.palette.primary.main,
              fontWeight: 700,
              animation: `${slideDown} 0.8s ${theme.transitions.easing.easeOut}`,
              marginBottom: { xs: 1, sm: 2 },
              background: 'linear-gradient(45deg, #7c3aed 30%, #2dd4bf 90%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              fontSize: {
                xs: '2rem',
                sm: '2.5rem',
                md: '3rem',
                lg: '3.5rem',
              },
              lineHeight: 1.2,
            }}
          >
            Real-time Collaborative
            <br />
            Code Editor
          </Typography>

          <Typography
            variant="h5"
            component="p"
            sx={{
              color: theme.palette.text.secondary,
              maxWidth: '800px',
              marginBottom: { xs: 2, sm: 4 },
              animation: `${fadeIn} 1s ${theme.transitions.easing.easeOut}`,
              animationDelay: '0.3s',
              opacity: 0,
              animationFillMode: 'forwards',
              fontSize: {
                xs: '1rem',
                sm: '1.1rem',
                md: '1.25rem',
              },
              px: { xs: 2, sm: 4 },
            }}
          >
            Work together seamlessly on code, documents, and projects. Share your workspace,
            see changes in real-time, and communicate with your team, all in one place.
          </Typography>

          <AnimatedButton
            variant="contained"
            color="primary"
            size="large"
            onClick={handleGetStarted}
            sx={{
              animation: `${slideUp} 0.8s ${theme.transitions.easing.easeOut}`,
              animationDelay: '0.6s',
              opacity: 0,
              animationFillMode: 'forwards',
              fontSize: { xs: '1rem', sm: '1.1rem', md: '1.2rem' },
              padding: { xs: '10px 24px', sm: '12px 32px' },
            }}
          >
            Get Started
          </AnimatedButton>
        </Box>

        {/* Features Section */}
        <Grid
          container
          spacing={{ xs: 2, sm: 3, md: 4 }}
          sx={{
            padding: { xs: '2rem 0', sm: '3rem 0', md: '4rem 0' },
          }}
        >
          {features.map((feature, index) => (
            <Grid
              item
              xs={12}
              sm={6}
              md={4}
              key={index}
              sx={{
                animation: `${slideUp} 0.8s ${theme.transitions.easing.easeOut}`,
                animationDelay: `${0.8 + index * 0.2}s`,
                opacity: 0,
                animationFillMode: 'forwards',
              }}
            >
              <AnimatedCard
                sx={{
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  padding: { xs: 3, sm: 4 },
                }}
              >
                <Typography
                  variant="h1"
                  sx={{
                    fontSize: { xs: '2.5rem', sm: '3rem' },
                    marginBottom: { xs: 1, sm: 2 },
                  }}
                >
                  {feature.icon}
                </Typography>
                <Typography
                  variant="h5"
                  component="h3"
                  gutterBottom
                  sx={{
                    color: theme.palette.primary.main,
                    fontSize: { xs: '1.25rem', sm: '1.5rem' },
                  }}
                >
                  {feature.title}
                </Typography>
                <Typography
                  variant="body1"
                  color="text.secondary"
                  align="center"
                  sx={{
                    fontSize: { xs: '0.875rem', sm: '1rem' },
                  }}
                >
                  {feature.description}
                </Typography>
              </AnimatedCard>
            </Grid>
          ))}
        </Grid>
      </Container>

      {/* Footer */}
      <Box
        component="footer"
        sx={{
          padding: { xs: '1rem 0', sm: '2rem 0' },
          textAlign: 'center',
          animation: `${fadeIn} 1s ${theme.transitions.easing.easeOut}`,
          animationDelay: '1.4s',
          opacity: 0,
          animationFillMode: 'forwards',
        }}
      >
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{
            fontSize: { xs: '0.75rem', sm: '0.875rem' },
          }}
        >
          Built with 💜 for developers
        </Typography>
      </Box>
    </Box>
  );
};

export default Home;
