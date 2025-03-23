// src/components/main-ui/SampleQueries.js
import React, { useState, useRef, useEffect } from 'react';
import { FaInfoCircle, FaCopy, FaCheck } from 'react-icons/fa';
import PortalDropdown from './PortalDropdown';

const SampleQueries = ({ setQuery }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState(null);
  const buttonRef = useRef(null);
  
  // Calculate dropdown position
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 });
  
  useEffect(() => {
    if (isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setDropdownPosition({
        top: rect.top + rect.height + window.scrollY,
        left: rect.left + window.scrollX
      });
    }
  }, [isOpen]);
  
  // Sample queries organized by category
  const sampleQueries = [
    {
      category: "Smartphones",
      queries: [
        "Best phone under 20000 with great camera",
        "Smartphone with long battery life under 15000",
        "Gaming phone under 25000 with good display",
        "Samsung phone under 25000",
        "Redmi phone under 20000"
      ]
    },
    {
      category: "Laptops",
      queries: [
        "Best laptop under 50000",
        "Gaming laptop under 70000",
        "Lightweight laptop under 60000",
        "HP laptop under 45000"
      ]
    },
    {
      category: "Other Electronics",
      queries: [
        "Best smartwatch under 5000",
        "Wireless earbuds under 5000"
      ]
    }
  ];
  
  // Toggle the sample queries panel
  const togglePanel = () => {
    setIsOpen(!isOpen);
  };
  
  // Handle query selection
  const handleSelectQuery = (query) => {
    setQuery(query);
    setIsOpen(false);
  };
  
  // Handle copy to clipboard
  const handleCopy = (e, query, index) => {
    e.stopPropagation();
    navigator.clipboard.writeText(query).then(() => {
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 2000);
    });
  };
  
  return (
    <div className="mb-2">
      <div className="d-flex align-items-center">
        <button 
          ref={buttonRef}
          className="btn btn-sm btn-outline-info d-flex align-items-center"
          onClick={togglePanel}
          title="Show sample queries"
          type="button"
        >
          <FaInfoCircle className="me-1" /> Sample Queries
        </button>
        {isOpen && (
          <span className="ms-2 small text-muted">
            Click a query to use it or click the copy icon
          </span>
        )}
      </div>
      
      <PortalDropdown 
        isOpen={isOpen} 
        onClose={() => setIsOpen(false)}
      >
        <div 
          className="card border-0 shadow" 
          style={{
            position: 'fixed',
            top: `${dropdownPosition.top}px`,
            left: `${dropdownPosition.left}px`,
            width: '80%',
            maxWidth: '800px',
            maxHeight: '80vh',
            overflow: 'auto'
          }}
        >
          <div className="card-header bg-light d-flex justify-content-between align-items-center">
            <h6 className="mb-0">Sample Queries for Testing</h6>
            <button 
              type="button" 
              className="btn-close" 
              onClick={() => setIsOpen(false)}
            ></button>
          </div>
          <div className="card-body">
            <div className="row">
              {sampleQueries.map((category, catIndex) => (
                <div className="col-md-4 mb-3" key={catIndex}>
                  <h6 className="border-bottom pb-2">{category.category}</h6>
                  <ul className="list-unstyled">
                    {category.queries.map((query, queryIndex) => {
                      const globalIndex = `${catIndex}-${queryIndex}`;
                      return (
                        <li key={queryIndex} className="mb-2">
                          <div className="d-flex align-items-start">
                            <button 
                              className="btn btn-link text-decoration-none text-start p-0 text-truncate"
                              style={{ maxWidth: '85%', fontSize: '0.875rem' }}
                              onClick={() => handleSelectQuery(query)}
                              type="button"
                            >
                              {query}
                            </button>
                            <button 
                              className="btn btn-sm text-muted ms-2 p-0"
                              onClick={(e) => handleCopy(e, query, globalIndex)}
                              title="Copy to clipboard"
                              type="button"
                            >
                              {copiedIndex === globalIndex ? (
                                <FaCheck className="text-success" />
                              ) : (
                                <FaCopy />
                              )}
                            </button>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </div>
      </PortalDropdown>
    </div>
  );
};

export default SampleQueries;