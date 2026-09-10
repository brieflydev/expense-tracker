import {
  Alert,
  Box,
  Grid,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { fetchDashboardSummary } from '../api/dashboard';
import { ApiError } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { labelCategory } from '../components/ExpenseFormDialog';

const CHART_COLORS = [
  '#0f6a5c',
  '#1f4e79',
  '#3d8f82',
  '#4a7399',
  '#7aa89f',
  '#88a4bd',
  '#245c52',
  '#2f5f8a',
  '#5c7a72',
];

function formatMoney(amount: number): string {
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
}

export function DashboardPage() {
  const { user } = useAuth();
  const summaryQuery = useQuery({
    queryKey: ['dashboard', 'summary'],
    queryFn: () => fetchDashboardSummary(),
  });

  const byCategory =
    summaryQuery.data?.byCategory.map((item) => ({
      ...item,
      label: labelCategory(item.category),
    })) ?? [];

  const byMonth = summaryQuery.data?.byMonth ?? [];

  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="h4" sx={{ mb: 0.5 }}>
          {user?.name ? `Hi, ${user.name}` : 'Dashboard'}
        </Typography>
        <Typography color="text.secondary">
          A snapshot of your spending by category and over time.
        </Typography>
      </Box>

      {summaryQuery.isError && (
        <Alert severity="error">
          {summaryQuery.error instanceof ApiError
            ? summaryQuery.error.message
            : 'Failed to load dashboard'}
        </Alert>
      )}

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
          <StatCard
            label="Total spent"
            value={formatMoney(summaryQuery.data?.total ?? 0)}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
          <StatCard
            label="Expenses logged"
            value={String(summaryQuery.data?.count ?? 0)}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
          <StatCard
            label="Categories used"
            value={String(byCategory.length)}
          />
        </Grid>
      </Grid>

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 5 }}>
          <Paper
            elevation={0}
            sx={{
              p: 2.5,
              height: 360,
              border: '1px solid',
              borderColor: 'divider',
            }}
          >
            <Typography variant="h6" sx={{ mb: 2 }}>
              By category
            </Typography>
            {byCategory.length === 0 ? (
              <EmptyChart />
            ) : (
              <ResponsiveContainer width="100%" height="85%">
                <PieChart>
                  <Pie
                    data={byCategory}
                    dataKey="amount"
                    nameKey="label"
                    innerRadius={55}
                    outerRadius={95}
                    paddingAngle={2}
                  >
                    {byCategory.map((entry, index) => (
                      <Cell
                        key={entry.category}
                        fill={CHART_COLORS[index % CHART_COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value) => formatMoney(Number(value ?? 0))}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </Paper>
        </Grid>

        <Grid size={{ xs: 12, md: 7 }}>
          <Paper
            elevation={0}
            sx={{
              p: 2.5,
              height: 360,
              border: '1px solid',
              borderColor: 'divider',
            }}
          >
            <Typography variant="h6" sx={{ mb: 2 }}>
              Spend over time
            </Typography>
            {byMonth.length === 0 ? (
              <EmptyChart />
            ) : (
              <ResponsiveContainer width="100%" height="85%">
                <BarChart data={byMonth}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(19,32,41,0.1)" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip
                    formatter={(value) => formatMoney(Number(value ?? 0))}
                  />
                  <Bar dataKey="amount" fill="#0f6a5c" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </Paper>
        </Grid>
      </Grid>
    </Stack>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <Paper
      elevation={0}
      sx={{
        p: 2.5,
        border: '1px solid',
        borderColor: 'divider',
        height: '100%',
      }}
    >
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
        {label}
      </Typography>
      <Typography variant="h4">{value}</Typography>
    </Paper>
  );
}

function EmptyChart() {
  return (
    <Box
      sx={{
        height: '80%',
        display: 'grid',
        placeItems: 'center',
        color: 'text.secondary',
      }}
    >
      Add a few expenses to see charts here.
    </Box>
  );
}
