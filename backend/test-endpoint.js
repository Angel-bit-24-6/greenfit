// Script simple para probar conectividad
const express = require('express');
const cors = require('cors');

const app = express();

app.use(cors({
  origin: ['http://localhost:8082', 'http://10.34.222.118:8082'],
  credentials: true
}));

app.use(express.json());

app.post('/api/orders', (req, res) => {
  console.log('📥 Received request:', JSON.stringify(req.body, null, 2));
  
  try {
    const { userId, items, customerEmail, notes } = req.body;
    
    // Validación básica
    if (!userId || !items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields',
        received: { userId, itemsCount: items?.length, customerEmail, notes }
      });
    }
    
    // Verificar cada item
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (!item.id || !item.type || !item.name || !item.price || !item.quantity) {
        return res.status(400).json({
          success: false,
          message: `Item ${i} is missing required fields`,
          received: item
        });
      }
    }
    
    console.log('✅ Validation passed, creating mock order...');
    
    // Crear orden mock
    const mockOrder = {
      orderId: 'test_' + Date.now(),
      totalPrice: items.reduce((sum, item) => sum + (item.price * item.quantity), 0),
      status: 'pending',
      paymentStatus: 'pending',
      items: items,
      createdAt: new Date().toISOString()
    };
    
    res.status(201).json({
      success: true,
      message: 'Test order created successfully',
      data: mockOrder
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

app.get('/api/orders/health', (req, res) => {
  res.json({ 
    success: true,
    message: 'Test server is healthy', 
    timestamp: new Date().toISOString()
  });
});

const PORT = 3002;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Test server running on port ${PORT}`);
  console.log(`📱 Ready to receive requests from frontend`);
});