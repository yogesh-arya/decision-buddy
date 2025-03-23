import axios from 'axios';

// Base API URL
const API_BASE_URL = 'http://localhost:5000/api';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Submit initial query
export const submitQuery = async (query) => {
  try {
    const response = await api.post('/query', { query });
    return response.data;
  } catch (error) {
    console.error('Error submitting query:', error);
    throw error;
  }
};

// Parse query to structured parameters
export const parseQuery = async (query) => {
  try {
    const response = await api.post('/parse-query', { query });
    return response.data.data;
  } catch (error) {
    console.error('Error parsing query:', error);
    throw error;
  }
};

// Fetch products based on structured query
export const fetchProducts = async (structuredQuery) => {
  try {
    const response = await api.post('/fetch-products', { structuredQuery });
    return response.data.data;
  } catch (error) {
    console.error('Error fetching products:', error);
    throw error;
  }
};

// Structure reviews for a product
export const structureReviews = async (productId) => {
  try {
    const response = await api.post('/structure-reviews', { productId });
    return response.data.data;
  } catch (error) {
    console.error('Error structuring reviews:', error);
    throw error;
  }
};

// Generate product recommendation
export const generateRecommendation = async (structuredQuery) => {
  try {
    const response = await api.post('/summarize-products', { structuredQuery });
    return response.data.data;
  } catch (error) {
    console.error('Error generating recommendation:', error);
    throw error;
  }
};

// Fetch process logs
export const fetchProcessLogs = async () => {
  try {
    const response = await api.get('/process-logs');
    return response.data.data;
  } catch (error) {
    console.error('Error fetching process logs:', error);
    return [];
  }
};

// Clear process logs
export const clearProcessLogs = async () => {
  try {
    const response = await api.delete('/process-logs');
    return response.data;
  } catch (error) {
    console.error('Error clearing process logs:', error);
    throw error;
  }
};

// All-in-one function to process user query
export const processFullQuery = async (query, callbacks = {}) => {
  const {
    onQuerySubmit,
    onQueryParsed,
    onProductsFetched,
    onReviewsStructured,
    onRecommendationGenerated
  } = callbacks;
  
  try {
    // Step 1: Submit initial query
    onQuerySubmit?.();
    await submitQuery(query);
    
    // Step 2: Parse query
    const structuredQuery = await parseQuery(query);
    onQueryParsed?.(structuredQuery);
    
    // Step 3: Fetch products
    const products = await fetchProducts(structuredQuery);
    onProductsFetched?.(products);
    
    // Step 4: Structure reviews for each product
    const productsWithReviews = [...products];
    for (const product of productsWithReviews) {
      const structuredReviews = await structureReviews(product.id);
      product.structuredReviews = structuredReviews;
    }
    onReviewsStructured?.(productsWithReviews);
    
    // Step 5: Generate recommendation
    const recommendation = await generateRecommendation(structuredQuery);
    onRecommendationGenerated?.(recommendation);
    
    return {
      structuredQuery,
      products: productsWithReviews,
      recommendation
    };
  } catch (error) {
    console.error('Error in full query process:', error);
    throw error;
  }
};