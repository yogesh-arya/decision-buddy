// src/components/main-ui/SearchBar.js
import React, { useState } from 'react';
import { processFullQuery } from '../../services/api';
import { useProcess } from '../../context/ProcessContext';
import SampleQueries from './SampleQueries';

const SearchBar = ({ 
  setActiveStep, 
  setStructuredQuery, 
  setProducts, 
  setRecommendation,
  setIsLoading
}) => {
  const [query, setQuery] = useState('');
  const { clearLogs, startPolling, stopPolling } = useProcess();
  
  const handleQueryChange = (e) => {
    setQuery(e.target.value);
  };
  
  const handleSubmit = async (e) => {
    if (e) {
      e.preventDefault();
    }
    
    if (!query.trim()) {
      return;
    }
    
    // Reset everything
    setActiveStep('idle');
    setStructuredQuery(null);
    setProducts([]);
    setRecommendation(null);
    clearLogs();
    
    // Start process
    setIsLoading(true);
    startPolling();
    
    try {
      const result = await processFullQuery(query, {
        onQuerySubmit: () => {
          setActiveStep('initiated');
        },
        onQueryParsed: (structuredQuery) => {
          setActiveStep('parsing');
          setStructuredQuery(structuredQuery);
        },
        onProductsFetched: (products) => {
          setActiveStep('fetching');
          setProducts(products);
        },
        onReviewsStructured: () => {
          setActiveStep('analyzing');
        },
        onRecommendationGenerated: (recommendation) => {
          setActiveStep('completed');
          setRecommendation(recommendation);
        }
      });
      
      // Update state with final results
      setStructuredQuery(result.structuredQuery);
      setProducts(result.products);
      setRecommendation(result.recommendation);
      
    } catch (error) {
      console.error('Error processing query:', error);
      setActiveStep('error');
    } finally {
      setIsLoading(false);
      stopPolling();
    }
  };
  
  return (
    <div className="card shadow-sm mb-4">
      <div className="card-body">
        <form onSubmit={handleSubmit}>
          <div className="mb-3">
            <label htmlFor="query" className="form-label fs-5">What are you looking for?</label>
            <SampleQueries setQuery={setQuery} />
            <div className="input-group">
              <input
                type="text"
                className="form-control form-control-lg"
                id="query"
                placeholder="e.g., Best phone under 20000 with great camera"
                value={query}
                onChange={handleQueryChange}
              />
              <button 
                type="submit" 
                className="btn btn-primary btn-lg"
                disabled={!query.trim()}
              >
                Find Products
              </button>
            </div>
            <div className="form-text">
              Try using natural language like "phone with good camera under 20000" or "laptop under 50000"
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SearchBar;