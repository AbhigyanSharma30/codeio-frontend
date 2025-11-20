import React, { useState } from 'react';
import {
  Box,
  Container,
  Paper,
  TextField,
  Button,
  Typography,
  Link,
  IconButton,
  InputAdornment,
  useTheme,
  Alert,
  CircularProgress,
  Slide,
  Fade,
} from '@mui/material';
import {
  Google as GoogleIcon,
  GitHub as GitHubIcon,
  Visibility,
  VisibilityOff,
  Code as CodeIcon,
} from '@mui/icons-material';
import { auth } from '../firebase-config';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  GithubAuthProvider,
} from 'firebase/auth';
import { useNavigate, useLocation } from 'react-router-dom';
import AnimatedBackground from './shared/AnimatedBackground';
import AnimatedButton from './shared/AnimatedButton';
import { fadeIn, slideUp, slideDown } from './shared/animations';

const Auth = () => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();

  React.useEffect(() => {
    setIsSignUp(location.pathname === '/signup');
  }, [location]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (isSignUp) {
        await createUserWithEmailAndPassword(auth, email, password);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
      // After login/sign-up, redirect back to the original destination if provided
      const destLocation = location.state?.from;
      let dest = '/documents/new';
      if (destLocation) {
        // Preserve pathname and search if present
        const pathname = destLocation.pathname || '/documents/new';
        const search = destLocation.search || '';
        dest = `${pathname}${search}`;
      }
      navigate(dest, { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError('');
    setLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      const destLocation = location.state?.from;
      let dest = '/documents/new';
      if (destLocation) {
        const pathname = destLocation.pathname || '/documents/new';
        const search = destLocation.search || '';
        dest = `${pathname}${search}`;
      }
      navigate(dest, { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGitHubSignIn = async () => {
    setError('');
    setLoading(true);
    try {
      const provider = new GithubAuthProvider();
      await signInWithPopup(auth, provider);
      const destLocation = location.state?.from;
      let dest = '/documents/new';
      if (destLocation) {
        const pathname = destLocation.pathname || '/documents/new';
        const search = destLocation.search || '';
        dest = `${pathname}${search}`;
      }
      navigate(dest, { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        position: 'relative',
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        p: { xs: 2, sm: 0 },
      }}
    >
      <AnimatedBackground />
      <Container component="main" maxWidth="xs">
        <Fade in timeout={800}>
          <Paper
            elevation={24}
            sx={{
              p: { xs: 3, sm: 4 },
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              width: '100%',
              borderRadius: { xs: 2, sm: 3 },
              backdropFilter: 'blur(10px)',
              backgroundColor: 'rgba(45, 45, 59, 0.8)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              animation: `${slideDown} 0.8s ${theme.transitions.easing.easeOut}`,
            }}
          >
            <IconButton
              sx={{
                bgcolor: theme.palette.primary.main,
                color: 'white',
                mb: { xs: 2, sm: 3 },
                p: { xs: 1.5, sm: 2 },
                animation: `${fadeIn} 0.8s ${theme.transitions.easing.easeOut}`,
                transform: 'scale(1.2)',
                '&:hover': {
                  bgcolor: theme.palette.primary.dark,
                  transform: 'scale(1.3)',
                },
                transition: 'all 0.3s ease-in-out',
              }}
              size="large"
            >
              <CodeIcon sx={{ fontSize: { xs: 24, sm: 32 } }} />
            </IconButton>

            <Typography
              component="h1"
              variant="h4"
              sx={{
                mb: { xs: 2, sm: 3 },
                fontWeight: 600,
                background: 'linear-gradient(45deg, #7c3aed 30%, #2dd4bf 90%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                animation: `${slideDown} 0.8s ${theme.transitions.easing.easeOut}`,
                fontSize: { xs: '1.5rem', sm: '2rem' },
                textAlign: 'center',
              }}
            >
              {isSignUp ? 'Create Account' : 'Welcome Back'}
            </Typography>

            <Box
              component="form"
              onSubmit={handleSubmit}
              sx={{
                width: '100%',
                animation: `${slideUp} 0.8s ${theme.transitions.easing.easeOut}`,
              }}
            >
              <TextField
                margin="normal"
                required
                fullWidth
                id="email"
                label="Email Address"
                name="email"
                autoComplete="email"
                autoFocus
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    backdropFilter: 'blur(10px)',
                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                  },
                }}
              />
              <TextField
                margin="normal"
                required
                fullWidth
                name="password"
                label="Password"
                type={showPassword ? 'text' : 'password'}
                id="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    backdropFilter: 'blur(10px)',
                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                  },
                }}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        aria-label="toggle password visibility"
                        onClick={() => setShowPassword(!showPassword)}
                        edge="end"
                      >
                        {showPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />

              {error && (
                <Slide direction="down" in={Boolean(error)}>
                  <Alert
                    severity="error"
                    sx={{
                      mt: 2,
                      backdropFilter: 'blur(10px)',
                      backgroundColor: 'rgba(211, 47, 47, 0.1)',
                    }}
                  >
                    {error}
                  </Alert>
                </Slide>
              )}

              <AnimatedButton
                type="submit"
                fullWidth
                variant="contained"
                sx={{
                  mt: 3,
                  mb: 2,
                  py: 1.5,
                  fontSize: '1.1rem',
                  animation: `${slideUp} 0.8s ${theme.transitions.easing.easeOut}`,
                }}
                disabled={loading}
              >
                {loading ? (
                  <CircularProgress size={24} color="inherit" />
                ) : isSignUp ? (
                  'Sign Up'
                ) : (
                  'Sign In'
                )}
              </AnimatedButton>

              <Box
                sx={{
                  position: 'relative',
                  my: 3,
                  animation: `${fadeIn} 0.8s ${theme.transitions.easing.easeOut}`,
                }}
              >
                <Box
                  sx={{
                    position: 'absolute',
                    top: '50%',
                    width: '100%',
                    borderBottom: 1,
                    borderColor: 'rgba(255, 255, 255, 0.1)',
                  }}
                />
                <Box sx={{ position: 'relative', textAlign: 'center' }}>
                  <Typography
                    variant="body2"
                    sx={{
                      bgcolor: 'background.paper',
                      px: 2,
                      color: 'text.secondary',
                      display: 'inline',
                    }}
                  >
                    Or continue with
                  </Typography>
                </Box>
              </Box>

              <Box
                sx={{
                  display: 'flex',
                  gap: 2,
                  mb: 2,
                  animation: `${slideUp} 0.8s ${theme.transitions.easing.easeOut}`,
                }}
              >
                <AnimatedButton
                  fullWidth
                  variant="outlined"
                  startIcon={<GoogleIcon />}
                  onClick={handleGoogleSignIn}
                  disabled={loading}
                >
                  Google
                </AnimatedButton>
                <AnimatedButton
                  fullWidth
                  variant="outlined"
                  startIcon={<GitHubIcon />}
                  onClick={handleGitHubSignIn}
                  disabled={loading}
                >
                  GitHub
                </AnimatedButton>
              </Box>

              <Box
                sx={{
                  textAlign: 'center',
                  mt: 2,
                  animation: `${fadeIn} 0.8s ${theme.transitions.easing.easeOut}`,
                }}
              >
                <Link
                  component="button"
                  variant="body2"
                  onClick={() => setIsSignUp(!isSignUp)}
                  sx={{
                    textDecoration: 'none',
                    color: theme.palette.primary.main,
                    '&:hover': {
                      color: theme.palette.primary.light,
                    },
                    transition: 'color 0.3s ease-in-out',
                  }}
                >
                  {isSignUp
                    ? 'Already have an account? Sign in'
                    : "Don't have an account? Sign up"}
                </Link>
              </Box>
            </Box>
          </Paper>
        </Fade>
      </Container>
    </Box>
  );
};

export default Auth;
