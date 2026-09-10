import { Prisma } from '../generated/prisma/client.js';
import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { requireAuth } from '../middleware/auth.js';
import { HttpError } from '../middleware/error.js';
import { getAuthUser } from '../types/auth.js';

const categorySchema = z.enum([
  'food',
  'transport',
  'housing',
  'utilities',
  'entertainment',
  'health',
  'shopping',
  'travel',
  'other',
]);

const expenseBodySchema = z.object({
  amount: z.coerce.number().positive().max(1_000_000_000),
  currency: z.string().trim().length(3).default('USD'),
  category: categorySchema,
  description: z.string().trim().max(500).optional().nullable(),
  date: z.coerce.date(),
});

const listQuerySchema = z.object({
  q: z.string().trim().optional(),
  category: categorySchema.optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  sort: z.enum(['date', 'amount', 'createdAt']).default('date'),
  order: z.enum(['asc', 'desc']).default('desc'),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

function serializeExpense(expense: {
  id: string;
  amount: Prisma.Decimal;
  currency: string;
  category: string;
  description: string | null;
  date: Date;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: expense.id,
    amount: Number(expense.amount),
    currency: expense.currency,
    category: expense.category,
    description: expense.description,
    date: expense.date.toISOString(),
    createdAt: expense.createdAt.toISOString(),
    updatedAt: expense.updatedAt.toISOString(),
  };
}

export const expensesRouter = Router();

expensesRouter.use(requireAuth);

expensesRouter.get('/', async (req, res, next) => {
  try {
    const user = getAuthUser(req);
    const query = listQuerySchema.parse(req.query);

    const where: Prisma.ExpenseWhereInput = {
      userId: user.id,
      ...(query.category ? { category: query.category } : {}),
      ...(query.from || query.to
        ? {
            date: {
              ...(query.from ? { gte: query.from } : {}),
              ...(query.to ? { lte: query.to } : {}),
            },
          }
        : {}),
      ...(query.q
        ? {
            OR: [
              { description: { contains: query.q, mode: 'insensitive' } },
              { category: { contains: query.q, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [total, items] = await Promise.all([
      prisma.expense.count({ where }),
      prisma.expense.findMany({
        where,
        orderBy: { [query.sort]: query.order },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
    ]);

    res.json({
      items: items.map(serializeExpense),
      page: query.page,
      pageSize: query.pageSize,
      total,
      totalPages: Math.ceil(total / query.pageSize) || 1,
    });
  } catch (err) {
    next(err);
  }
});

expensesRouter.post('/', async (req, res, next) => {
  try {
    const user = getAuthUser(req);
    const body = expenseBodySchema.parse(req.body);

    const expense = await prisma.expense.create({
      data: {
        userId: user.id,
        amount: body.amount,
        currency: body.currency.toUpperCase(),
        category: body.category,
        description: body.description ?? null,
        date: body.date,
      },
    });

    res.status(201).json({ expense: serializeExpense(expense) });
  } catch (err) {
    next(err);
  }
});

expensesRouter.get('/:id', async (req, res, next) => {
  try {
    const user = getAuthUser(req);
    const expense = await prisma.expense.findFirst({
      where: { id: req.params.id, userId: user.id },
    });
    if (!expense) {
      throw new HttpError(404, 'Expense not found');
    }
    res.json({ expense: serializeExpense(expense) });
  } catch (err) {
    next(err);
  }
});

expensesRouter.patch('/:id', async (req, res, next) => {
  try {
    const user = getAuthUser(req);
    const body = expenseBodySchema.partial().parse(req.body);

    const existing = await prisma.expense.findFirst({
      where: { id: req.params.id, userId: user.id },
    });
    if (!existing) {
      throw new HttpError(404, 'Expense not found');
    }

    const expense = await prisma.expense.update({
      where: { id: existing.id },
      data: {
        ...(body.amount !== undefined ? { amount: body.amount } : {}),
        ...(body.currency !== undefined
          ? { currency: body.currency.toUpperCase() }
          : {}),
        ...(body.category !== undefined ? { category: body.category } : {}),
        ...(body.description !== undefined
          ? { description: body.description }
          : {}),
        ...(body.date !== undefined ? { date: body.date } : {}),
      },
    });

    res.json({ expense: serializeExpense(expense) });
  } catch (err) {
    next(err);
  }
});

expensesRouter.delete('/:id', async (req, res, next) => {
  try {
    const user = getAuthUser(req);
    const existing = await prisma.expense.findFirst({
      where: { id: req.params.id, userId: user.id },
    });
    if (!existing) {
      throw new HttpError(404, 'Expense not found');
    }

    await prisma.expense.delete({ where: { id: existing.id } });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});
