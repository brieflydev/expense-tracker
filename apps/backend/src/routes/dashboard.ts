import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { requireAuth } from '../middleware/auth.js';
import { getAuthUser } from '../types/auth.js';

const summaryQuerySchema = z.object({
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  currency: z.string().trim().length(3).optional(),
});

type CurrencyBucket = {
  total: number;
  count: number;
  byCategory: Map<string, number>;
  byMonth: Map<string, number>;
};

export const dashboardRouter = Router();

dashboardRouter.use(requireAuth);

dashboardRouter.get('/summary', async (req, res, next) => {
  try {
    const user = getAuthUser(req);
    const query = summaryQuerySchema.parse(req.query);
    const currencyFilter = query.currency?.toUpperCase();

    const dateFilter =
      query.from || query.to
        ? {
            date: {
              ...(query.from ? { gte: query.from } : {}),
              ...(query.to ? { lte: query.to } : {}),
            },
          }
        : {};

    const expenses = await prisma.expense.findMany({
      where: {
        userId: user.id,
        ...dateFilter,
        ...(currencyFilter ? { currency: currencyFilter } : {}),
      },
      select: {
        amount: true,
        category: true,
        date: true,
        currency: true,
      },
      orderBy: { date: 'asc' },
    });

    const byCurrency = new Map<string, CurrencyBucket>();

    for (const expense of expenses) {
      const currency = expense.currency.toUpperCase();
      const amount = Number(expense.amount);
      const bucket = byCurrency.get(currency) ?? {
        total: 0,
        count: 0,
        byCategory: new Map<string, number>(),
        byMonth: new Map<string, number>(),
      };

      bucket.total += amount;
      bucket.count += 1;
      bucket.byCategory.set(
        expense.category,
        (bucket.byCategory.get(expense.category) ?? 0) + amount,
      );
      const monthKey = expense.date.toISOString().slice(0, 7);
      bucket.byMonth.set(
        monthKey,
        (bucket.byMonth.get(monthKey) ?? 0) + amount,
      );
      byCurrency.set(currency, bucket);
    }

    const currencies = [...byCurrency.entries()]
      .map(([currency, bucket]) => ({
        currency,
        total: bucket.total,
        count: bucket.count,
        byCategory: [...bucket.byCategory.entries()]
          .map(([category, amount]) => ({ category, amount }))
          .sort((a, b) => b.amount - a.amount),
        byMonth: [...bucket.byMonth.entries()]
          .map(([month, amount]) => ({ month, amount }))
          .sort((a, b) => a.month.localeCompare(b.month)),
      }))
      .sort((a, b) => b.total - a.total || a.currency.localeCompare(b.currency));

    res.json({
      currencies,
      // Convenience: primary = largest total bucket (or requested filter).
      primary: currencies[0] ?? null,
    });
  } catch (err) {
    next(err);
  }
});
