import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { requireAuth } from '../middleware/auth.js';
import { getAuthUser } from '../types/auth.js';

const summaryQuerySchema = z.object({
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
});

export const dashboardRouter = Router();

dashboardRouter.use(requireAuth);

dashboardRouter.get('/summary', async (req, res, next) => {
  try {
    const user = getAuthUser(req);
    const query = summaryQuerySchema.parse(req.query);

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
      where: { userId: user.id, ...dateFilter },
      select: {
        amount: true,
        category: true,
        date: true,
        currency: true,
      },
      orderBy: { date: 'asc' },
    });

    let total = 0;
    const byCategory = new Map<string, number>();
    const byMonth = new Map<string, number>();

    for (const expense of expenses) {
      const amount = Number(expense.amount);
      total += amount;

      byCategory.set(
        expense.category,
        (byCategory.get(expense.category) ?? 0) + amount,
      );

      const monthKey = expense.date.toISOString().slice(0, 7);
      byMonth.set(monthKey, (byMonth.get(monthKey) ?? 0) + amount);
    }

    res.json({
      total,
      count: expenses.length,
      byCategory: [...byCategory.entries()]
        .map(([category, amount]) => ({ category, amount }))
        .sort((a, b) => b.amount - a.amount),
      byMonth: [...byMonth.entries()]
        .map(([month, amount]) => ({ month, amount }))
        .sort((a, b) => a.month.localeCompare(b.month)),
    });
  } catch (err) {
    next(err);
  }
});
