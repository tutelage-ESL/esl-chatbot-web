'use strict';
// SM-2 spaced repetition algorithm
function sm2(quality, interval, ease, repetitions) {
  if (quality < 3) { return { interval: 1, ease: Math.max(1.3, ease - 0.2), repetitions: 0 }; }
  let newEase = ease + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
  newEase = Math.max(1.3, newEase);
  let newInterval;
  if (repetitions === 0) newInterval = 1;
  else if (repetitions === 1) newInterval = 6;
  else newInterval = Math.round(interval * newEase);
  return { interval: newInterval, ease: newEase, repetitions: repetitions + 1 };
}
function getNextDueDate(interval) {
  const due = new Date();
  due.setDate(due.getDate() + interval);
  return due;
}
module.exports = { sm2, getNextDueDate };
