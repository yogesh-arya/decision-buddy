// src/components/main-ui/PortalDropdown.js
import React, { useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';

const PortalDropdown = ({ isOpen, children, onClose }) => {
  const dropdownRef = useRef(null);

  useEffect(() => {
    // Create click outside handler
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        onClose();
      }
    };

    // Add event listener when dropdown is open
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    // Clean up
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Create portal to append dropdown directly to body
  return ReactDOM.createPortal(
    <div 
      className="dropdown-portal-overlay"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'transparent',
        pointerEvents: 'none',
        zIndex: 9990
      }}
    >
      <div 
        ref={dropdownRef}
        className="dropdown-portal-content"
        style={{
          position: 'absolute',
          width: '100%',
          maxWidth: '800px',
          backgroundColor: 'white',
          borderRadius: '0.375rem',
          boxShadow: '0 0.5rem 1rem rgba(0, 0, 0, 0.15)',
          pointerEvents: 'auto',
          zIndex: 9999
        }}
      >
        {children}
      </div>
    </div>,
    document.body
  );
};

export default PortalDropdown;