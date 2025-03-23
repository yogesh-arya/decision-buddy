import React from 'react';

const AIAnalysis = ({ recommendation }) => {
  if (!recommendation) {
    return (
      <div className="alert alert-info">
        Waiting for AI analysis...
      </div>
    );
  }
  
  return (
    <div>
      <h5 className="mb-3">AI Analysis Process</h5>
      
      <div className="alert alert-success">
        <strong>Analysis Complete!</strong> Recommendation generated based on your preferences
      </div>
      
      <div className="mt-3">
        <h6>GPT Recommendation Process</h6>
        <div className="small text-muted">
          <p>The AI follows these steps to generate a personalized recommendation:</p>
          <ol className="small">
            <li>Structure user reviews by feature</li>
            <li>Map product specs to user priorities</li>
            <li>Compare multiple products based on weighted criteria</li>
            <li>Generate natural language recommendation</li>
            <li>Highlight top picks for easy decision-making</li>
          </ol>
        </div>
      </div>
      
      {recommendation.topPicks && (
        <div className="mt-3">
          <h6>Top Picks</h6>
          <div className="small bg-light p-2 rounded">
            <p>The AI selected the following product IDs as top recommendations:</p>
            <ul className="small">
              {recommendation.topPicks.map((id, idx) => (
                <li key={idx}>{id}</li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};

export default AIAnalysis;