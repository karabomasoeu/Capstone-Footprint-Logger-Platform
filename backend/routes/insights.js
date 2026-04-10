const express     = require('express');
const ActivityLog = require('../models/ActivityLog');
const protect     = require('../middleware/auth');

const router = express.Router();
router.use(protect);

// Community average baseline (kg CO2 per day, the SA national estimate)
const COMMUNITY_AVG = {
  transport: 18.4,
  food:      12.7,
  energy:    9.3,
  other:     4.1,
};

// Weekly reduction goals (kg CO2 per week per category)
const WEEKLY_GOAL = {
  transport: 15,
  food:      10,
  energy:    8,
  other:     3,
};

const TIPS = {
  transport: [
    'Try carpooling or public transit two days per week to cut transport emissions significantly.',
    'Plan your trips to combine errands into a single journey.',
    'Consider cycling for trips under 5 km, it produces zero emissions.',
    'If buying a new vehicle, compare hybrid or electric options.',
  ],
  food: [
    'Try one meat-free day per week, it can reduce food emissions by up to 15%.',
    'Reducing beef consumption has the single largest food-related impact.',
    'Buy local and seasonal produce to minimise transport and storage emissions.',
    'Reduce food waste by planning meals and using leftovers.',
  ],
  energy: [
    'Switch to LED bulbs throughout your home, they use up to 80% less energy.',
    'Unplug devices on standby, they draw power even when not in use.',
    'Consider a solar water heater to reduce geyser electricity consumption.',
    'Set your geyser thermostat to 60°C rather than higher.',
  ],
  other: [
    'Buy second-hand clothing when possible to avoid production emissions.',
    'Compost organic waste instead of sending it to landfill.',
    'Choose products with minimal packaging.',
    'Reduce video streaming quality on large screens to lower data centre energy use.',
  ],
};

// GET /api/insights: personalised tips and weekly goal progress
router.get('/', async (req, res) => {
  try {
    const userId = req.user._id;

    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    // This week's totals by category
    const weeklyByCategory = await ActivityLog.aggregate([
      { $match: { userId, loggedAt: { $gte: oneWeekAgo } } },
      {
        $group: {
          _id: '$category',
          co2: { $sum: '$co2kg' },
        },
      },
    ]);

    const weeklyTotals = weeklyByCategory.reduce((acc, c) => {
      acc[c._id] = Math.round(c.co2 * 100) / 100;
      return acc;
    }, {});

    // All-time totals by category for top category ranking
    const allTimeByCategory = await ActivityLog.aggregate([
      { $match: { userId } },
      {
        $group: {
          _id: '$category',
          co2: { $sum: '$co2kg' },
        },
      },
      { $sort: { co2: -1 } },
    ]);

    // Build goal progress
    const goals = Object.entries(WEEKLY_GOAL).map(([cat, goal]) => {
      const current = weeklyTotals[cat] || 0;
      return {
        category:   cat,
        goal,
        current,
        percentage: Math.min(100, Math.round((current / goal) * 100)),
        onTrack:    current <= goal,
      };
    });

    // Build personalised tips — prioritised by highest-emission category
    const tips = allTimeByCategory.map((c) => {
      const catTips   = TIPS[c._id] || [];
      const tipIndex  = Math.floor(Math.random() * catTips.length);
      const commAvg   = COMMUNITY_AVG[c._id] || 0;
      const weekTotal = weeklyTotals[c._id] || 0;
      const diff      = weekTotal - commAvg * 7;

      return {
        category:        c._id,
        totalCo2:        Math.round(c.co2 * 100) / 100,
        weekCo2:         weekTotal,
        communityAvgDay: commAvg,
        vsCommunitPct:   commAvg > 0
          ? Math.round((Math.abs(diff) / (commAvg * 7)) * 100)
          : 0,
        aboveCommunity:  diff > 0,
        tip:             catTips[tipIndex] || '',
      };
    });

    res.json({ goals, tips });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/insights/community:community average comparison
router.get('/community', async (req, res) => {
  try {
    const userId = req.user._id;

    const allTimeByCategory = await ActivityLog.aggregate([
      { $match: { userId } },
      { $group: { _id: '$category', co2: { $sum: '$co2kg' } } },
    ]);

    const userTotals = allTimeByCategory.reduce((acc, c) => {
      acc[c._id] = Math.round(c.co2 * 100) / 100;
      return acc;
    }, {});

    const comparison = Object.entries(COMMUNITY_AVG).map(([cat, avg]) => ({
      category:    cat,
      userTotal:   userTotals[cat] || 0,
      communityAvg: avg,
      difference:  Math.round(((userTotals[cat] || 0) - avg) * 100) / 100,
    }));

    res.json({ comparison, communityAvg: COMMUNITY_AVG });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
