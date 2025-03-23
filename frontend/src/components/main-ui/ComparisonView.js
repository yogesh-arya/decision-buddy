import React from 'react';
import ProductCard from './ProductCard';

const ComparisonView = ({ products, topPicks = [] }) => {
  return (
    <div className="mb-4">
      <h2 className="mb-3">Product Comparison</h2>
      <div className="row row-cols-1 row-cols-md-2 row-cols-lg-3 g-4">
        {products.map(product => (
          <div className="col" key={product.id}>
            <ProductCard 
              product={product} 
              isTopPick={topPicks.includes(product.id)}
            />
          </div>
        ))}
      </div>
    </div>
  );
};

export default ComparisonView;