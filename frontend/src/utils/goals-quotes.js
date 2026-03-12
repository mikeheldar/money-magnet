// Daily rotating quotes about money, wealth, value, and manifestation
export const GOALS_QUOTES = [
  'Wealth is not about having a lot of money; it\'s about having a lot of options.',
  'The best time to plant a tree was 20 years ago. The second best time is now.',
  'What you think, you become. What you feel, you attract. What you imagine, you create.',
  'Money is a tool. Use it to build the life you want.',
  'Wealth flows to those who create value for others.',
  'Your net worth to the world is usually determined by what remains after your bad habits are subtracted from your good ones.',
  'Do not save what is left after spending; spend what is left after saving.',
  'The more you give, the more you receive. Generosity multiplies abundance.',
  'Invest in yourself. Your career is the engine of your wealth.',
  'Small daily improvements over time lead to stunning results.',
  'Financial freedom is less about how much you earn and more about how much you keep.',
  'Wealth is the product of a man\'s capacity to think.',
  'The habit of saving is itself an education; it fosters every virtue.',
  'Money often costs too much.',
  'An investment in knowledge pays the best interest.',
  'Do not wait; the time will never be "just right." Start where you stand.',
  'The secret to getting ahead is getting started.',
  'Wealth consists not in having great possessions, but in having few wants.',
  'A budget is telling your money where to go instead of wondering where it went.',
  'The goal isn\'t more money. The goal is living life on your terms.',
  'Financial peace isn\'t the acquisition of stuff. It\'s the learning to live on less than you make.',
  'You don\'t have to be great to start, but you have to start to be great.',
  'Abundance is not something we acquire. It is something we tune into.',
  'What you focus on expands. Focus on abundance.',
  'The universe rewards action. Take the first step toward your goal today.',
  'We become what we think about most of the time.',
  'Your beliefs about money shape your financial reality. Choose empowering beliefs.',
  'Gratitude turns what we have into enough.',
  'The best investment you can make is in your own abilities.',
  'Income follows value. Create more value, earn more.',
  'Financial freedom is when your passive income exceeds your expenses.',
  'Every dollar you save today is a dollar working for your future.',
  'Wealth is built one good decision at a time.',
  'Clarity about your goals is the first step to achieving them.',
  'You are one decision away from a completely different life.',
  'The only limit to your impact is your imagination and commitment.',
  'Money flows to those who see opportunities and take action.',
  'Your financial life improves when you improve your financial habits.',
  'Think like the wealthy: focus on assets that generate income.',
  'The path to wealth is paved with discipline and patience.',
  'Value your time; it is the one resource you cannot replace.',
  'Success is the sum of small efforts repeated day in and day out.',
  'You attract what you are ready for. Get ready for abundance.',
  'The best way to predict your financial future is to create it.',
  'Small steps lead to big changes. Start today.',
  'Wealth is created when you do what others won\'t do today so you can do what others can\'t do tomorrow.',
  'Your net worth is a reflection of your self-worth. Believe in your value.',
  'Abundance is your birthright. Claim it with intention and action.',
  'Every moment is a chance to choose a wealthier path.',
  'The mind is everything. What you think you become.',
  'Manifest your goals by aligning your thoughts, feelings, and actions.',
  'Money follows value. Increase your value; increase your income.',
  'The wealthy think in terms of net worth; the rest think in terms of salary.',
  'Your future is created by what you do today, not tomorrow.',
  'Financial confidence comes from taking control of your money.',
  'Dream big, start small, act now.',
  'Wealth is not what you have in the bank; it\'s what you build in your life.',
  'The only way to do great work is to love what you do—and get paid well for it.',
  'Opportunity is missed by most people because it is dressed in overalls and looks like work.',
  'Your income can grow only to the extent that you do.',
  'Be so good they can\'t ignore you—and charge accordingly.',
  'The best investment is in the tools of one\'s own trade.',
  'Spend on what matters; cut what doesn\'t. Clarity is power.'
]

/**
 * Returns the same quote for the entire day (deterministic by day of year).
 */
export function getQuoteOfTheDay() {
  const now = new Date()
  const startOfYear = new Date(now.getFullYear(), 0, 0)
  const dayOfYear = Math.floor((now - startOfYear) / 864e5)
  const index = dayOfYear % GOALS_QUOTES.length
  return GOALS_QUOTES[index]
}
