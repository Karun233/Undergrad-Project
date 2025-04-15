import React, { useState } from "react";
import { Button } from "react-bootstrap";
import Plot from 'react-plotly.js';

/**
 * Monte Carlo Simulation Component
 * @param {Array} tradeReturns - Array of trade returns (as decimal, e.g. 0.01 for 1%)
 * @param {number} initialBalance - Starting balance
 * @param {number} numSimulations - Number of simulations (default: 1000)
 */
const MonteCarloSimulation = ({ tradeReturns, initialBalance = 10000, numSimulations = 1000 }) => {
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);

  const runSimulations = () => {
    setLoading(true);
    const equityCurves = [];
    for (let i = 0; i < numSimulations; i++) {
      let curve = [initialBalance];
      for (let j = 0; j < tradeReturns.length; j++) {
        // Randomly sample a return from tradeReturns
        const r = tradeReturns[Math.floor(Math.random() * tradeReturns.length)];
        curve.push(curve[curve.length - 1] * (1 + r));
      }
      equityCurves.push(curve);
    }
    setResults(equityCurves);
    setLoading(false);
  };

  return (
    <div className="mt-5">
      <h4>Monte Carlo Simulation</h4>
      <p>
        This simulation randomly resamples your trade results to show a range of possible equity curves. It helps visualize risk and variability in your trading outcomes.
      </p>
      <Button variant="primary" onClick={runSimulations} disabled={loading || !tradeReturns.length}>
        {loading ? "Simulating..." : "Run Monte Carlo"}
      </Button>
      {results && (
        <div className="mt-4">
          <Plot
            data={results.map((curve, i) => ({
              x: Array.from({ length: curve.length }, (_, j) => j),
              y: curve,
              type: 'scatter',
              mode: 'lines',
              line: { color: 'rgba(0,0,255,0.1)' },
              showlegend: false,
              hoverinfo: 'none',
            }))}
            layout={{
              title: 'Simulated Equity Curves',
              xaxis: { title: 'Trade Number' },
              yaxis: { title: 'Account Balance' },
              height: 400,
            }}
            config={{ displayModeBar: false }}
          />
        </div>
      )}
    </div>
  );
};

export default MonteCarloSimulation;
