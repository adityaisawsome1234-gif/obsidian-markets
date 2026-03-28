import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validate.js';

const router = Router();

const createAlertSchema = z.object({
  type: z.enum(['price', 'volume', 'news', 'options_flow', 'technical']),
  ticker: z.string().min(1).max(10),
  condition: z.enum(['above', 'below', 'crosses', 'percent_change', 'volume_spike']),
  value: z.number(),
  notes: z.string().max(500).optional(),
});

const updateAlertSchema = z.object({
  condition: z.enum(['above', 'below', 'crosses', 'percent_change', 'volume_spike']).optional(),
  value: z.number().optional(),
  enabled: z.boolean().optional(),
  notes: z.string().max(500).optional(),
});

// Mock alert store
const mockAlerts = [
  { id: 'alert_1', userId: 'usr_demo_001', type: 'price', ticker: 'AAPL', condition: 'above', value: 200, enabled: true, notes: 'Breakout above resistance', createdAt: '2025-01-15T10:00:00Z', triggeredAt: null },
  { id: 'alert_2', userId: 'usr_demo_001', type: 'price', ticker: 'NVDA', condition: 'below', value: 800, enabled: true, notes: 'Key support level', createdAt: '2025-01-20T14:30:00Z', triggeredAt: null },
  { id: 'alert_3', userId: 'usr_demo_001', type: 'volume', ticker: 'TSLA', condition: 'volume_spike', value: 100000000, enabled: true, notes: 'Unusual volume alert', createdAt: '2025-02-01T09:00:00Z', triggeredAt: null },
  { id: 'alert_4', userId: 'usr_demo_001', type: 'options_flow', ticker: 'SPY', condition: 'above', value: 5000000, enabled: false, notes: 'Large premium flow', createdAt: '2025-02-05T11:00:00Z', triggeredAt: '2025-02-10T13:45:00Z' },
  { id: 'alert_5', userId: 'usr_demo_001', type: 'technical', ticker: 'MSFT', condition: 'crosses', value: 420, enabled: true, notes: 'SMA 50 crossover', createdAt: '2025-02-10T16:00:00Z', triggeredAt: null },
  { id: 'alert_6', userId: 'usr_demo_001', type: 'price', ticker: 'META', condition: 'above', value: 525, enabled: true, notes: 'All-time high breakout', createdAt: '2025-02-12T08:00:00Z', triggeredAt: null },
  { id: 'alert_7', userId: 'usr_demo_001', type: 'news', ticker: 'PLTR', condition: 'above', value: 0, enabled: true, notes: 'Any news alert', createdAt: '2025-02-14T10:00:00Z', triggeredAt: null },
];

/**
 * GET /api/alerts
 * Returns all alerts for the authenticated user.
 */
router.get('/', (_req: Request, res: Response) => {
  res.json({
    alerts: mockAlerts,
    total: mockAlerts.length,
    active: mockAlerts.filter(a => a.enabled).length,
    triggered: mockAlerts.filter(a => a.triggeredAt).length,
  });
});

/**
 * GET /api/alerts/:id
 * Returns a specific alert.
 */
router.get('/:id', (req: Request, res: Response) => {
  const alert = mockAlerts.find(a => a.id === req.params.id);

  if (!alert) {
    res.status(404).json({ error: 'NotFound', message: 'Alert not found.' });
    return;
  }

  res.json({ alert });
});

/**
 * POST /api/alerts
 * Create a new alert.
 */
router.post('/', validate(createAlertSchema), (req: Request, res: Response) => {
  const body = req.body as z.infer<typeof createAlertSchema>;

  const newAlert = {
    id: `alert_${Date.now().toString(36)}`,
    userId: 'usr_demo_001',
    type: body.type,
    ticker: body.ticker.toUpperCase(),
    condition: body.condition,
    value: body.value,
    enabled: true,
    notes: body.notes || null,
    createdAt: new Date().toISOString(),
    triggeredAt: null,
  };

  res.status(201).json({
    alert: newAlert,
    message: 'Alert created successfully.',
  });
});

/**
 * PUT /api/alerts/:id
 * Update an existing alert.
 */
router.put('/:id', validate(updateAlertSchema), (req: Request, res: Response) => {
  const alert = mockAlerts.find(a => a.id === req.params.id);

  if (!alert) {
    res.status(404).json({ error: 'NotFound', message: 'Alert not found.' });
    return;
  }

  const updates = req.body as z.infer<typeof updateAlertSchema>;
  const updatedAlert = { ...alert, ...updates, updatedAt: new Date().toISOString() };

  res.json({
    alert: updatedAlert,
    message: 'Alert updated successfully.',
  });
});

/**
 * DELETE /api/alerts/:id
 * Delete an alert.
 */
router.delete('/:id', (req: Request, res: Response) => {
  const alertIndex = mockAlerts.findIndex(a => a.id === req.params.id);

  if (alertIndex === -1) {
    res.status(404).json({ error: 'NotFound', message: 'Alert not found.' });
    return;
  }

  res.json({ message: 'Alert deleted successfully.', deletedId: req.params.id });
});

/**
 * GET /api/alerts/history/recent
 * Returns recently triggered alerts.
 */
router.get('/history/recent', (_req: Request, res: Response) => {
  const triggeredAlerts = [
    { id: 'alert_4', ticker: 'SPY', type: 'options_flow', condition: 'above', value: 5000000, triggeredAt: '2025-02-10T13:45:00Z', triggerPrice: 5234000, message: 'SPY options premium exceeded $5M threshold' },
    { id: 'alert_hist_1', ticker: 'AAPL', type: 'price', condition: 'above', value: 195, triggeredAt: '2025-02-08T10:30:00Z', triggerPrice: 195.12, message: 'AAPL crossed above $195.00' },
    { id: 'alert_hist_2', ticker: 'NVDA', type: 'volume', condition: 'volume_spike', value: 80000000, triggeredAt: '2025-02-06T14:00:00Z', triggerPrice: 89500000, message: 'NVDA volume spike: 89.5M shares (above 80M threshold)' },
  ];

  res.json({
    history: triggeredAlerts,
    total: triggeredAlerts.length,
  });
});

export default router;
