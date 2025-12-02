import React from "react";
import { CreditCard, Wallet, TrendingUp, Gift } from "lucide-react";
import "./StatsSummary.css";

function StatsSummary() {
  return (
    <div className="stats-container">
      <div className="stat-box">
        <div className="icon blue">
          <CreditCard size={24} />
        </div>
        <p>Total Credit Limit</p>
        <h2>RM 47,000</h2>
      </div>

      <div className="stat-box">
        <div className="icon green">
          <Wallet size={24} />
        </div>
        <p>Available Credit</p>
        <h2>RM 44,520</h2>
      </div>

      <div className="stat-box">
        <div className="icon purple">
          <TrendingUp size={24} />
        </div>
        <p>Credit Score</p>
        <h2>750 <span className="score-change">+15</span></h2>
      </div>

      <div className="stat-box">
        <div className="icon orange">
          <Gift size={24} />
        </div>
        <p>Monthly Rewards</p>
        <h2>RM 67</h2>
      </div>
    </div>
  );
}

export default StatsSummary;
