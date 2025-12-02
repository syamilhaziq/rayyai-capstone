import React, { useState } from "react";
import { TrendingUp, Award, FileText, ExternalLink, Sparkles, ArrowLeft, CheckCircle, AlertCircle } from "lucide-react";
import { Dialog, DialogContent } from "./ui/dialog";
import { Button } from "./ui/button";
import "./RecommendationCard.css";

function RecommendationCard({
  match,
  bank,
  title,
  offer,
  description,
  analysis,
  annualFee,
  value,
  cardBrand,
  eligibilityCriteria = {},
  benefits = {},
  promotions = [],
  highlightedBenefits = [],
}) {
  const [showFullDetails, setShowFullDetails] = useState(false);

  // Handle Compare button click - trigger RayyAI chat with comparison context
  const handleCompareClick = () => {
    // Dispatch custom event to open RayyAI chat
    const event = new CustomEvent('openRayyAI', {
      detail: {
        context: 'credit_card_comparison',
        message: `I'm interested in the recommended "${title}" from ${bank}. Can you compare this card with ALL of my current credit cards? Here are the recommended card details:

- Match Score: ${match}%
- Annual Fee: ${formatCurrency(annualFee)}

${highlightedBenefits.length > 0 ? `\nKey Benefits:\n${highlightedBenefits.map(b => `- ${b}`).join('\n')}` : ''}

Please provide:
1. A comparison table showing the recommended card vs each of my existing cards with columns: Card Name, Bank, Annual Fee, Credit Limit, Utilization, Key Benefits
2. Analysis of overlapping benefits
3. Whether getting this card would provide additional value or is redundant
4. Pros and cons comparison
5. Final recommendation based on my spending patterns`,
        autoSend: true  // Flag to trigger automatic sending
      }
    });
    window.dispatchEvent(event);
  };
  // Progress bar color
  const getBarColor = () => {
    if (match >= 90) return "green";
    if (match >= 70) return "orange";
    return "red";
  };

  // Card network (example logic)
  const getNetwork = () => {
    if (bank.toLowerCase().includes("maybank")) return "VISA";
    if (bank.toLowerCase().includes("cimb")) return "MasterCard";
    if (bank.toLowerCase().includes("public")) return "VISA";
    if (bank.toLowerCase().includes("affin")) return "MasterCard";
    return "VISA";
  };

  // Custom display name for bank
  const getDisplayName = () => {
    if (bank.toLowerCase() === "maybank") return "Harimau";   // 🟡 Harimau
    if (bank.toLowerCase() === "cimb") return "Octopus";      // 🔴 Octopus
    return bank; // default
  };

  // Get CSS class name for card styling
  const getBankClass = () => {
    const bankLower = bank.toLowerCase();
    if (bankLower.includes("maybank") || bankLower.includes("harimau")) return "maybank";
    if (bankLower.includes("cimb") || bankLower.includes("octopus") || bankLower.includes("octupus")) return "octopus";
    if (bankLower.includes("public")) return "public";
    if (bankLower.includes("affin")) return "affin";
    if (bankLower.includes("hello")) return "hello";
    return "default";
  };

  // Professional currency formatting
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-MY', {
      style: 'currency',
      currency: 'MYR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount).replace('MYR', 'RM');
  };

  // Brand colors
  const brand = {
    ink: "#04362c",
    accent: "#0DAD8D",
    surface: "#f8faf9",
  };

  return (
    <div className="recommendation-card">
      <div className="recommendation-content">
        {/* Enhanced Card Preview */}
        <div className="card-preview-section">
          {/* Match Score at Top */}
          <div className="match-score-top">
            <div className={`match-circle ${getBarColor()}`}>
              <span className="match-percentage">{match}%</span>
            </div>
            <div className="match-label-inline">
              <span className="match-text">Match Score</span>
              <span className={`match-status ${getBarColor()}`}>
                {match >= 90 ? 'Excellent' : match >= 70 ? 'Good' : 'Fair'}
              </span>
            </div>
          </div>

          {/* Credit Card */}
          <div className={`card-photo ${getBankClass()}`}>
            {/* Card Background Pattern */}
            <div className="card-background-pattern">
              <div className="bg-orb orb-1"></div>
              <div className="bg-orb orb-2"></div>
              <div className="bg-orb orb-3"></div>
            </div>
            
            <div className="card-top">
              <div className="chip-container">
                <div className="chip-modern">
                  <div className="chip-inner">
                    <div className="chip-line chip-line-1"></div>
                    <div className="chip-line chip-line-2"></div>
                    <div className="chip-line chip-line-3"></div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Contactless Symbol */}
            <div className="contactless-symbol">
              <div className="contactless-circle">
                <div className="contactless-dot"></div>
              </div>
            </div>
            
            <div className="card-middle">
              <div className="bank-info">
                <div className="bank-label">{getDisplayName()}</div>
                <div className="card-product">Premium Credit</div>
              </div>
              <div className="card-number-modern">**** **** **** 1234</div>
            </div>
            
            <div className="card-bottom-modern">
              <div className="cardholder-section">
                <span className="label-small">CARDHOLDER</span>
                <span className="cardholder-name">Your Name</span>
              </div>
              <div className="valid-section">
                <span className="label-small">VALID THRU</span>
                <span className="valid-date">12/27</span>
              </div>
              <div className="network-logo">
                <div className="network-badge">{getNetwork()}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Enhanced Details Section */}
        <div className="card-details">
          <div className="details-header">
            <div className="title-section">
              <h3 className="card-title">{title}</h3>
              <div className="card-meta">
                <span className="annual-fee-badge">
                  Annual Fee: {formatCurrency(annualFee)}
                </span>
              </div>
            </div>
          </div>

          <div className="offer-section">
            <div className="offer-highlight">
              <Award size={16} className="offer-icon" />
              <span className="offer-text">{offer}</span>
            </div>
            {description && <p className="offer-description">{description}</p>}
          </div>

          <div className="analysis-section">
            <div className="analysis-header">
              <div className="analysis-title">
                <Sparkles size={16} className="analysis-icon" />
                <h4>RayyAI Analysis</h4>
              </div>
            </div>
            <div className="analysis-insights">
              {analysis.map((item, i) => (
                <div key={i} className="insight-item">
                  <div className="insight-bullet"></div>
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="actions-section">
            <button className="action-btn secondary" onClick={() => setShowFullDetails(true)}>
              <FileText size={14} />
              Details
            </button>
            <button className="action-btn secondary" onClick={handleCompareClick}>
              <TrendingUp size={14} />
              Compare
            </button>
            <button className="action-btn primary">
              <ExternalLink size={14} />
              Apply Now
            </button>
          </div>
        </div>
      </div>

      {/* Full-Screen Details Dialog */}
      <Dialog open={showFullDetails} onOpenChange={setShowFullDetails}>
        <DialogContent
          className="!max-w-[100vw] !w-full !h-full !max-h-[100vh] !p-0 !gap-0 !rounded-none !translate-x-[-50%] !translate-y-[-50%] !top-[50%] !left-[50%]"
          style={{ margin: 0 }}
          showCloseButton={false}
        >
          <div className="min-h-screen" style={{ background: brand.surface }}>
            {/* Header Section */}
            <div className="bg-gradient-to-r from-[#04362c] to-[#0DAD8D] text-white">
              <div className="w-full px-6 sm:px-8 lg:px-14 pt-6 pb-8">
                {/* Back Button */}
                <button
                  onClick={() => setShowFullDetails(false)}
                  className="flex items-center gap-2 text-white/90 hover:text-white transition-colors mb-6"
                >
                  <ArrowLeft size={20} />
                  <span className="text-sm font-medium">Back to Recommendations</span>
                </button>

                {/* Card Title and Match Score */}
                <div className="flex items-start justify-between">
                  <div>
                    <h1 className="text-4xl font-bold mb-2">{title}</h1>
                    <p className="text-white/80 text-lg">{bank}</p>
                  </div>
                  <div className="text-right">
                    <div className="text-5xl font-bold mb-1">{match}%</div>
                    <div className="text-sm text-white/80 uppercase tracking-wide">Match Score</div>
                  </div>
                </div>

                {/* Key Metrics */}
                <div className="grid grid-cols-2 gap-6 mt-8 pt-6 border-t border-white/20">
                  <div>
                    <div className="text-sm text-white/70 uppercase tracking-wide mb-2">Annual Fee</div>
                    <div className="text-3xl font-bold">{formatCurrency(annualFee)}</div>
                  </div>
                  
                </div>
              </div>
            </div>

            {/* Content Section */}
            <div className="w-full px-6 sm:px-8 lg:px-14 py-8 overflow-y-auto max-h-[calc(100vh-400px)]">
              <div className="max-w-[1400px] mx-auto space-y-6">
                {/* Why This Card */}
                {description && (
                  <div className="bg-white rounded-2xl border border-black/5 shadow-sm p-6">
                    <div className="border-l-4 border-blue-500 bg-blue-50/50 p-4 rounded-r-lg">
                      <div className="flex items-start gap-3">
                        <Sparkles className="w-6 h-6 text-blue-600 flex-shrink-0 mt-0.5" />
                        <div>
                          <h2 className="font-semibold text-[#04362c] text-base uppercase tracking-wide mb-3">
                            Why This Card is Perfect for You
                          </h2>
                          <p className="text-base text-gray-700 leading-relaxed">{description}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Key Benefits */}
                {highlightedBenefits && highlightedBenefits.length > 0 && (
                  <div className="bg-white rounded-2xl border border-black/5 shadow-sm p-6">
                    <h2 className="font-semibold text-[#04362c] text-base uppercase tracking-wide mb-4">
                      Key Benefits
                    </h2>
                    <div className="grid gap-3">
                      {highlightedBenefits.map((benefit, index) => (
                        <div key={index} className="flex items-start gap-3 p-4 bg-green-50/50 border border-green-200 rounded-lg hover:bg-green-50 transition-colors">
                          <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0 mt-0.5" />
                          <span className="text-base text-gray-800">{benefit}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Detailed Analysis */}
                {analysis && analysis.length > 0 && (
                  <div className="bg-white rounded-2xl border border-black/5 shadow-sm p-6">
                    <h2 className="font-semibold text-[#04362c] text-base uppercase tracking-wide mb-4">
                      Personalized Analysis
                    </h2>
                    <div className="space-y-3">
                      {analysis.map((item, index) => (
                        <div key={index} className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg border border-gray-200">
                          <div className="w-2.5 h-2.5 bg-[#0DAD8D] rounded-full mt-2 flex-shrink-0"></div>
                          <span className="text-base text-gray-700 leading-relaxed">{item}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Eligibility Criteria */}
                {eligibilityCriteria && Object.keys(eligibilityCriteria).length > 0 && (
                  <div className="bg-white rounded-2xl border border-black/5 shadow-sm p-6">
                    <h2 className="font-semibold text-[#04362c] text-base uppercase tracking-wide mb-4 flex items-center gap-2">
                      <AlertCircle className="w-5 h-5 text-orange-600" />
                      Eligibility Requirements
                    </h2>
                    <div className="bg-orange-50/50 border border-orange-200 rounded-lg p-5">
                      <div className="grid gap-4">
                        {Object.entries(eligibilityCriteria).map(([key, value], index) => (
                          <div key={index} className="flex justify-between items-start text-base pb-3 border-b border-orange-100 last:border-0 last:pb-0">
                            <span className="font-medium text-gray-800 capitalize">{key.replace(/_/g, ' ')}</span>
                            <span className="text-gray-700 text-right ml-6">
                              {typeof value === 'object' && value !== null
                                ? JSON.stringify(value)
                                : typeof value === 'boolean'
                                ? (value ? 'Yes' : 'No')
                                : value}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Full Benefits */}
                {benefits && Object.keys(benefits).length > 0 && (
                  <div className="bg-white rounded-2xl border border-black/5 shadow-sm p-6">
                    <h2 className="font-semibold text-[#04362c] text-base uppercase tracking-wide mb-4">
                      All Benefits & Features
                    </h2>
                    <div className="grid gap-4">
                      {Object.entries(benefits).map(([category, details], index) => (
                        <div key={index} className="bg-gray-50 border border-gray-200 rounded-lg p-5 hover:shadow-sm transition-shadow">
                          <div className="font-semibold text-gray-900 mb-4 capitalize text-base">{category.replace(/_/g, ' ')}</div>
                          <div className="text-base text-gray-700">
                            {typeof details === 'object' && details !== null ? (
                              <div className="space-y-3">
                                {Object.entries(details).map(([key, val], idx) => (
                                  <div key={idx} className="flex justify-between items-start py-2">
                                    <span className="capitalize text-gray-600">{key.replace(/_/g, ' ')}:</span>
                                    <span className="font-medium text-gray-900 text-right ml-6">{String(val)}</span>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="text-gray-700">{String(details)}</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Promotions */}
                {promotions && promotions.length > 0 && (
                  <div className="bg-white rounded-2xl border border-black/5 shadow-sm p-6">
                    <h2 className="font-semibold text-[#04362c] text-base uppercase tracking-wide mb-4 flex items-center gap-2">
                      <Award className="w-5 h-5 text-purple-600" />
                      Current Promotions
                    </h2>
                    <div className="grid gap-4">
                      {promotions.map((promo, index) => (
                        <div key={index} className="bg-purple-50/50 border border-purple-200 rounded-lg p-5">
                          {typeof promo === 'object' ? (
                            <div className="space-y-2">
                              {promo.title && <div className="font-semibold text-purple-900 text-base">{promo.title}</div>}
                              {promo.description && <div className="text-base text-gray-700 leading-relaxed">{promo.description}</div>}
                              {promo.validity && <div className="text-sm text-gray-500 mt-2">Valid until: {promo.validity}</div>}
                            </div>
                          ) : (
                            <div className="text-base text-gray-700">{String(promo)}</div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="bg-white rounded-2xl border border-black/5 shadow-sm p-6">
                  <div className="flex justify-between items-center">
                    <Button
                      variant="outline"
                      onClick={() => setShowFullDetails(false)}
                      className="px-8 py-3 text-base"
                    >
                      Back to Recommendations
                    </Button>
                    <Button className="bg-[#0DAD8D] hover:bg-[#0a8d72] text-white px-8 py-3 text-base">
                      <ExternalLink size={18} className="mr-2" />
                      Apply Now
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default RecommendationCard;

