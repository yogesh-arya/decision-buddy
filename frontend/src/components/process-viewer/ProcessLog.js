// src/components/process-viewer/ProcessLog.js
import React from 'react';
import { useProcess } from '../../context/ProcessContext';

const ProcessLog = () => {
  const { processLogs, clearLogs } = useProcess();
  
  // Helper function to format JSON for display
  const formatJSON = (data) => {
    try {
      if (typeof data === 'object') {
        return JSON.stringify(data, null, 2);
      }
      return data;
    } catch (e) {
      return 'Error formatting data';
    }
  };
  
  const getStepColor = (step) => {
    const colors = {
      'Received user query': 'info',
      'Parsing natural language query': 'primary',
      'Query parsed to structured parameters': 'success',
      'Initiating product search on Flipkart': 'warning',
      'Products fetched successfully': 'success',
      'Analyzing reviews for product': 'warning',
      'Reviews structured by sentiment and features': 'success',
      'Generating personalized recommendation': 'warning',
      'AI recommendation generated': 'success',
      'Error': 'danger'
    };
    
    // If the step contains "Error", return danger color
    if (step.toLowerCase().includes('error')) {
      return 'danger';
    }
    
    return colors[step] || 'secondary';
  };
  
  return (
    <div className="mt-4">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h4>Process Logs</h4>
        <button 
          className="btn btn-sm btn-outline-danger"
          onClick={clearLogs}
        >
          Clear Logs
        </button>
      </div>
      
      {processLogs.length === 0 && (
        <div className="alert alert-info">
          No process logs yet. Search for a product to see the process in action.
        </div>
      )}
      
      <div className="process-log-container" style={{ maxHeight: '500px', overflowY: 'auto' }}>
        {/* Reverse the logs array to show latest entries first */}
        {[...processLogs].reverse().map((log, index) => (
          <div 
            key={index} 
            className={`process-step mb-2 p-2 border-start border-${getStepColor(log.step)} border-3`}
          >
            <div className="d-flex justify-content-between">
              <span className={`badge bg-${getStepColor(log.step)}`}>{log.step}</span>
              <small className="text-muted">
                {new Date(log.timestamp).toLocaleTimeString()}
              </small>
            </div>
            
            {log.data && (
              <div className="mt-2">
                <pre className="small bg-light p-2 rounded" style={{ maxHeight: '100px', overflowY: 'auto' }}>
                  {formatJSON(log.data)}
                </pre>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default ProcessLog;