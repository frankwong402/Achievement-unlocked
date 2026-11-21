'use client';

import { useEffect } from 'react';
import { mountAchievementApp } from '../lib/controller';

// This client boundary owns the interactive mock app. No server secrets in browser.
export default function AchievementClient() {
  useEffect(() => mountAchievementApp(), []);
  return <div id="app" />;
}
