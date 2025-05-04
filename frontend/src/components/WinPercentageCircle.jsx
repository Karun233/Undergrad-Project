import React from 'react';

/**
 * Circular Progress Component for win percentage visualization
 * @param {number} value - Win percentage value (0-100)
 */
const WinPercentageCircle = ({ value }) => {
  // Ensure value is between 0-100
  const percentage = Math.min(Math.max(0, value), 100);
  
  // Calculate the circumference and offset
  const radius = 35;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percentage / 100) * circumference;
  
  // Determine color based on win percentage
  let color;
  if (percentage >= 65) color = "#4CAF50"; // Green for excellent (65%+)
  else if (percentage >= 50) color = "#8BC34A"; // Light green for good (50-65%)
  else if (percentage >= 40) color = "#FFC107"; // Yellow for acceptable (40-50%)
  else color = "#F44336"; // Red for poor (<40%)

  return (
    <div className="position-relative d-flex justify-content-center align-items-center" style={{ height: '80px' }}>
      <svg width="80" height="80" viewBox="0 0 80 80">
        {/* Background circle */}
        <circle 
          cx="40" 
          cy="40" 
          r={radius} 
          fill="none" 
          stroke="#e6e6e6" 
          strokeWidth="6"
        />
        
        {/* Progress circle */}
        <circle 
          cx="40" 
          cy="40" 
          r={radius} 
          fill="none" 
          stroke={color} 
          strokeWidth="6" 
          strokeDasharray={circumference} 
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform="rotate(-90 40 40)"
        />
      </svg>
      
      {/* Value in the center */}
      <div className="position-absolute" style={{ fontSize: '0.9rem', fontWeight: 'bold' }}>
        {percentage.toFixed(0)}%
      </div>
    </div>
  );
};

export default WinPercentageCircle;
