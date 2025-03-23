// controllers/queryController.js
const express = require('express');
const router = express.Router();
const parserService = require('../services/parserService');
const scraperService = require('../services/scraperService');
const summarizerService = require('../services/summarizerService');

// Store temporary data for POC (in-memory storage)
let tempProductData = [];
let processLog = [];

// Helper to log process steps with actual data
const logProcess = (step, data) => {
  const timestamp = new Date().toISOString();
  
  // Create a copy of the data to avoid circular references
  let logData = null;
  
  if (data) {
    try {
      if (typeof data === 'object') {
        // For large objects, create a summary instead of logging everything
        if (Array.isArray(data)) {
          // For arrays, show length and first item summary
          logData = {
            count: data.length,
            sample: data.length > 0 ? summarizeObject(data[0]) : null
          };
        } else {
          // For other objects, create a summary
          logData = summarizeObject(data);
        }
      } else {
        // For primitive values, log as is
        logData = data;
      }
    } catch (e) {
      logData = 'Error processing log data';
    }
  }
  
  processLog.push({
    timestamp,
    step,
    data: logData
  });
  
  // Keep only the last 100 log entries
  if (processLog.length > 100) {
    processLog = processLog.slice(-100);
  }
  
  console.log(`PROCESS LOG: ${step}`);
};

// Helper to create a summary of an object for logging
const summarizeObject = (obj) => {
  if (!obj) return null;
  
  // For products, create a brief summary
  if (obj.id && obj.title && obj.price) {
    return {
      id: obj.id,
      title: obj.title ? (obj.title.length > 30 ? obj.title.substring(0, 30) + '...' : obj.title) : 'No title',
      price: obj.price,
      features_count: obj.features ? obj.features.length : 0
    };
  }
  
  // For structured query, keep as is (it's already small)
  if (obj.category || obj.budget || obj.priority) {
    return obj;
  }
  
  // For other objects, keep top-level keys but limit nested objects
  const summary = {};
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'object' && value !== null) {
      if (Array.isArray(value)) {
        summary[key] = `Array(${value.length})`;
      } else {
        summary[key] = 'Object';
      }
    } else if (typeof value === 'string' && value.length > 50) {
      summary[key] = value.substring(0, 50) + '...';
    } else {
      summary[key] = value;
    }
  }
  
  return summary;
};

// Submit user query
router.post('/query', async (req, res) => {
  try {
    const { query } = req.body;
    
    if (!query) {
      return res.status(400).json({ 
        success: false, 
        message: 'Query is required' 
      });
    }
    
    logProcess('Received user query', { query });
    
    // Create a process ID for this query session
    const processId = Date.now().toString();
    
    res.status(200).json({ 
      success: true, 
      message: 'Query received successfully',
      processId
    });
  } catch (error) {
    console.error('Error in query endpoint:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error'
    });
  }
});

// Parse query to structured parameters
router.post('/parse-query', async (req, res) => {
  try {
    const { query } = req.body;
    
    if (!query) {
      return res.status(400).json({ 
        success: false, 
        message: 'Query is required' 
      });
    }
    
    logProcess('Parsing natural language query', { query });
    
    const structuredQuery = await parserService.parseQuery(query);
    
    logProcess('Query parsed to structured parameters', structuredQuery);
    
    res.status(200).json({ 
      success: true, 
      data: structuredQuery
    });
  } catch (error) {
    console.error('Error in parse-query endpoint:', error);
    logProcess('Error parsing query', { error: error.message });
    res.status(500).json({ 
      success: false, 
      message: 'Failed to parse query'
    });
  }
});

// Fetch products based on structured query
router.post('/fetch-products', async (req, res) => {
  try {
    const { structuredQuery } = req.body;
    
    if (!structuredQuery) {
      return res.status(400).json({ 
        success: false, 
        message: 'Structured query is required' 
      });
    }
    
    logProcess('Initiating product search on Flipkart', structuredQuery);
    
    const products = await scraperService.fetchProducts(structuredQuery);
    
    // Store fetched products in memory for this POC
    tempProductData = products;
    
    logProcess('Products fetched successfully', { count: products.length, products: products.map(p => ({ id: p.id, title: p.title.substring(0, 30) + '...', price: p.price })) });
    
    res.status(200).json({ 
      success: true, 
      data: products
    });
  } catch (error) {
    console.error('Error in fetch-products endpoint:', error);
    logProcess('Error fetching products', { error: error.message });
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch products'
    });
  }
});

// Get product reviews and structure them
router.post('/structure-reviews', async (req, res) => {
  try {
    const { productId } = req.body;
    
    if (!productId) {
      return res.status(400).json({ 
        success: false, 
        message: 'Product ID is required' 
      });
    }
    
    // Find product in the temporary storage
    const product = tempProductData.find(p => p.id === productId);
    
    if (!product) {
      return res.status(404).json({ 
        success: false, 
        message: 'Product not found' 
      });
    }
    
    logProcess('Analyzing reviews for product', { 
      productId, 
      productTitle: product.title,
      reviewCount: product.reviews ? product.reviews.length : 0
    });
    
    const structuredReviews = await scraperService.structureReviews(product);
    
    // Update the product with structured reviews
    product.structuredReviews = structuredReviews;
    
    logProcess('Reviews structured by sentiment and features', { 
      productId, 
      structuredReviews
    });
    
    res.status(200).json({ 
      success: true, 
      data: structuredReviews
    });
  } catch (error) {
    console.error('Error in structure-reviews endpoint:', error);
    logProcess('Error structuring reviews', { error: error.message });
    res.status(500).json({ 
      success: false, 
      message: 'Failed to structure reviews'
    });
  }
});

// Generate summary and recommendations
router.post('/summarize-products', async (req, res) => {
  try {
    const { structuredQuery } = req.body;
    
    if (!structuredQuery || tempProductData.length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Structured query and fetched products are required' 
      });
    }
    
    logProcess('Generating personalized recommendation', { 
      structuredQuery, 
      productCount: tempProductData.length,
      productSample: tempProductData.slice(0, 2).map(p => ({ title: p.title, price: p.price }))
    });
    
    const summary = await summarizerService.generateRecommendation(
      structuredQuery, 
      tempProductData
    );
    
    logProcess('AI recommendation generated', { 
      topPicks: summary.topPicks,
      recommendationPreview: summary.recommendation ? summary.recommendation.substring(0, 100) + '...' : 'No recommendation'
    });
    
    res.status(200).json({ 
      success: true, 
      data: summary
    });
  } catch (error) {
    console.error('Error in summarize-products endpoint:', error);
    logProcess('Error generating recommendation', { error: error.message });
    res.status(500).json({ 
      success: false, 
      message: 'Failed to generate recommendation'
    });
  }
});

// Get process logs (for debugging UI)
router.get('/process-logs', (req, res) => {
  res.status(200).json({ 
    success: true, 
    data: processLog
  });
});

// Clear process logs
router.delete('/process-logs', (req, res) => {
  processLog = [];
  res.status(200).json({ 
    success: true, 
    message: 'Process logs cleared'
  });
});

module.exports = router;