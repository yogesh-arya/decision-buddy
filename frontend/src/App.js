// src/App.js
import React, { useState } from 'react';
import { ProcessProvider } from './context/ProcessContext';
import SearchBar from './components/main-ui/SearchBar';
import Recommendation from './components/main-ui/Recommendation';
import ComparisonView from './components/main-ui/ComparisonView';
import ProcessLog from './components/process-viewer/ProcessLog';
import QueryParser from './components/process-viewer/QueryParser';
import DataFetcher from './components/process-viewer/DataFetcher';
import AIAnalysis from './components/process-viewer/AIAnalysis';
// SampleQueries is imported inside SearchBar

function App() {
  const [activeStep, setActiveStep] = useState('idle');
  const [structuredQuery, setStructuredQuery] = useState(null);
  const [products, setProducts] = useState([]);
  const [recommendation, setRecommendation] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  return (
    <ProcessProvider>
      <div className="container-fluid">
        <div className="row">
          {/* Main UI Panel (left side) */}
          <div className="col-md-8 p-4">
            <div className="p-3 mb-4 bg-primary bg-gradient text-white rounded">
              <h1 className="display-5 fw-bold">DecisionBuddy</h1>
              <p className="fs-5">AI-Powered Product Comparison with Real-Time Data</p>
            </div>
            
            {/* Search Input */}
            <SearchBar 
              setActiveStep={setActiveStep}
              setStructuredQuery={setStructuredQuery}
              setProducts={setProducts}
              setRecommendation={setRecommendation}
              setIsLoading={setIsLoading}
            />
            
            {/* Loading Indicator */}
            {isLoading && (
              <div className="text-center my-5">
                <div className="spinner-border text-primary" role="status">
                  <span className="visually-hidden">Loading...</span>
                </div>
                <p className="mt-2">Working on your request...</p>
              </div>
            )}
            
            {/* Recommendation Display */}
            {recommendation && (
              <Recommendation recommendation={recommendation} />
            )}
            
            {/* Product Comparison View */}
            {products.length > 0 && (
              <ComparisonView 
                products={products} 
                topPicks={recommendation?.topPicks || []}
              />
            )}
          </div>
          
          {/* Process Viewer Panel (right side) */}
          <div className="col-md-4 process-panel p-4">
            <h3 className="mb-4">Backend Process Viewer</h3>
            <div className="mb-3">
              <div className="card">
                <div className="card-header bg-dark text-white">
                  <h5 className="mb-0">Current Step: {activeStep}</h5>
                </div>
                <div className="card-body">
                  {activeStep === 'parsing' && <QueryParser query={structuredQuery} />}
                  {activeStep === 'fetching' && <DataFetcher products={products} />}
                  {activeStep === 'analyzing' && <AIAnalysis recommendation={recommendation} />}
                  {activeStep === 'completed' && <AIAnalysis recommendation={recommendation} />}
                </div>
              </div>
            </div>
            <ProcessLog />
          </div>
        </div>
      </div>
    </ProcessProvider>
  );
}

export default App;