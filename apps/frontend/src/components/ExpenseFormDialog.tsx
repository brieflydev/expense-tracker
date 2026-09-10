import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Stack,
  TextField,
} from '@mui/material';
import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { EXPENSE_CATEGORIES, type Expense, type ExpenseCategory } from '../types';

export type ExpenseFormValues = {
  amount: string;
  currency: string;
  category: ExpenseCategory;
  description: string;
  date: string;
};

const emptyValues: ExpenseFormValues = {
  amount: '',
  currency: 'USD',
  category: 'food',
  description: '',
  date: new Date().toISOString().slice(0, 10),
};

type Props = {
  open: boolean;
  title: string;
  initial?: Expense | null;
  submitting?: boolean;
  onClose: () => void;
  onSubmit: (values: ExpenseFormValues) => Promise<void> | void;
};

export function ExpenseFormDialog({
  open,
  title,
  initial,
  submitting,
  onClose,
  onSubmit,
}: Props) {
  const [values, setValues] = useState<ExpenseFormValues>(emptyValues);

  useEffect(() => {
    if (!open) return;
    if (initial) {
      setValues({
        amount: String(initial.amount),
        currency: initial.currency,
        category: initial.category,
        description: initial.description ?? '',
        date: initial.date.slice(0, 10),
      });
    } else {
      setValues(emptyValues);
    }
  }, [open, initial]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    await onSubmit(values);
  }

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{title}</DialogTitle>
      <BoxForm onSubmit={handleSubmit}>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <TextField
              label="Amount"
              type="number"
              required
              value={values.amount}
              onChange={(e) =>
                setValues((prev) => ({ ...prev, amount: e.target.value }))
              }
              slotProps={{ htmlInput: { min: 0.01, step: 0.01 } }}
              fullWidth
            />
            <TextField
              label="Currency"
              value={values.currency}
              onChange={(e) =>
                setValues((prev) => ({
                  ...prev,
                  currency: e.target.value.toUpperCase().slice(0, 3),
                }))
              }
              slotProps={{ htmlInput: { maxLength: 3 } }}
              fullWidth
            />
            <TextField
              select
              label="Category"
              value={values.category}
              onChange={(e) =>
                setValues((prev) => ({
                  ...prev,
                  category: e.target.value as ExpenseCategory,
                }))
              }
              fullWidth
            >
              {EXPENSE_CATEGORIES.map((category) => (
                <MenuItem key={category} value={category}>
                  {labelCategory(category)}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              label="Date"
              type="date"
              required
              value={values.date}
              onChange={(e) =>
                setValues((prev) => ({ ...prev, date: e.target.value }))
              }
              slotProps={{ inputLabel: { shrink: true } }}
              fullWidth
            />
            <TextField
              label="Description"
              value={values.description}
              onChange={(e) =>
                setValues((prev) => ({ ...prev, description: e.target.value }))
              }
              fullWidth
              multiline
              minRows={2}
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button type="submit" variant="contained" disabled={submitting}>
            {submitting ? 'Saving…' : 'Save'}
          </Button>
        </DialogActions>
      </BoxForm>
    </Dialog>
  );
}

function BoxForm({
  children,
  onSubmit,
}: {
  children: ReactNode;
  onSubmit: (event: FormEvent) => void;
}) {
  return (
    <form onSubmit={onSubmit} style={{ display: 'contents' }}>
      {children}
    </form>
  );
}

export function labelCategory(category: string): string {
  return category.charAt(0).toUpperCase() + category.slice(1);
}
