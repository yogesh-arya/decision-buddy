import React, { createContext, useState, useContext, useEffect } from 'react';
import { fetchProcessLogs } from '../services/api';

// Create context
const ProcessContext = createContext();

export const useProcess = () => useContext(ProcessContext);

export const ProcessProvider = ({ children }) => {
  const [processLogs, setProcessLogs] = useState([]);
  const [pollingActive, setPollingActive] = useState(false);

  // Add a new log entry
  const addLogEntry = (step, data) => {
    const newEntry = {
      timestamp: new Date().toISOString(),
      step,
      data
    };
    
    setProcessLogs(prevLogs => [...prevLogs, newEntry]);
  };

  // Clear all logs
  const clearLogs = () => {
    setProcessLogs([]);
  };

  // Start polling logs from server (for displaying real-time logs)
  const startPolling = () => {
    setPollingActive(true);
  };

  // Stop polling
  const stopPolling = () => {
    setPollingActive(false);
  };

  // Effect for polling logs from server
  useEffect(() => {
    let intervalId;
    
    if (pollingActive) {
      // Initial fetch
      fetchProcessLogs().then(logs => {
        if (logs && logs.length > 0) {
          setProcessLogs(logs);
        }
      }).catch(err => {
        console.error('Error fetching logs:', err);
      });
      
      // Setup interval for polling
      intervalId = setInterval(() => {
        fetchProcessLogs().then(logs => {
          if (logs && logs.length > 0) {
            setProcessLogs(logs);
          }
        }).catch(err => {
          console.error('Error fetching logs:', err);
        });
      }, 2000); // Poll every 2 seconds
    }
    
    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [pollingActive]);

  // Context value
  const value = {
    processLogs,
    addLogEntry,
    clearLogs,
    startPolling,
    stopPolling
  };

  return (
    <ProcessContext.Provider value={value}>
      {children}
    </ProcessContext.Provider>
  );
};