import React from 'react';
import Plot from 'react-plotly.js';


const RiskRewardLineChart = ({ entries }) => {
  
  const validEntries = entries.filter(entry => entry.risk_reward_ratio !== undefined && entry.risk_reward_ratio !== null);
  
  // Extract dates and risk:reward values
  const dates = validEntries.map(entry => entry.date);
  const ratios = validEntries.map(entry => parseFloat(entry.risk_reward_ratio));
  
  // Determine color based on risk:reward value
  const colors = ratios.map(ratio => {
    if (ratio >= 2.0) return "#4CAF50"; // Green for excellent
    else if (ratio >= 1.5) return "#8BC34A"; // Light green for good
    else if (ratio >= 1.0) return "#FFC107"; // Yellow for acceptable
    else return "#F44336"; // Red for poor
  });

  // Create the plot data
  const data = [{
    x: dates,
    y: ratios,
    type: 'scatter',
    mode: 'lines+markers',
    line: { color: '#2196F3', width: 2 },
    marker: { 
      color: colors,
      size: 6,
      symbol: 'circle'
    },
    name: 'Risk:Reward',
    hoverinfo: 'y',
    hoverlabel: {
      bgcolor: '#FFF',
      bordercolor: '#DDD',
      font: { size: 12 }
    }
  }];

  // Configure the layout
  const layout = {
    autosize: true,
    height: 80,
    margin: { l: 8, r: 8, t: 8, b: 8 },
    xaxis: {
      showticklabels: false,
      showgrid: false,
      showline: false,
      zeroline: false
    },
    yaxis: {
      showticklabels: false,
      showgrid: false,
      showline: false,
      zeroline: false
    },
    showlegend: false,
    hovermode: 'closest',
    paper_bgcolor: 'rgba(0,0,0,0)',
    plot_bgcolor: 'rgba(0,0,0,0)',
    shapes: [
      {
        type: 'line',
        x0: 0,
        y0: 1.0,
        x1: 1,
        y1: 1.0,
        xref: 'paper',
        line: {
          color: '#FFC107',
          width: 1,
          dash: 'dash'
        }
      }
    ]
  };

  // Configure plot options
  const config = {
    displayModeBar: false,
    responsive: true
  };

  return (
    <div style={{ height: '80px', width: '100%' }}>
      {validEntries.length > 1 ? (
        <Plot
          data={data}
          layout={layout}
          config={config}
          style={{ width: '100%', height: '100%' }}
        />
      ) : (
        <div className="d-flex justify-content-center align-items-center h-100 text-muted">
          No risk:reward data available
        </div>
      )}
    </div>
  );
};

export default RiskRewardLineChart;
