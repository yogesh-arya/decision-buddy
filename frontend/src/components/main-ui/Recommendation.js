import React from 'react';

const Recommendation = ({ recommendation }) => {
  // Split recommendation into paragraphs
  const paragraphs = recommendation.recommendation
    ? recommendation.recommendation.split('\n').filter(p => p.trim())
    : [];
  
  return (
    <div className="card shadow-sm mb-4">
      <div className="card-header bg-success bg-gradient text-white">
        <h3 className="mb-0">AI Recommendation</h3>
      </div>
      <div className="card-body">
        {paragraphs.map((paragraph, index) => (
          <p key={index} className={index === 0 ? 'lead' : ''}>
            {paragraph}
          </p>
        ))}
      </div>
    </div>
  );
};

export default Recommendation;