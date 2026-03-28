import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';

interface QuoteUpdate {
  ticker: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  bid: number;
  ask: number;
  timestamp: string;
}

interface OptionsFlowUpdate {
  id: string;
  ticker: string;
  type: 'call' | 'put';
  sentiment: 'bullish' | 'bearish' | 'neutral';
  strike: number;
  expiration: string;
  premium: number;
  volume: number;
  timestamp: string;
}

const TRACKED_TICKERS: Record<string, number> = {
  AAPL: 198.45, MSFT: 425.67, GOOGL: 178.23, AMZN: 192.34, NVDA: 875.32,
  META: 512.45, TSLA: 245.67, JPM: 198.34, V: 287.56, AMD: 168.90,
  SPY: 589.23, QQQ: 502.34, IWM: 208.45, DIA: 435.21, PLTR: 42.87,
};

// Track current simulated prices
const currentPrices = new Map<string, number>();
for (const [ticker, price] of Object.entries(TRACKED_TICKERS)) {
  currentPrices.set(ticker, price);
}

function generateQuoteUpdate(ticker: string): QuoteUpdate {
  const currentPrice = currentPrices.get(ticker) || 100;
  const volatility = currentPrice * 0.001;
  const change = (Math.random() - 0.48) * volatility;
  const newPrice = +(currentPrice + change).toFixed(2);

  currentPrices.set(ticker, newPrice);

  const basePrice = TRACKED_TICKERS[ticker] || 100;
  const totalChange = +(newPrice - basePrice).toFixed(2);
  const totalChangePercent = +((totalChange / basePrice) * 100).toFixed(2);

  return {
    ticker,
    price: newPrice,
    change: totalChange,
    changePercent: totalChangePercent,
    volume: Math.floor(Math.random() * 500000) + 10000,
    bid: +(newPrice - 0.01).toFixed(2),
    ask: +(newPrice + 0.01).toFixed(2),
    timestamp: new Date().toISOString(),
  };
}

function generateOptionsFlow(): OptionsFlowUpdate {
  const tickers = Object.keys(TRACKED_TICKERS);
  const ticker = tickers[Math.floor(Math.random() * tickers.length)];
  const type = Math.random() > 0.48 ? 'call' : 'put';
  const basePrice = currentPrices.get(ticker) || 100;

  return {
    id: `ws_flow_${Date.now()}_${Math.random().toString(36).substring(7)}`,
    ticker,
    type,
    sentiment: type === 'call'
      ? (Math.random() > 0.3 ? 'bullish' : 'neutral')
      : (Math.random() > 0.3 ? 'bearish' : 'neutral'),
    strike: Math.round(basePrice * (0.9 + Math.random() * 0.2) / 5) * 5,
    expiration: ['2025-03-21', '2025-04-17', '2025-05-16', '2025-06-20'][Math.floor(Math.random() * 4)],
    premium: Math.floor(Math.random() * 3000000) + 50000,
    volume: Math.floor(Math.random() * 5000) + 100,
    timestamp: new Date().toISOString(),
  };
}

