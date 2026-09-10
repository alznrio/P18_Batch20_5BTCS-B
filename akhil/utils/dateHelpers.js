const addMonths = (date, months) => {
  const result = new Date(date);
  result.setMonth(result.getMonth() + parseInt(months, 10));
  return result;
};

const daysRemaining = (targetDate) => {
  const now = new Date();
  const diffTime = new Date(targetDate) - now;
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

module.exports = {
  addMonths,
  daysRemaining,
};