/**
 * Formats a decimal score as a percentage string.
 * @param {number} score - The decimal score (e.g., 0.85)
 * @param {number} decimals - Number of decimal places to show
 * @returns {string} The formatted percentage (e.g., "85%")
 */
export const formatPercentage = (score, decimals = 0) => {
  if (score === null || score === undefined || isNaN(score)) return '0%';
  return `${(score * 100).toFixed(decimals)}%`;
};
