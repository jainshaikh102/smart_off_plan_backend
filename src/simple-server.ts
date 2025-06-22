import express from 'express';
import cors from 'cors';

const app = express();
const PORT = process.env.PORT || 5000;

// Basic middleware
app.use(cors());
app.use(express.json());

// Test route
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Smart Off Plan Backend is running!',
    timestamp: new Date().toISOString(),
  });
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'Backend is healthy!',
    timestamp: new Date().toISOString(),
  });
});

// Simple properties endpoint
app.get('/api/properties', (req, res) => {
  const mockProperties = [
    {
      id: 1,
      name: "Marina Vista Towers",
      area: "Dubai Marina",
      min_price: 1200000,
      max_price: 2500000,
      price_currency: "AED",
      cover_image_url: JSON.stringify([{
        url: "https://images.unsplash.com/photo-1613490493576-7fde63acd811?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80"
      }]),
      developer: "Emaar Properties",
      sale_status: "Available",
      status: "Off-plan",
      completion_datetime: "2025-06-15T00:00:00Z",
      coordinates: "25.0771, 55.1408",
    },
    {
      id: 2,
      name: "Downtown Heights",
      area: "Downtown Dubai",
      min_price: 2200000,
      max_price: 4500000,
      price_currency: "AED",
      cover_image_url: JSON.stringify([{
        url: "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80"
      }]),
      developer: "Damac Properties",
      sale_status: "Available",
      status: "Under Construction",
      completion_datetime: "2025-03-20T00:00:00Z",
      coordinates: "25.1972, 55.2744",
    }
  ];

  res.json({
    success: true,
    data: mockProperties,
    message: "Properties fetched successfully",
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`
🚀 Simple Backend Server Started!
🌐 Server: http://localhost:${PORT}
📊 Health Check: http://localhost:${PORT}/api/health
🏠 Properties API: http://localhost:${PORT}/api/properties
  `);
});

export default app;
