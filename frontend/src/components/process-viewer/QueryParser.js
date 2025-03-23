import React from 'react';

const QueryParser = ({ query }) => {
  if (!query) {
    return (
      <div className="alert alert-info">
        Waiting for query parsing...
      </div>
    );
  }
  
  return (
    <div>
      <h5 className="mb-3">Structured Query Parameters</h5>
      <div className="table-responsive">
        <table className="table table-sm">
          <tbody>
            {query.category && (
              <tr>
                <th>Category</th>
                <td>{query.category}</td>
              </tr>
            )}
            {query.budget && (
              <tr>
                <th>Budget</th>
                <td>₹{query.budget.toLocaleString()}</td>
              </tr>
            )}
            {query.priority && query.priority.length > 0 && (
              <tr>
                <th>Priorities</th>
                <td>
                  {query.priority.map((p, i) => (
                    <span key={i} className="badge bg-primary me-1">{p}</span>
                  ))}
                </td>
              </tr>
            )}
            {query.brand && query.brand.length > 0 && (
              <tr>
                <th>Preferred Brands</th>
                <td>
                  {query.brand.map((b, i) => (
                    <span key={i} className="badge bg-secondary me-1">{b}</span>
                  ))}
                </td>
              </tr>
            )}
            {query.avoid && query.avoid.length > 0 && (
              <tr>
                <th>Avoid</th>
                <td>
                  {query.avoid.map((a, i) => (
                    <span key={i} className="badge bg-danger me-1">{a}</span>
                  ))}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      
      <div className="mt-3">
        <h6>GPT-4 Query Parsing</h6>
        <div className="small text-muted">
          <p>The natural language query is analyzed using NLU to extract structured parameters:</p>
          <ol className="small">
            <li>Input text is sent to GPT-4 with specific prompting</li>
            <li>Model extracts key entities (category, budget, priorities)</li>
            <li>Results are structured as JSON for downstream processing</li>
          </ol>
        </div>
      </div>
    </div>
  );
};

export default QueryParser;