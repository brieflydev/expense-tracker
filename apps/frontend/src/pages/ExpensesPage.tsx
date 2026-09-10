import DeleteOutlineOutlinedIcon from '@mui/icons-material/DeleteOutlineOutlined';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import {
  Alert,
  Box,
  Button,
  IconButton,
  MenuItem,
  Pagination,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import {
  createExpense,
  deleteExpense,
  listExpenses,
  updateExpense,
} from '../api/expenses';
import { ApiError } from '../api/client';
import {
  ExpenseFormDialog,
  labelCategory,
  type ExpenseFormValues,
} from '../components/ExpenseFormDialog';
import { EXPENSE_CATEGORIES, type Expense } from '../types';

function formatMoney(amount: number, currency: string): string {
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency,
  }).format(amount);
}

export function ExpensesPage() {
  const queryClient = useQueryClient();
  const [q, setQ] = useState('');
  const [category, setCategory] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [page, setPage] = useState(1);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Expense | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const filters = useMemo(
    () => ({
      q: q || undefined,
      category: category || undefined,
      from: from || undefined,
      to: to || undefined,
      page,
      pageSize: 10,
      sort: 'date' as const,
      order: 'desc' as const,
    }),
    [q, category, from, to, page],
  );

  const expensesQuery = useQuery({
    queryKey: ['expenses', filters],
    queryFn: () => listExpenses(filters),
  });

  const saveMutation = useMutation({
    mutationFn: async (values: ExpenseFormValues) => {
      const payload = {
        amount: Number(values.amount),
        currency: values.currency,
        category: values.category,
        description: values.description || null,
        date: values.date,
      };
      if (editing) {
        return updateExpense(editing.id, payload);
      }
      return createExpense(payload);
    },
    onSuccess: async () => {
      setDialogOpen(false);
      setEditing(null);
      setFormError(null);
      await queryClient.invalidateQueries({ queryKey: ['expenses'] });
      await queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
    onError: (err) => {
      setFormError(err instanceof ApiError ? err.message : 'Could not save expense');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteExpense(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['expenses'] });
      await queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });

  return (
    <Stack spacing={3}>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={2}
        sx={{
          justifyContent: 'space-between',
          alignItems: { sm: 'center' },
        }}
      >
        <Box>
          <Typography variant="h4">Expenses</Typography>
          <Typography color="text.secondary">
            Search, filter, and manage your spending history.
          </Typography>
        </Box>
        <Button
          variant="contained"
          onClick={() => {
            setEditing(null);
            setFormError(null);
            setDialogOpen(true);
          }}
        >
          Add expense
        </Button>
      </Stack>

      <Paper
        elevation={0}
        sx={{ p: 2, border: '1px solid', borderColor: 'divider' }}
      >
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          spacing={2}
          useFlexGap
          sx={{ flexWrap: 'wrap' }}
        >
          <TextField
            label="Search"
            value={q}
            onChange={(e) => {
              setPage(1);
              setQ(e.target.value);
            }}
            sx={{ minWidth: 200, flex: 1 }}
          />
          <TextField
            select
            label="Category"
            value={category}
            onChange={(e) => {
              setPage(1);
              setCategory(e.target.value);
            }}
            sx={{ minWidth: 160 }}
          >
            <MenuItem value="">All</MenuItem>
            {EXPENSE_CATEGORIES.map((item) => (
              <MenuItem key={item} value={item}>
                {labelCategory(item)}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            label="From"
            type="date"
            value={from}
            onChange={(e) => {
              setPage(1);
              setFrom(e.target.value);
            }}
            slotProps={{ inputLabel: { shrink: true } }}
          />
          <TextField
            label="To"
            type="date"
            value={to}
            onChange={(e) => {
              setPage(1);
              setTo(e.target.value);
            }}
            slotProps={{ inputLabel: { shrink: true } }}
          />
        </Stack>
      </Paper>

      {expensesQuery.isError && (
        <Alert severity="error">
          {expensesQuery.error instanceof ApiError
            ? expensesQuery.error.message
            : 'Failed to load expenses'}
        </Alert>
      )}

      <Paper
        elevation={0}
        sx={{ border: '1px solid', borderColor: 'divider', overflow: 'auto' }}
      >
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Date</TableCell>
              <TableCell>Category</TableCell>
              <TableCell>Description</TableCell>
              <TableCell align="right">Amount</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {expensesQuery.data?.items.map((expense) => (
              <TableRow key={expense.id} hover>
                <TableCell>{expense.date.slice(0, 10)}</TableCell>
                <TableCell>{labelCategory(expense.category)}</TableCell>
                <TableCell>{expense.description || '—'}</TableCell>
                <TableCell align="right">
                  {formatMoney(expense.amount, expense.currency)}
                </TableCell>
                <TableCell align="right">
                  <IconButton
                    aria-label="Edit"
                    onClick={() => {
                      setEditing(expense);
                      setFormError(null);
                      setDialogOpen(true);
                    }}
                  >
                    <EditOutlinedIcon fontSize="small" />
                  </IconButton>
                  <IconButton
                    aria-label="Delete"
                    onClick={() => {
                      if (window.confirm('Delete this expense?')) {
                        deleteMutation.mutate(expense.id);
                      }
                    }}
                  >
                    <DeleteOutlineOutlinedIcon fontSize="small" />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
            {expensesQuery.data?.items.length === 0 && (
              <TableRow>
                <TableCell colSpan={5}>
                  <Typography
                    color="text.secondary"
                    sx={{ py: 3, textAlign: 'center' }}
                  >
                    No expenses match these filters.
                  </Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Paper>

      {expensesQuery.data && expensesQuery.data.totalPages > 1 && (
        <Pagination
          page={page}
          count={expensesQuery.data.totalPages}
          onChange={(_e, value) => setPage(value)}
          color="primary"
        />
      )}

      <ExpenseFormDialog
        open={dialogOpen}
        title={editing ? 'Edit expense' : 'Add expense'}
        initial={editing}
        submitting={saveMutation.isPending}
        onClose={() => {
          if (!saveMutation.isPending) {
            setDialogOpen(false);
            setEditing(null);
            setFormError(null);
          }
        }}
        onSubmit={async (values) => {
          await saveMutation.mutateAsync(values);
        }}
      />

      {formError && (
        <Alert
          severity="error"
          sx={{ position: 'fixed', bottom: 24, right: 24 }}
        >
          {formError}
        </Alert>
      )}
    </Stack>
  );
}