export function setupWebSocket(httpServer: HttpServer): Server {
  const io = new Server(httpServer, {
    cors: {
      origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
      methods: ['GET', 'POST'],
      credentials: true,
    },
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  // ==========================================
  // /market namespace - Real-time quote updates
  // ==========================================
  const marketNs = io.of('/market');

  marketNs.on('connection', (socket: Socket) => {
    console.log(`[WS /market] Client connected: ${socket.id}`);

    // Track which tickers this client is subscribed to
    const subscribedTickers = new Set<string>();

    socket.on('subscribe', (tickers: string | string[]) => {
      const tickerList = Array.isArray(tickers) ? tickers : [tickers];
      for (const ticker of tickerList) {
        const upper = ticker.toUpperCase();
        if (TRACKED_TICKERS[upper] !== undefined) {
          subscribedTickers.add(upper);
          socket.join(`ticker:${upper}`);
          console.log(`[WS /market] ${socket.id} subscribed to ${upper}`);

          // Send immediate quote for newly subscribed ticker
          socket.emit('quote', generateQuoteUpdate(upper));
        }
      }
    });

    socket.on('unsubscribe', (tickers: string | string[]) => {
      const tickerList = Array.isArray(tickers) ? tickers : [tickers];
      for (const ticker of tickerList) {
        const upper = ticker.toUpperCase();
        subscribedTickers.delete(upper);
        socket.leave(`ticker:${upper}`);
      }
    });

    socket.on('disconnect', (reason) => {
      console.log(`[WS /market] Client disconnected: ${socket.id} (${reason})`);
      subscribedTickers.clear();
    });
  });

  // Emit quote updates every second
  const quoteInterval = setInterval(() => {
    const tickers = Object.keys(TRACKED_TICKERS);
    // Update 3-5 random tickers each tick
    const numUpdates = Math.floor(Math.random() * 3) + 3;

    for (let i = 0; i < numUpdates; i++) {
      const ticker = tickers[Math.floor(Math.random() * tickers.length)];
      const update = generateQuoteUpdate(ticker);
      marketNs.to(`ticker:${ticker}`).emit('quote', update);
    }
  }, 1000);

  // ==========================================
  // /options namespace - Options flow stream
  // ==========================================
  const optionsNs = io.of('/options');

  optionsNs.on('connection', (socket: Socket) => {
    console.log(`[WS /options] Client connected: ${socket.id}`);

    const subscribedTickers = new Set<string>();

    socket.on('subscribe', (tickers: string | string[]) => {
      const tickerList = Array.isArray(tickers) ? tickers : [tickers];
      for (const ticker of tickerList) {
        const upper = ticker.toUpperCase();
        subscribedTickers.add(upper);
        socket.join(`options:${upper}`);
      }
    });

    socket.on('subscribe:all', () => {
      socket.join('options:all');
      console.log(`[WS /options] ${socket.id} subscribed to all flow`);
    });

    socket.on('unsubscribe', (tickers: string | string[]) => {
      const tickerList = Array.isArray(tickers) ? tickers : [tickers];
      for (const ticker of tickerList) {
        const upper = ticker.toUpperCase();
        subscribedTickers.delete(upper);
        socket.leave(`options:${upper}`);
      }
    });

    socket.on('disconnect', (reason) => {
      console.log(`[WS /options] Client disconnected: ${socket.id} (${reason})`);
      subscribedTickers.clear();
    });
  });

  // Emit options flow updates every 2-5 seconds
  const flowInterval = setInterval(() => {
    const flow = generateOptionsFlow();

    // Emit to ticker-specific room and the "all" room
    optionsNs.to(`options:${flow.ticker}`).emit('flow', flow);
    optionsNs.to('options:all').emit('flow', flow);
  }, 2000 + Math.floor(Math.random() * 3000));

  // ==========================================
  // Default namespace - general notifications
  // ==========================================
  io.on('connection', (socket: Socket) => {
    console.log(`[WS] Client connected: ${socket.id}`);

    socket.on('ping', () => {
      socket.emit('pong', { timestamp: Date.now() });
    });

    socket.on('disconnect', (reason) => {
      console.log(`[WS] Client disconnected: ${socket.id} (${reason})`);
    });
  });

  // Emit market status updates every 30 seconds
  const statusInterval = setInterval(() => {
    const now = new Date();
    const hour = now.getUTCHours();
    const isMarketHours = hour >= 14 && hour < 21; // 9:30 AM - 4 PM ET approx

    io.emit('market:status', {
      status: isMarketHours ? 'open' : 'closed',
      timestamp: now.toISOString(),
      nextEvent: isMarketHours ? 'close' : 'open',
    });
  }, 30000);

  // Cleanup on server close
  io.engine.on('close', () => {
    clearInterval(quoteInterval);
    clearInterval(flowInterval);
    clearInterval(statusInterval);
  });

  console.log('[WebSocket] Server initialized with /market and /options namespaces');

  return io;
}
