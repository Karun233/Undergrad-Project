import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import axios from 'axios';
import Navbar from '../components/Navbar';
import { ACCESS_TOKEN } from "../constants";

// Your API base URL (should match what you use in other components)
const API_BASE_URL = 'http://localhost:8000/api';

// Circular Progress Component for risk:reward visualization
const CircularProgress = ({ value }) => {
  // Calculate the percentage for the progress circle
  // We're capping at 3.0 as an excellent risk:reward (so 3+ = 100%)
  const percentage = Math.min(value / 3 * 100, 100);
  
  // Calculate the circumference and offset
  const radius = 70;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percentage / 100) * circumference;
  
  // Determine color based on value
  let color;
  if (value >= 2.0) color = "#4CAF50"; // Green for excellent
  else if (value >= 1.5) color = "#8BC34A"; // Light green for good
  else if (value >= 1.0) color = "#FFC107"; // Yellow for acceptable
  else color = "#F44336"; // Red for poor

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
        {value.toFixed(2)}
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
          {/* Risk to Reward Card */}
          <div className="col-md-4">
            <div className="card shadow-sm mb-4">
              <div className="card-body text-center">
                <h6 className="text-muted">Risk : Reward <i className="bi bi-info-circle"></i></h6>
                <CircularProgress value={metrics.avgRiskReward} />
                <small className="text-muted d-block mt-2">
                  Average risk to reward ratio across trades
                </small>
              </div>
            </div>
          </div>
          
          {/* Win Rate Card */}
          <div className="col-md-4">
            <MetricCard 
              title="Win Rate" 
              value={`${metrics.winRate}%`} 
              description={`Based on ${metrics.totalTrades} trades`}
              color={parseFloat(metrics.winRate) > 40 ? "text-success" : "text-danger"}
            />
          </div>
          
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
      </div>
    </div>
  );
}

export default Dashboard;