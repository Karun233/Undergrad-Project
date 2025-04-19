import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import axios from 'axios';
import Navbar from '../components/Navbar';
import { ACCESS_TOKEN } from "../constants";
import MonteCarloSimulation from '../components/MonteCarloSimulation';
import Plot from 'react-plotly.js';

// Your API base URL (should match what you use in other components)
const API_BASE_URL = 'http://localhost:8000/api';

// Risk-to-Reward Line Chart Component (Compact Version)
const RiskRewardLineChart = ({ entries }) => {
  // Filter entries that have risk_reward_ratio
  const validEntries = entries.filter(entry => entry.risk_reward_ratio !== undefined && entry.risk_reward_ratio !== null);
  
  // Calculate average risk:reward ratio
  const avgRiskReward = validEntries.length > 0
    ? validEntries.reduce((sum, entry) => sum + parseFloat(entry.risk_reward_ratio), 0) / validEntries.length
    : 0;
  
  // Extract dates and risk:reward values (last 15 trades for compact display)
  const recentEntries = validEntries.slice(Math.max(0, validEntries.length - 15));
  const dates = recentEntries.map(entry => entry.date);
  const ratios = recentEntries.map(entry => parseFloat(entry.risk_reward_ratio));
  
  // Create the plot data
  const data = [{
    x: Array.from({ length: ratios.length }, (_, i) => i),
    y: ratios,
    type: 'scatter',
    mode: 'lines',
    line: { color: '#4CAF50', width: 1.5 },
    hoverinfo: 'y',
    name: 'Risk:Reward',
  }];

  // Configure the layout
  const layout = {
    autosize: true,
    height: 60,
    width: 180,
    margin: { l: 0, r: 0, t: 0, b: 0, pad: 0 },
    xaxis: {
      showgrid: false,
      zeroline: false,
      showticklabels: false,
      fixedrange: true,
    },
    yaxis: {
      showgrid: false,
      zeroline: false,
      showticklabels: false,
      fixedrange: true,
    },
    showlegend: false,
    plot_bgcolor: 'rgba(0,0,0,0)',
    paper_bgcolor: 'rgba(0,0,0,0)',
  };

  // Configure plot options
  const config = {
    displayModeBar: false,
    responsive: true,
    staticPlot: true,
  };

  return (
    <div className="col-md-4">
      <div className="card shadow-sm mb-4">
        <div className="card-body">
          <h6 className="text-muted">Profit Factor</h6>
          <div className="d-flex align-items-center">
            <div>
              <h3 className="mb-0">{avgRiskReward.toFixed(2)}</h3>
            </div>
            <div className="ms-3 flex-grow-1">
              {validEntries.length > 1 ? (
                <Plot
                  data={data}
                  layout={layout}
                  config={config}
                  style={{ width: '100%', height: '60px' }}
                />
              ) : (
                <div className="text-muted small">Not enough data</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Daily Win Rate by Day of Week Chart Component
const DailyWinRateChart = ({ entries }) => {
  // Skip if no entries
  if (!entries || entries.length === 0) {
    return (
      <div className="col-md-6">
        <div className="card shadow-sm mb-4">
          <div className="card-body">
            <h6 className="text-muted">Win Rate by Day</h6>
            <p className="text-center">Not enough data</p>
          </div>
        </div>
      </div>
    );
  }

  // Parse dates and group entries by day of week
  // Using clearer labels to distinguish between Tuesday and Thursday
  const dayMap = {
    0: 'Su', // Sunday
    1: 'M',
    2: 'Tu',
    3: 'W',
    4: 'Th',
    5: 'F',
    6: 'Sa' // Saturday
  };

  // Initialize counters for each day with improved labels
  const days = ['M', 'Tu', 'W', 'Th', 'F', 'Sa', 'Su'];
  const dayTotals = {};
  const dayWins = {};
  
  // Initialize the counters for each day
  days.forEach(day => {
    dayTotals[day] = 0;
    dayWins[day] = 0;
  });

  // Count trades and wins for each day
  entries.forEach(entry => {
    if (entry.date) {
      const date = new Date(entry.date);
      const dayIndex = date.getDay(); // 0 = Sunday, 1 = Monday, etc.
      const dayKey = dayMap[dayIndex];
      
      dayTotals[dayKey]++;
      if (entry.outcome === "Win") {
        dayWins[dayKey]++;
      }
    }
  });

  // Calculate win percentage for each day
  const winRates = days.map(day => {
    if (dayTotals[day] === 0) return 0;
    return (dayWins[day] / dayTotals[day]) * 100;
  });

  // Generate a sleek gradient for the bars
  const generateGradient = (value) => {
    // Base gradient colors
    const topColor = value >= 70 ? 'rgba(76, 175, 80, 1)' : 
                   value >= 50 ? 'rgba(139, 195, 74, 1)' : 
                   value >= 30 ? 'rgba(205, 220, 57, 1)' : 'rgba(255, 193, 7, 1)';
    
    const bottomColor = value >= 70 ? 'rgba(76, 175, 80, 0.7)' : 
                      value >= 50 ? 'rgba(139, 195, 74, 0.7)' : 
                      value >= 30 ? 'rgba(205, 220, 57, 0.7)' : 'rgba(255, 193, 7, 0.7)';
    
    return [topColor, bottomColor];
  };

  // Prepare colors with gradients for a sleeker look
  const colorGradients = winRates.map(generateGradient);

  // Create the plot data with improved styling
  const data = [{
    x: days,
    y: winRates,
    type: 'bar',
    marker: {
      color: winRates.map((_, i) => colorGradients[i][0]),
      colorscale: 'YlGn',
      line: {
        color: winRates.map((_, i) => colorGradients[i][1]),
        width: 1.5
      }
    },
    hovertemplate: '<b>%{y:.1f}%</b><extra></extra>',
    width: 0.6, // Narrower bars for a sleeker look
    // Rounded corners for the bars
    textfont: {
      family: 'Arial, sans-serif',
      size: 10,
      color: 'white'
    }
  }];

  // Configure the layout with enhanced styling
  const layout = {
    autosize: true,
    height: 220,
    margin: { l: 40, r: 10, t: 20, b: 40 },
    xaxis: {
      tickfont: { 
        size: 10,
        family: 'Arial, sans-serif',
        color: '#666'
      },
      tickangle: 0,
      showgrid: false,
    },
    yaxis: {
      title: {
        text: 'Win %',
        font: { 
          size: 10,
          family: 'Arial, sans-serif',
          color: '#666'
        }
      },
      tickfont: { 
        size: 10,
        family: 'Arial, sans-serif',
        color: '#666'
      },
      range: [0, 100],
      showgrid: true,
      gridcolor: 'rgba(0,0,0,0.05)',
      gridwidth: 1
    },
    showlegend: false,
    plot_bgcolor: 'rgba(0,0,0,0)',
    paper_bgcolor: 'rgba(0,0,0,0)',
    bargap: 0.3, // Gap between bars
    shapes: [{
      type: 'line',
      x0: -0.5,
      y0: 50,
      x1: days.length - 0.5,
      y1: 50,
      line: {
        color: 'rgba(0,0,0,0.1)',
        width: 1,
        dash: 'dash'
      }
    }]
  };

  // Configure plot options
  const config = {
    displayModeBar: false,
    responsive: true,
  };

  return (
    <div className="col-md-6">
      <div className="card shadow-sm mb-4">
        <div className="card-body">
          <h6 className="text-muted">Win Rate by Day</h6>
          <Plot
            data={data}
            layout={layout}
            config={config}
            style={{ width: '100%', height: '220px' }}
          />
        </div>
      </div>
    </div>
  );
};

// Buy vs Sell Comparison Chart Component
const BuyVsSellComparisonChart = ({ entries }) => {
  // Skip if no entries
  if (!entries || entries.length === 0) {
    return (
      <div className="col-md-6">
        <div className="card shadow-sm mb-4">
          <div className="card-body">
            <h6 className="text-muted">Buy vs Sell Comparison</h6>
            <p className="text-center">Not enough data</p>
          </div>
        </div>
      </div>
    );
  }

  // Count buy and sell trades
  const buyTrades = entries.filter(entry => entry.direction === "Buy" || entry.direction === "Long");
  const sellTrades = entries.filter(entry => entry.direction === "Sell" || entry.direction === "Short");
  
  // Count winning buy and sell trades
  const winningBuyTrades = buyTrades.filter(entry => entry.outcome === "Win");
  const winningSellTrades = sellTrades.filter(entry => entry.outcome === "Win");
  
  // Calculate win rates
  const buyWinRate = buyTrades.length > 0 ? (winningBuyTrades.length / buyTrades.length) * 100 : 0;
  const sellWinRate = sellTrades.length > 0 ? (winningSellTrades.length / sellTrades.length) * 100 : 0;
  
  // Prepare data for the chart
  const data = [
    {
      x: ['Buy', 'Sell'],
      y: [buyTrades.length, sellTrades.length],
      type: 'bar',
      name: 'Total Trades',
      marker: {
        color: ['rgba(54, 162, 235, 0.7)', 'rgba(255, 99, 132, 0.7)'],
        line: {
          color: ['rgba(54, 162, 235, 1)', 'rgba(255, 99, 132, 1)'],
          width: 1
        }
      }
    },
    {
      x: ['Buy', 'Sell'],
      y: [winningBuyTrades.length, winningSellTrades.length],
      type: 'bar',
      name: 'Winning Trades',
      marker: {
        color: ['rgba(75, 192, 192, 0.7)', 'rgba(153, 102, 255, 0.7)'],
        line: {
          color: ['rgba(75, 192, 192, 1)', 'rgba(153, 102, 255, 1)'],
          width: 1
        }
      }
    }
  ];

  // Configure the layout
  const layout = {
    autosize: true,
    height: 300,
    barmode: 'group',
    title: {
      text: 'Buy vs Sell Comparison',
      font: {
        family: 'Arial, sans-serif',
        size: 16
      }
    },
    xaxis: {
      title: 'Direction',
      titlefont: {
        family: 'Arial, sans-serif',
        size: 12
      }
    },
    yaxis: {
      title: 'Number of Trades',
      titlefont: {
        family: 'Arial, sans-serif',
        size: 12
      }
    },
    legend: {
      x: 0,
      y: 1.1,
      orientation: 'h'
    },
    annotations: [
      {
        x: 'Buy',
        y: buyTrades.length,
        text: buyWinRate.toFixed(1) + '%',
        showarrow: false,
        font: {
          family: 'Arial',
          size: 12,
          color: 'black'
        },
        yshift: 20
      },
      {
        x: 'Sell',
        y: sellTrades.length,
        text: sellWinRate.toFixed(1) + '%',
        showarrow: false,
        font: {
          family: 'Arial',
          size: 12,
          color: 'black'
        },
        yshift: 20
      }
    ],
    margin: {
      l: 50,
      r: 50,
      b: 50,
      t: 50,
      pad: 4
    }
  };

  // Configure plot options
  const config = {
    displayModeBar: false,
    responsive: true
  };

  return (
    <div className="col-md-6">
      <div className="card shadow-sm mb-4">
        <div className="card-body">
          <Plot
            data={data}
            layout={layout}
            config={config}
            style={{ width: '100%', height: '100%' }}
          />
          <div className="d-flex justify-content-around mt-3 text-center">
            <div>
              <h6 className="text-primary">Buy Win Rate</h6>
              <h4>{buyWinRate.toFixed(1)}%</h4>
              <small className="text-muted">{winningBuyTrades.length} of {buyTrades.length} trades</small>
            </div>
            <div>
              <h6 className="text-danger">Sell Win Rate</h6>
              <h4>{sellWinRate.toFixed(1)}%</h4>
              <small className="text-muted">{winningSellTrades.length} of {sellTrades.length} trades</small>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Circular Progress Component for win percentage visualization
const CircularProgress = ({ value }) => {
  // Ensure value is between 0-100
  const percentage = Math.min(Math.max(0, value), 100);
  
  // Calculate the circumference and offset
  const radius = 70;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percentage / 100) * circumference;
  
  // Determine color based on win percentage
  let color;
  if (percentage >= 65) color = "#4CAF50"; // Green for excellent (65%+)
  else if (percentage >= 50) color = "#8BC34A"; // Light green for good (50-65%)
  else if (percentage >= 40) color = "#FFC107"; // Yellow for acceptable (40-50%)
  else color = "#F44336"; // Red for poor (<40%)

  return (
    <div className="position-relative d-flex justify-content-center align-items-center" style={{ height: '160px' }}>
      <svg width="160" height="160" viewBox="0 0 160 160">
        {/* Background circle */}
        <circle 
          cx="80" 
          cy="80" 
          r={radius} 
          fill="none" 
          stroke="#e6e6e6" 
          strokeWidth="12"
        />
        
        {/* Progress circle */}
        <circle 
          cx="80" 
          cy="80" 
          r={radius} 
          fill="none" 
          stroke={color} 
          strokeWidth="12" 
          strokeDasharray={circumference} 
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform="rotate(-90 80 80)"
        />
      </svg>
      
      {/* Value in the center */}
      <div className="position-absolute" style={{ fontSize: '2rem', fontWeight: 'bold' }}>
        {percentage.toFixed(0)}%
      </div>
    </div>
  );
};

// Metric Card Component for displaying statistics
const MetricCard = ({ title, value, description, color }) => {
  return (
    <div className="card shadow-sm mb-4">
      <div className="card-body">
        <h6 className="text-muted">{title} <i className="bi bi-info-circle"></i></h6>
        <h3 className={`fw-bold ${color}`}>{value}</h3>
        {description && <small className="text-muted">{description}</small>}
      </div>
    </div>
  );
};

function Dashboard() {
  const { id } = useParams(); // Get the journal ID from the URL
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [aiFeedback, setAiFeedback] = useState(null);
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const [feedbackError, setFeedbackError] = useState(null);
  const [showAIFeedback, setShowAIFeedback] = useState(false);
  const [metrics, setMetrics] = useState({
    winRate: 0,
    totalTrades: 0,
    wins: 0,
    losses: 0,
    breakeven: 0,
    avgRiskReward: 0,
    totalProfit: 0,
    averageWin: 0,
    averageLoss: 0
  });

  // Sort entries by date (newest to oldest)
  const sortedEntries = entries.slice().sort((a, b) => {
    return new Date(b.date) - new Date(a.date);
  });

  // Fetch journal entries
  useEffect(() => {
    const fetchEntries = async () => {
      try {
        setLoading(true);
        const response = await axios.get(`${API_BASE_URL}/journal/${id}/entries/`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem(ACCESS_TOKEN)}`
          }
        });
        
        if (Array.isArray(response.data)) {
          setEntries(response.data);
          calculateMetrics(response.data);
        } else {
          setEntries([]);
          setError("No entries found or invalid data format");
        }
      } catch (error) {
        console.error("Error fetching entries:", error);
        setError("Failed to load journal entries");
      } finally {
        setLoading(false);
      }
    };

    fetchEntries();
  }, [id]);

  // Request AI feedback analysis
  const generateAIFeedback = async () => {
    setFeedbackLoading(true);
    setFeedbackError(null);
    setShowAIFeedback(true);
    
    try {
      const response = await axios.post(
        `${API_BASE_URL}/journal/${id}/generate-feedback/`,
        {},
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem(ACCESS_TOKEN)}`
          }
        }
      );
      
      setAiFeedback(response.data);
    } catch (error) {
      console.error("Error generating AI feedback:", error);
      setFeedbackError("Unable to generate trading feedback. Please try again later.");
    } finally {
      setFeedbackLoading(false);
    }
  };
  
  // Calculate metrics from entries
  const calculateMetrics = (entries) => {
    // Count wins, losses, etc.
    const wins = entries.filter(entry => entry.outcome === "Win").length;
    const losses = entries.filter(entry => entry.outcome === "Loss").length;
    const breakeven = entries.filter(entry => entry.outcome === "Breakeven").length;
    const totalTrades = entries.length;
    
    // Calculate win rate (excluding breakeven trades from the denominator)
    const countedTrades = wins + losses;
    const winRate = countedTrades > 0 ? (wins / countedTrades) * 100 : 0;
    
    // Calculate profit metrics
    let totalProfit = 0;
    let grossProfit = 0;
    let grossLoss = 0;
    
    // Sum up profits and losses
    entries.forEach(entry => {
      const profitLoss = parseFloat(entry.profit_loss || 0);
      totalProfit += profitLoss;
      
      if (profitLoss > 0) {
        grossProfit += profitLoss;
      } else if (profitLoss < 0) {
        grossLoss += Math.abs(profitLoss);  // Convert to positive for calculation
      }
    });
    
    // Calculate average Risk to Reward ratio
    const validRiskRewardEntries = entries.filter(entry => 
      entry.risk_reward_ratio !== null && 
      entry.risk_reward_ratio !== undefined &&
      !isNaN(parseFloat(entry.risk_reward_ratio))
    );
    
    const avgRiskReward = validRiskRewardEntries.length > 0 
      ? validRiskRewardEntries.reduce((sum, entry) => 
          sum + parseFloat(entry.risk_reward_ratio), 0) / validRiskRewardEntries.length 
      : 0;
    
    // Calculate average win and loss
    const winningTrades = entries.filter(entry => parseFloat(entry.profit_loss || 0) > 0);
    const losingTrades = entries.filter(entry => parseFloat(entry.profit_loss || 0) < 0);
    
    const averageWin = winningTrades.length > 0 
      ? winningTrades.reduce((sum, entry) => sum + parseFloat(entry.profit_loss || 0), 0) / winningTrades.length 
      : 0;
      
    const averageLoss = losingTrades.length > 0 
      ? losingTrades.reduce((sum, entry) => sum + parseFloat(entry.profit_loss || 0), 0) / losingTrades.length 
      : 0;
    
    setMetrics({
      winRate: winRate.toFixed(2),
      totalTrades,
      wins,
      losses,
      breakeven,
      avgRiskReward,
      totalProfit: totalProfit.toFixed(2),
      averageWin: averageWin.toFixed(2),
      averageLoss: averageLoss.toFixed(2)
    });
  };

  if (loading) {
    return (
      <div>
        <Navbar />
        <div className="container mt-4">
          <h2>Dashboard for Journal {id}</h2>
          <p>Loading metrics...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <Navbar />
        <div className="container mt-4">
          <h2>Dashboard for Journal {id}</h2>
          <div className="alert alert-danger">{error}</div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <Navbar />
      <div className="container mt-4">
        <h2>Dashboard for Journal {id}</h2>
        
        <div className="row mt-4">
          {/* Win Rate Card with Circular Progress */}
          <div className="col-md-4">
            <div className="card shadow-sm mb-4">
              <div className="card-body text-center">
                <h6 className="text-muted">Win Percentage <i className="bi bi-info-circle"></i></h6>
                <CircularProgress value={parseFloat(metrics.winRate)} />
                <small className="text-muted d-block mt-2">
                  Based on {metrics.totalTrades} trades ({metrics.wins} wins, {metrics.losses} losses)
                </small>
              </div>
            </div>
          </div>
          
          {/* Risk Reward Line Chart (Compact) */}
          <RiskRewardLineChart entries={entries} />
          
          {/* Total Profit/Loss Card */}
          <div className="col-md-4">
            <MetricCard 
              title="Total P&L" 
              value={parseFloat(metrics.totalProfit) >= 0 ? `+${metrics.totalProfit}` : metrics.totalProfit} 
              description="Net profit/loss across all trades"
              color={parseFloat(metrics.totalProfit) >= 0 ? "text-success" : "text-danger"}
            />
          </div>
        </div>
        
        <div className="row">
          {/* Trade Outcomes Card */}
          <div className="col-md-6">
            <div className="card shadow-sm mb-4">
              <div className="card-body">
                <h5>Trade Outcomes</h5>
                <div className="d-flex justify-content-between">
                  <div className="text-center">
                    <h6 className="text-success">Wins</h6>
                    <h4>{metrics.wins}</h4>
                  </div>
                  <div className="text-center">
                    <h6 className="text-danger">Losses</h6>
                    <h4>{metrics.losses}</h4>
                  </div>
                  <div className="text-center">
                    <h6 className="text-secondary">Breakeven</h6>
                    <h4>{metrics.breakeven}</h4>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Average Trade Card */}
          <div className="col-md-6">
            <div className="card shadow-sm mb-4">
              <div className="card-body">
                <h5>Average Trade</h5>
                <div className="d-flex justify-content-between">
                  <div className="text-center">
                    <h6 className="text-success">Avg. Win</h6>
                    <h4>+{metrics.averageWin}</h4>
                  </div>
                  <div className="text-center">
                    <h6 className="text-danger">Avg. Loss</h6>
                    <h4>{metrics.averageLoss}</h4>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Daily Win Rate Chart Row */}
        <div className="row">
          {/* Win Rate by Day Chart */}
          <DailyWinRateChart entries={entries} />
          {/* Buy vs Sell Comparison Chart */}
          <BuyVsSellComparisonChart entries={entries} />
        </div>
        
        {/* AI Trading Analysis Section */}
        <div className="card shadow-sm mb-4">
          <div className="card-header d-flex justify-content-between align-items-center">
            <h5 className="card-title mb-0">AI Trading Analysis</h5>
            {!showAIFeedback && (
              <button 
                className="btn btn-primary" 
                onClick={generateAIFeedback}
                disabled={feedbackLoading || entries.length < 5}
              >
                {entries.length < 5 ? 'Need 5+ Trades' : 'Generate Feedback'}
              </button>
            )}
          </div>
          
          {showAIFeedback && (
            <div className="card-body">
              {feedbackLoading ? (
                <div className="text-center p-4">
                  <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Loading...</span>
                  </div>
                  <p className="mt-3">Analyzing your trading patterns...</p>
                </div>
              ) : feedbackError ? (
                <div className="alert alert-danger">{feedbackError}</div>
              ) : aiFeedback ? (
                <div>
                  <div className="mb-4">
                    <h6>Trading Coach Feedback:</h6>
                    <div className="p-3 bg-light rounded border">
                      {aiFeedback.feedback.split('\n\n').map((section, sectionIndex) => {
                        // Skip empty sections
                        if (!section.trim()) return null;
                        
                        // Handle section headers and bullet points
                        if (section.includes('POSITIVES:') || section.includes('AREAS FOR IMPROVEMENT:') || section.includes('ACTION STEPS:')) {
                          const [header, ...bulletPoints] = section.split('\n');
                          return (
                            <div key={sectionIndex} className="mb-3">
                              <h5 className={`fw-bold ${header.includes('POSITIVES') ? 'text-success' : header.includes('AREAS') ? 'text-warning' : 'text-primary'}`}>
                                {header}
                              </h5>
                              <ul className="mb-0">
                                {bulletPoints.filter(point => point.trim()).map((point, bulletIndex) => (
                                  <li key={bulletIndex}>{point.replace('- ', '')}</li>
                                ))}
                              </ul>
                            </div>
                          );
                        }
                        
                        // Regular paragraph
                        return <p key={sectionIndex}>{section}</p>;
                      })}
                    </div>
                  </div>
                  
                  {aiFeedback.summary && (
                    <div className="row mt-4">
                      <div className="col-md-6">
                        <h6>Trading Metrics Analyzed:</h6>
                        <ul className="list-group">
                          <li className="list-group-item d-flex justify-content-between align-items-center">
                            Total Trades
                            <span className="badge bg-primary rounded-pill">{aiFeedback.summary.total_trades}</span>
                          </li>
                          <li className="list-group-item d-flex justify-content-between align-items-center">
                            Win Rate
                            <span className={`badge ${aiFeedback.summary.win_rate > 50 ? 'bg-success' : 'bg-warning'} rounded-pill`}>
                              {aiFeedback.summary.win_rate}%
                            </span>
                          </li>
                          <li className="list-group-item d-flex justify-content-between align-items-center">
                            Average Risk
                            <span className={`badge ${aiFeedback.summary.avg_risk <= aiFeedback.summary.max_risk ? 'bg-success' : 'bg-danger'} rounded-pill`}>
                              {aiFeedback.summary.avg_risk}%
                            </span>
                          </li>
                        </ul>
                      </div>
                      
                      <div className="col-md-6">
                        <h6>Areas of Focus:</h6>
                        <ul className="list-group">
                          {aiFeedback.summary.risk_exceeded_count > 0 && (
                            <li className="list-group-item list-group-item-danger">
                              Risk Management (exceeded {aiFeedback.summary.risk_exceeded_count} times)
                            </li>
                          )}
                          {aiFeedback.summary.overtrading_days > 0 && (
                            <li className="list-group-item list-group-item-warning">
                              Overtrading ({aiFeedback.summary.overtrading_days} days with 3+ trades)
                            </li>
                          )}
                          {aiFeedback.summary.unusual_instruments && aiFeedback.summary.unusual_instruments.length > 0 && (
                            <li className="list-group-item list-group-item-info">
                              Trading Unusual Instruments: {aiFeedback.summary.unusual_instruments.join(', ')}
                            </li>
                          )}
                        </ul>
                      </div>
                    </div>
                  )}
                  
                  <div className="d-flex justify-content-end mt-4">
                    <button 
                      className="btn btn-outline-primary"
                      onClick={() => generateAIFeedback()}
                    >
                      Regenerate Feedback
                    </button>
                  </div>
                </div>
              ) : (
                <p className="text-center p-4">Click "Generate Feedback" to analyze your trading patterns with AI.</p>
              )}
            </div>
          )}
        </div>
        
        {/* Monte Carlo Simulation Section */}
        <MonteCarloSimulation 
          tradeReturns={entries.map(e => parseFloat(e.profit_loss) / 100)} 
          initialBalance={10000} 
          numSimulations={1000} 
        />
      </div>
    </div>
  );
}

export default Dashboard;