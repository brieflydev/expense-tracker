import {
  AppBar,
  Box,
  Button,
  Container,
  Stack,
  Toolbar,
  Typography,
} from '@mui/material';
import { Link as RouterLink, NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

const navLinkSx = {
  color: 'text.secondary',
  textDecoration: 'none',
  fontWeight: 600,
  px: 1.25,
  py: 0.5,
  borderRadius: 1,
  '&.active': {
    color: 'primary.main',
    backgroundColor: 'rgba(15, 106, 92, 0.1)',
  },
};

export function AppLayout() {
  const { user, logout } = useAuth();

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background:
          'radial-gradient(ellipse 80% 50% at 10% -10%, rgba(15,106,92,0.18), transparent 55%), radial-gradient(ellipse 60% 40% at 100% 0%, rgba(31,78,121,0.16), transparent 50%), linear-gradient(180deg, #e7eef2 0%, #f3f7f8 100%)',
      }}
    >
      <AppBar position="sticky" color="transparent" elevation={0}>
        <Toolbar sx={{ gap: 2 }}>
          <Typography
            component={RouterLink}
            to="/"
            variant="h6"
            sx={{
              color: 'text.primary',
              textDecoration: 'none',
              mr: 2,
              flexShrink: 0,
            }}
          >
            Expense Tracker
          </Typography>

          <Stack direction="row" spacing={0.5} sx={{ flexGrow: 1 }}>
            <Box component={NavLink} to="/" end sx={navLinkSx}>
              Dashboard
            </Box>
            <Box component={NavLink} to="/expenses" sx={navLinkSx}>
              Expenses
            </Box>
          </Stack>

          <Typography variant="body2" color="text.secondary" sx={{ display: { xs: 'none', sm: 'block' } }}>
            {user?.name || user?.email}
          </Typography>
          <Button color="inherit" onClick={() => void logout()}>
            Log out
          </Button>
        </Toolbar>
      </AppBar>

      <Container maxWidth="lg" sx={{ py: { xs: 3, md: 5 } }}>
        <Outlet />
      </Container>
    </Box>
  );
}
