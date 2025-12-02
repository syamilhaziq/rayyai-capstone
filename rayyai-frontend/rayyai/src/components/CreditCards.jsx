import React, { useState } from "react";
import { Trash2, Gift, Check } from "lucide-react";
import { cardsApi } from "../services/api";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Button } from "./ui/button";

function CreditCard({
  card_id,
  bank,
  cardNumber = "1234567812345678",
  cardType = "Visa",
  balance = "2000",
  utilization,
  annualFee,
  nextPayment = "28/11/2025",
  minPayment = "200",
  availableCredit,
  rewards,
  isSelected = false,
  onSelect = () => {},
  showSelection = false,
  onDelete = () => {},
}) {
  const [showFullNumber, setShowFullNumber] = useState(false);
  const [showRewardsDialog, setShowRewardsDialog] = useState(false);
  const [rewardsData, setRewardsData] = useState(null);
  const [rewardsLoading, setRewardsLoading] = useState(false);
  const [rewardsError, setRewardsError] = useState(null);

  const maskedNumber = showFullNumber
    ? cardNumber.replace(/(.{4})/g, "$1 ").trim()
    : "**** **** **** " + cardNumber.slice(-4);

  // Professional number formatting
  const formatCurrency = (amount) => {
    const num = typeof amount === 'string' ? parseFloat(amount.replace(/,/g, '')) : amount;
    return new Intl.NumberFormat('en-MY', {
      style: 'currency',
      currency: 'MYR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(num).replace('MYR', 'RM');
  };

  // Utilization status
  const getUtilizationStatus = (util) => {
    if (util <= 10) return { color: 'green', text: 'Excellent' };
    if (util <= 30) return { color: 'blue', text: 'Good' };
    if (util <= 50) return { color: 'orange', text: 'Fair' };
    return { color: 'red', text: 'High' };
  };

  const utilizationStatus = getUtilizationStatus(utilization);

  // Handle Rewards button click
  const handleRewardsClick = async () => {
    setShowRewardsDialog(true);
    setRewardsLoading(true);
    setRewardsError(null);

    try {
      const cardData = await cardsApi.getById(card_id);
      setRewardsData(cardData.benefits || {});
    } catch (err) {
      setRewardsError(err.message || "Failed to load rewards");
    } finally {
      setRewardsLoading(false);
    }
  };

  // Handle Analytics button click - trigger RayyAI chat
  const handleAnalyticsClick = () => {
    // Dispatch custom event to open RayyAI chat
    const event = new CustomEvent('openRayyAI', {
      detail: {
        context: 'credit_card_analysis',
        cardId: card_id,
        bank: bank
      }
    });
    window.dispatchEvent(event);
  };

  // Brand-consistent card colors
  const getCardColor = (bank) => {
    const bankLower = bank?.toLowerCase() || '';
    switch (bankLower) {
      case "maybank":
      case "harimau bank":
        return "linear-gradient(135deg, #fbbf24, #f59e0b)";
      case "cimb":
      case "octupus bank":
        return "linear-gradient(135deg, #dc2626, #b91c1c)";
      case "uob":
        return "linear-gradient(135deg, #1e40af, #3b82f6)";
      case "rhb":
      case "rhb bank":
        return "linear-gradient(135deg, #6f948d, #586c75)";
      default:
        return "linear-gradient(135deg, #6f948d, #586c75)"; // Brand primary colors
    }
  };

  const getTextColor = (bank) => {
    const bankLower = bank?.toLowerCase() || '';
    // Maybank uses dark text on yellow background
    if (bankLower === "maybank" || bankLower === "harimau bank") {
      return "#1f2937";
    }
    // All other cards use white text
    return "#ffffff";
  };

  return (
    <div className={`bg-[#f9fafb] rounded-2xl p-5 border shadow-sm transition-all w-full max-w-[360px] relative flex flex-col items-center ${
      isSelected
        ? 'border-[#04362c] shadow-[0_0_0_2px_rgba(4,54,44,0.2)]'
        : 'border-[#e5e7eb] hover:shadow-[0_4px_12px_rgba(0,0,0,0.15)] hover:-translate-y-0.5'
    }`}>
      {/* Selection Checkbox */}
      {showSelection && (
        <div className="absolute top-3 right-3 z-10">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={(e) => onSelect(e.target.checked)}
            aria-label={`Select ${bank} credit card`}
            className="absolute opacity-0 w-[18px] h-[18px] cursor-pointer"
          />
          <div className={`w-[18px] h-[18px] border-2 rounded-sm flex items-center justify-center transition-all cursor-pointer ${
            isSelected
              ? 'bg-[#04362c] border-[#04362c] text-white'
              : 'bg-white border-[#d1d5db]'
          }`}>
            {isSelected && <Check size={12} />}
          </div>
        </div>
      )}

      {/* Credit Card */}
      <div
        className="w-full h-[180px] rounded-xl p-5 relative cursor-pointer transition-all duration-[400ms] overflow-hidden mb-4 shadow-[0_4px_12px_rgba(0,0,0,0.15)] [transform-style:preserve-3d] [perspective:1000px] hover:scale-[1.02] hover:[transform:scale(1.02)_rotateY(-5deg)_rotateX(2deg)] hover:shadow-[0_12px_32px_rgba(0,0,0,0.25)] md:h-[160px] md:p-4"
        style={{
          background: getCardColor(bank),
          color: getTextColor(bank)
        }}
        onClick={() => setShowFullNumber(!showFullNumber)}
        role="button"
        tabIndex={0}
        aria-label={`${bank} credit card`}
      >
        {/* Card Top */}
        <div className="flex justify-between items-center mb-4">
          <div className="w-8 h-6 bg-gradient-to-br from-[#fbbf24] to-[#f59e0b] rounded shadow-sm relative after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:right-0.5 after:bottom-0.5 after:bg-gradient-to-br after:from-[#fde047] after:to-[#fbbf24] after:rounded-sm"></div>
          <div className="text-[11px] font-bold uppercase tracking-wider opacity-90">{cardType}</div>
        </div>

        {/* Card Middle */}
        <div className="flex-1 flex flex-col justify-center gap-2">
          <div className="text-base font-bold tracking-wide mb-1 md:text-sm">{bank.toUpperCase()}</div>
          <div className="text-lg font-semibold font-mono tracking-[2px] mb-2 md:text-base">{maskedNumber}</div>
        </div>

        {/* Card Bottom */}
        <div className="mt-auto">
          <div className="flex justify-between items-end">
            <div className="flex flex-col">
              <span className="text-[8px] font-semibold uppercase opacity-70 tracking-wider mb-0.5">VALID THRU</span>
              <span className="text-xs font-semibold tracking-wider">12/27</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[8px] font-semibold uppercase opacity-70 tracking-wider mb-0.5">BALANCE</span>
              <span className="text-xs font-semibold tracking-wider">{formatCurrency(balance)}</span>
            </div>
          </div>
        </div>

        {/* Contactless Symbol */}
        <div className="absolute top-5 right-[60px]">
          <div className="w-4 h-4 border-2 border-current rounded-full opacity-60 relative after:content-[''] after:absolute after:top-1/2 after:left-1/2 after:-translate-x-1/2 after:-translate-y-1/2 after:w-1 after:h-1 after:bg-current after:rounded-full"></div>
        </div>
      </div>

      {/* Card Details */}
      <div className="flex flex-col gap-4 w-full">
        {/* Quick Stats */}
        <div className="flex items-center justify-between gap-2">
          <div className={`px-2 py-1 rounded-xl text-lg font-semibold whitespace-nowrap ${
            utilizationStatus.color === 'green' ? 'bg-[#dcfce7] text-[#166534]' :
            utilizationStatus.color === 'blue' ? 'bg-[#dbeafe] text-[#1e40af]' :
            utilizationStatus.color === 'orange' ? 'bg-[#fed7aa] text-[#c2410c]' :
            'bg-[#fecaca] text-[#dc2626]'
          }`}>
            {utilization}% Used
          </div>
          <div className="px-2 py-1 rounded-xl text-lg font-semibold whitespace-nowrap bg-[#f3f4f6] text-[#374151]">
            {formatCurrency(annualFee)} Fee
          </div>
          <div className="flex gap-2">
            <button className="flex items-center justify-center w-9 h-9 bg-[#f8fafc] border border-[#e2e8f0] rounded-lg cursor-pointer transition-all text-[#6b7280] hover:bg-[#f1f5f9] hover:border-[#cbd5e1] hover:text-[#374151] hover:-translate-y-0.5" title="Delete" onClick={() => onDelete(card_id)}>
              <Trash2 size={16} />
            </button>
          </div>
        </div>

        {/* Payment Due */}
        <div className="flex justify-between items-center py-3 px-4 bg-white border border-[#e2e8f0] rounded-lg">
          <div className="flex flex-col">
            <span className="text-lg font-medium text-[#6b7280] mb-0.5">Next Payment</span>
            <span className="text-sm font-semibold text-[#111827]">{nextPayment}</span>
          </div>
          <div className="flex flex-col items-end">
            <span className="text-base font-bold text-[#111827]">{formatCurrency(minPayment)}</span>
            <span className="text-[11px] font-medium text-[#6b7280] uppercase">minimum</span>
          </div>
        </div>

        {/* Overview */}
        <div className="flex gap-3">
          <div className="flex-1 p-3 bg-white border border-[#f3f4f6] rounded-lg flex flex-col items-center text-center">
            <span className="text-lg font-medium text-[#6b7280] uppercase mb-1">Available</span>
            <span className="text-sm font-bold text-[#111827]">{formatCurrency(availableCredit)}</span>
          </div>
          <div className="flex-1 p-3 bg-white border border-[#f3f4f6] rounded-lg flex flex-col items-center text-center">
            <span className="text- font-medium text-[#6b7280] uppercase mb-1">Rewards</span>
            <span className="text-sm font-bold text-[#111827]">{formatCurrency(rewards)}</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          <button className="flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-lg text-md font-medium cursor-pointer transition-all border-0 bg-[#04362c] text-white hover:opacity-90 hover:-translate-y-0.5" onClick={handleRewardsClick}>
            Rewards
          </button>
          <button className="flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-lg text-md font-medium cursor-pointer transition-all border-0 bg-[#04362c] text-white hover:opacity-90 hover:-translate-y-0.5" onClick={handleAnalyticsClick}>
            Analytics
          </button>
        </div>
      </div>

      {/* Rewards Dialog */}
      <Dialog open={showRewardsDialog} onOpenChange={setShowRewardsDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Gift className="w-5 h-5 text-[#04362c]" />
              Card Rewards & Benefits
            </DialogTitle>
            <DialogDescription>
              View rewards and benefits for {bank} credit card
            </DialogDescription>
          </DialogHeader>

          <div className="max-h-[500px] overflow-y-auto">
            {rewardsLoading ? (
              <div className="text-center py-8">
                <p>Loading rewards...</p>
              </div>
            ) : rewardsError ? (
              <div className="text-center py-8 text-red-600">
                <p>{rewardsError}</p>
              </div>
            ) : !rewardsData || Object.keys(rewardsData).length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p>No rewards or benefits configured for this card.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Rewards Balance */}
                {rewardsData.points !== undefined && (
                  <div className="bg-gradient-to-r from-[#04362c] to-[#0DAD8D] rounded-lg p-6 text-white">
                    <div className="text-sm font-medium opacity-90 mb-1">Total Rewards Points</div>
                    <div className="text-3xl font-bold">{rewardsData.points?.toLocaleString() || 0}</div>
                    {rewardsData.cashback_value && (
                      <div className="text-sm mt-2 opacity-90">
                        ≈ {formatCurrency(rewardsData.cashback_value)} cashback value
                      </div>
                    )}
                  </div>
                )}

                {/* Fee Details */}
                {rewardsData["Fee Details"] && (
                  <div className="bg-blue-50 border border-blue-100 rounded-lg p-4">
                    <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                      <span className="text-blue-600">💳</span>
                      Fee Details
                    </h4>
                    <p className="text-sm text-gray-700 leading-relaxed">{rewardsData["Fee Details"]}</p>
                  </div>
                )}

                {/* Cash Rebate Tiers */}
                {rewardsData["Cash Rebate Tiers"] && typeof rewardsData["Cash Rebate Tiers"] === 'object' && (
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                      <span className="text-green-600">💰</span>
                      Cash Rebate Tiers
                    </h4>
                    <div className="space-y-3">
                      {Object.entries(rewardsData["Cash Rebate Tiers"]).map(([tier, details], index) => (
                        <div key={index} className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-100 rounded-lg p-4">
                          <div className="font-semibold text-green-800 mb-2">{tier}</div>
                          <p className="text-sm text-gray-700 leading-relaxed">{details}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Benefits List (array format) */}
                {rewardsData.benefits && Array.isArray(rewardsData.benefits) && rewardsData.benefits.length > 0 && (
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-3">Card Benefits</h4>
                    <div className="space-y-2">
                      {rewardsData.benefits.map((benefit, index) => (
                        <div key={index} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                          <div className="w-2 h-2 bg-[#0DAD8D] rounded-full mt-1.5"></div>
                          <div className="flex-1">
                            <div className="font-medium text-gray-900">{benefit.name || benefit}</div>
                            {benefit.description && (
                              <div className="text-sm text-gray-600 mt-1">{benefit.description}</div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Cashback Categories */}
                {rewardsData.cashback_categories && Object.keys(rewardsData.cashback_categories).length > 0 && (
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-3">Cashback Categories</h4>
                    <div className="space-y-2">
                      {Object.entries(rewardsData.cashback_categories).map(([category, rate], index) => (
                        <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                          <span className="font-medium text-gray-900 capitalize">{category}</span>
                          <span className="text-[#0DAD8D] font-semibold">{rate}% cashback</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Other Benefits - Generic fallback for any other fields */}
                {Object.keys(rewardsData).filter(key =>
                  key !== 'points' &&
                  key !== 'cashback_value' &&
                  key !== 'Fee Details' &&
                  key !== 'Cash Rebate Tiers' &&
                  key !== 'benefits' &&
                  key !== 'cashback_categories'
                ).length > 0 && (
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-3">Additional Information</h4>
                    <div className="space-y-2">
                      {Object.entries(rewardsData)
                        .filter(([key]) =>
                          key !== 'points' &&
                          key !== 'cashback_value' &&
                          key !== 'Fee Details' &&
                          key !== 'Cash Rebate Tiers' &&
                          key !== 'benefits' &&
                          key !== 'cashback_categories'
                        )
                        .map(([key, value], index) => (
                          <div key={index} className="p-3 bg-gray-50 rounded-lg">
                            <div className="font-medium text-gray-900 mb-1 capitalize">{key.replace(/_/g, ' ')}</div>
                            <div className="text-sm text-gray-700">
                              {typeof value === 'object' && value !== null
                                ? JSON.stringify(value, null, 2)
                                : typeof value === 'boolean'
                                ? (value ? 'Yes' : 'No')
                                : value}
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="flex justify-end mt-4">
            <Button variant="outline" onClick={() => setShowRewardsDialog(false)}>
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default CreditCard;