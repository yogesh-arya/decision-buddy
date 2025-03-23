import React from 'react';
const ProductCard = ({ product, isTopPick }) => {
    // Add an error handler for images
    const handleImageError = (e) => {
        e.target.onerror = null;
        e.target.src = `https://via.placeholder.com/200x200?text=${encodeURIComponent(product.title.substring(0, 10))}`;
    };

    return (
        <div className={`card h-100 ${isTopPick ? 'border-primary' : ''}`}>
            {/* Other card content */}
            <div className="text-center p-3">
                <img
                    src={product.image}
                    alt={product.title}
                    className="img-fluid mb-2"
                    style={{ maxHeight: '150px' }}
                    onError={handleImageError}
                />
            </div>
            <div className="card-body">
                <h5 className="card-title">{product.title}</h5>
                <h6 className="card-subtitle mb-2 text-muted">₹{product.price.toLocaleString()}</h6>

                {product.rating && (
                    <div className="mb-2">
                        <span className="badge bg-success">Rating: {product.rating} ★</span>
                    </div>
                )}

                <h6 className="mt-3">Key Features:</h6>
                <ul className="small">
                    {product.features.slice(0, 4).map((feature, idx) => (
                        <li key={idx}>{feature}</li>
                    ))}
                </ul>

                {product.structuredReviews && (
                    <div className="mt-3">
                        <h6>What Users Say:</h6>
                        <ul className="small">
                            {Object.entries(product.structuredReviews)
                                .filter(([key]) => key !== 'sentiment')
                                .slice(0, 3)
                                .map(([feature, sentiment], idx) => (
                                    <li key={idx}>
                                        <strong>{feature}:</strong> {sentiment}
                                    </li>
                                ))}
                        </ul>
                        <p className="small text-muted mt-2">
                            <strong>Overall Sentiment:</strong> {product.structuredReviews.sentiment || "N/A"}
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ProductCard;