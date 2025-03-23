import React from 'react';

const DataFetcher = ({ products }) => {
  if (!products || products.length === 0) {
    return (
      <div className="alert alert-info">
        Waiting for product data...
      </div>
    );
  }
  
  return (
    <div>
      <h5 className="mb-3">Data Collection Process</h5>
      
      <div className="alert alert-success">
        <strong>Found {products.length} products</strong> matching your criteria
      </div>
      
      <div className="mt-3">
        <h6>Real-Time Scraping Process</h6>
        <div className="small text-muted">
          <p>The system is using headless browser (Puppeteer) to:</p>
          <ol className="small">
            <li>Search for products on e-commerce platforms</li>
            <li>Extract product details (title, price, features)</li>
            <li>Collect user reviews for sentiment analysis</li>
            <li>Store structured data for comparison</li>
          </ol>
        </div>
      </div>
      
      <h6 className="mt-4">Data Sample</h6>
      <div className="small bg-light p-2 rounded" style={{ maxHeight: '200px', overflowY: 'auto' }}>
        <pre>{JSON.stringify(products[0], null, 2)}</pre>
      </div>
    </div>
  );
};

export default DataFetcher;